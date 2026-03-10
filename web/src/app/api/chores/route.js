import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/chores?completed=true|false&assigned_to=user_id
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const completed = searchParams.get('completed')
    const assignedTo = searchParams.get('assigned_to')
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's household
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No household found' }, { status: 404 })
    }

    let query = supabase
      .from('chores')
      .select('*')
      .eq('household_id', membership.household_id)
      .order('due_date', { nullsFirst: false })
      .order('created_at', { ascending: false })

    if (completed !== null) {
      query = query.eq('completed', completed === 'true')
    }

    if (assignedTo) {
      query = query.or(`assigned_to.eq.${assignedTo},assigned_to_profile_id.eq.${assignedTo}`)
    }

    const { data: chores, error } = await query

    if (error) {
      console.error('Error fetching chores:', error)
      return NextResponse.json({ error: 'Failed to fetch chores' }, { status: 500 })
    }

    return NextResponse.json({ chores })
    
  } catch (error) {
    console.error('Error in chores endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/chores
export async function POST(request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's household
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No household found' }, { status: 404 })
    }

    const {
      title,
      description,
      assigned_to,
      assigned_to_profile_id,
      due_date,
      recurrence_rule,
      points,
      category,
      estimated_minutes
    } = body

    if (!title || (!assigned_to && !assigned_to_profile_id)) {
      return NextResponse.json({ error: 'Title and assigned person are required' }, { status: 400 })
    }

    const { data: chore, error } = await supabase
      .from('chores')
      .insert({
        household_id: membership.household_id,
        title,
        description,
        assigned_to: assigned_to || null,
        assigned_to_profile_id: assigned_to_profile_id || null,
        due_date,
        recurrence_rule,
        points: points || 0,
        category,
        estimated_minutes,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating chore:', error)
      return NextResponse.json({ error: 'Failed to create chore' }, { status: 500 })
    }

    return NextResponse.json({ chore }, { status: 201 })
    
  } catch (error) {
    console.error('Error in chores endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

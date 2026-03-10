import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/templates?category=event|chore|meal
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    
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
      .from('event_templates')
      .select('*')
      .eq('household_id', membership.household_id)
      .order('name')

    if (category) {
      query = query.eq('category', category)
    }

    const { data: templates, error } = await query

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    return NextResponse.json({ templates })
    
  } catch (error) {
    console.error('Error in templates endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/templates
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
      name,
      title,
      description,
      location,
      duration_minutes,
      all_day,
      default_attendees,
      color,
      category,
      icon
    } = body

    if (!name || !title) {
      return NextResponse.json({ error: 'Name and title are required' }, { status: 400 })
    }

    const { data: template, error } = await supabase
      .from('event_templates')
      .insert({
        household_id: membership.household_id,
        name,
        title,
        description,
        location,
        duration_minutes: duration_minutes || 60,
        all_day: all_day || false,
        default_attendees: default_attendees || [],
        color,
        category: category || 'event',
        icon,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    return NextResponse.json({ template }, { status: 201 })
    
  } catch (error) {
    console.error('Error in templates endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

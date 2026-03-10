import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Get all household profiles
export async function GET(request) {
  try {
    const supabase = await createClient()

    // Get user's household
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: member } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'No household found' }, { status: 404 })
    }

    // Get all profiles in the household
    const { data: profiles, error } = await supabase
      .from('household_profiles')
      .select('*')
      .eq('household_id', member.household_id)
      .order('is_auth_user', { ascending: false })
      .order('name')

    if (error) {
      console.error('Error fetching profiles:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profiles })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add a new household profile (e.g., a child without email)
export async function POST(request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's household
    const { data: member } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'No household found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, birth_date, relationship, avatar_url, color } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Create new profile (non-auth user)
    const { data: profile, error } = await supabase
      .from('household_profiles')
      .insert({
        household_id: member.household_id,
        name,
        birth_date: birth_date || null,
        relationship: relationship || null,
        avatar_url: avatar_url || null,
        color: color || null,
        is_auth_user: false,
        user_id: null,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating profile:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

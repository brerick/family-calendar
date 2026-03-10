import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Get current user's profile
export async function GET(request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      profile: profile || { id: user.id, timezone: 'America/Los_Angeles' },
      email: user.email 
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update user's profile (display name, timezone, etc.)
export async function PATCH(request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { display_name, timezone } = body

    // Check if profile exists
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    let result

    if (existing) {
      // Update existing profile
      const updateData = {}
      if (display_name !== undefined) updateData.display_name = display_name
      if (timezone !== undefined) updateData.timezone = timezone
      updateData.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating profile:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      result = data
    } else {
      // Create new profile
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          display_name: display_name || null,
          timezone: timezone || 'America/Los_Angeles'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating profile:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      result = data
    }

    // Update household profile name if exists
    if (display_name) {
      await supabase
        .from('household_profiles')
        .update({ name: display_name })
        .eq('user_id', user.id)
        .eq('is_auth_user', true)
    }

    return NextResponse.json({ profile: result })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

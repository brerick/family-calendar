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
      console.error('Auth error in PATCH:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { display_name, timezone } = body

    console.log('Updating profile for user:', user.id, { display_name, timezone })

    // Check if profile exists
    const { data: existing, error: checkError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking profile:', checkError)
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    let result

    if (existing) {
      // Update existing profile
      const updateData = {}
      if (display_name !== undefined) updateData.display_name = display_name
      if (timezone !== undefined) updateData.timezone = timezone
      updateData.updated_at = new Date().toISOString()

      console.log('Updating existing profile with:', updateData)

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
      console.log('Profile updated successfully:', result)
    } else {
      // Create new profile
      console.log('Creating new profile')
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
      console.log('Profile created successfully:', result)
    }

    // Update household profile name if exists and display_name is provided
    if (display_name) {
      console.log('Updating household profiles with name:', display_name)
      const { error: householdError } = await supabase
        .from('household_profiles')
        .update({ name: display_name })
        .eq('user_id', user.id)
        .eq('is_auth_user', true)

      if (householdError) {
        console.error('Error updating household profiles:', householdError)
        // Don't fail the whole request if household update fails
      } else {
        console.log('Household profiles updated')
      }
    }

    return NextResponse.json({ profile: result })
  } catch (error) {
    console.error('Unexpected error in PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

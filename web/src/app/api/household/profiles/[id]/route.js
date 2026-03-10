import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH - Update a household profile
export async function PATCH(request, { params }) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, birth_date, relationship, avatar_url, color } = body

    // Verify the profile belongs to user's household
    const { data: profile } = await supabase
      .from('household_profiles')
      .select('household_id, is_auth_user')
      .eq('id', id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check user is in the same household
    const { data: member } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .eq('household_id', profile.household_id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update the profile
    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (birth_date !== undefined) updateData.birth_date = birth_date
    if (relationship !== undefined) updateData.relationship = relationship
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url
    if (color !== undefined) updateData.color = color
    updateData.updated_at = new Date().toISOString()

    const { data: updatedProfile, error } = await supabase
      .from('household_profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile: updatedProfile })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a household profile (only non-auth profiles)
export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the profile belongs to user's household and is not an auth user
    const { data: profile } = await supabase
      .from('household_profiles')
      .select('household_id, is_auth_user')
      .eq('id', id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.is_auth_user) {
      return NextResponse.json(
        { error: 'Cannot delete authenticated user profiles. Use the invite system to remove members.' },
        { status: 400 }
      )
    }

    // Check user is in the same household
    const { data: member } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .eq('household_id', profile.household_id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete the profile
    const { error } = await supabase
      .from('household_profiles')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting profile:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await request.json()

    if (!token || token.trim().length === 0) {
      return NextResponse.json({ error: 'Invite token is required' }, { status: 400 })
    }

    // Find invite
    const { data: invite, error: inviteError } = await supabase
      .from('household_invites')
      .select('*, household:households(*)')
      .eq('token', token.trim())
      .is('redeemed_at', null)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 })
    }

    // Check if invite has expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', invite.household_id)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      return NextResponse.json({ error: 'You are already a member of this household' }, { status: 400 })
    }

    // Add user to household
    const { error: memberError } = await supabase
      .from('household_members')
      .insert({
        household_id: invite.household_id,
        user_id: user.id,
        role: invite.role,
      })

    if (memberError) {
      console.error('Error adding household member:', memberError)
      return NextResponse.json({ error: 'Failed to join household' }, { status: 500 })
    }

    // Mark invite as redeemed
    await supabase
      .from('household_invites')
      .update({ redeemed_at: new Date().toISOString() })
      .eq('id', invite.id)

    return NextResponse.json({ household: invite.household })
  } catch (error) {
    console.error('Error in household join:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

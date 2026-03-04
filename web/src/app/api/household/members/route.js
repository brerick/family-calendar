import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's household membership
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of any household' }, { status: 404 });
  }

  try {
    // Get all household members with their role
    const { data: members, error: membersError } = await supabase
      .from('household_members')
      .select('id, user_id, role, created_at')
      .eq('household_id', membership.household_id)
      .order('created_at', { ascending: true });

    if (membersError) throw membersError;

    // Get user details from auth.users for each member
    // Note: We need to use the service role for this or rely on public user metadata
    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        // Fetch user metadata from Supabase Auth admin endpoint
        // For now, we'll just include the user_id and fetch email on client if needed
        // Or we can use a server-side admin call
        return {
          id: member.id,
          user_id: member.user_id,
          role: member.role,
          joined_at: member.created_at,
        };
      })
    );

    // Get pending invites (not redeemed)
    const { data: pendingInvites, error: invitesError } = await supabase
      .from('household_invites')
      .select('id, token, role, created_at, expires_at, created_by')
      .eq('household_id', membership.household_id)
      .is('redeemed_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (invitesError) throw invitesError;

    // Get redeemed invites (recently accepted)
    const { data: redeemedInvites, error: redeemedError } = await supabase
      .from('household_invites')
      .select('id, role, created_at, redeemed_at')
      .eq('household_id', membership.household_id)
      .not('redeemed_at', 'is', null)
      .order('redeemed_at', { ascending: false })
      .limit(10);

    if (redeemedError) throw redeemedError;

    return NextResponse.json({
      members: membersWithDetails,
      pending_invites: pendingInvites || [],
      redeemed_invites: redeemedInvites || [],
    });
  } catch (error) {
    console.error('Error fetching household members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch household members' },
      { status: 500 }
    );
  }
}

// Update member role (owner only)
export async function PATCH(request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's household membership
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'owner') {
    return NextResponse.json(
      { error: 'Only household owners can update member roles' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { member_id, new_role } = body;

    if (!member_id || !new_role) {
      return NextResponse.json(
        { error: 'member_id and new_role are required' },
        { status: 400 }
      );
    }

    if (!['owner', 'member', 'viewer'].includes(new_role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be owner, member, or viewer' },
        { status: 400 }
      );
    }

    // Update the member's role
    const { error: updateError } = await supabase
      .from('household_members')
      .update({ role: new_role, updated_at: new Date().toISOString() })
      .eq('id', member_id)
      .eq('household_id', membership.household_id);

    if (updateError) throw updateError;

    return NextResponse.json({ message: 'Member role updated successfully' });
  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { error: 'Failed to update member role' },
      { status: 500 }
    );
  }
}

// Remove member (owner only)
export async function DELETE(request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's household membership
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'owner') {
    return NextResponse.json(
      { error: 'Only household owners can remove members' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { member_id } = body;

    if (!member_id) {
      return NextResponse.json(
        { error: 'member_id is required' },
        { status: 400 }
      );
    }

    // Prevent removing the owner
    const { data: memberToRemove } = await supabase
      .from('household_members')
      .select('role')
      .eq('id', member_id)
      .single();

    if (memberToRemove?.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot remove the household owner' },
        { status: 400 }
      );
    }

    // Remove the member
    const { error: deleteError } = await supabase
      .from('household_members')
      .delete()
      .eq('id', member_id)
      .eq('household_id', membership.household_id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}

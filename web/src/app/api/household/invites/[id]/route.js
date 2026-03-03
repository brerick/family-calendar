import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// DELETE /api/household/invites/[id] - Revoke an invite
export async function DELETE(request, { params }) {
  const supabase = await createClient();
  
  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Get the invite to verify ownership
  const { data: invite } = await supabase
    .from('household_invites')
    .select('household_id')
    .eq('id', id)
    .single();

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  // Check if user is owner of the household
  const { data: membership } = await supabase
    .from('household_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('household_id', invite.household_id)
    .single();

  if (!membership || membership.role !== 'owner') {
    return NextResponse.json({ error: 'Only household owners can revoke invites' }, { status: 403 });
  }

  // Delete the invite
  const { error } = await supabase
    .from('household_invites')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting invite:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

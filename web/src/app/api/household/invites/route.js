import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

// POST /api/household/invites - Generate a new invite link
export async function POST(request) {
  const supabase = await createClient();
  
  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { role = 'member', expires_days = 7 } = body;

  // Validate role
  if (!['member', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  // Get user's household
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'No household found' }, { status: 404 });
  }

  // Check if user is owner (only owners can create invites)
  if (membership.role !== 'owner') {
    return NextResponse.json({ error: 'Only household owners can create invites' }, { status: 403 });
  }

  // Generate secure token
  const token = randomBytes(32).toString('hex');

  // Calculate expiration
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expires_days);

  // Insert invite
  const { data: invite, error } = await supabase
    .from('household_invites')
    .insert({
      household_id: membership.household_id,
      token,
      role,
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating invite:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invite }, { status: 201 });
}

// GET /api/household/invites - List all active invites
export async function GET(request) {
  const supabase = await createClient();
  
  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's household
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'No household found' }, { status: 404 });
  }

  // Only owners can view invites
  if (membership.role !== 'owner') {
    return NextResponse.json({ error: 'Only household owners can view invites' }, { status: 403 });
  }

  // Get active invites (not redeemed and not expired)
  const { data: invites, error } = await supabase
    .from('household_invites')
    .select('*')
    .eq('household_id', membership.household_id)
    .is('redeemed_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invites:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invites });
}

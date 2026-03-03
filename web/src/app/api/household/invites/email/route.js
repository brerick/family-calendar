import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

// POST /api/household/invites/email - Send invite via email
export async function POST(request) {
  const supabase = await createClient();
  
  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { email, role = 'member' } = body;

  // Validate inputs
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }

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

  // Check if user is owner
  if (membership.role !== 'owner') {
    return NextResponse.json({ error: 'Only household owners can send invites' }, { status: 403 });
  }

  // Get household details
  const { data: household } = await supabase
    .from('households')
    .select('name')
    .eq('id', membership.household_id)
    .single();

  // Generate secure token
  const token = randomBytes(32).toString('hex');

  // Calculate expiration (7 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

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

  // Generate invite URL
  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/household/setup?invite=${token}`;

  // TODO: Send email using your preferred email service
  // For now, return the invite details
  // You can integrate with Resend, SendGrid, AWS SES, etc.
  
  /*
  Example with Resend:
  
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  await resend.emails.send({
    from: 'Family Calendar <invites@yourdomain.com>',
    to: email,
    subject: `You're invited to join ${household.name}`,
    html: `
      <h1>You've been invited!</h1>
      <p>${user.email} has invited you to join <strong>${household.name}</strong> on Family Calendar.</p>
      <p>Your role will be: <strong>${role}</strong></p>
      <p><a href="${inviteUrl}">Click here to accept the invitation</a></p>
      <p>This invitation expires in 7 days.</p>
    `,
  });
  */

  return NextResponse.json({ 
    invite,
    inviteUrl,
    message: 'Invite created. Email sending not yet configured. Share the invite URL manually.',
    // TODO: Change message once email is configured
  }, { status: 201 });
}

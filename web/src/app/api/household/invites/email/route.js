import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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

  // Send email via Resend
  try {
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'HomeOrbit Calendar <invites@booblie.com>',
      to: email,
      subject: `You're invited to join ${household.name || 'a household'} on HomeOrbit`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Household Invitation</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0;">🏠 You've Been Invited!</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
              <p style="font-size: 16px; margin-bottom: 20px;">
                <strong>${user.email}</strong> has invited you to join their household <strong>${household.name || 'calendar'}</strong> on HomeOrbit.
              </p>
              
              <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #667eea;">
                <p style="margin: 0 0 10px 0; color: #6b7280;">Your role:</p>
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #667eea; text-transform: capitalize;">
                  ${role === 'member' ? '📝 Member - Can view and edit calendars' : '👁️ Viewer - Can view calendars'}
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" 
                   style="display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Accept Invitation
                </a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                This invitation expires in <strong>7 days</strong>. If you didn't expect this invitation, you can safely ignore this email.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
              
              <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                HomeOrbit - Family Calendar Aggregator<br>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}" style="color: #667eea;">www.homeorbit.app</a>
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      // Still return success with invite created, but note email failed
      return NextResponse.json({ 
        invite,
        inviteUrl,
        message: 'Invite created, but email failed to send. Share the invite URL manually.',
        emailError: emailError.message,
      }, { status: 201 });
    }

    return NextResponse.json({ 
      invite,
      inviteUrl,
      message: `Invitation email sent to ${email} successfully!`,
      emailId: emailData?.id,
    }, { status: 201 });

  } catch (error) {
    console.error('Error sending email:', error);
    // Invite was created, just email failed
    return NextResponse.json({ 
      invite,
      inviteUrl,
      message: 'Invite created, but email sending failed. Share the invite URL manually.',
      error: error.message,
    }, { status: 201 });
  }
}

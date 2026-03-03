import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('Google OAuth error:', error)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?error=google_auth_failed`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?error=missing_params`)
    }

    // Parse state
    const { user_id, household_id } = JSON.parse(state)

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Store tokens temporarily for calendar selection
    const supabase = await createClient()
    const { data: session, error: sessionError } = await supabase
      .from('google_oauth_sessions')
      .insert({
        user_id: user_id,
        household_id: household_id,
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Error storing OAuth session:', sessionError)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?error=session_storage_failed`)
    }

    // Redirect to calendar selection page
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/calendars/google/select?session=${session.id}`)
  } catch (error) {
    console.error('Error in Google OAuth callback:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?error=callback_failed`)
  }
}

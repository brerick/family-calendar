import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get OAuth session
    const { data: session, error: sessionError } = await supabase
      .from('google_oauth_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 })
    }

    // Check if session has expired
    if (new Date(session.expires_at) < new Date()) {
      // Clean up expired session
      await supabase.from('google_oauth_sessions').delete().eq('id', sessionId)
      return NextResponse.json({ error: 'Session expired. Please reconnect.' }, { status: 410 })
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    oauth2Client.setCredentials({
      refresh_token: session.refresh_token,
      access_token: session.access_token,
    })

    // Fetch calendar list
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const { data } = await calendar.calendarList.list()

    if (!data.items || data.items.length === 0) {
      return NextResponse.json({ error: 'No calendars found' }, { status: 404 })
    }

    // Return calendar list
    return NextResponse.json({
      calendars: data.items.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description,
        backgroundColor: cal.backgroundColor,
        primary: cal.primary || false,
      })),
    })
  } catch (error) {
    console.error('Error fetching Google calendars:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

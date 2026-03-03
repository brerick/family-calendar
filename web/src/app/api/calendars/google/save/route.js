import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { session_id, calendar_ids } = await request.json()

    if (!session_id || !calendar_ids || !Array.isArray(calendar_ids) || calendar_ids.length === 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
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
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 })
    }

    // Check if session has expired
    if (new Date(session.expires_at) < new Date()) {
      await supabase.from('google_oauth_sessions').delete().eq('id', session_id)
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

    // Fetch calendar list to validate IDs
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const { data } = await calendar.calendarList.list()

    if (!data.items) {
      return NextResponse.json({ error: 'Failed to fetch calendars' }, { status: 500 })
    }

    // Filter to only selected calendars
    const selectedCalendars = data.items.filter(cal => calendar_ids.includes(cal.id))

    if (selectedCalendars.length === 0) {
      return NextResponse.json({ error: 'No valid calendars selected' }, { status: 400 })
    }

    // Create calendar records
    const createdCalendars = []
    for (const cal of selectedCalendars) {
      const { data: newCalendar, error: insertError } = await supabase
        .from('calendars')
        .insert({
          household_id: session.household_id,
          name: cal.summary || 'Google Calendar',
          type: 'google',
          color: cal.backgroundColor || '#3b82f6',
          external_id: cal.id,
          refresh_token: session.refresh_token,
          sync_cursor: null,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating calendar:', insertError)
        continue
      }

      createdCalendars.push(newCalendar)

      // Register webhook watch for real-time updates
      try {
        const channelId = `${newCalendar.id}-${Date.now()}`
        const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/api/webhooks/google`
        const webhookToken = process.env.GOOGLE_WEBHOOK_TOKEN || 'your-secret-token'

        const watchResponse = await calendar.events.watch({
          calendarId: cal.id,
          requestBody: {
            id: channelId,
            type: 'web_hook',
            address: webhookUrl,
            token: webhookToken,
            expiration: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days from now
          },
        })

        // Store watch info in database
        if (watchResponse.data) {
          await supabase.from('google_calendar_watches').insert({
            calendar_id: newCalendar.id,
            channel_id: channelId,
            resource_id: watchResponse.data.resourceId,
            expiration: new Date(parseInt(watchResponse.data.expiration)),
          })
          console.log('Webhook watch registered:', channelId)
        }
      } catch (watchError) {
        console.error('Error registering webhook watch:', watchError)
        // Continue even if watch registration fails
      }

      // Trigger initial sync (don't wait for it)
      try {
        fetch(`${request.nextUrl.origin}/api/sync/google/${newCalendar.id}`, {
          method: 'POST',
        }).catch(err => console.error('Sync trigger error:', err))
      } catch (syncError) {
        console.error('Error triggering sync:', syncError)
      }
    }

    // Clean up OAuth session
    await supabase.from('google_oauth_sessions').delete().eq('id', session_id)

    return NextResponse.json({
      success: true,
      calendars_created: createdCalendars.length,
      calendars: createdCalendars,
    })
  } catch (error) {
    console.error('Error saving Google calendars:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

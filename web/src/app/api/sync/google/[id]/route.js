import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Time window: 6 months ago to 18 months ahead
const TIME_WINDOW_START = new Date()
TIME_WINDOW_START.setMonth(TIME_WINDOW_START.getMonth() - 6)
const TIME_WINDOW_END = new Date()
TIME_WINDOW_END.setMonth(TIME_WINDOW_END.getMonth() + 18)

export async function POST(request, { params }) {
  try {
    const supabase = await createClient()
    const { id: calendarId } = await params

    console.log('[Google Sync] Starting sync for calendar:', calendarId)

    // Get calendar details
    const { data: calendar, error: calendarError } = await supabase
      .from('calendars')
      .select('*')
      .eq('id', calendarId)
      .eq('type', 'google')
      .single()

    if (calendarError) {
      console.error('[Google Sync] Calendar error:', calendarError)
      return NextResponse.json({ error: 'Calendar not found', details: calendarError }, { status: 404 })
    }

    if (!calendar) {
      console.error('[Google Sync] Calendar not found:', calendarId)
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 })
    }

    if (!calendar.refresh_token) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 400 })
    }

    console.log('[Google Sync] Calendar found:', calendar.name, 'External ID:', calendar.external_id)

    // Record sync start
    const syncStartTime = new Date().toISOString()
    const { data: syncRun, error: syncRunError } = await supabase
      .from('sync_runs')
      .insert({
        calendar_id: calendarId,
        status: 'running',
        started_at: syncStartTime,
      })
      .select()
      .single()

    if (syncRunError) {
      console.error('[Google Sync] Error creating sync run:', syncRunError)
    }

    try {
      // Create OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      )

      oauth2Client.setCredentials({
        refresh_token: calendar.refresh_token,
      })

      const calendarAPI = google.calendar({ version: 'v3', auth: oauth2Client })

      // Fetch events
      const response = await calendarAPI.events.list({
        calendarId: calendar.external_id,
        timeMin: TIME_WINDOW_START.toISOString(),
        timeMax: TIME_WINDOW_END.toISOString(),
        singleEvents: true, // Expand recurring events
        orderBy: 'startTime',
        maxResults: 2500,
        syncToken: calendar.sync_cursor || undefined,
      })

      const events = response.data.items || []
      console.log(`[Google Sync] Fetched ${events.length} events from Google Calendar`)

      const parsedEvents = []
      const eventIds = new Set()

      // Process events
      for (const event of events) {
        const startDate = event.start?.dateTime || event.start?.date
        const endDate = event.end?.dateTime || event.end?.date

        if (!startDate) continue

        const normalizedEvent = {
          calendar_id: calendarId,
          external_event_id: event.id,
          instance_id: event.recurringEventId ? `${event.recurringEventId}_${startDate}` : '',
          title: event.summary || 'Untitled Event',
          description: event.description || null,
          location: event.location || null,
          start_time: event.start.dateTime ? new Date(event.start.dateTime).toISOString() : new Date(event.start.date).toISOString(),
          end_time: event.end?.dateTime ? new Date(event.end.dateTime).toISOString() : (event.end?.date ? new Date(event.end.date).toISOString() : null),
          all_day: !event.start.dateTime,
          status: event.status === 'cancelled' ? 'cancelled' : 'confirmed',
          recurrence_rule: event.recurrence ? event.recurrence.join(';') : null,
          raw_payload: event,
        }

        parsedEvents.push(normalizedEvent)
        eventIds.add(normalizedEvent.external_event_id)
      }

      console.log(`[Google Sync] Parsed ${parsedEvents.length} events within time window`)

      // Upsert events
      let eventsUpserted = 0
      let upsertErrors = 0
      for (const event of parsedEvents) {
        // Check if event exists
        const { data: existing } = await supabase
          .from('events')
          .select('id')
          .eq('calendar_id', event.calendar_id)
          .eq('external_event_id', event.external_event_id)
          .eq('instance_id', event.instance_id)
          .maybeSingle()

        let error
        if (existing) {
          // Update existing event
          const result = await supabase
            .from('events')
            .update(event)
            .eq('id', existing.id)
          error = result.error
        } else {
          // Insert new event
          const result = await supabase
            .from('events')
            .insert(event)
          error = result.error
        }

        if (error) {
          console.error('[Google Sync] Error upserting event:', error.message, 'Event:', event.title)
          upsertErrors++
        } else {
          eventsUpserted++
        }
      }

      console.log(`[Google Sync] Upserted ${eventsUpserted} events, ${upsertErrors} errors`)

      // Mark removed events as cancelled
      const { data: existingEvents } = await supabase
        .from('events')
        .select('id, external_event_id')
        .eq('calendar_id', calendarId)
        .neq('status', 'cancelled')

      if (existingEvents) {
        const removedEvents = existingEvents.filter(
          (e) => !eventIds.has(e.external_event_id)
        )

        if (removedEvents.length > 0) {
          for (const removedEvent of removedEvents) {
            await supabase
              .from('events')
              .update({ status: 'cancelled' })
              .eq('id', removedEvent.id)
          }
          console.log(`[Google Sync] Marked ${removedEvents.length} removed events as cancelled`)
        }
      }

      // Store syncToken for incremental sync next time
      if (response.data.nextSyncToken) {
        await supabase
          .from('calendars')
          .update({ sync_cursor: response.data.nextSyncToken })
          .eq('id', calendarId)
      }

      // Update sync run as completed
      await supabase
        .from('sync_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          events_synced: eventsUpserted,
        })
        .eq('id', syncRun.id)

      // Update calendar last_synced_at
      await supabase
        .from('calendars')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', calendarId)

      return NextResponse.json({
        success: true,
        events_synced: eventsUpserted,
        sync_run_id: syncRun.id,
      })
    } catch (syncError) {
      console.error('[Google Sync] Sync error:', syncError)

      // Update sync run as failed
      if (syncRun) {
        await supabase
          .from('sync_runs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: syncError.message,
          })
          .eq('id', syncRun.id)
      }

      return NextResponse.json(
        { error: 'Failed to sync calendar', details: syncError.message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Google Sync] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

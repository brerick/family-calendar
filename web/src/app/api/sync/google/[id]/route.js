import { createClient as createServerClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getTimeWindow() {
  const start = new Date()
  start.setMonth(start.getMonth() - 6)
  const end = new Date()
  end.setMonth(end.getMonth() + 18)
  return { start, end }
}

async function fetchAllGoogleEvents(calendarAPI, externalCalendarId, params) {
  const items = []
  let pageToken = undefined
  let nextSyncToken = undefined

  do {
    const response = await calendarAPI.events.list({
      calendarId: externalCalendarId,
      ...params,
      ...(pageToken ? { pageToken } : {}),
    })
    items.push(...(response.data.items || []))
    pageToken = response.data.nextPageToken
    nextSyncToken = response.data.nextSyncToken
  } while (pageToken)

  return { items, nextSyncToken }
}

export async function POST(request, { params }) {
  try {
    // Use service role client to bypass RLS (webhooks trigger this with no user auth)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
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

      let events = []
      let nextSyncToken = null
      let isFullSync = false

      if (calendar.sync_cursor) {
        // Incremental sync: syncToken CANNOT be combined with timeMin/timeMax/orderBy.
        // Google will return only events changed since the last sync.
        // If the token is expired/invalid (410 Gone), fall back to a full sync.
        try {
          console.log('[Google Sync] Attempting incremental sync with syncToken')
          const result = await fetchAllGoogleEvents(calendarAPI, calendar.external_id, {
            syncToken: calendar.sync_cursor,
            maxResults: 2500,
          })
          events = result.items
          nextSyncToken = result.nextSyncToken
          console.log(`[Google Sync] Incremental sync fetched ${events.length} changed events`)
        } catch (syncTokenError) {
          const status = syncTokenError?.response?.status || syncTokenError?.code
          const googleError = syncTokenError?.response?.data?.error
          if (status === 410) {
            // 410 = sync token expired — clear and do a full sync
            console.warn('[Google Sync] syncToken expired (410), falling back to full sync')
            await supabase.from('calendars').update({ sync_cursor: null }).eq('id', calendarId)
            isFullSync = true
          } else if (status === 401 || googleError === 'invalid_grant') {
            // Refresh token revoked or expired — tell the user to reconnect
            console.error('[Google Sync] Google auth invalid (status', status, googleError, '), need reconnect')
            await supabase.from('calendars').update({ sync_cursor: null, sync_error: 'auth_expired' }).eq('id', calendarId)
            return NextResponse.json(
              { error: 'Google authorization expired. Please reconnect your Google Calendar.', details: syncTokenError.message },
              { status: 401 }
            )
          } else {
            throw syncTokenError
          }
        }
      } else {
        isFullSync = true
      }

      if (isFullSync) {
        const { start, end } = getTimeWindow()
        console.log('[Google Sync] Performing full sync')
        try {
          const result = await fetchAllGoogleEvents(calendarAPI, calendar.external_id, {
            timeMin: start.toISOString(),
            timeMax: end.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 2500,
          })
          events = result.items
          nextSyncToken = result.nextSyncToken
          console.log(`[Google Sync] Full sync fetched ${events.length} events`)
        } catch (fullSyncError) {
          const status = fullSyncError?.response?.status || fullSyncError?.code
          const googleError = fullSyncError?.response?.data?.error
          console.error('[Google Sync] Full sync error:', status, googleError, fullSyncError.message)
          if (status === 401 || googleError === 'invalid_grant') {
            // Refresh token revoked or expired — clear cursor, tell the user to reconnect
            await supabase.from('calendars').update({ sync_cursor: null, sync_error: 'auth_expired' }).eq('id', calendarId)
            return NextResponse.json(
              { error: 'Google authorization expired. Please reconnect your Google Calendar.', details: fullSyncError.message },
              { status: 401 }
            )
          }
          throw fullSyncError
        }
      }

      // Process events
      let eventsUpserted = 0
      let upsertErrors = 0
      const seenEventIds = new Set()
      // Cache master event recurrence rules to avoid repeated API calls
      const masterRecurrenceCache = new Map()

      for (const event of events) {
        const startDate = event.start?.dateTime || event.start?.date
        const endDate = event.end?.dateTime || event.end?.date

        // For incremental sync, cancelled events arrive with status='cancelled' but
        // may lack start/end — handle them explicitly.
        if (event.status === 'cancelled') {
          await supabase
            .from('events')
            .update({ status: 'cancelled', raw_payload: event })
            .eq('calendar_id', calendarId)
            .eq('external_event_id', event.id)
          eventsUpserted++
          continue
        }

        if (!startDate) continue

        seenEventIds.add(event.id)

        // For recurring instances, fetch the master event once to get the RRULE
        let recurrenceRule = event.recurrence ? event.recurrence.join(';') : null
        if (event.recurringEventId && !recurrenceRule) {
          if (!masterRecurrenceCache.has(event.recurringEventId)) {
            try {
              const master = await calendarAPI.events.get({
                calendarId: calendar.external_id,
                eventId: event.recurringEventId,
              })
              masterRecurrenceCache.set(event.recurringEventId, master.data.recurrence ? master.data.recurrence.join(';') : null)
            } catch {
              masterRecurrenceCache.set(event.recurringEventId, null)
            }
          }
          recurrenceRule = masterRecurrenceCache.get(event.recurringEventId) || null
        }

        const normalizedEvent = {
          calendar_id: calendarId,
          external_event_id: event.id,
          recurring_event_id: event.recurringEventId || null,
          instance_id: event.recurringEventId ? `${event.recurringEventId}_${startDate}` : '',
          title: event.summary || 'Untitled Event',
          description: event.description || null,
          location: event.location || null,
          start_time: event.start.dateTime ? new Date(event.start.dateTime).toISOString() : new Date(event.start.date).toISOString(),
          end_time: event.end?.dateTime ? new Date(event.end.dateTime).toISOString() : (event.end?.date ? new Date(event.end.date).toISOString() : null),
          all_day: !event.start.dateTime,
          status: 'confirmed',
          recurrence_rule: recurrenceRule,
          raw_payload: event,
        }

        const { data: existing } = await supabase
          .from('events')
          .select('id')
          .eq('calendar_id', calendarId)
          .eq('external_event_id', event.id)
          .eq('instance_id', normalizedEvent.instance_id)
          .maybeSingle()

        let error
        if (existing) {
          const result = await supabase.from('events').update(normalizedEvent).eq('id', existing.id)
          error = result.error
        } else {
          const result = await supabase.from('events').insert(normalizedEvent)
          error = result.error
        }

        if (error) {
          console.error('[Google Sync] Error upserting event:', error.message, 'Event:', normalizedEvent.title)
          upsertErrors++
        } else {
          eventsUpserted++
        }
      }

      console.log(`[Google Sync] Upserted ${eventsUpserted} events, ${upsertErrors} errors`)

      // For full syncs only: mark events no longer in Google as cancelled.
      // Skipped for incremental sync — Google already sends cancelled status for removed events.
      if (isFullSync && seenEventIds.size > 0) {
        const { data: existingEvents } = await supabase
          .from('events')
          .select('id, external_event_id')
          .eq('calendar_id', calendarId)
          .neq('status', 'cancelled')

        if (existingEvents) {
          const removedEvents = existingEvents.filter((e) => !seenEventIds.has(e.external_event_id))
          if (removedEvents.length > 0) {
            for (const removedEvent of removedEvents) {
              await supabase.from('events').update({ status: 'cancelled' }).eq('id', removedEvent.id)
            }
            console.log(`[Google Sync] Marked ${removedEvents.length} removed events as cancelled`)
          }
        }
      }

      // Persist the new syncToken for the next incremental sync
      if (nextSyncToken) {
        await supabase
          .from('calendars')
          .update({ sync_cursor: nextSyncToken, last_synced_at: new Date().toISOString(), sync_error: null })
          .eq('id', calendarId)
      } else {
        await supabase
          .from('calendars')
          .update({ last_synced_at: new Date().toISOString(), sync_error: null })
          .eq('id', calendarId)
      }

      if (syncRun) {
        await supabase
          .from('sync_runs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            events_synced: eventsUpserted,
          })
          .eq('id', syncRun.id)
      }

      return NextResponse.json({
        success: true,
        events_synced: eventsUpserted,
        sync_type: isFullSync ? 'full' : 'incremental',
        sync_run_id: syncRun?.id,
      })
    } catch (syncError) {
      console.error('[Google Sync] Sync error:', syncError)

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

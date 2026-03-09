import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import ICAL from 'ical.js'

// Force Node.js runtime
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Helper function to normalize webcal:// URLs to https://
function normalizeCalendarUrl(url) {
  if (!url) return url
  const trimmed = url.trim()
  // Convert webcal:// to https:// and webcals:// to https://
  if (trimmed.startsWith('webcal://')) {
    return trimmed.replace('webcal://', 'https://')
  }
  if (trimmed.startsWith('webcals://')) {
    return trimmed.replace('webcals://', 'https://')
  }
  return trimmed
}

// Time window: 6 months ago to 18 months ahead
const TIME_WINDOW_START = new Date()
TIME_WINDOW_START.setMonth(TIME_WINDOW_START.getMonth() - 6)
const TIME_WINDOW_END = new Date()
TIME_WINDOW_END.setMonth(TIME_WINDOW_END.getMonth() + 18)

function isWithinTimeWindow(start, end) {
  const startDate = new Date(start)
  const endDate = new Date(end || start)
  return (
    (startDate >= TIME_WINDOW_START && startDate <= TIME_WINDOW_END) ||
    (endDate >= TIME_WINDOW_START && endDate <= TIME_WINDOW_END) ||
    (startDate <= TIME_WINDOW_START && endDate >= TIME_WINDOW_END)
  )
}

export async function POST(request, { params }) {
  try {
    const supabase = await createClient()
    const { id: calendarId } = await params

    console.log('[iCal Sync] Starting sync for calendar:', calendarId)

    // Get calendar details
    const { data: calendar, error: calendarError } = await supabase
      .from('calendars')
      .select('*')
      .eq('id', calendarId)
      .eq('type', 'ical')
      .single()

    if (calendarError) {
      console.error('[iCal Sync] Calendar error:', calendarError)
      return NextResponse.json({ error: 'Calendar not found', details: calendarError }, { status: 404 })
    }

    if (!calendar) {
      console.error('[iCal Sync] Calendar not found:', calendarId)
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 })
    }

    console.log('[iCal Sync] Calendar found:', calendar.name, 'URL:', calendar.ics_url)

    if (!calendar.ics_url) {
      return NextResponse.json({ error: 'No ICS URL configured' }, { status: 400 })
    }

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
      console.error('Error creating sync run:', syncRunError)
    }

    try {
      // Normalize URL (convert webcal:// to https://)
      const normalizedUrl = normalizeCalendarUrl(calendar.ics_url)
      
      // Fetch and parse ICS feed
      console.log(`[iCal Sync] Fetching ICS feed from: ${normalizedUrl}`)
      const response = await fetch(normalizedUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch ICS feed: ${response.statusText}`)
      }
      
      const icsData = await response.text()
      console.log(`[iCal Sync] Fetched ${icsData.length} bytes of ICS data`)
      
      // Parse ICS data
      const jcalData = ICAL.parse(icsData)
      const comp = new ICAL.Component(jcalData)
      const vevents = comp.getAllSubcomponents('vevent')
      
      console.log(`[iCal Sync] Found ${vevents.length} events in feed`)
      
      const parsedEvents = []
      const eventIds = new Set()

      // Process events
      for (const vevent of vevents) {
        const event = new ICAL.Event(vevent)
        
        const startDate = event.startDate?.toJSDate()
        const endDate = event.endDate?.toJSDate()
        
        if (!startDate || !isWithinTimeWindow(startDate, endDate)) continue

        const normalizedEvent = {
          calendar_id: calendarId,
          external_event_id: event.uid,
          instance_id: '', // Default to empty string for unique constraint
          title: event.summary || 'Untitled Event',
          description: event.description || null,
          location: event.location || null,
          start_time: startDate.toISOString(),
          end_time: endDate ? endDate.toISOString() : startDate.toISOString(),
          all_day: !event.startDate.isDate ? false : true,
          status: event.status === 'CANCELLED' ? 'cancelled' : 'confirmed',
          recurrence_rule: event.isRecurring() ? vevent.getFirstPropertyValue('rrule')?.toString() : null,
          raw_payload: vevent.toJSON(),
        }

        // Handle recurring event instances
        if (event.recurrenceId) {
          const recurrenceDate = event.recurrenceId.toJSDate()
          normalizedEvent.instance_id = `${event.uid}_${recurrenceDate.toISOString()}`
        }

        parsedEvents.push(normalizedEvent)
        eventIds.add(normalizedEvent.external_event_id)
      }

      console.log(`[iCal Sync] Parsed ${parsedEvents.length} events from ICS feed (within time window)`)

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
          console.error('[iCal Sync] Error upserting event:', error.message, 'Event:', event.title)
          upsertErrors++
        } else {
          eventsUpserted++
        }
      }

      console.log(`[iCal Sync] Upserted ${eventsUpserted} events, ${upsertErrors} errors`)

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
          console.log(`Marked ${removedEvents.length} removed events as cancelled`)
        }
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
      console.error('Sync error:', syncError)

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
    console.error('Error in iCal sync:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

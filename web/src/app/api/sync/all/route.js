import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Force Node.js runtime
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const supabase = await createClient()

    // First, renew any expiring Google Calendar watches (don't wait for it)
    fetch(`${request.nextUrl.origin}/api/webhooks/google/renew`, { method: 'POST' })
      .catch(err => console.error('Watch renewal error:', err))

    // Get all external calendars that need syncing (iCal and Google)
    const { data: calendars, error } = await supabase
      .from('calendars')
      .select('id, name, type, ics_url, refresh_token')
      .in('type', ['ical', 'google'])

    if (error) {
      console.error('Error fetching calendars:', error)
      return NextResponse.json({ error: 'Failed to fetch calendars' }, { status: 500 })
    }

    if (!calendars || calendars.length === 0) {
      return NextResponse.json({ message: 'No calendars to sync', synced: 0 })
    }

    console.log(`Starting sync for ${calendars.length} calendars`)

    // Sync each calendar
    const results = []
    for (const calendar of calendars) {
      try {
        const syncUrl = calendar.type === 'ical'
          ? `${request.nextUrl.origin}/api/sync/ical/${calendar.id}`
          : `${request.nextUrl.origin}/api/sync/google/${calendar.id}`
        
        const response = await fetch(syncUrl, { method: 'POST' })
        const data = await response.json()
        
        results.push({
          calendar_id: calendar.id,
          calendar_name: calendar.name,
          calendar_type: calendar.type,
          success: response.ok,
          events_synced: data.events_synced || 0,
          error: data.error || null,
        })
      } catch (syncError) {
        console.error(`Error syncing calendar ${calendar.id}:`, syncError)
        results.push({
          calendar_id: calendar.id,
          calendar_name: calendar.name,
          calendar_type: calendar.type,
          success: false,
          error: syncError.message,
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    console.log(`Sync completed: ${successCount}/${calendars.length} successful`)

    return NextResponse.json({
      message: `Synced ${successCount}/${calendars.length} calendars`,
      results,
    })
  } catch (error) {
    console.error('Error in sync-all:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

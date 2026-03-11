import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'

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

export async function PATCH(request, { params }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { name, ics_url } = await request.json()

    // Verify calendar belongs to user's household
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'No household found' }, { status: 404 })
    }

    // Check if calendar exists and belongs to household
    const { data: calendar } = await supabase
      .from('calendars')
      .select('household_id, type')
      .eq('id', id)
      .single()

    if (!calendar || calendar.household_id !== membership.household_id) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 })
    }

    // Build update object
    const updates = {}
    if (name !== undefined && name.trim().length > 0) {
      updates.name = name.trim()
    }
    if (ics_url !== undefined && calendar.type === 'ical') {
      updates.ics_url = normalizeCalendarUrl(ics_url)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Update calendar
    const { data: updatedCalendar, error } = await supabase
      .from('calendars')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating calendar:', error)
      return NextResponse.json({ error: 'Failed to update calendar' }, { status: 500 })
    }

    return NextResponse.json({ calendar: updatedCalendar })
  } catch (error) {
    console.error('Error in calendar PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify calendar belongs to user's household
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'No household found' }, { status: 404 })
    }

    // Check if calendar exists and belongs to household
    const { data: calendar } = await supabase
      .from('calendars')
      .select('household_id, type, external_id, refresh_token')
      .eq('id', id)
      .single()

    if (!calendar || calendar.household_id !== membership.household_id) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 })
    }

    // For Google calendars: stop the webhook watch channel so Google stops sending
    // notifications for this calendar. Failures here are non-fatal.
    if (calendar.type === 'google' && calendar.refresh_token) {
      try {
        const serviceSupabase = createServiceClient()
        const { data: watch } = await serviceSupabase
          .from('google_calendar_watches')
          .select('channel_id, resource_id')
          .eq('calendar_id', id)
          .maybeSingle()

        if (watch) {
          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
          )
          oauth2Client.setCredentials({ refresh_token: calendar.refresh_token })
          const calendarAPI = google.calendar({ version: 'v3', auth: oauth2Client })
          await calendarAPI.channels.stop({
            requestBody: { id: watch.channel_id, resourceId: watch.resource_id },
          })
          console.log('[Calendar Delete] Stopped webhook watch channel:', watch.channel_id)
        }
      } catch (watchErr) {
        // Non-fatal: log and continue with deletion
        console.warn('[Calendar Delete] Failed to stop watch (non-fatal):', watchErr.message)
      }
    }

    // Delete calendar (cascade deletes events, sync_runs, google_calendar_watches)
    const { error } = await supabase
      .from('calendars')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting calendar:', error)
      return NextResponse.json({ error: 'Failed to delete calendar' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in calendar DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

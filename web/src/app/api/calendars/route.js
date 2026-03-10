import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('Auth error in GET /api/calendars:', authError)
      return NextResponse.json({ 
        error: 'Authentication failed', 
        details: authError.message 
      }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's household
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'No household found' }, { status: 404 })
    }

    // Get calendars for the household
    const { data: calendars, error } = await supabase
      .from('calendars')
      .select('*')
      .eq('household_id', membership.household_id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching calendars:', error)
      return NextResponse.json({ error: 'Failed to fetch calendars' }, { status: 500 })
    }

    return NextResponse.json({ calendars })
  } catch (error) {
    console.error('Error in calendars GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, color, type = 'manual', ics_url } = await request.json()

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Calendar name is required' }, { status: 400 })
    }

    if (type === 'ical' && (!ics_url || ics_url.trim().length === 0)) {
      return NextResponse.json({ error: 'ICS URL is required for iCal calendars' }, { status: 400 })
    }

    // Get user's household
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'No household found' }, { status: 404 })
    }

    // Create calendar
    const calendarData = {
      household_id: membership.household_id,
      name: name.trim(),
      color: color || '#3b82f6',
      type: type,
    }

    if (type === 'ical') {
      calendarData.ics_url = normalizeCalendarUrl(ics_url)
    }

    const { data: calendar, error } = await supabase
      .from('calendars')
      .insert(calendarData)
      .select()
      .single()

    if (error) {
      console.error('Error creating calendar:', error)
      return NextResponse.json({ error: 'Failed to create calendar' }, { status: 500 })
    }

    // If it's an iCal calendar, trigger initial sync
    if (type === 'ical') {
      try {
        await fetch(`${request.nextUrl.origin}/api/sync/ical/${calendar.id}`, {
          method: 'POST',
        })
      } catch (syncError) {
        console.error('Error triggering initial sync:', syncError)
        // Don't fail the calendar creation if sync fails
      }
    }

    return NextResponse.json({ calendar })
  } catch (error) {
    console.error('Error in calendars POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
      .select('household_id')
      .eq('id', id)
      .single()

    if (!calendar || calendar.household_id !== membership.household_id) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 })
    }

    // Delete calendar (cascade will delete events)
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

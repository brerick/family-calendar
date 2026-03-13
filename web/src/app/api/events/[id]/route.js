import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getGoogleCalendarAPI, buildGoogleEventBody } from '@/lib/google';

// GET /api/events/[id] - Fetch a single event
export async function GET(request, { params }) {
  const supabase = await createClient();
  
  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Fetch event with calendar info
  const { data: event, error } = await supabase
    .from('events')
    .select('*, calendar:calendars(*)')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  return NextResponse.json(event);
}

// PUT /api/events/[id] - Update an event
export async function PUT(request, { params }) {
  const supabase = await createClient();
  
  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { title, description, start_time, end_time, all_day, location, recurrence_rule, attendee_profile_ids } = body;

  // Update event
  const { data: event, error } = await supabase
    .from('events')
    .update({
      title,
      description,
      start_time,
      end_time,
      all_day,
      location,
      recurrence_rule: recurrence_rule ?? null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sync attendees if provided (replace all)
  if (attendee_profile_ids !== undefined) {
    await supabase.from('event_attendees').delete().eq('event_id', id)

    if (attendee_profile_ids.length > 0) {
      const { data: profiles } = await supabase
        .from('household_profiles')
        .select('id, user_id')
        .in('id', attendee_profile_ids)

      if (profiles?.length > 0) {
        await supabase.from('event_attendees').insert(
          profiles.map(p => ({
            event_id: id,
            profile_id: p.id,
            user_id: p.user_id || null,
            status: 'accepted',
          }))
        )
      }
    }
  }

  // Push update to Google Calendar if this event is linked to one
  let googleSyncWarning = null;
  if (event.external_event_id) {
    const { data: calendar } = await supabase
      .from('calendars')
      .select('type, external_id, refresh_token')
      .eq('id', event.calendar_id)
      .single();
    if (calendar?.type === 'google' && calendar.refresh_token) {
      try {
        const calAPI = getGoogleCalendarAPI(calendar.refresh_token);
        await calAPI.events.patch({
          calendarId: calendar.external_id,
          eventId: event.external_event_id,
          requestBody: buildGoogleEventBody(event),
        });
      } catch (googleErr) {
        const status = googleErr?.response?.status;
        console.error('[Google Push] Failed to update event in Google:', googleErr.message);
        if (status === 401 || status === 403) {
          googleSyncWarning = 'reconnect'; // OAuth token lacks write permission
        } else {
          googleSyncWarning = 'error';
        }
      }
    }
  }

  return NextResponse.json({ event, googleSyncWarning });
}

// PATCH /api/events/[id] - Update an event (alias for PUT)
export async function PATCH(request, { params }) {
  return PUT(request, { params });
}

// DELETE /api/events/[id] - Delete an event
export async function DELETE(request, { params }) {
  const supabase = await createClient();
  
  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Fetch event before deleting so we can remove it from Google too
  const { data: eventToDelete } = await supabase
    .from('events')
    .select('external_event_id, calendar_id, calendar:calendars(type, external_id, refresh_token)')
    .eq('id', id)
    .single();

  // Delete event from Supabase
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Remove from Google Calendar if linked
  if (eventToDelete?.external_event_id && eventToDelete.calendar?.type === 'google' && eventToDelete.calendar.refresh_token) {
    try {
      const calAPI = getGoogleCalendarAPI(eventToDelete.calendar.refresh_token);
      await calAPI.events.delete({
        calendarId: eventToDelete.calendar.external_id,
        eventId: eventToDelete.external_event_id,
      });
    } catch (googleErr) {
      // 410 Gone means it was already deleted in Google — that's fine
      if (googleErr?.response?.status !== 410) {
        console.error('[Google Push] Failed to delete event from Google:', googleErr.message);
      }
    }
  }

  return NextResponse.json({ success: true });
}

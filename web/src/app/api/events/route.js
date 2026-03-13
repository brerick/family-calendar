import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getGoogleCalendarAPI, buildGoogleEventBody } from '@/lib/google';

// GET /api/events - Get all events for user's household
export async function GET(request) {
  const supabase = await createClient();
  
  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's household_id
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: 'No household found' }, { status: 404 });
  }

  // Get all events from all calendars in the household
  const { data: events, error } = await supabase
    .from('events')
    .select(`
      *,
      calendar:calendars(id, name, color, type)
    `)
    .eq('calendars.household_id', membership.household_id)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events });
}

// POST /api/events - Create a new event
export async function POST(request) {
  const supabase = await createClient();
  
  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { calendar_id, title, description, start_time, end_time, all_day, location, recurrence_rule, attendee_profile_ids } = body;

  // Validate required fields
  if (!calendar_id || !title || !start_time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Fetch calendar to know if this is a Google calendar
  const { data: calendar } = await supabase
    .from('calendars')
    .select('type, external_id, refresh_token')
    .eq('id', calendar_id)
    .single();

  // Insert event
  const { data: event, error } = await supabase
    .from('events')
    .insert({
      calendar_id,
      title,
      description: description || null,
      start_time,
      end_time: end_time || start_time,
      all_day: all_day || false,
      location: location || null,
      recurrence_rule: recurrence_rule || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Push to Google Calendar if this is a Google-connected calendar
  if (calendar?.type === 'google' && calendar.refresh_token) {
    try {
      const calAPI = getGoogleCalendarAPI(calendar.refresh_token);
      const { data: googleEvent } = await calAPI.events.insert({
        calendarId: calendar.external_id,
        requestBody: buildGoogleEventBody(event),
      });
      // Store the Google event ID so future edits/deletes can target it
      await supabase
        .from('events')
        .update({ external_event_id: googleEvent.id })
        .eq('id', event.id);
      event.external_event_id = googleEvent.id;
    } catch (googleErr) {
      console.error('[Google Push] Failed to create event in Google:', googleErr.message);
    }
  }

  // Save attendees if provided
  if (attendee_profile_ids?.length > 0) {
    const { data: profiles } = await supabase
      .from('household_profiles')
      .select('id, user_id')
      .in('id', attendee_profile_ids)

    if (profiles?.length > 0) {
      await supabase.from('event_attendees').insert(
        profiles.map(p => ({
          event_id: event.id,
          profile_id: p.id,
          user_id: p.user_id || null,
          status: 'accepted',
        }))
      )
    }
  }

  return NextResponse.json({ event }, { status: 201 });
}

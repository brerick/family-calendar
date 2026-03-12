import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

  return NextResponse.json({ event });
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

  // Delete event
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

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
  const { title, description, start_time, end_time, all_day, location } = body;

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
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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

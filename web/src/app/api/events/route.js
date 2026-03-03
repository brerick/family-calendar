import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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
  const { calendar_id, title, description, start_time, end_time, all_day, location } = body;

  // Validate required fields
  if (!calendar_id || !title || !start_time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

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
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event }, { status: 201 });
}

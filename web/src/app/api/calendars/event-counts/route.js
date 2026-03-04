import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/calendars/event-counts - Get event counts for all calendars
export async function GET() {
  const supabase = await createClient();
  
  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's household
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'No household found' }, { status: 404 });
  }

  try {
    // Get all calendars for the household
    const { data: calendars } = await supabase
      .from('calendars')
      .select('id')
      .eq('household_id', membership.household_id);

    if (!calendars || calendars.length === 0) {
      return NextResponse.json({});
    }

    const calendarIds = calendars.map(c => c.id);

    // Get event counts for each calendar (only future events)
    const { data: events, error } = await supabase
      .from('events')
      .select('calendar_id')
      .in('calendar_id', calendarIds)
      .gte('end_time', new Date().toISOString());

    if (error) {
      console.error('Error fetching event counts:', error);
      return NextResponse.json({});
    }

    // Count events per calendar
    const counts = {};
    calendarIds.forEach(id => {
      counts[id] = 0;
    });

    events.forEach(event => {
      if (counts[event.calendar_id] !== undefined) {
        counts[event.calendar_id]++;
      }
    });

    return NextResponse.json(counts);
  } catch (error) {
    console.error('Error in event-counts API:', error);
    return NextResponse.json({}, { status: 500 });
  }
}

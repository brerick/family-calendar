import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/availability?start=YYYY-MM-DD&end=YYYY-MM-DD&date=YYYY-MM-DD&time=HH:MM
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's household
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No household found' }, { status: 404 })
    }

    const householdId = membership.household_id

    // Get all household profiles (includes both auth users and non-auth members like kids)
    const { data: profiles, error: profilesError } = await supabase
      .from('household_profiles')
      .select('*')
      .eq('household_id', householdId)
      .order('is_auth_user', { ascending: false })
      .order('name')

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
    }

    // Get timezone for auth users
    const memberDetails = await Promise.all(
      profiles.map(async (profile) => {
        let timezone = 'America/Los_Angeles'
        
        if (profile.is_auth_user && profile.user_id) {
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('timezone')
            .eq('id', profile.user_id)
            .maybeSingle()
          
          timezone = userProfile?.timezone || 'America/Los_Angeles'
        }
        
        return {
          profile_id: profile.id,
          user_id: profile.user_id,
          name: profile.name,
          is_auth_user: profile.is_auth_user,
          timezone,
        }
      })
    )

    // Mode 1: Weekly availability grid (default)
    const mode = searchParams.get('mode') || 'week'
    
    if (mode === 'week') {
      const startDate = searchParams.get('start') || new Date().toISOString().split('T')[0]
      const endDate = searchParams.get('end') || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      // Get all events in the date range for this household
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          start_time,
          end_time,
          all_day,
          calendar_id,
          calendars(household_id)
        `)
        .eq('calendars.household_id', householdId)
        .gte('start_time', startDate + 'T00:00:00Z')
        .lte('start_time', endDate + 'T23:59:59Z')
        .order('start_time')

      if (eventsError) {
        console.error('Error fetching events:', eventsError)
        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
      }

      // Get attendees for all these events
      const eventIds = events.map(e => e.id)
      const { data: attendees } = await supabase
        .from('event_attendees')
        .select('event_id, user_id, profile_id, status')
        .in('event_id', eventIds)

      // Build availability grid
      const availability = memberDetails.map(member => {
        const memberEvents = events.filter(event => {
          const eventAttendees = attendees?.filter(a => a.event_id === event.id) || []
          return eventAttendees.some(a => 
            (a.profile_id === member.profile_id || a.user_id === member.user_id) && 
            a.status === 'accepted'
          )
        })

        return {
          profile_id: member.profile_id,
          user_id: member.user_id,
          name: member.name,
          is_auth_user: member.is_auth_user,
          timezone: member.timezone,
          events: memberEvents.map(e => ({
            id: e.id,
            title: e.title,
            start_time: e.start_time,
            end_time: e.end_time,
            all_day: e.all_day
          }))
        }
      })

      return NextResponse.json({
        household_id: householdId,
        start_date: startDate,
        end_date: endDate,
        members: availability
      })
    }

    // Mode 2: Specific date/time slot check
    if (mode === 'slot') {
      const date = searchParams.get('date')
      const time = searchParams.get('time')
      const duration = parseInt(searchParams.get('duration') || '60') // minutes

      if (!date || !time) {
        return NextResponse.json({ error: 'Date and time required for slot mode' }, { status: 400 })
      }

      const startTime = new Date(`${date}T${time}:00Z`)
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000)

      // Check who's busy during this slot
      const { data: busyMembers, error: busyError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          start_time,
          end_time,
          event_attendees(user_id, profile_id, status)
        `)
        .eq('calendars.household_id', householdId)
        .lt('start_time', endTime.toISOString())
        .gt('end_time', startTime.toISOString())

      if (busyError) {
        console.error('Error checking availability:', busyError)
        return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 })
      }

      const availability = memberDetails.map(member => {
        const conflicts = busyMembers?.filter(event => {
          return event.event_attendees?.some(a => 
            (a.profile_id === member.profile_id || a.user_id === member.user_id) && 
            a.status === 'accepted'
          )
        }) || []

        return {
          profile_id: member.profile_id,
          user_id: member.user_id,
          name: member.name,
          is_auth_user: member.is_auth_user,
          available: conflicts.length === 0,
          conflicts: conflicts.map(c => ({
            id: c.id,
            title: c.title,
            start_time: c.start_time,
            end_time: c.end_time
          }))
        }
      })

      return NextResponse.json({
        household_id: householdId,
        slot: {
          start: startTime.toISOString(),
          end: endTime.toISOString()
        },
        members: availability
      })
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
    
  } catch (error) {
    console.error('Error in availability endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

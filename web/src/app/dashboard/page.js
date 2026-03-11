import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import DashboardLayout from '@/components/DashboardLayout'

export const dynamic = 'force-dynamic'

const SYNC_STALE_MINS = 60 // Re-sync external calendars at most once per hour

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Check if user belongs to a household
  const { data: membership, error: memberError } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership || memberError) {
    console.log('No membership found or error:', memberError)
    redirect('/household/setup')
  }

  // Fetch household details separately
  const { data: household } = await supabase
    .from('households')
    .select('*')
    .eq('id', membership.household_id)
    .single()

  // Fetch calendars
  const { data: calendars } = await supabase
    .from('calendars')
    .select('*')
    .eq('household_id', membership.household_id)
    .order('created_at', { ascending: true })

  // Background-sync any stale external calendars (replaces cron).
  // Fire-and-forget: we do NOT await so the page renders immediately.
  const hasExternalCalendars = calendars?.some(c => c.type === 'ical' || c.type === 'google')
  if (hasExternalCalendars) {
    const reqHeaders = await headers()
    const host = reqHeaders.get('host')
    const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const syncUrl = `${proto}://${host}/api/sync/all?stale_mins=${SYNC_STALE_MINS}`
    fetch(syncUrl, { method: 'POST' }).catch(err =>
      console.error('[Dashboard] Background sync trigger failed:', err)
    )
  }

  // Get visible calendar IDs
  const visibleCalendarIds = calendars?.filter(c => c.visible !== false).map(c => c.id) || []

  // Fetch events only from visible calendars
  const { data: events } = await supabase
    .from('events')
    .select(`
      *,
      calendar:calendars(id, name, color, type)
    `)
    .in('calendar_id', visibleCalendarIds.length > 0 ? visibleCalendarIds : ['00000000-0000-0000-0000-000000000000']) // Use impossible ID if no visible calendars
    .order('start_time', { ascending: true })

  return (
    <DashboardLayout 
      household={household}
      user={user}
      calendars={calendars || []}
      events={events || []}
      membershipRole={membership.role}
    />
  )
}

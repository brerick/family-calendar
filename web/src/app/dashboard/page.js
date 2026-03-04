import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/DashboardLayout'

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

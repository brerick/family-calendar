import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import CalendarList from '@/components/CalendarList'

export const dynamic = 'force-dynamic'

export default async function CalendarsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) redirect('/household/setup')

  const { data: calendars } = await supabase
    .from('calendars')
    .select('*')
    .eq('household_id', membership.household_id)
    .order('created_at', { ascending: true })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendars</h1>
            <p className="text-sm text-gray-600 mt-1">Manage your calendar connections</p>
          </div>
          <Link
            href="/calendars/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Calendar
          </Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CalendarList calendars={calendars || []} />
      </main>
    </div>
  )
}

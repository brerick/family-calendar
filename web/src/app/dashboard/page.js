import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import CalendarList from '@/components/CalendarList'

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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              {household?.name || 'Family Calendar'}
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar with calendars */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Calendars</h2>
                <Link
                  href="/calendars/new"
                  className="text-blue-600 hover:text-blue-700 text-2xl leading-none"
                  title="Add Calendar"
                >
                  +
                </Link>
              </div>
              
              <CalendarList calendars={calendars || []} />

              {membership.role === 'owner' && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <Link
                    href="/household/settings"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Household Settings →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Main calendar view */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">Calendar View</h2>
              {calendars && calendars.length > 0 ? (
                <p className="text-gray-600">Calendar UI coming soon...</p>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No calendars yet</p>
                  <Link
                    href="/calendars/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Create Your First Calendar
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

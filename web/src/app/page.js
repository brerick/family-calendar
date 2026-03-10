import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Home as HomeIcon, Calendar, Users, RefreshCw } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is logged in, check if they have a household
  let hasHousehold = false
  if (user) {
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle()
    
    hasHousehold = !!membership
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <HomeIcon className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                HomeOrbit
              </h1>
            </div>
            <div className="flex gap-3">
              {user ? (
                <>
                  {hasHousehold && (
                    <Link
                      href="/dashboard"
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                    >
                      Go to Dashboard
                    </Link>
                  )}
                  {!hasHousehold && (
                    <Link
                      href="/household/setup"
                      className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Setup Household
                    </Link>
                  )}
                  <Link
                    href="/auth/signout"
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    Sign Out
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Your Family's Schedule,
            <br />
            <span className="text-blue-600">All in One Place</span>
          </h2>
          <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Unify your family's schedule from Google Calendar, Apple Calendar, iCal feeds, and manual entries into one beautiful view.
          </p>
          
          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
              >
                Get Started Free
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-blue-600 text-lg font-medium rounded-lg text-blue-600 bg-white hover:bg-blue-50 transition"
              >
                Sign In
              </Link>
            </div>
          )}

          {user && !hasHousehold && (
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
              <p className="text-gray-700 mb-4">
                Welcome back, {user.email}! Let's set up your household.
              </p>
              <Link
                href="/household/setup"
                className="inline-flex items-center justify-center w-full px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition"
              >
                Create or Join Household
              </Link>
            </div>
          )}

          {user && hasHousehold && (
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
              <p className="text-gray-700 mb-4">
                Welcome back! Ready to view your calendar?
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center w-full px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition"
              >
                Go to Dashboard
              </Link>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="flex justify-center mb-4">
              <Calendar className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Multiple Sources</h3>
            <p className="text-gray-600">
              Connect Google Calendar, Apple Calendar, and iCal feeds all in one place
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="flex justify-center mb-4">
              <Users className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Family Sharing</h3>
            <p className="text-gray-600">
              Invite family members and manage everyone's schedules together
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="flex justify-center mb-4">
              <RefreshCw className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Auto Sync</h3>
            <p className="text-gray-600">
              Events automatically sync from your connected calendars
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

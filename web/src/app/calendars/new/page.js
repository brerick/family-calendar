'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const PRESET_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Yellow', value: '#eab308' },
]

export default function NewCalendarPage() {
  const [type, setType] = useState('manual') // 'manual', 'ical', or 'google'
  const [name, setName] = useState('')
  const [icsUrl, setIcsUrl] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleGoogleConnect = () => {
    // Redirect to Google OAuth
    window.location.href = '/api/auth/google'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const payload = { name, color, type }
      if (type === 'ical') {
        payload.ics_url = icsUrl
      }

      const response = await fetch('/api/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create calendar')
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6">Create New Calendar</h1>

          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-6">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calendar Type
              </label>
              <div className="flex rounded-md shadow-sm" role="group">
                <button
                  type="button"
                  onClick={() => setType('manual')}
                  className={`flex-1 px-4 py-2 text-sm font-medium border ${
                    type === 'manual'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  } rounded-l-lg`}
                >
                  Manual
                </button>
                <button
                  type="button"
                  onClick={() => setType('ical')}
                  className={`flex-1 px-4 py-2 text-sm font-medium border-t border-b ${
                    type === 'ical'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  iCal Feed
                </button>
                <button
                  type="button"
                  onClick={() => setType('google')}
                  className={`flex-1 px-4 py-2 text-sm font-medium border ${
                    type === 'google'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  } rounded-r-lg`}
                >
                  Google
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {type === 'manual' && 'Create a calendar and add events manually'}
                {type === 'ical' && 'Subscribe to an external calendar feed (.ics URL)'}
                {type === 'google' && 'Connect your Google Calendar via OAuth'}
              </p>
            </div>

            {type === 'google' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <svg className="w-12 h-12 mx-auto mb-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Connect Google Calendar
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Securely connect your Google Calendar to sync events automatically. 
                  You'll be redirected to Google to authorize access.
                </p>
                <button
                  type="button"
                  onClick={handleGoogleConnect}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Connect Google Calendar
                </button>
                <p className="text-xs text-gray-500 mt-4">
                  Read-only access • Your data stays secure • Revoke anytime
                </p>
              </div>
            )}

            {type === 'ical' && (
              <div>
                <label htmlFor="ics-url" className="block text-sm font-medium text-gray-700 mb-2">
                  iCal Feed URL
                </label>
                <input
                  id="ics-url"
                  type="url"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/calendar.ics"
                  value={icsUrl}
                  onChange={(e) => setIcsUrl(e.target.value)}
                />
                <p className="mt-2 text-sm text-gray-500">
                  Enter the URL of a public calendar feed (must end in .ics or support iCal format)
                </p>
              </div>
            )}

            {type !== 'google' && (
              <>
                <div>
                  <label htmlFor="calendar-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Calendar Name
                  </label>
                  <input
                    id="calendar-name"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Family Events, Kids Activities"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Calendar Color
                  </label>
              <div className="grid grid-cols-4 gap-3">
                {PRESET_COLORS.map((presetColor) => (
                  <button
                    key={presetColor.value}
                    type="button"
                    onClick={() => setColor(presetColor.value)}
                    className={`flex items-center gap-2 p-3 rounded-md border-2 transition ${
                      color === presetColor.value
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: presetColor.value }}
                    />
                    <span className="text-sm text-gray-700">{presetColor.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {type !== 'google' && (
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Calendar'}
                </button>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </Link>
              </div>
            )}
              </>
            )}
          </form>
        </div>
      </main>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function GoogleCalendarSelectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session')

  const [calendars, setCalendars] = useState([])
  const [selectedCalendars, setSelectedCalendars] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided')
      setLoading(false)
      return
    }

    // Fetch available calendars
    const fetchCalendars = async () => {
      try {
        const response = await fetch(`/api/calendars/google/list?session=${sessionId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch calendars')
        }

        setCalendars(data.calendars || [])
        
        // Auto-select primary calendar
        const primaryCal = data.calendars.find(cal => cal.primary)
        if (primaryCal) {
          setSelectedCalendars(new Set([primaryCal.id]))
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchCalendars()
  }, [sessionId])

  const handleToggleCalendar = (calendarId) => {
    const newSelected = new Set(selectedCalendars)
    if (newSelected.has(calendarId)) {
      newSelected.delete(calendarId)
    } else {
      newSelected.add(calendarId)
    }
    setSelectedCalendars(newSelected)
  }

  const handleSave = async () => {
    if (selectedCalendars.size === 0) {
      alert('Please select at least one calendar')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/calendars/google/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          calendar_ids: Array.from(selectedCalendars),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save calendars')
      }

      // Redirect to dashboard
      router.push('/dashboard?success=google_calendars_connected')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">Invalid session. Please try connecting again.</p>
          <Link href="/calendars/new" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
            Go back
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-semibold text-gray-900">Select Google Calendars</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading your Google Calendars...</p>
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
              <Link
                href="/calendars/new"
                className="mt-4 inline-block text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Try again
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Choose calendars to sync
                </h2>
                <p className="text-sm text-gray-600">
                  Select which of your Google calendars you'd like to sync with your Family Calendar.
                  Each will appear as a separate calendar.
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {calendars.map((calendar) => (
                  <label
                    key={calendar.id}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition cursor-pointer ${
                      selectedCalendars.has(calendar.id)
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCalendars.has(calendar.id)}
                      onChange={() => handleToggleCalendar(calendar.id)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div
                      className="w-4 h-4 rounded flex-shrink-0"
                      style={{ backgroundColor: calendar.backgroundColor || '#3b82f6' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {calendar.summary}
                        {calendar.primary && (
                          <span className="ml-2 text-xs text-blue-600 font-semibold">PRIMARY</span>
                        )}
                      </p>
                      {calendar.description && (
                        <p className="text-xs text-gray-500 truncate">{calendar.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-gray-600">
                  {selectedCalendars.size} calendar{selectedCalendars.size !== 1 ? 's' : ''} selected
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/dashboard"
                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </Link>
                  <button
                    onClick={handleSave}
                    disabled={saving || selectedCalendars.size === 0}
                    className="px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Connecting...' : `Connect ${selectedCalendars.size} Calendar${selectedCalendars.size !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

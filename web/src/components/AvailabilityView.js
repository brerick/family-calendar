'use client'

import { useState, useEffect } from 'react'
import { Users, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function AvailabilityView({ householdProfiles = [] }) {
  const [availability, setAvailability] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState('09:00')
  const [duration, setDuration] = useState('60')
  const [viewMode, setViewMode] = useState('week') // 'week' or 'slot'

  // Initialize selectedDate to today
  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(new Date().toISOString().split('T')[0])
    }
  }, [selectedDate])

  // Fetch availability data
  useEffect(() => {
    if (viewMode === 'week') {
      fetchWeekAvailability()
    }
  }, [viewMode])

  const fetchWeekAvailability = async () => {
    setLoading(true)
    try {
      const today = new Date()
      const nextWeek = new Date(today)
      nextWeek.setDate(today.getDate() + 7)

      const start = today.toISOString().split('T')[0]
      const end = nextWeek.toISOString().split('T')[0]

      const response = await fetch(`/api/availability?mode=week&start=${start}&end=${end}`)
      if (response.ok) {
        const data = await response.json()
        setAvailability(data)
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkSlotAvailability = async () => {
    if (!selectedDate || !selectedTime) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/availability?mode=slot&date=${selectedDate}&time=${selectedTime}&duration=${duration}`
      )
      if (response.ok) {
        const data = await response.json()
        setAvailability(data)
      }
    } catch (error) {
      console.error('Error checking slot availability:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (timeString) => {
    const date = new Date(timeString)
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const getProfileName = (profile) => {
    return profile?.name || 'Unknown'
  }

  if (loading && !availability) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Family Availability</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              viewMode === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Week View
          </button>
          <button
            onClick={() => setViewMode('slot')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              viewMode === 'slot'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Time Slot
          </button>
        </div>
      </div>

      {/* Slot Check Mode */}
      {viewMode === 'slot' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Check Specific Time Slot</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (min)
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={checkSlotAvailability}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Check Availability
              </button>
            </div>
          </div>

          {availability && availability.members && (
            <div className="mt-6 space-y-3">
              {availability.members.map((member) => (
                <div
                  key={member.profile_id || member.user_id}
                  className={`p-4 rounded-lg border-2 ${
                    member.available
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {member.available ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="font-medium">{member.name}</span>
                      <span className={`text-sm px-2 py-1 rounded ${
                        member.available
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {member.available ? 'Available' : 'Busy'}
                      </span>
                    </div>
                  </div>
                  {!member.available && member.conflicts && member.conflicts.length > 0 && (
                    <div className="mt-3 pl-8 space-y-1">
                      {member.conflicts.map((conflict) => (
                        <div key={conflict.id} className="text-sm text-red-700">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {conflict.title} ({formatTime(conflict.start_time)} - {formatTime(conflict.end_time)})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Week View Mode */}
      {viewMode === 'week' && availability && availability.members && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            This Week ({formatDate(availability.start_date)} - {formatDate(availability.end_date)})
          </h3>
          <div className="space-y-4">
            {availability.members.map((member) => (
              <div key={member.profile_id || member.user_id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-lg">{member.name}</span>
                  <span className="text-sm text-gray-600">
                    {member.events.length} event{member.events.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {member.events.length > 0 ? (
                  <div className="space-y-2">
                    {member.events.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded"
                      >
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{event.title}</span>
                        <span className="text-gray-500">
                          {event.all_day ? (
                            'All day'
                          ) : (
                            <>
                              {formatDate(event.start_time)} {formatTime(event.start_time)}
                            </>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">No events this week</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !availability && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No availability data available</p>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, RefreshCw, Trash2, Plus, Edit, Calendar } from 'lucide-react'

export default function CalendarList({ calendars }) {
  const [deleting, setDeleting] = useState(null)
  const [syncing, setSyncing] = useState(null)
  const [toggling, setToggling] = useState(null)
  const [eventCounts, setEventCounts] = useState({})
  const router = useRouter()

  // Fetch event counts for each calendar
  useEffect(() => {
    const fetchEventCounts = async () => {
      try {
        const response = await fetch('/api/calendars/event-counts')
        if (response.ok) {
          const data = await response.json()
          setEventCounts(data)
        }
      } catch (error) {
        console.error('Error fetching event counts:', error)
      }
    }
    
    if (calendars.length > 0) {
      fetchEventCounts()
    }
  }, [calendars])

  const handleDelete = async (calendarId) => {
    if (!confirm('Are you sure you want to delete this calendar? All events will be deleted.')) {
      return
    }

    setDeleting(calendarId)

    try {
      const response = await fetch(`/api/calendars/${calendarId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete calendar')
      }

      router.refresh()
    } catch (error) {
      console.error('Error deleting calendar:', error)
      alert('Failed to delete calendar')
      setDeleting(null)
    }
  }

  const handleSync = async (calendarId, calendarType) => {
    setSyncing(calendarId)

    try {
      const endpoint = calendarType === 'ical'
        ? `/api/sync/ical/${calendarId}`
        : `/api/sync/google/${calendarId}`
      
      const response = await fetch(endpoint, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to sync calendar')
      }

      router.refresh()
    } catch (error) {
      console.error('Error syncing calendar:', error)
      alert('Failed to sync calendar')
    } finally {
      setSyncing(null)
    }
  }

  const handleToggleVisibility = async (calendarId, currentVisibility) => {
    setToggling(calendarId)

    try {
      const response = await fetch(`/api/calendars/${calendarId}/visibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ visible: !currentVisibility }),
      })

      if (!response.ok) {
        throw new Error('Failed to toggle calendar visibility')
      }

      router.refresh()
    } catch (error) {
      console.error('Error toggling visibility:', error)
      alert('Failed to toggle calendar visibility')
    } finally {
      setToggling(null)
    }
  }

  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never synced'
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  if (calendars.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500 mb-3">No calendars yet</p>
        <Link
          href="/calendars/new"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus className="h-4 w-4" />
          Create your first calendar
        </Link>
      </div>
    )
  }

  // Group calendars by visibility
  const visibleCalendars = calendars.filter(cal => cal.visible !== false)
  const hiddenCalendars = calendars.filter(cal => cal.visible === false)

  return (
    <div className="space-y-3">
      {/* Visible Calendars */}
      {visibleCalendars.map((calendar) => (
        <div
          key={calendar.id}
          className="group border border-gray-200 rounded-lg p-3 hover:border-gray-300 hover:shadow-sm transition-all bg-white"
        >
          <div className="flex items-start gap-3">
            {/* Color indicator with visibility toggle */}
            <button
              onClick={() => handleToggleVisibility(calendar.id, calendar.visible ?? true)}
              disabled={toggling === calendar.id}
              className="flex-shrink-0 mt-0.5 transition-all disabled:opacity-50 hover:scale-110"
              title={calendar.visible ?? true ? 'Hide calendar' : 'Show calendar'}
            >
              <div
                className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
                style={{ 
                  borderColor: calendar.color,
                  backgroundColor: calendar.color + '20'
                }}
              >
                {toggling === calendar.id ? (
                  <RefreshCw className="h-3 w-3 animate-spin" style={{ color: calendar.color }} />
                ) : (
                  <Eye className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: calendar.color }} />
                )}
              </div>
            </button>
            
            <div className="flex-1 min-w-0">
              {/* Calendar name and type */}
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {calendar.name}
                </h3>
                {eventCounts[calendar.id] !== undefined && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {eventCounts[calendar.id]}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <span className="capitalize px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">
                  {calendar.type}
                </span>
                {(calendar.type === 'ical' || calendar.type === 'google') && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" />
                      {formatLastSync(calendar.last_synced_at)}
                    </span>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {(calendar.type === 'ical' || calendar.type === 'google') && (
                  <button
                    onClick={() => handleSync(calendar.id, calendar.type)}
                    disabled={syncing === calendar.id}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                    title="Sync now"
                  >
                    <RefreshCw className={`h-3 w-3 ${syncing === calendar.id ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Sync</span>
                  </button>
                )}
                {calendar.type === 'manual' && (
                  <Link
                    href={`/calendars/${calendar.id}/events/new`}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Add event"
                  >
                    <Plus className="h-3 w-3" />
                    <span className="hidden sm:inline">Add Event</span>
                  </Link>
                )}
                <button
                  onClick={() => handleDelete(calendar.id)}
                  disabled={deleting === calendar.id}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 ml-auto"
                  title="Delete calendar"
                >
                  {deleting === calendar.id ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Hidden Calendars Section */}
      {hiddenCalendars.length > 0 && (
        <details className="group/details">
          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 flex items-center gap-2">
            <span className="transform transition-transform group-open/details:rotate-90">▸</span>
            Hidden ({hiddenCalendars.length})
          </summary>
          <div className="space-y-2 mt-2">
            {hiddenCalendars.map((calendar) => (
              <div
                key={calendar.id}
                className="group border border-gray-200 rounded-lg p-3 bg-gray-50 opacity-60 hover:opacity-100 transition-all"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleVisibility(calendar.id, calendar.visible ?? true)}
                    disabled={toggling === calendar.id}
                    className="flex-shrink-0 mt-0.5 transition-all disabled:opacity-50 hover:scale-110"
                    title="Show calendar"
                  >
                    <div
                      className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
                      style={{ 
                        borderColor: calendar.color,
                        backgroundColor: calendar.color + '10'
                      }}
                    >
                      {toggling === calendar.id ? (
                        <RefreshCw className="h-3 w-3 animate-spin" style={{ color: calendar.color }} />
                      ) : (
                        <EyeOff className="h-3 w-3" style={{ color: calendar.color }} />
                      )}
                    </div>
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-600 truncate">
                        {calendar.name}
                      </h3>
                      <button
                        onClick={() => handleDelete(calendar.id)}
                        disabled={deleting === calendar.id}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        title="Delete calendar"
                      >
                        {deleting === calendar.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

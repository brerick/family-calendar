'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CalendarList({ calendars }) {
  const [deleting, setDeleting] = useState(null)
  const [syncing, setSyncing] = useState(null)
  const [toggling, setToggling] = useState(null)
  const router = useRouter()

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
      <p className="text-sm text-gray-500 text-center py-4">
        No calendars yet
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {calendars.map((calendar) => (
        <div
          key={calendar.id}
          className="flex items-center justify-between p-3 rounded-md hover:bg-gray-50 group"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Visibility toggle */}
            <button
              onClick={() => handleToggleVisibility(calendar.id, calendar.visible ?? true)}
              disabled={toggling === calendar.id}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              title={calendar.visible ?? true ? 'Hide calendar' : 'Show calendar'}
            >
              {toggling === calendar.id ? (
                <span className="text-sm">⟳</span>
              ) : (calendar.visible ?? true) ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
              )}
            </button>
            
            <div
              className="w-4 h-4 rounded flex-shrink-0"
              style={{ 
                backgroundColor: calendar.color,
                opacity: (calendar.visible ?? true) ? 1 : 0.3
              }}
            />
            <div className="flex-1 min-w-0">
              <p 
                className="text-sm font-medium text-gray-900 truncate"
                style={{ opacity: (calendar.visible ?? true) ? 1 : 0.5 }}
              >
                {calendar.name}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500 capitalize">
                  {calendar.type}
                </p>
                {(calendar.type === 'ical' || calendar.type === 'google') && (
                  <span className="text-xs text-gray-400">
                    • {formatLastSync(calendar.last_synced_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(calendar.type === 'ical' || calendar.type === 'google') && (
              <button
                onClick={() => handleSync(calendar.id, calendar.type)}
                disabled={syncing === calendar.id}
                className="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-700 text-sm transition-opacity disabled:opacity-50"
                title="Sync now"
              >
                {syncing === calendar.id ? '⟳' : '↻'}
              </button>
            )}
            {calendar.type === 'manual' && (
              <Link
                href={`/calendars/${calendar.id}/events/new`}
                className="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-700 text-sm transition-opacity"
                title="Add event"
              >
                +
              </Link>
            )}
            <button
              onClick={() => handleDelete(calendar.id)}
              disabled={deleting === calendar.id}
              className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 text-sm transition-opacity disabled:opacity-50"
              title="Delete calendar"
            >
              {deleting === calendar.id ? '...' : '×'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

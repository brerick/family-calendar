'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CalendarList({ calendars }) {
  const [deleting, setDeleting] = useState(null)
  const [syncing, setSyncing] = useState(null)
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
            <div
              className="w-4 h-4 rounded flex-shrink-0"
              style={{ backgroundColor: calendar.color }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
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

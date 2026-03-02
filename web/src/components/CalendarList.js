'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CalendarList({ calendars }) {
  const [deleting, setDeleting] = useState(null)
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
              <p className="text-xs text-gray-500 capitalize">
                {calendar.type}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleDelete(calendar.id)}
            disabled={deleting === calendar.id}
            className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 text-sm transition-opacity disabled:opacity-50"
            title="Delete calendar"
          >
            {deleting === calendar.id ? '...' : '×'}
          </button>
        </div>
      ))}
    </div>
  )
}

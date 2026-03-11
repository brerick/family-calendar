'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, RefreshCw, Trash2, Plus, Edit, Calendar } from 'lucide-react'

export default function CalendarList({ calendars, compact = false }) {
  const [deleting, setDeleting] = useState(null)
  const [syncing, setSyncing] = useState(null)
  const [toggling, setToggling] = useState(null)
  const [eventCounts, setEventCounts] = useState({})
  const [editingCalendar, setEditingCalendar] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', ics_url: '' })
  const [saving, setSaving] = useState(false)
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

  const handleDelete = async (calendarId, calendarName) => {
    if (!confirm(`Delete "${calendarName}"? All events will be removed and this cannot be undone.`)) {
      return
    }

    setDeleting(calendarId)

    try {
      const response = await fetch(`/api/calendars/${calendarId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        let msg = 'Failed to delete calendar'
        try {
          const body = await response.json()
          if (body?.error) msg = body.error
        } catch {}
        throw new Error(msg)
      }

      router.refresh()
    } catch (error) {
      console.error('Error deleting calendar:', error)
      alert(error.message || 'Failed to delete calendar')
    } finally {
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
        let msg = 'Failed to sync calendar'
        try {
          const body = await response.json()
          if (body?.error) msg = body.error
          if (body?.details) msg += `\n\nDetails: ${body.details}`
        } catch {}
        throw new Error(msg)
      }

      router.refresh()
    } catch (error) {
      console.error('Error syncing calendar:', error)
      alert(error.message || 'Failed to sync calendar')
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

  const handleEdit = (calendar) => {
    setEditingCalendar(calendar)
    setEditForm({
      name: calendar.name,
      ics_url: calendar.ics_url || ''
    })
  }

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      alert('Calendar name is required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/calendars/${editingCalendar.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      })

      if (!response.ok) {
        throw new Error('Failed to update calendar')
      }

      setEditingCalendar(null)
      router.refresh()
    } catch (error) {
      console.error('Error updating calendar:', error)
      alert('Failed to update calendar')
    } finally {
      setSaving(false)
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

  // Compact view for sidebar
  if (compact) {
    return (
      <div className="space-y-1">
        {visibleCalendars.map((calendar) => (
          <div
            key={calendar.id}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
          >
            <div
              className="w-3 h-3 rounded flex-shrink-0"
              style={{ backgroundColor: calendar.color }}
            />
            <span className="truncate flex-1">{calendar.name}</span>
            {(calendar.type === 'ical' || calendar.type === 'google') && (
              <button
                onClick={() => handleSync(calendar.id, calendar.type)}
                disabled={syncing === calendar.id}
                className="flex-shrink-0 p-0.5 text-gray-400 hover:text-blue-600 rounded transition-colors disabled:opacity-50"
                title={`Sync now • ${formatLastSync(calendar.last_synced_at)}`}
              >
                <RefreshCw className={`h-3 w-3 ${syncing === calendar.id ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={() => handleToggleVisibility(calendar.id, calendar.visible ?? true)}
              disabled={toggling === calendar.id}
              className="flex-shrink-0 p-0.5 text-gray-400 hover:text-gray-600 rounded transition-colors disabled:opacity-50"
              title="Hide calendar"
            >
              {toggling === calendar.id
                ? <RefreshCw className="h-3 w-3 animate-spin" />
                : <Eye className="h-3 w-3" />
              }
            </button>
            <button
              onClick={() => handleDelete(calendar.id, calendar.name)}
              disabled={deleting === calendar.id}
              className="flex-shrink-0 p-0.5 text-gray-400 hover:text-red-600 rounded transition-colors disabled:opacity-50"
              title="Delete calendar"
            >
              {deleting === calendar.id
                ? <RefreshCw className="h-3 w-3 animate-spin" />
                : <Trash2 className="h-3 w-3" />
              }
            </button>
          </div>
        ))}
        
        {hiddenCalendars.length > 0 && (
          <details className="group/details">
            <summary className="cursor-pointer list-none px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <span className="transform transition-transform group-open/details:rotate-90">▸</span>
              Hidden ({hiddenCalendars.length})
            </summary>
            <div className="space-y-1 mt-1">
              {hiddenCalendars.map((calendar) => (
                <div
                  key={calendar.id}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
                >
                  <div
                    className="w-3 h-3 rounded flex-shrink-0"
                    style={{ backgroundColor: calendar.color }}
                  />
                  <span className="truncate flex-1">{calendar.name}</span>
                  <button
                    onClick={() => handleToggleVisibility(calendar.id, calendar.visible ?? true)}
                    disabled={toggling === calendar.id}
                    className="flex-shrink-0 p-0.5 text-gray-400 hover:text-gray-600 rounded transition-colors disabled:opacity-50"
                    title="Show calendar"
                  >
                    {toggling === calendar.id
                      ? <RefreshCw className="h-3 w-3 animate-spin" />
                      : <EyeOff className="h-3 w-3" />
                    }
                  </button>
                  <button
                    onClick={() => handleDelete(calendar.id, calendar.name)}
                    disabled={deleting === calendar.id}
                    className="flex-shrink-0 p-0.5 text-gray-400 hover:text-red-600 rounded transition-colors disabled:opacity-50"
                    title="Delete calendar"
                  >
                    {deleting === calendar.id
                      ? <RefreshCw className="h-3 w-3 animate-spin" />
                      : <Trash2 className="h-3 w-3" />
                    }
                  </button>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    )
  }

  // Full view for dashboard
  return (
    <div className="space-y-3">
      {/* Visible Calendars */}
      {visibleCalendars.map((calendar) => (
        <div
          key={calendar.id}
          className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 hover:shadow-sm transition-all bg-white"
        >
          <div className="flex items-start gap-3">
            {/* Color indicator */}
            <div
              className="flex-shrink-0 mt-1 w-4 h-4 rounded-md"
              style={{ backgroundColor: calendar.color }}
            />

            <div className="flex-1 min-w-0">
              {/* Calendar name row with always-visible sync button */}
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {calendar.name}
                </h3>
                {eventCounts[calendar.id] !== undefined && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {eventCounts[calendar.id]}
                  </span>
                )}
                {(calendar.type === 'ical' || calendar.type === 'google') && (
                  <button
                    onClick={() => handleSync(calendar.id, calendar.type)}
                    disabled={syncing === calendar.id}
                    className="ml-auto flex-shrink-0 p-1 text-gray-400 hover:text-blue-600 rounded transition-colors disabled:opacity-50"
                    title={`Sync now • Last synced: ${formatLastSync(calendar.last_synced_at)}`}
                  >
                    <RefreshCw className={`h-4 w-4 ${syncing === calendar.id ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <span className="capitalize px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">
                  {calendar.type}
                </span>
                {(calendar.type === 'ical' || calendar.type === 'google') && (
                  <>
                    <span>•</span>
                    <span>{formatLastSync(calendar.last_synced_at)}</span>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggleVisibility(calendar.id, calendar.visible ?? true)}
                  disabled={toggling === calendar.id}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                  title="Hide calendar"
                >
                  {toggling === calendar.id
                    ? <RefreshCw className="h-3 w-3 animate-spin" />
                    : <Eye className="h-3 w-3" />
                  }
                  <span className="hidden sm:inline">Hide</span>
                </button>
                <button
                  onClick={() => handleEdit(calendar)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Edit calendar"
                >
                  <Edit className="h-3 w-3" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
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
                  onClick={() => handleDelete(calendar.id, calendar.name)}
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
                className="border border-gray-200 rounded-lg p-3 bg-gray-50 opacity-70 hover:opacity-100 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex-shrink-0 w-4 h-4 rounded-md opacity-50"
                    style={{ backgroundColor: calendar.color }}
                  />
                  <h3 className="text-sm font-medium text-gray-600 truncate flex-1">
                    {calendar.name}
                  </h3>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleVisibility(calendar.id, calendar.visible ?? true)}
                      disabled={toggling === calendar.id}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                      title="Show calendar"
                    >
                      {toggling === calendar.id
                        ? <RefreshCw className="h-3 w-3 animate-spin" />
                        : <EyeOff className="h-3 w-3" />
                      }
                      <span className="hidden sm:inline">Show</span>
                    </button>
                    <button
                      onClick={() => handleDelete(calendar.id, calendar.name)}
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
            ))}
          </div>
        </details>
      )}

      {/* Edit Modal */}
      {editingCalendar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Calendar</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Calendar Name
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Calendar name"
                />
              </div>

              {editingCalendar.type === 'ical' && (
                <div>
                  <label htmlFor="edit-url" className="block text-sm font-medium text-gray-700 mb-1">
                    Calendar Feed URL
                  </label>
                  <input
                    id="edit-url"
                    type="text"
                    value={editForm.ics_url}
                    onChange={(e) => setEditForm({ ...editForm, ics_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://... or webcal://..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Supports https://, http://, and webcal:// URLs
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditingCalendar(null)}
                disabled={saving}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

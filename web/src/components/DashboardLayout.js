'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import CalendarView from '@/components/CalendarView';

function getLastSyncedAt(calendars) {
  const times = calendars
    .filter(c => c.last_synced_at)
    .map(c => new Date(c.last_synced_at).getTime())
  if (times.length === 0) return null
  return new Date(Math.max(...times))
}

function formatSyncAge(date) {
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function DashboardLayout({ household, user, calendars, events, membershipRole, householdProfiles = [] }) {
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState(() => getLastSyncedAt(calendars))

  const handleSyncNow = useCallback(async () => {
    setSyncing(true)
    try {
      await fetch('/api/sync/all', { method: 'POST' })
      setLastSynced(new Date())
    } catch {
      // ignore
    } finally {
      setSyncing(false)
    }
  }, [])

  const hasExternalCalendars = calendars.some(c => c.type === 'ical' || c.type === 'google')

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {hasExternalCalendars && (
        <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-1.5 bg-white border-b border-gray-100 text-xs text-gray-500">
          {lastSynced ? (
            <span>Last synced {formatSyncAge(lastSynced)}</span>
          ) : (
            <span>Not yet synced</span>
          )}
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
      )}
      <div className="flex-1 p-4 sm:p-6 overflow-hidden">
        <div className="h-full bg-white rounded-lg shadow">
          {calendars && calendars.length > 0 ? (
            <div className="h-full p-3 sm:p-6 overflow-auto">
              <CalendarView events={events || []} calendars={calendars} householdProfiles={householdProfiles} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-500 mb-4">No calendars yet</p>
                <Link
                  href="/calendars/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Create Your First Calendar
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

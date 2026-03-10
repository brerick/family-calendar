'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import CalendarList from '@/components/CalendarList';
import CalendarView from '@/components/CalendarView';

export default function DashboardLayout({ household, user, calendars, events, membershipRole }) {
  const [showCalendarList, setShowCalendarList] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="space-y-4">
          {/* Collapsible Calendar List */}
          <div className="bg-white rounded-lg shadow">
            <button
              onClick={() => setShowCalendarList(!showCalendarList)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">My Calendars</h2>
                <span className="text-sm text-gray-500">
                  ({calendars?.length || 0})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/calendars/new"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md"
                  title="Add Calendar"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New</span>
                </Link>
                {showCalendarList ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </button>
            
            {showCalendarList && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-3 mt-3">
                  Toggle visibility to show/hide calendars
                </p>
                <CalendarList calendars={calendars || []} />
              </div>
            )}
          </div>

          {/* Main calendar view */}
          <div className="bg-white rounded-lg shadow p-3 sm:p-6">
            {calendars && calendars.length > 0 ? (
              <CalendarView events={events || []} calendars={calendars} />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No calendars yet</p>
                <Link
                  href="/calendars/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Create Your First Calendar
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

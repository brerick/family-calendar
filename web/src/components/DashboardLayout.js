'use client';

import Link from 'next/link';
import CalendarView from '@/components/CalendarView';

export default function DashboardLayout({ household, user, calendars, events, membershipRole, householdProfiles = [] }) {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
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

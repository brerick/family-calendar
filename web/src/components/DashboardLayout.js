'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, LogOut, Settings } from 'lucide-react';
import CalendarList from '@/components/CalendarList';
import CalendarView from '@/components/CalendarView';

export default function DashboardLayout({ household, user, calendars, events, membershipRole }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16 items-center">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                aria-label="Toggle menu"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <h1 className="text-base sm:text-xl font-semibold text-gray-900 truncate max-w-[120px] sm:max-w-none">
                {household?.name || 'Family Calendar'}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="hidden sm:inline text-sm text-gray-600 truncate max-w-[150px] md:max-w-none">
                {user.email}
              </span>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Mobile Sidebar Overlay */}
          {sidebarOpen && (
            <div 
              className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar with calendars */}
          <div className={`
            lg:col-span-1
            ${sidebarOpen ? 'fixed inset-y-0 left-0 z-40 w-72 transform translate-x-0' : 'hidden lg:block'}
            lg:relative lg:translate-x-0 lg:w-auto
            transition-transform duration-300 ease-in-out
          `}>
            <div className="bg-white rounded-lg shadow p-4 sm:p-6 h-full lg:h-auto overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base sm:text-lg font-semibold">Calendars</h2>
                <Link
                  href="/calendars/new"
                  className="text-blue-600 hover:text-blue-700 text-2xl leading-none p-1 hover:bg-blue-50 rounded"
                  title="Add Calendar"
                  onClick={() => setSidebarOpen(false)}
                >
                  +
                </Link>
              </div>
              
              <CalendarList calendars={calendars || []} />

              {membershipRole === 'owner' && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <Link
                    href="/household/settings"
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 p-2 rounded-md"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Household Settings</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Main calendar view */}
          <div className="lg:col-span-3">
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
        </div>
      </main>
    </div>
  );
}

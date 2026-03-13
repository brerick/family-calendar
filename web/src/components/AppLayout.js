'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import AppNavigation from '@/components/AppNavigation'
import { X, Menu } from 'lucide-react'

export default function AppLayout({ children }) {
  const [userName, setUserName] = useState(null)
  const [calendars, setCalendars] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    fetchUserProfile()
    fetchCalendars()

    const handleProfileUpdate = () => {
      fetchUserProfile()
      fetchCalendars()
    }
    
    window.addEventListener('profile-updated', handleProfileUpdate)
    return () => window.removeEventListener('profile-updated', handleProfileUpdate)
  }, [])

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/users/profile')
      if (response.ok) {
        const data = await response.json()
        setUserName(data.profile.display_name || data.email?.split('@')[0] || 'User')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const fetchCalendars = async () => {
    try {
      const response = await fetch('/api/calendars')
      if (response.ok) {
        const data = await response.json()
        setCalendars(data.calendars || [])
      }
    } catch (error) {
      console.error('Error fetching calendars:', error)
    }
  }

  if (pathname.startsWith('/auth') || pathname.startsWith('/household/setup') || pathname.startsWith('/household/join')) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — always visible on desktop, slide-over on mobile */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Close button inside sidebar on mobile */}
        <div className="absolute top-4 right-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-md text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <AppNavigation userName={userName} calendars={calendars} onCalendarUpdate={fetchCalendars} />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto min-w-0">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-gray-900">Family Calendar</span>
        </div>
        {children}
      </main>
    </div>
  )
}

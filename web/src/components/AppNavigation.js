'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Calendar, 
  Users, 
  Settings, 
  LogOut,
  ClipboardList,
  Utensils,
  User,
  ChevronDown,
  ChevronRight,
  Plus
} from 'lucide-react'
import CalendarList from '@/components/CalendarList'

export default function AppNavigation({ userName, calendars = [], onCalendarUpdate }) {
  const pathname = usePathname()
  const [calendarsExpanded, setCalendarsExpanded] = useState(true)

  const navItems = [
    {
      href: '/dashboard',
      icon: Home,
      label: 'Dashboard',
      description: 'Calendar overview'
    },
    {
      href: '/family-planner',
      icon: Users,
      label: 'Family Planner',
      description: 'Organize your household'
    },
    {
      href: '/calendars',
      icon: Calendar,
      label: 'Calendars',
      description: 'Manage calendars'
    },
    {
      href: '/household/settings',
      icon: Settings,
      label: 'Household',
      description: 'Settings & members'
    }
  ]

  const quickActions = [
    {
      href: '/calendars/new',
      icon: Calendar,
      label: 'New Calendar',
      color: 'bg-blue-100 text-blue-700 hover:bg-blue-200'
    },
    {
      href: '/family-planner?tab=chores',
      icon: ClipboardList,
      label: 'Add Chore',
      color: 'bg-purple-100 text-purple-700 hover:bg-purple-200'
    },
    {
      href: '/family-planner?tab=meals',
      icon: Utensils,
      label: 'Plan Meal',
      color: 'bg-green-100 text-green-700 hover:bg-green-200'
    }
  ]

  const isActive = (href) => {
    if (href === '/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="bg-white border-r border-gray-200 w-64 min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Family Calendar</h1>
            <p className="text-xs text-gray-500">Stay organized together</p>
          </div>
        </Link>
      </div>

      {/* User Info */}
      {userName && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
              <Link 
                href="/profile/settings" 
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Edit profile
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* My Calendars Section */}
        {calendars.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setCalendarsExpanded(!calendarsExpanded)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-lg"
            >
              <span>My Calendars ({calendars.length})</span>
              {calendarsExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
            
            {calendarsExpanded && (
              <div className="mt-2">
                <CalendarList calendars={calendars} compact />
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Quick Actions
          </h3>
          <div className="space-y-1">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${action.color}`}
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg w-full"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </form>
      </div>
    </div>
  )
}

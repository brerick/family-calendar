'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import AppNavigation from '@/components/AppNavigation'

export default function AppLayout({ children }) {
  const [userName, setUserName] = useState(null)
  const pathname = usePathname()

  useEffect(() => {
    fetchUserProfile()
  }, [])

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

  // Don't show sidebar on auth pages
  if (pathname.startsWith('/auth') || pathname.startsWith('/household/setup') ||pathname.startsWith('/household/join')) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AppNavigation userName={userName} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

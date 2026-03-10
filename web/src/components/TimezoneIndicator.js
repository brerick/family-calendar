'use client'

import { useEffect, useState } from 'react'
import { Globe } from 'lucide-react'
import { getBrowserTimezone, formatInTimezone } from '@/lib/timezone'

export default function TimezoneIndicator({ className = '' }) {
  const [timezone, setTimezone] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    setTimezone(getBrowserTimezone())
    
    // Update time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    
    return () => clearInterval(interval)
  }, [])

  if (!timezone) return null

  const formatTimezone = (tz) => {
    // Format timezone name (e.g., "America/Los_Angeles" -> "Los Angeles")
    const parts = tz.split('/')
    return parts[parts.length - 1].replace(/_/g, ' ')
  }

  const getOffset = () => {
    const offset = -new Date().getTimezoneOffset()
    const hours = Math.floor(Math.abs(offset) / 60)
    const minutes = Math.abs(offset) % 60
    const sign = offset >= 0 ? '+' : '-'
    return `UTC${sign}${hours}:${minutes.toString().padStart(2, '0')}`
  }

  return (
    <div className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}>
      <Globe className="h-4 w-4" />
      <span className="font-medium">{formatTimezone(timezone)}</span>
      <span className="text-gray-400">({getOffset()})</span>
    </div>
  )
}

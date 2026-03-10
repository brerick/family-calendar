/**
 * Timezone utilities for converting between UTC and user's local timezone
 * Uses native JavaScript Intl API - no external dependencies
 */

/**
 * Get the user's browser timezone
 * @returns {string} IANA timezone identifier (e.g., 'America/Los_Angeles')
 */
export function getBrowserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Get list of common timezones for selector
 * @returns {Array<{value: string, label: string, offset: string}>}
 */
export function getTimezones() {
  const timezones = [
    'America/New_York',
    'America/Chicago', 
    'America/Denver',
    'America/Phoenix',
    'America/Los_Angeles',
    'America/Anchorage',
    'Pacific/Honolulu',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Rome',
    'Europe/Madrid',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Bangkok',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Pacific/Auckland',
  ]

  return timezones.map(tz => {
    const offset = getTimezoneOffset(tz)
    const label = tz.replace(/_/g, ' ').replace('/', ': ')
    return {
      value: tz,
      label: `${label} (UTC${offset})`,
      offset
    }
  }).sort((a, b) => {
    // Sort by offset first, then alphabetically
    const offsetA = parseOffset(a.offset)
    const offsetB = parseOffset(b.offset)
    if (offsetA !== offsetB) return offsetA - offsetB
    return a.label.localeCompare(b.label)
  })
}

/**
 * Get timezone offset string (e.g., '+02:00', '-05:00')
 * @param {string} timezone - IANA timezone identifier
 * @returns {string} Offset string
 */
function getTimezoneOffset(timezone) {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset'
  })
  const parts = formatter.formatToParts(now)
  const offsetPart = parts.find(part => part.type === 'timeZoneName')
  
  if (offsetPart && offsetPart.value.startsWith('GMT')) {
    const offset = offsetPart.value.replace('GMT', '')
    return offset === '' ? '+00:00' : offset
  }
  
  return '+00:00'
}

/**
 * Parse offset string to minutes for sorting
 * @param {string} offset - Offset string like '+02:00'
 * @returns {number} Offset in minutes
 */
function parseOffset(offset) {
  const match = offset.match(/([+-])(\d{2}):(\d{2})/)
  if (!match) return 0
  const [, sign, hours, minutes] = match
  const totalMinutes = parseInt(hours) * 60 + parseInt(minutes)
  return sign === '+' ? totalMinutes : -totalMinutes
}

/**
 * Convert UTC date to user's timezone
 * @param {Date|string} utcDate - UTC date
 * @param {string} timezone - Target timezone
 * @returns {Date} Date object in user's timezone
 */
export function utcToTimezone(utcDate, timezone) {
  if (!utcDate) return null
  
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
  
  // Create formatter for the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  const parts = formatter.formatToParts(date)
  const getValue = (type) => parts.find(p => p.type === type)?.value
  
  // Construct date in the target timezone
  return new Date(
    parseInt(getValue('year')),
    parseInt(getValue('month')) - 1,
    parseInt(getValue('day')),
    parseInt(getValue('hour')),
    parseInt(getValue('minute')),
    parseInt(getValue('second'))
  )
}

/**
 * Convert user's local timezone date to UTC for storage
 * @param {Date} localDate - Date in user's timezone
 * @param {string} timezone - User's timezone
 * @returns {Date} UTC date
 */
export function timezoneToUtc(localDate, timezone) {
  if (!localDate) return null
  
  // Format the date parts
  const year = localDate.getFullYear()
  const month = String(localDate.getMonth() + 1).padStart(2, '0')
  const day = String(localDate.getDate()).padStart(2, '0')
  const hours = String(localDate.getHours()).padStart(2, '0')
  const minutes = String(localDate.getMinutes()).padStart(2, '0')
  const seconds = String(localDate.getSeconds()).padStart(2, '0')
  
  // Create ISO string with timezone
  const isoString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
  
  // Parse in the specified timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  // Get the offset by comparing with UTC
  const localParts = formatter.formatToParts(new Date(isoString + 'Z'))
  const utcParts = formatter.formatToParts(new Date(isoString + 'Z'))
  
  // Actually, let's use a simpler approach with toLocaleString
  const dateStr = localDate.toLocaleString('en-US', { timeZone: timezone })
  const utcDate = new Date(dateStr)
  
  // Better approach: use the fact that Date constructor interprets ISO strings as local time
  // when no timezone is specified, then convert
  const tempDate = new Date(`${isoString}`)
  const offset = getOffsetBetweenTimezones(timezone, tempDate)
  
  return new Date(tempDate.getTime() - offset)
}

/**
 * Get offset in milliseconds between a timezone and UTC
 * @param {string} timezone - IANA timezone
 * @param {Date} date - Reference date
 * @returns {number} Offset in milliseconds
 */
function getOffsetBetweenTimezones(timezone, date) {
  // Get time in the specified timezone
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }))
  // Get time in UTC
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  
  return tzDate.getTime() - utcDate.getTime()
}

/**
 * Format date in user's timezone
 * @param {Date|string} utcDate - UTC date
 * @param {string} timezone - User's timezone
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatInTimezone(utcDate, timezone, options = {}) {
  if (!utcDate) return ''
  
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
  
  const defaultOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }
  
  return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(date)
}

/**
 * Get user's timezone from their profile
 * Falls back to browser timezone if not set
 * @param {Object} supabase - Supabase client
 * @returns {Promise<string>} User's timezone
 */
export async function getUserTimezone(supabase) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return getBrowserTimezone()
    }
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('timezone')
      .eq('id', user.id)
      .single()
    
    return profile?.timezone || getBrowserTimezone()
  } catch (error) {
    console.error('Error fetching user timezone:', error)
    return getBrowserTimezone()
  }
}

/**
 * Update user's timezone preference
 * @param {Object} supabase - Supabase client
 * @param {string} timezone - New timezone
 * @returns {Promise<boolean>} Success status
 */
export async function updateUserTimezone(supabase, timezone) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('No user logged in')
    }
    
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        timezone,
        updated_at: new Date().toISOString()
      })
    
    if (error) throw error
    
    return true
  } catch (error) {
    console.error('Error updating user timezone:', error)
    return false
  }
}

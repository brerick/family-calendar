import { google } from 'googleapis'

/**
 * Build a Google Calendar API client authenticated with the given refresh token.
 */
export function getGoogleCalendarAPI(refreshToken) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  return google.calendar({ version: 'v3', auth: oauth2Client })
}

const FREQ_MAP = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' }
const DAY_MAP = { 0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA' }

/**
 * Convert the app's recurrence rule storage format to a Google RRULE array.
 * The app stores recurrence in two possible formats:
 *   - JSON string: {"frequency":"weekly","interval":2,"byweekday":[1,3]}
 *   - RRULE string: "RRULE:FREQ=WEEKLY;BYDAY=MO" (synced from Google)
 * Returns an array suitable for Google's `recurrence` property, or undefined.
 */
export function buildGoogleRecurrence(recurrenceRule) {
  if (!recurrenceRule) return undefined

  // Already in RRULE/EXDATE format (came from Google)
  if (recurrenceRule.includes('RRULE:') || recurrenceRule.includes('EXDATE:')) {
    return recurrenceRule.split(';EXDATE:').length > 1
      ? recurrenceRule.split(';').reduce((acc, part) => {
          if (part.startsWith('RRULE:') || part.startsWith('EXDATE:') || part.startsWith('RDATE:')) acc.push(part)
          else if (acc.length > 0) acc[acc.length - 1] += ';' + part
          return acc
        }, [])
      : [recurrenceRule]
  }

  // JSON format from RecurrenceSelector component
  try {
    const rule = JSON.parse(recurrenceRule)
    const freq = FREQ_MAP[rule.frequency] || 'WEEKLY'
    let rrule = `RRULE:FREQ=${freq}`
    if (rule.interval && rule.interval > 1) rrule += `;INTERVAL=${rule.interval}`
    if (rule.byweekday?.length > 0) rrule += `;BYDAY=${rule.byweekday.map(d => DAY_MAP[d]).join(',')}`
    if (rule.until) {
      const untilStr = new Date(rule.until).toISOString().replace(/[-:]/g, '').replace('.000Z', 'Z')
      rrule += `;UNTIL=${untilStr}`
    }
    if (rule.count) rrule += `;COUNT=${rule.count}`
    return [rrule]
  } catch {
    return undefined
  }
}

/**
 * Build the request body for a Google Calendar event from a local event record.
 */
export function buildGoogleEventBody({ title, description, location, start_time, end_time, all_day, recurrence_rule }) {
  const body = {
    summary: title || 'Untitled Event',
  }

  if (description) body.description = description
  if (location) body.location = location

  if (all_day) {
    const startDate = new Date(start_time).toISOString().slice(0, 10)
    const endDate = end_time ? new Date(end_time).toISOString().slice(0, 10) : startDate
    body.start = { date: startDate }
    body.end = { date: endDate }
  } else {
    body.start = { dateTime: start_time }
    body.end = { dateTime: end_time || start_time }
  }

  const recurrence = buildGoogleRecurrence(recurrence_rule)
  if (recurrence) body.recurrence = recurrence

  return body
}

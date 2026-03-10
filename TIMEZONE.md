# Timezone Handling in HomeOrbit

## Overview

HomeOrbit implements proper timezone handling using these principles:

1. **Store in UTC**: All event times are stored in PostgreSQL using `timestamptz` (timestamp with timezone), which stores values in UTC
2. **Display in Local**: Events are automatically displayed in each user's browser timezone
3. **Timezone Indicator**: A globe icon shows users which timezone they're viewing events in

## How It Works

### Storage (Backend)
- All event `start_time` and `end_time` columns use `timestamptz` type in PostgreSQL
- When storing dates, we use JavaScript's `.toISOString()` which converts local time to UTC
- Database stores everything in UTC internally

### Display (Frontend)
- JavaScript `Date` objects automatically convert UTC timestamps to the browser's local timezone
- When creating a `new Date("2024-03-10T14:00:00Z")`, the browser shows it in local time
- FullCalendar (our calendar library) respects the browser's timezone settings

### User Experience
- **Timezone Indicator**: Dashboard header shows current timezone (e.g., "Los Angeles (UTC-8:00)")
- **Automatic Conversion**: Users in different timezones see events at the correct local time
- **No Configuration Needed**: Works automatically using browser timezone detection

## Example

If a user in Los Angeles creates an event for 2:00 PM PST:
1. Browser sends: `2024-03-10T22:00:00Z` (converted to UTC)
2. Database stores: `2024-03-10 22:00:00+00` (UTC)
3. User in New York sees: "5:00 PM EST" when viewing
4. User in Los Angeles sees: "2:00 PM PST" when viewing

## All-Day Events

All-day events are handled slightly differently:
- Stored with time set to midnight UTC
- Displayed as full-day events regardless of timezone
- The `all_day` boolean flag prevents timezone confusion

## Setup

To enable timezone features, run this SQL migration in Supabase:

```bash
# Run in Supabase SQL Editor
cat supabase/add-user-profiles-timezone.sql
```

This creates:
- `user_profiles` table with timezone preference
- Auto-creates profile when new user signs up
- RLS policies for secure access

## Timezone Utilities

Located in `web/src/lib/timezone.js`:

- `getBrowserTimezone()` - Get user's browser timezone
- `getTimezones()` - List of common timezones for selector
- `formatInTimezone()` - Format date in specific timezone
- `utcToTimezone()` - Convert UTC to specific timezone
- `timezoneToUtc()` - Convert timezone date to UTC

## Future Enhancements

If needed, we can add:
1. **Manual Timezone Override**: Let users override browser timezone in settings
2. **Timezone Selection**: Dropdown in dashboard to view events in different timezones
3. **Event Creation in Different Timezone**: Create events for different timezones when planning travel

## Technical Notes

### Why This Approach?

We use browser timezone detection instead of manual selection because:
- **Simplicity**: Works automatically for 99% of users
- **Accuracy**: Browser always knows the correct timezone
- **Handles DST**: Automatically adjusts for daylight saving time
- **Travel-Friendly**: When user travels, events automatically show in new timezone

### Timezone Database

JavaScript uses the IANA timezone database (e.g., `America/Los_Angeles`, `Europe/London`), which:
- Handles historical timezone changes
- Automatically manages daylight saving time
- Is updated with timezone policy changes worldwide

### PostgreSQL timestamptz

PostgreSQL's `timestamptz` type:
- Stores all times in UTC internally
- Accepts times with timezone offsets
- Converts to UTC automatically on storage
- Returns times in session timezone (or UTC by default)

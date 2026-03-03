-- Add table to track Google Calendar webhook watches
CREATE TABLE IF NOT EXISTS google_calendar_watches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID REFERENCES calendars(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL UNIQUE,
  resource_id TEXT NOT NULL,
  expiration TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(calendar_id)
);

-- Add index for finding expiring watches
CREATE INDEX IF NOT EXISTS idx_watches_expiration ON google_calendar_watches(expiration);

-- RLS policies for google_calendar_watches
ALTER TABLE google_calendar_watches ENABLE ROW LEVEL SECURITY;

-- Users can view watches for calendars in their household
CREATE POLICY "watches_select_policy" ON google_calendar_watches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calendars c
      INNER JOIN household_members hm ON hm.household_id = c.household_id
      WHERE c.id = google_calendar_watches.calendar_id
      AND hm.user_id = auth.uid()
    )
  );

-- Service role can manage all watches (for webhook operations)
-- No INSERT/UPDATE/DELETE policies for users - these are managed by the system

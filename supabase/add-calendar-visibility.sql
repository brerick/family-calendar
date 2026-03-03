-- Add visible column to calendars table
-- This allows users to show/hide calendars from the calendar view

ALTER TABLE calendars
ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT true NOT NULL;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_calendars_visible ON calendars(visible);

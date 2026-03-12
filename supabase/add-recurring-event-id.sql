-- Store the Google recurring series master ID on each event instance.
-- This lets us bulk-assign attendees to all instances of a series at once.
-- Run this in the Supabase SQL Editor.

ALTER TABLE events ADD COLUMN IF NOT EXISTS recurring_event_id text;

-- Backfill from existing instance_id (format: "{masterGoogleId}_{startDate}")
-- Only touches rows that already have an instance_id set and no recurring_event_id yet
UPDATE events
SET recurring_event_id = split_part(instance_id, '_', 1)
WHERE instance_id IS NOT NULL
  AND instance_id <> ''
  AND recurring_event_id IS NULL
  AND split_part(instance_id, '_', 1) <> '';

CREATE INDEX IF NOT EXISTS idx_events_recurring_event_id ON events(recurring_event_id);

-- Track auth/sync errors on Google calendars so we can show a reconnect banner.
-- Run this in the Supabase SQL Editor.

ALTER TABLE calendars ADD COLUMN IF NOT EXISTS sync_error text;

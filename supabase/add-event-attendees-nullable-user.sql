-- Allow assigning events to non-auth household members (kids, etc.)
-- Run this in the Supabase SQL editor before using the "Assign to" feature

-- 1. Make user_id nullable so profiles without a linked user account can be attendees
ALTER TABLE event_attendees ALTER COLUMN user_id DROP NOT NULL;

-- 2. Drop the old unique constraint on (event_id, user_id) — it blocks null user_ids
ALTER TABLE event_attendees DROP CONSTRAINT IF EXISTS event_attendees_event_id_user_id_key;

-- 3. Partial unique index: one row per auth user per event
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_attendees_uniq_user
  ON event_attendees(event_id, user_id)
  WHERE user_id IS NOT NULL;

-- 4. Partial unique index: one row per household profile per event
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_attendees_uniq_profile
  ON event_attendees(event_id, profile_id)
  WHERE profile_id IS NOT NULL;

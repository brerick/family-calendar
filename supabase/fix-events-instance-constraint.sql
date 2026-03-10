-- Fix events unique constraint to support recurring event instances
-- Run this in Supabase SQL Editor

-- Drop the old unique constraint (only on calendar_id + external_event_id)
drop index if exists uniq_event_external;

-- Create a new unique constraint that includes instance_id
-- This allows recurring events to have multiple instances with the same external_event_id
-- but different instance_ids
create unique index uniq_event_external_instance
  on events (calendar_id, external_event_id, instance_id)
  where external_event_id is not null;

-- Note: instance_id defaults to empty string ('') for non-recurring events
-- and contains a unique identifier for each recurring event instance

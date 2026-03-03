-- Fix external_event_id constraint for manual events
-- Run this in Supabase SQL Editor

-- Make external_event_id nullable since manual events don't have external IDs
alter table events alter column external_event_id drop not null;

-- Update the unique constraint to handle nulls properly
-- Drop the old unique constraint
drop index if exists uniq_event_external;

-- Create a new unique constraint that only applies when external_event_id is not null
create unique index uniq_event_external
  on events (calendar_id, external_event_id)
  where external_event_id is not null;

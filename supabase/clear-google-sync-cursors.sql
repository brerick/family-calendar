-- Clear stale Google Calendar sync tokens so the next sync performs a full
-- re-fetch with the corrected incremental sync logic.
-- Run this once in the Supabase SQL Editor after deploying the sync fix.

update calendars
set sync_cursor = null
where type = 'google';

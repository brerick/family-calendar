-- Add last_synced_at to calendars table
alter table calendars add column if not exists last_synced_at timestamptz;

-- Update sync_runs table structure for better tracking
alter table sync_runs add column if not exists started_at timestamptz default now();
alter table sync_runs add column if not exists completed_at timestamptz;
alter table sync_runs add column if not exists events_synced integer default 0;
alter table sync_runs add column if not exists error_message text;

-- Update existing run_at to started_at if needed
update sync_runs set started_at = run_at where started_at is null;

-- Add index for faster sync status queries
create index if not exists idx_calendars_last_synced on calendars(last_synced_at);
create index if not exists idx_sync_runs_calendar_started on sync_runs(calendar_id, started_at desc);

-- Update unique constraint to include instance_id for recurring events
drop index if exists uniq_event_external;
create unique index if not exists uniq_event_external_instance
  on events (calendar_id, external_event_id, coalesce(instance_id, ''))
  where external_event_id is not null;

-- Family Calendar Aggregator schema
-- Note: Run in Supabase SQL editor or via migrations.

-- Extensions
create extension if not exists pgcrypto;

-- Households
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Household members
create table if not exists household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner', 'member', 'viewer')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (household_id, user_id)
);

-- Invite links
create table if not exists household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  token text unique not null,
  role text not null check (role in ('member', 'viewer')),
  created_by uuid not null,
  expires_at timestamptz,
  created_at timestamptz default now(),
  redeemed_at timestamptz
);

-- Calendars
create table if not exists calendars (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  name text not null,
  type text not null check (type in ('google', 'ical', 'manual')),
  color text,
  external_id text,
  ics_url text,
  refresh_token text,
  sync_cursor text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Events
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid references calendars(id) on delete cascade,
  external_event_id text,  -- nullable for manual events
  instance_id text,
  title text,
  description text,
  location text,
  start_time timestamptz not null,
  end_time timestamptz,
  all_day boolean default false,
  status text default 'confirmed',
  recurrence_rule text,
  updated_at timestamptz,
  raw_payload jsonb
);

-- Unique constraint only for external events (where external_event_id is not null)
create unique index if not exists uniq_event_external
  on events (calendar_id, external_event_id)
  where external_event_id is not null;

create index if not exists idx_events_calendar_time
  on events (calendar_id, start_time);

create index if not exists idx_events_external
  on events (external_event_id);

create index if not exists idx_events_start
  on events (start_time);

create index if not exists idx_events_instance
  on events (instance_id);

-- Sync run logs (optional)
create table if not exists sync_runs (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid references calendars(id) on delete cascade,
  status text,
  message text,
  run_at timestamptz default now()
);

-- RLS
alter table households enable row level security;
alter table household_members enable row level security;
alter table household_invites enable row level security;
alter table calendars enable row level security;
alter table events enable row level security;
alter table sync_runs enable row level security;

-- Helper: check membership
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from household_members hm
    where hm.household_id = hid
      and hm.user_id = auth.uid()
  );
$$;

-- Households policies
create policy "households_select" on households
  for select
  using (
    public.is_household_member(id)
    OR
    auth.uid() = owner_user_id
  );

create policy "households_insert" on households
  for insert
  with check (auth.uid() = owner_user_id);

create policy "households_update" on households
  for update
  using (auth.uid() = owner_user_id);

-- Household members policies
create policy "members_select" on household_members
  for select
  using (
    public.is_household_member(household_id)
    OR
    user_id = auth.uid()
  );

create policy "members_insert" on household_members
  for insert
  with check (
    public.is_household_member(household_id)
    OR
    exists (
      select 1
      from households h
      where h.id = household_id
        and h.owner_user_id = auth.uid()
    )
  );

create policy "members_update" on household_members
  for update
  using (public.is_household_member(household_id));

create policy "members_delete" on household_members
  for delete
  using (public.is_household_member(household_id));

-- Invites policies
create policy "invites_select" on household_invites
  for select
  using (public.is_household_member(household_id));

create policy "invites_insert" on household_invites
  for insert
  with check (public.is_household_member(household_id));

create policy "invites_update" on household_invites
  for update
  using (public.is_household_member(household_id));

create policy "invites_delete" on household_invites
  for delete
  using (public.is_household_member(household_id));

-- Calendars policies
create policy "calendars_select" on calendars
  for select
  using (public.is_household_member(household_id));

create policy "calendars_insert" on calendars
  for insert
  with check (public.is_household_member(household_id));

create policy "calendars_update" on calendars
  for update
  using (public.is_household_member(household_id));

create policy "calendars_delete" on calendars
  for delete
  using (public.is_household_member(household_id));

-- Events policies (join through calendars)
create policy "events_select" on events
  for select
  using (
    exists (
      select 1
      from calendars c
      where c.id = events.calendar_id
        and public.is_household_member(c.household_id)
    )
  );

create policy "events_insert" on events
  for insert
  with check (
    exists (
      select 1
      from calendars c
      where c.id = events.calendar_id
        and public.is_household_member(c.household_id)
    )
  );

create policy "events_update" on events
  for update
  using (
    exists (
      select 1
      from calendars c
      where c.id = events.calendar_id
        and public.is_household_member(c.household_id)
    )
  );

create policy "events_delete" on events
  for delete
  using (
    exists (
      select 1
      from calendars c
      where c.id = events.calendar_id
        and public.is_household_member(c.household_id)
    )
  );

-- Sync runs policies
create policy "sync_runs_select" on sync_runs
  for select
  using (
    exists (
      select 1
      from calendars c
      where c.id = sync_runs.calendar_id
        and public.is_household_member(c.household_id)
    )
  );

create policy "sync_runs_insert" on sync_runs
  for insert
  with check (
    exists (
      select 1
      from calendars c
      where c.id = sync_runs.calendar_id
        and public.is_household_member(c.household_id)
    )
  );

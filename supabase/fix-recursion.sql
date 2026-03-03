-- Fix infinite recursion in RLS - Run this in Supabase SQL Editor

-- Drop ALL existing policies first
drop policy if exists "households_select" on households;
drop policy if exists "households_insert" on households;
drop policy if exists "households_update" on households;

drop policy if exists "members_select" on household_members;
drop policy if exists "members_insert" on household_members;
drop policy if exists "members_update" on household_members;
drop policy if exists "members_delete" on household_members;

drop policy if exists "invites_select" on household_invites;
drop policy if exists "invites_insert" on household_invites;
drop policy if exists "invites_update" on household_invites;
drop policy if exists "invites_delete" on household_invites;

drop policy if exists "calendars_select" on calendars;
drop policy if exists "calendars_insert" on calendars;
drop policy if exists "calendars_update" on calendars;
drop policy if exists "calendars_delete" on calendars;

drop policy if exists "events_select" on events;
drop policy if exists "events_insert" on events;
drop policy if exists "events_update" on events;
drop policy if exists "events_delete" on events;

drop policy if exists "sync_runs_select" on sync_runs;
drop policy if exists "sync_runs_insert" on sync_runs;

-- Now drop the problematic helper function
drop function if exists public.is_household_member(uuid);

-- Households policies (simple, no helper function)
create policy "households_select" on households
  for select
  using (
    auth.uid() = owner_user_id
    OR
    exists (
      select 1 from household_members
      where household_members.household_id = households.id
        and household_members.user_id = auth.uid()
    )
  );

create policy "households_insert" on households
  for insert
  with check (auth.uid() = owner_user_id);

create policy "households_update" on households
  for update
  using (auth.uid() = owner_user_id);

-- Household members policies (simple, no helper function)
create policy "members_select" on household_members
  for select
  using (user_id = auth.uid());

create policy "members_insert" on household_members
  for insert
  with check (
    user_id = auth.uid()
    AND
    (
      -- Owner adding members to their household
      exists (
        select 1 from households
        where households.id = household_members.household_id
          and households.owner_user_id = auth.uid()
      )
      OR
      -- User joining via valid invite
      exists (
        select 1 from household_invites
        where household_invites.household_id = household_members.household_id
          and household_invites.redeemed_at is null
          and (household_invites.expires_at is null or household_invites.expires_at > now())
      )
    )
  );

create policy "members_update" on household_members
  for update
  using (
    exists (
      select 1 from household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
    )
  );

create policy "members_delete" on household_members
  for delete
  using (
    exists (
      select 1 from household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
    )
  );

-- Calendars policies (inline the membership check)
create policy "calendars_select" on calendars
  for select
  using (
    exists (
      select 1 from household_members
      where household_members.household_id = calendars.household_id
        and household_members.user_id = auth.uid()
    )
  );

create policy "calendars_insert" on calendars
  for insert
  with check (
    exists (
      select 1 from household_members
      where household_members.household_id = calendars.household_id
        and household_members.user_id = auth.uid()
    )
  );

create policy "calendars_update" on calendars
  for update
  using (
    exists (
      select 1 from household_members
      where household_members.household_id = calendars.household_id
        and household_members.user_id = auth.uid()
    )
  );

create policy "calendars_delete" on calendars
  for delete
  using (
    exists (
      select 1 from household_members
      where household_members.household_id = calendars.household_id
        and household_members.user_id = auth.uid()
    )
  );

-- Invites policies
create policy "invites_select" on household_invites
  for select
  using (
    exists (
      select 1 from household_members
      where household_members.household_id = household_invites.household_id
        and household_members.user_id = auth.uid()
    )
  );

create policy "invites_insert" on household_invites
  for insert
  with check (
    exists (
      select 1 from household_members
      where household_members.household_id = household_invites.household_id
        and household_members.user_id = auth.uid()
    )
  );

create policy "invites_update" on household_invites
  for update
  using (
    exists (
      select 1 from household_members
      where household_members.household_id = household_invites.household_id
        and household_members.user_id = auth.uid()
    )
  );

create policy "invites_delete" on household_invites
  for delete
  using (
    exists (
      select 1 from household_members
      where household_members.household_id = household_invites.household_id
        and household_members.user_id = auth.uid()
    )
  );

-- Events policies
create policy "events_select" on events
  for select
  using (
    exists (
      select 1 from calendars c
      inner join household_members hm on hm.household_id = c.household_id
      where c.id = events.calendar_id
        and hm.user_id = auth.uid()
    )
  );

create policy "events_insert" on events
  for insert
  with check (
    exists (
      select 1 from calendars c
      inner join household_members hm on hm.household_id = c.household_id
      where c.id = events.calendar_id
        and hm.user_id = auth.uid()
    )
  );

create policy "events_update" on events
  for update
  using (
    exists (
      select 1 from calendars c
      inner join household_members hm on hm.household_id = c.household_id
      where c.id = events.calendar_id
        and hm.user_id = auth.uid()
    )
  );

create policy "events_delete" on events
  for delete
  using (
    exists (
      select 1 from calendars c
      inner join household_members hm on hm.household_id = c.household_id
      where c.id = events.calendar_id
        and hm.user_id = auth.uid()
    )
  );

-- Sync runs policies
create policy "sync_runs_select" on sync_runs
  for select
  using (
    exists (
      select 1 from calendars c
      inner join household_members hm on hm.household_id = c.household_id
      where c.id = sync_runs.calendar_id
        and hm.user_id = auth.uid()
    )
  );

create policy "sync_runs_insert" on sync_runs
  for insert
  with check (
    exists (
      select 1 from calendars c
      inner join household_members hm on hm.household_id = c.household_id
      where c.id = sync_runs.calendar_id
        and hm.user_id = auth.uid()
    )
  );

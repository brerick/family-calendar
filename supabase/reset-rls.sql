-- Reset RLS policies for households - Run this in Supabase SQL Editor

-- Drop all existing policies
drop policy if exists "households_select" on households;
drop policy if exists "households_insert" on households;
drop policy if exists "households_update" on households;

drop policy if exists "members_select" on household_members;
drop policy if exists "members_insert" on household_members;
drop policy if exists "members_update" on household_members;
drop policy if exists "members_delete" on household_members;

-- Recreate households policies
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

-- Recreate household_members policies
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

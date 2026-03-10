-- Add support for household members without email/auth accounts (like young children)
-- Run this in Supabase SQL Editor AFTER add-family-features.sql

-- ============================================================================
-- HOUSEHOLD PROFILES - Represents all household members (with or without auth)
-- ============================================================================

create table if not exists household_profiles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade, -- Null for non-auth members like kids
  name text not null, -- Display name
  birth_date date, -- Optional, useful for kids
  relationship text, -- 'parent', 'child', 'spouse', 'other'
  avatar_url text,
  color text, -- For calendar display
  is_auth_user boolean default false, -- True if this profile has a user_id
  created_by uuid not null, -- Who added this profile
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(household_id, user_id), -- Can't have duplicate auth users in same household
  check (
    (is_auth_user = true and user_id is not null) or
    (is_auth_user = false and user_id is null)
  )
);

create index if not exists idx_household_profiles_household on household_profiles(household_id);
create index if not exists idx_household_profiles_user on household_profiles(user_id) where user_id is not null;

-- Enable RLS
alter table household_profiles enable row level security;

-- Household members can view all profiles in their household
drop policy if exists "profiles_select" on household_profiles;
create policy "profiles_select" on household_profiles
  for select
  using (
    household_id in (select public.user_household_ids())
  );

-- Household members can create profiles (add kids/family members)
drop policy if exists "profiles_insert" on household_profiles;
create policy "profiles_insert" on household_profiles
  for insert
  with check (
    household_id in (select public.user_household_ids())
    and created_by = auth.uid()
  );

-- Household members can update profiles
drop policy if exists "profiles_update" on household_profiles;
create policy "profiles_update" on household_profiles
  for update
  using (
    household_id in (select public.user_household_ids())
  );

-- Household members can delete profiles (except authenticated users must use invite system)
drop policy if exists "profiles_delete" on household_profiles;
create policy "profiles_delete" on household_profiles
  for delete
  using (
    household_id in (select public.user_household_ids())
    and is_auth_user = false -- Can only delete non-auth profiles directly
  );

-- ============================================================================
-- MIGRATE EXISTING DATA
-- ============================================================================

-- Create profiles for all existing household members
insert into household_profiles (household_id, user_id, name, is_auth_user, created_by, created_at)
select 
  hm.household_id,
  hm.user_id,
  coalesce(up.display_name, au.email, 'User'),
  true,
  hm.user_id, -- Self-created for existing members
  coalesce(hm.created_at, now())
from household_members hm
inner join auth.users au on au.id = hm.user_id
left join user_profiles up on up.id = hm.user_id
where not exists (
  select 1 from household_profiles hp
  where hp.household_id = hm.household_id
    and hp.user_id = hm.user_id
)
on conflict (household_id, user_id) do nothing;

-- ============================================================================
-- UPDATE EXISTING TABLES TO USE PROFILES
-- ============================================================================

-- Add profile_id to event_attendees (keeping user_id for backward compatibility)
alter table event_attendees add column if not exists profile_id uuid references household_profiles(id) on delete cascade;
create index if not exists idx_event_attendees_profile on event_attendees(profile_id);

-- Migrate existing attendees to use profiles
update event_attendees ea
set profile_id = (
  select hp.id
  from household_profiles hp
  where hp.user_id = ea.user_id
  limit 1
)
where ea.profile_id is null and ea.user_id is not null;

-- Add profile_id to chores (keeping assigned_to for backward compatibility)
alter table chores add column if not exists assigned_to_profile_id uuid references household_profiles(id) on delete set null;
create index if not exists idx_chores_assigned_profile on chores(assigned_to_profile_id);

-- Migrate existing chores to use profiles
update chores c
set assigned_to_profile_id = (
  select hp.id
  from household_profiles hp
  where hp.user_id = c.assigned_to
  limit 1
)
where c.assigned_to_profile_id is null and c.assigned_to is not null;

-- Add profile_id to meals (keeping assigned_to for backward compatibility)
alter table meals add column if not exists assigned_to_profile_id uuid references household_profiles(id) on delete set null;
create index if not exists idx_meals_assigned_profile on meals(assigned_to_profile_id);

-- Migrate existing meals to use profiles
update meals m
set assigned_to_profile_id = (
  select hp.id
  from household_profiles hp
  where hp.user_id = m.assigned_to
  limit 1
)
where m.assigned_to_profile_id is null and m.assigned_to is not null;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to automatically create a profile when someone joins a household
create or replace function public.handle_new_household_member()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Create a profile for the new household member
  insert into public.household_profiles (household_id, user_id, name, is_auth_user, created_by)
  select 
    new.household_id,
    new.user_id,
    coalesce(up.display_name, au.email, 'User'),
    true,
    new.user_id
  from auth.users au
  left join user_profiles up on up.id = au.id
  where au.id = new.user_id
  on conflict (household_id, user_id) do nothing;
  
  return new;
end;
$$;

-- Create trigger to automatically create profile for new household members
drop trigger if exists on_household_member_added on household_members;
create trigger on_household_member_added
  after insert on household_members
  for each row
  execute function public.handle_new_household_member();

-- Updated function to get available household members (now uses profiles)
create or replace function get_available_profiles(
  p_household_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz
)
returns table(
  profile_id uuid,
  name text,
  is_auth_user boolean,
  is_busy boolean
)
language sql
stable
security definer
as $$
  select 
    hp.id as profile_id,
    hp.name,
    hp.is_auth_user,
    exists(
      select 1 from events e
      inner join calendars c on c.id = e.calendar_id
      inner join event_attendees ea on ea.event_id = e.id
      where c.household_id = p_household_id
        and (ea.profile_id = hp.id or (ea.user_id = hp.user_id and hp.user_id is not null))
        and ea.status = 'accepted'
        and e.start_time < p_end_time
        and e.end_time > p_start_time
    ) as is_busy
  from household_profiles hp
  where hp.household_id = p_household_id
  order by hp.is_auth_user desc, hp.name;
$$;

-- Function to get household profile by user_id or profile_id
create or replace function get_household_profile(
  p_household_id uuid,
  p_user_id uuid default null,
  p_profile_id uuid default null
)
returns table(
  id uuid,
  household_id uuid,
  user_id uuid,
  name text,
  birth_date date,
  relationship text,
  avatar_url text,
  color text,
  is_auth_user boolean
)
language sql
stable
security definer
as $$
  select 
    hp.id,
    hp.household_id,
    hp.user_id,
    hp.name,
    hp.birth_date,
    hp.relationship,
    hp.avatar_url,
    hp.color,
    hp.is_auth_user
  from household_profiles hp
  where hp.household_id = p_household_id
    and (
      (p_profile_id is not null and hp.id = p_profile_id)
      or (p_user_id is not null and hp.user_id = p_user_id)
    )
  limit 1;
$$;

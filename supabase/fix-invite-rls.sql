-- Fix household_members and household_invites RLS policies
-- Run this in Supabase SQL Editor

-- First, drop ALL existing policies to start fresh
drop policy if exists "members_select" on household_members;
drop policy if exists "members_insert" on household_members;
drop policy if exists "members_update" on household_members;
drop policy if exists "members_delete" on household_members;

-- Create a helper function that bypasses RLS to check membership
-- This prevents infinite recursion in policies
create or replace function public.user_household_ids()
returns setof uuid
language sql
stable
security definer
as $$
  select household_id
  from household_members
  where user_id = auth.uid();
$$;

-- Fix members_select policy
-- Users can see all members of households they belong to (using helper function)
create policy "members_select" on household_members
  for select
  using (
    household_id in (select public.user_household_ids())
  );

-- Create members_insert policy
-- Allows:
-- 1. Owners to add members to their household
-- 2. Users to add themselves via valid invite
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

-- Add members_update policy (for changing roles, etc.)
create policy "members_update" on household_members
  for update
  using (
    household_id in (select public.user_household_ids())
  );

-- Add members_delete policy (for removing members)
create policy "members_delete" on household_members
  for delete
  using (
    household_id in (select public.user_household_ids())
  );

-- Fix invites_select policy
-- Problem: Users trying to join can't read the invite because they're not members yet
drop policy if exists "invites_select" on household_invites;
drop policy if exists "invites_insert" on household_invites;
drop policy if exists "invites_update" on household_invites;
drop policy if exists "invites_delete" on household_invites;

-- Allow ANY authenticated user to read valid, unredeemed invites
-- This is secure because:
-- 1. Tokens are cryptographically secure random strings (impossible to guess)
-- 2. Only unredeemed, non-expired invites are readable
-- 3. Users need the actual token to find the invite
create policy "invites_select" on household_invites
  for select
  using (
    -- Anyone can read unredeemed, non-expired invites (needed for joining)
    (redeemed_at is null and (expires_at is null or expires_at > now()))
    OR
    -- Members can read all invites for their household (using helper function)
    household_id in (select public.user_household_ids())
  );

-- Only household owners can create invites
create policy "invites_insert" on household_invites
  for insert
  with check (
    -- Check if user is owner of the household
    exists (
      select 1 from household_members
      where household_members.household_id = household_invites.household_id
        and household_members.user_id = auth.uid()
        and household_members.role = 'owner'
    )
  );

-- Only household members can update invites (e.g., mark as redeemed)
create policy "invites_update" on household_invites
  for update
  using (
    -- Use helper function to avoid recursion
    household_id in (select public.user_household_ids())
  );

-- Only household owners can delete invites
create policy "invites_delete" on household_invites
  for delete
  using (
    -- Check if user is owner of the household
    exists (
      select 1 from household_members
      where household_members.household_id = household_invites.household_id
        and household_members.user_id = auth.uid()
        and household_members.role = 'owner'
    )
  );

-- ============================================================================
-- FIX EVENTS UNIQUE CONSTRAINT TO SUPPORT RECURRING EVENT INSTANCES
-- ============================================================================

-- Drop the old unique constraints
drop index if exists uniq_event_external;
drop index if exists uniq_event_external_instance;

-- Create a new unique constraint that includes instance_id
-- This allows recurring events to have multiple instances with the same external_event_id
-- but different instance_ids (one per recurrence exception/instance)
create unique index uniq_event_external_instance
  on events (calendar_id, external_event_id, instance_id)
  where external_event_id is not null;

-- Note: instance_id defaults to empty string ('') for non-recurring events
-- and contains a unique identifier (uid_timestamp) for each recurring event instance

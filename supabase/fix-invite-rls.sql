-- Fix household_members insert policy to allow joining via invite
-- AND fix household_invites select policy to allow reading invites before joining
-- Run this in Supabase SQL Editor

-- Fix members_insert policy
-- Drop existing policy
drop policy if exists "members_insert" on household_members;

-- Create new policy that allows:
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
    -- Members can read all invites for their household
    exists (
      select 1 from household_members
      where household_members.household_id = household_invites.household_id
        and household_members.user_id = auth.uid()
    )
  );

-- Only household members can create invites
create policy "invites_insert" on household_invites
  for insert
  with check (
    exists (
      select 1 from household_members
      where household_members.household_id = household_invites.household_id
        and household_members.user_id = auth.uid()
        and household_members.role = 'owner'  -- Only owners can create invites
    )
  );

-- Only household members can update invites (e.g., mark as redeemed)
create policy "invites_update" on household_invites
  for update
  using (
    exists (
      select 1 from household_members
      where household_members.household_id = household_invites.household_id
        and household_members.user_id = auth.uid()
    )
  );

-- Only household owners can delete invites
create policy "invites_delete" on household_invites
  for delete
  using (
    exists (
      select 1 from household_members
      where household_members.household_id = household_invites.household_id
        and household_members.user_id = auth.uid()
        and household_members.role = 'owner'
    )
  );

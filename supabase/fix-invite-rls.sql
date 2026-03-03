-- Fix household_members insert policy to allow joining via invite
-- Run this in Supabase SQL Editor

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

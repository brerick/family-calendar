-- Fix RLS policy for household_members insert
-- This allows the household owner to add the first member (themselves)

drop policy if exists "members_insert" on household_members;

create policy "members_insert" on household_members
  for insert
  with check (
    -- Allow if user is already a household member
    public.is_household_member(household_id)
    OR
    -- Allow if user is the owner of the household
    exists (
      select 1
      from households h
      where h.id = household_id
        and h.owner_user_id = auth.uid()
    )
  );

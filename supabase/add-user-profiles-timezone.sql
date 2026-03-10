-- Add user profiles table for timezone preferences
-- Run this in Supabase SQL Editor

-- Create user_profiles table
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'America/Los_Angeles',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS on user_profiles
alter table user_profiles enable row level security;

-- Users can only read/update their own profile
drop policy if exists "users_select_own_profile" on user_profiles;
create policy "users_select_own_profile" on user_profiles
  for select
  using (auth.uid() = id);

drop policy if exists "users_insert_own_profile" on user_profiles;
create policy "users_insert_own_profile" on user_profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "users_update_own_profile" on user_profiles;
create policy "users_update_own_profile" on user_profiles
  for update
  using (auth.uid() = id);

-- Create a function to automatically create a profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.user_profiles (id, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'timezone', 'America/Los_Angeles')
  );
  return new;
end;
$$;

-- Create trigger to automatically create profile for new users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Backfill existing users with default timezone
insert into user_profiles (id, timezone)
select id, 'America/Los_Angeles'
from auth.users
where id not in (select id from user_profiles)
on conflict (id) do nothing;

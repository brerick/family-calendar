-- Test RLS and auth.uid() - Run this in Supabase SQL Editor while logged in

-- First, let's check if auth.uid() works
select auth.uid() as my_user_id;

-- If the above returns NULL, you're not authenticated in the SQL editor
-- Try this query after authenticating via your app

-- Test insert with explicit user ID (replace with your actual user ID from auth.users table)
-- This should work if RLS is set up correctly
insert into households (name, owner_user_id)
values ('Test Household', auth.uid())
returning *;

-- If the above fails, temporarily disable RLS to test:
-- alter table households disable row level security;
-- Then try the insert again
-- Then re-enable: alter table households enable row level security;

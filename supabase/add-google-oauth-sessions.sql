-- Create table for temporary Google OAuth sessions
create table if not exists google_oauth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  household_id uuid references households(id) on delete cascade,
  refresh_token text not null,
  access_token text,
  expires_at timestamptz not null default now() + interval '15 minutes',
  created_at timestamptz default now()
);

-- Index for cleanup
create index if not exists idx_google_oauth_sessions_expires on google_oauth_sessions(expires_at);

-- RLS policies
alter table google_oauth_sessions enable row level security;

-- Users can only access their own sessions
create policy google_oauth_sessions_select_own
  on google_oauth_sessions for select
  using (user_id = auth.uid());

create policy google_oauth_sessions_delete_own
  on google_oauth_sessions for delete
  using (user_id = auth.uid());

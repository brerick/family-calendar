-- Add family-centric features: Availability, Templates, Meals, Chores
-- Run this in Supabase SQL Editor

-- ============================================================================
-- EVENT ATTENDEES - Track who's attending which events
-- ============================================================================

create table if not exists event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade not null,
  user_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'maybe')),
  response_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(event_id, user_id)
);

create index idx_event_attendees_event on event_attendees(event_id);
create index idx_event_attendees_user on event_attendees(user_id);

-- Enable RLS
alter table event_attendees enable row level security;

-- Household members can see attendees for their household's events
create policy "attendees_select" on event_attendees
  for select
  using (
    exists (
      select 1 from events e
      inner join calendars c on c.id = e.calendar_id
      inner join household_members hm on hm.household_id = c.household_id
      where e.id = event_attendees.event_id
        and hm.user_id = auth.uid()
    )
  );

-- Users can update their own attendance status
create policy "attendees_update_own" on event_attendees
  for update
  using (user_id = auth.uid());

-- Event creators can manage all attendees
create policy "attendees_insert" on event_attendees
  for insert
  with check (
    exists (
      select 1 from events e
      inner join calendars c on c.id = e.calendar_id
      inner join household_members hm on hm.household_id = c.household_id
      where e.id = event_attendees.event_id
        and hm.user_id = auth.uid()
    )
  );

create policy "attendees_delete" on event_attendees
  for delete
  using (
    exists (
      select 1 from events e
      inner join calendars c on c.id = e.calendar_id
      inner join household_members hm on hm.household_id = c.household_id
      where e.id = event_attendees.event_id
        and hm.user_id = auth.uid()
    )
  );

-- ============================================================================
-- EVENT TEMPLATES - Reusable event templates
-- ============================================================================

create table if not exists event_templates (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade not null,
  name text not null,
  title text not null,
  description text,
  location text,
  duration_minutes integer default 60,
  all_day boolean default false,
  default_attendees uuid[] default '{}', -- Array of user_ids
  color text,
  category text check (category in ('event', 'chore', 'meal', 'other')),
  icon text,
  created_by uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_templates_household on event_templates(household_id);
create index idx_templates_category on event_templates(category);

-- Enable RLS
alter table event_templates enable row level security;

-- Household members can view templates
create policy "templates_select" on event_templates
  for select
  using (
    household_id in (select public.user_household_ids())
  );

-- Household members can create templates
create policy "templates_insert" on event_templates
  for insert
  with check (
    household_id in (select public.user_household_ids())
    and created_by = auth.uid()
  );

-- Template creator or household owners can update
create policy "templates_update" on event_templates
  for update
  using (
    household_id in (select public.user_household_ids())
    and (
      created_by = auth.uid()
      or exists (
        select 1 from household_members
        where household_members.household_id = event_templates.household_id
          and household_members.user_id = auth.uid()
          and household_members.role = 'owner'
      )
    )
  );

-- Template creator or household owners can delete
create policy "templates_delete" on event_templates
  for delete
  using (
    household_id in (select public.user_household_ids())
    and (
      created_by = auth.uid()
      or exists (
        select 1 from household_members
        where household_members.household_id = event_templates.household_id
          and household_members.user_id = auth.uid()
          and household_members.role = 'owner'
      )
    )
  );

-- ============================================================================
-- MEALS - Meal planning
-- ============================================================================

create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade not null,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  title text not null,
  description text,
  recipe_url text,
  cooking_time_minutes integer,
  ingredients jsonb, -- Array of {name, quantity, unit}
  assigned_to uuid, -- Who's cooking
  notes text,
  created_by uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_meals_household on meals(household_id);
create index idx_meals_date on meals(date);
create index idx_meals_assigned on meals(assigned_to);

-- Enable RLS
alter table meals enable row level security;

-- Household members can view meals
create policy "meals_select" on meals
  for select
  using (
    household_id in (select public.user_household_ids())
  );

-- Household members can create meals
create policy "meals_insert" on meals
  for insert
  with check (
    household_id in (select public.user_household_ids())
    and created_by = auth.uid()
  );

-- Household members can update meals
create policy "meals_update" on meals
  for update
  using (
    household_id in (select public.user_household_ids())
  );

-- Household members can delete meals
create policy "meals_delete" on meals
  for delete
  using (
    household_id in (select public.user_household_ids())
  );

-- ============================================================================
-- CHORES - Chore tracking
-- ============================================================================

create table if not exists chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade not null,
  title text not null,
  description text,
  assigned_to uuid not null,
  due_date date,
  completed boolean default false,
  completed_at timestamptz,
  completed_by uuid,
  recurrence_rule text, -- Same format as events (RRULE)
  points integer default 0, -- Optional reward system
  category text, -- 'cleaning', 'dishes', 'laundry', 'yard', 'pets', 'other'
  estimated_minutes integer,
  created_by uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_chores_household on chores(household_id);
create index idx_chores_assigned on chores(assigned_to);
create index idx_chores_due on chores(due_date);
create index idx_chores_completed on chores(completed);

-- Enable RLS
alter table chores enable row level security;

-- Household members can view chores
create policy "chores_select" on chores
  for select
  using (
    household_id in (select public.user_household_ids())
  );

-- Household members can create chores
create policy "chores_insert" on chores
  for insert
  with check (
    household_id in (select public.user_household_ids())
    and created_by = auth.uid()
  );

-- Household members can update chores
create policy "chores_update" on chores
  for update
  using (
    household_id in (select public.user_household_ids())
  );

-- Household members can delete chores
create policy "chores_delete" on chores
  for delete
  using (
    household_id in (select public.user_household_ids())
  );

-- ============================================================================
-- SHOPPING LIST - Auto-generated from meals
-- ============================================================================

create table if not exists shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade not null,
  name text not null,
  quantity text,
  category text, -- 'produce', 'dairy', 'meat', 'pantry', 'frozen', 'other'
  checked boolean default false,
  meal_id uuid references meals(id) on delete set null, -- Source meal if auto-generated
  added_by uuid not null,
  checked_by uuid,
  checked_at timestamptz,
  created_at timestamptz default now()
);

create index idx_shopping_household on shopping_list_items(household_id);
create index idx_shopping_checked on shopping_list_items(checked);

-- Enable RLS
alter table shopping_list_items enable row level security;

-- Household members can view shopping list
create policy "shopping_select" on shopping_list_items
  for select
  using (
    household_id in (select public.user_household_ids())
  );

-- Household members can add items
create policy "shopping_insert" on shopping_list_items
  for insert
  with check (
    household_id in (select public.user_household_ids())
    and added_by = auth.uid()
  );

-- Household members can update items
create policy "shopping_update" on shopping_list_items
  for update
  using (
    household_id in (select public.user_household_ids())
  );

-- Household members can delete items
create policy "shopping_delete" on shopping_list_items
  for delete
  using (
    household_id in (select public.user_household_ids())
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get available household members for a time slot
create or replace function get_available_members(
  p_household_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz
)
returns table(user_id uuid, email text, is_busy boolean)
language sql
stable
security definer
as $$
  select 
    hm.user_id,
    au.email,
    exists(
      select 1 from events e
      inner join calendars c on c.id = e.calendar_id
      inner join event_attendees ea on ea.event_id = e.id
      where c.household_id = p_household_id
        and ea.user_id = hm.user_id
        and ea.status = 'accepted'
        and e.start_time < p_end_time
        and e.end_time > p_start_time
    ) as is_busy
  from household_members hm
  inner join auth.users au on au.id = hm.user_id
  where hm.household_id = p_household_id;
$$;

# Family Calendar Aggregator — Product Requirements Document (PRD)

**Author:** Brad Erickson  
**Status:** Draft — MVP Build Spec  
**Last Updated:** 2026-02-28  
**Stack:** Next.js + Supabase + Tailwind + ShadCN + n8n (post-MVP)  
**Auth:** Supabase Auth (email + password)

---

# 1. Overview

## Purpose
Build a unified family calendar web application that aggregates events from:

- Google Calendars
- iCal (.ics) feeds
- Manual entries

The app normalizes events into a single Supabase database and renders them in a unified calendar UI.

---

## Goals
- Single unified calendar view
- Fast loading UI
- Background syncing
- Simple filtering
- Expandable automation architecture

---

## Non-Goals (MVP)
- Editing external calendar events
- Native mobile app
- Notifications
- Offline mode

---

# 2. Users

## Primary Users
Household members managing shared schedules.

## Secondary Users (Future)
- Caregivers
- Families
- Teams
- Shift workers

---

# 3. Functional Requirements

## Calendar Management

Users can:

- Connect Google Calendar
- Add iCal URL
- Create manual calendar
- Assign color and name
- Share calendars within a household
- Invite members via invite link

System must:

- Store metadata for each calendar
- Support multiple calendars per household
- Support household roles: `owner`, `member`, `viewer`
- Persist sync state

---

## Event Handling

System must:

- Normalize event format across providers
- Deduplicate events
- Support:
  - all-day events
  - time zones
  - recurring events (instance-level)
  - cancellations

---

## Sync Engine

System must:

- Sync Google calendars
- Sync iCal feeds
- Detect updates
- Detect deletions
- Avoid duplicates

---

## UI Requirements

User must be able to:

- View unified household calendar
- Toggle calendars
- See color-coded events
- Click event for details

---

# 4. Technical Architecture

## Stack

### Frontend
- Next.js
- Tailwind
- ShadCN
- FullCalendar React

### Backend
- Supabase (Postgres + Auth + Edge Functions)

### Automation (Post-MVP)
- n8n

---

## Data Flow

### MVP Architecture

```
External Calendars → App Sync Jobs → Supabase DB → UI
```

### Post-MVP Architecture

```
External Calendars → n8n → Supabase DB → UI
```

---

# 5. Database Schema (Supabase)

## households table (new)

```sql
create table households (
  id uuid primary key default gen_random_uuid(),
  name text,
  owner_user_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## household_members table (new)

```sql
create table household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id),
  user_id uuid,
  role text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Role values: `owner`, `member`, `viewer`

---

## calendars table

```sql
create table calendars (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id),
  name text,
  type text,
  color text,
  external_id text,
  ics_url text,
  refresh_token text,
  sync_cursor text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## events table

```sql
create table events (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid references calendars(id),
  external_event_id text,
  instance_id text,
  title text,
  description text,
  location text,
  start_time timestamptz,
  end_time timestamptz,
  all_day boolean,
  status text,
  recurrence_rule text,
  updated_at timestamptz,
  raw_payload jsonb
);
```

---

## Indexes

```sql
create index idx_events_calendar_time on events(calendar_id, start_time);
create index idx_events_external on events(external_event_id);
create index idx_events_start on events(start_time);
create index idx_events_instance on events(instance_id);
```

---

## Optional Sync Log Table

```sql
create table sync_runs (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid,
  status text,
  message text,
  run_at timestamptz default now()
);
```

---

# 6. Sync Strategy

## MVP Sync Engine
Runs scheduled server jobs.

| Source | Frequency |
|--------|-----------|
| Google | Every 10 minutes |
| iCal | Every 60 minutes |

---

## Upsert Logic

Unique identifier:

```
calendar_id + external_event_id
```

Rules:

| Condition | Action |
|----------|--------|
| Exists | Update |
| Missing | Insert |
| Removed | Mark cancelled |

---

# 7. API Endpoints

## Sync

```
POST /api/sync/google
POST /api/sync/ical
```

---

## Calendars

```
GET /api/calendars
POST /api/calendars
DELETE /api/calendars/:id
```

---

## Events

```
GET /api/events?start=&end=
```

Returns normalized events for UI.

---

# 8. Security Requirements

System must:

- Encrypt refresh tokens
- Keep tokens server-side
- Validate ICS URLs
- Rate limit sync endpoints
- Prevent token exposure
- Enforce household-based access control

---

# 9. MVP Milestones

## Phase 1 — Core System
- DB schema
- Manual calendars
- Calendar UI
- Household sharing model

## Phase 2 — iCal Support
- ICS parser
- Sync endpoint
- Scheduled jobs

## Phase 3 — Google Integration
- OAuth flow
- Token storage
- Incremental sync

## Phase 4 — Hardening
- Logging
- Retry logic
- Error handling
- Status indicators

---

# 9.1 Acceptance Criteria

## Phase 1 — Core System
- User can sign up and log in with email + password.
- User can create a household and becomes `owner`.
- Owner can create manual calendars and events.
- Owner can generate an invite link and add a `member` or `viewer`.
- Household members see the same unified calendar with color-coded events.

## Phase 2 — iCal Support
- User can add a valid ICS URL and it appears as a calendar.
- Sync job ingests events within the time window and upserts without duplicates.
- Cancellations or removals set event `status` to `cancelled`.
- Recurring ICS instances are stored with `instance_id`.

## Phase 3 — Google Integration
- OAuth flow connects a Google calendar and stores tokens server-side.
- Incremental sync uses `singleEvents=true` and respects the time window.
- Updates and deletions in Google are reflected in the unified calendar.
- Recurring Google instances are stored with `instance_id`.

## Phase 4 — Hardening
- Sync failures are logged with calendar and error details.
- Retries occur automatically on transient errors.
- UI shows last sync status per calendar.

---

# 9.2 QA Test Plan (Manual + Playwright)

## Phase 1 — Core System

Manual QA:
- Sign up with email + password, then log out and log in again.
- Create a household and confirm you are shown as `owner`.
- Create a manual calendar with a color and name.
- Create a manual event and verify it appears on the calendar view.
- Generate an invite link, open it in a new browser profile, and join as `member`.
- As `viewer`, confirm you can view but not edit calendars or events.

Playwright:
- Auth flow: sign up, log in, log out, log in again.
- Household flow: create household, invite link join, role-based UI visibility.
- Calendar flow: create manual calendar, create event, verify it appears.

## Phase 2 — iCal Support

Manual QA:
- Add a valid ICS URL and confirm events appear in the unified calendar.
- Add an invalid ICS URL and confirm an error is shown.
- Remove an event from the ICS source and confirm it shows as `cancelled`.
- Verify recurring instances appear as separate events.

Playwright:
- Stub a test ICS feed and add it as a calendar.
- Validate that events render within the time window.
- Validate that removed events are marked `cancelled`.

## Phase 3 — Google Integration

Manual QA:
- Connect a Google calendar via OAuth and confirm events appear.
- Update a Google event and verify the change appears after sync.
- Delete a Google event and verify it is marked `cancelled`.
- Verify recurring instances appear as separate events.

Playwright:
- Mock Google API responses for list/instances endpoints.
- Validate incremental sync updates and deletions are reflected in UI.

## Phase 4 — Hardening

Manual QA:
- Trigger a sync failure and confirm the error is logged.
- Confirm retry behavior and final sync status in UI.

Playwright:
- Mock API failures, assert retry attempts and status indicators.

---

# 10. Post-MVP Roadmap (n8n Migration)

Move syncing from app → n8n workflows.

Benefits:

- Visual logs
- Retry control
- Observability
- Automation expansion

Planned workflows:

- Google Sync
- ICS Sync
- Daily Digest
- Conflict Detection
- Reminder Alerts

---

# 11. Success Metrics

MVP is successful when:

- At least 2 calendar sources connected
- Events load under 500ms
- Sync success rate above 99%
- No duplicate events appear

---

# 12. Future Enhancements

- Push notifications
- SMS reminders
- Availability heatmap
- AI summaries
- PWA install
- Bi-directional sync
- Roles and permissions

---

# 13. Risks & Mitigation

| Risk | Mitigation |
|------|-------------|
| Google API limits | Incremental sync |
| ICS format variance | Tolerant parser |
| Duplicate events | Composite keys |
| Token expiration | Refresh tokens |

---

# 14. Open Questions

- Should events be editable locally?
- Should manual edits override external sources?
- Should events support comments?
- Should offline mode be supported?
- Should invite links be reusable or one-time?

---

# 15. Definition of Done

MVP is complete when:

- User connects Google and ICS calendars
- Events sync automatically
- UI shows unified view
- No duplicate events exist
- Sync runs without manual trigger

---

**END OF DOCUMENT**

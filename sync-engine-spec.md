# Sync Engine Specification — Family Calendar Aggregator

**Author:** Brad Erickson  
**Status:** Draft — Build Spec  
**Last Updated:** 2026-02-28  
**Applies To:** MVP (app-owned sync) + Post-MVP (n8n-owned sync)  
**DB:** Supabase Postgres

---

## 1. Scope

This document specifies the sync engine that ingests external calendar data (Google Calendar + iCal/ICS), normalizes it, and upserts it into the `events` table associated to a `calendars` record.

Two execution modes are supported:

- **MVP Mode:** Next.js server jobs (cron hits API routes / Edge Functions)
- **Fat Follow Mode:** n8n workflows call the same core logic (either directly in n8n Code nodes or via HTTP to app endpoints)

The **UI must never call external APIs at runtime**. UI reads from Supabase only.

---

## 2. Goals & Non-Goals

### Goals
- Incremental syncing where possible (Google)
- Deterministic deduplication and idempotent upserts
- Correct handling of cancellations/deletions
- Correct handling of recurring events (minimum viable correctness for MVP)
- Stable performance for multi-calendar households

### Non-Goals (MVP)
- Bi-directional writeback to Google/ICS
- Perfect recurrence expansion across all edge cases
- Historical diffing beyond current time window
- Invitee/attendee management

---

## 3. Definitions

### Calendar Types
- `google`: Google Calendar API source
- `ical`: ICS URL source
- `manual`: user-entered events (not handled by sync engine)

### Normalized Event
A database row in `events` representing either:
- a single event instance (including a single expanded recurrence instance), or
- a top-level recurring series placeholder (optional; see recurrence strategy)

### Canonical Keys
- `calendar_id`: FK to `calendars`
- `external_event_id`: stable identifier from upstream (Google event id; ICS UID)
- `instance_key`: optional additional discriminator for recurrence instances (see §8)

---

## 4. Data Model Requirements

### calendars table fields used by sync
- `id`
- `type`
- `external_id` (Google calendarId)
- `ics_url`
- `refresh_token` (Google OAuth; encrypted at rest)
- `sync_cursor` (Google syncToken or updatedMin; also may store ICS etag/last_modified)

### events table required fields
- `calendar_id`
- `external_event_id`
- `title`
- `description`
- `location`
- `start_time`
- `end_time`
- `all_day`
- `status` (e.g., `confirmed`, `cancelled`)
- `recurrence_rule` (optional)
- `updated_at`
- `raw_payload` (jsonb)

### Additional recommended columns (add in Phase 4 if needed)
If you want recurrence to be robust and deletions clean, add:
- `instance_start timestamptz` (or reuse `start_time` as instance start)
- `instance_id text` (Google: `id` for series + `recurringEventId` and `originalStartTime`; ICS: `UID` + recurrenceId)
- `source_updated_at timestamptz`
- `hash text` (content hash for change detection)

You can still ship MVP without these, but recurrence correctness improves if you add at least `instance_id`.

---

## 5. Sync Scheduling

### MVP (app-owned)
- Google: every **10 minutes**
- iCal: every **60 minutes**
- Manual: no sync

### Post-MVP (n8n-owned)
- Same frequencies
- Add “retry on failure” and “dead-letter logging” behavior

---

## 6. Sync Execution Overview

Each sync run follows the same phases:

1. **List calendars** eligible for a given sync type (`google` or `ical`)
2. For each calendar:
   1. Fetch upstream changes/events within a configured window
   2. Normalize into the canonical event shape
   3. Upsert into `events`
   4. Mark deletions/cancellations
   5. Update `sync_cursor`
   6. Record run logs (optional `sync_runs`)

The sync engine must be **idempotent**: running twice should result in the same DB state.

---

## 7. Time Window Strategy

To avoid storing infinite history and to keep the UI fast:

### Default Window (MVP)
- **Past:** 60 days
- **Future:** 365 days

This can be adjusted per household.

Rationale:
- Most family planning needs near-term + next year (school, vacations)
- Keeps storage and sync times manageable

---

## 8. Recurrence Strategy (MVP vs Hardening)

Recurring events are the trickiest part. The simplest reliable approach for MVP is:

### MVP Recurrence Approach
Store **expanded instances** within the time window whenever possible.

- **Google:** request instances via `singleEvents=true` so Google expands recurring events into instances. This yields stable, display-ready events with correct exception handling for most cases.
- **ICS:** expand recurring rules into instances within the time window using a recurrence library or limited expansion logic.

#### Instance Identity
For correct dedupe, each instance must have a unique key.

Recommended:

- **Google instance key:**  
  `external_event_id = <event.id>` (instance id returned by API)  
  Store the top-level series id in `raw_payload.recurringEventId` if present.

- **ICS instance key:**  
  Use:
  - `UID` for base series
  - If `RECURRENCE-ID` exists, treat each as an instance with unique key:  
    `external_event_id = UID + "::" + RECURRENCE-ID`

If you do not include `RECURRENCE-ID`, you risk overwriting instances.

### Phase 4 Hardening (Optional)
Store both:
- a “series” record (UID or recurringEventId)
- instance records keyed by (series_id + instance_start)

This allows better reconciliation of exceptions and deletions.

---

## 9. Deduplication & Upsert Rules

### Unique Constraint (Recommended)
Add a DB constraint to enforce idempotency:

```sql
create unique index uniq_event_external
on events (calendar_id, external_event_id);
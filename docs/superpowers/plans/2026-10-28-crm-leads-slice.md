# CRM Leads Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan is executed inline by the session that wrote it. The behaviour each piece must show is written as test cases, and the code is written straight into the files listed.

- **Goal:** one lead pipeline in the admin. Families, leads and a timeline live in the database, WhatsApp chats and assessment bookings feed them automatically, and Today, Leads and Family screens are built for phones.
- **Architecture:**
  - **Database.** Postgres joins the records together. New tables: `families`, `leads`, `lead_activities` and a one-row `crm_settings`.
  - **Triggers.** Security-definer trigger functions on `consultation_bookings`, `whatsapp_conversations` and the three web-form tables create a family's single open lead, or move it forward.
  - **Backfill.** A one-time backfill replays existing chats and bookings in time order through the same functions.
  - **UI.** React pages read with supabase-js directly, following the project's convention, through a typed client for the new tables.
- **Tech stack:** Postgres on Supabase (Lovable Cloud), the drizzle-kit migration track, React 18, Vite, TypeScript, shadcn/ui, Tailwind, date-fns and supabase-js v2.
- **Spec:** `docs/superpowers/specs/2026-10-28-crm-redesign-design.md`, sections 5 and 6.

## Global Constraints

- **Migration track.** Migrations go in `drizzle/migrations` with a journal entry. Lovable applies this track, and `drizzle.__drizzle_migrations` already holds 0000–0003.
- **Idempotent.** The migration must be safe to run twice: `IF NOT EXISTS`, `OR REPLACE`, `DROP … IF EXISTS`, `ON CONFLICT DO NOTHING`.
- **Never block the original write.** CRM triggers must not stop the insert or update they hang off. Each trigger body runs inside `BEGIN … EXCEPTION WHEN OTHERS THEN RAISE WARNING … END`.
- **Access.** New tables are admin-only through `public.has_role(auth.uid(), 'admin')`, with explicit `GRANT`s as `drizzle/migrations/0001_crm_grants.sql` does.
- **Generated types.** Do not hand-edit `src/integrations/supabase/types.ts`. New tables are typed in `src/components/admin/crm/crmTypes.ts` until Lovable regenerates the file.
- **Phone numbers** are stored as international digits (`2547…`). The SQL `crm_normalize_phone` and the TS `normalizePhone` must give the same result for every test case.
- **No new dependencies** and no lockfile changes. Use `useEffect`/`useState` with supabase-js, as the rest of `src/` does.
- **Checks.** Verify with `npx tsc --noEmit -p tsconfig.app.json` and `npm run build`. Commit only when the user asks.
- **Copy.** No emoji. Use the Lana theme tokens already in Tailwind (`primary`, `secondary`, `muted`).
- **Personal data.** Spreadsheets with personal data stay outside the repo.
- **Decisions (28 Oct):**
  - A student no-show or late cancellation counts as a session taken.
  - The multi-student tracker is the current payment sheet.
  - Nobody replies from the WhatsApp Business app.
  - New leads go to the learning coordinator by default and can be reassigned.
  - Tutors confirm their own lessons, and admins can confirm on their behalf.

## File map

| File | Responsibility |
|---|---|
| `drizzle/migrations/0004_crm_leads.sql` | Schema, functions, triggers, RLS, backfill |
| `drizzle/migrations/meta/_journal.json` | Add entry `idx 4` |
| `drizzle/migrations/meta/0004_snapshot.json` | Empty snapshot chained to 0003 |
| `src/components/admin/crm/crmTypes.ts` | Row types, `CrmDatabase`, typed client `crmDb` |
| `src/components/admin/crm/crmMeta.ts` | Stages, channels, lost reasons, Meta event map, phone and date helpers |
| `src/components/admin/crm/useCrmData.ts` | Hooks: `useOpenLeads`, `useTeam`, `useFamily` |
| `src/components/admin/crm/CrmShell.tsx` | Layout: top bar, desktop rail, phone bottom bar |
| `src/components/admin/crm/LeadRow.tsx` | One lead in a list |
| `src/components/admin/crm/NewLeadDialog.tsx` | The "+ Lead" form, with phone lookup |
| `src/components/admin/crm/LogCallDialog.tsx` | Log a call or note |
| `src/components/admin/crm/NextStepEditor.tsx` | Next step: text, when, who |
| `src/components/admin/crm/AssessmentCard.tsx` | Assessment time and outcome form |
| `src/components/admin/crm/CloseLeadDialog.tsx` | Won or Lost, with a reason |
| `src/components/admin/crm/FamilyTimeline.tsx` | Activities and WhatsApp messages, merged |
| `src/pages/admin/CrmToday.tsx`, `CrmLeads.tsx`, `CrmFamily.tsx` | The three screens |
| `src/App.tsx` | Routes. Hide the site nav and the WhatsApp button on CRM routes. |
| `src/components/admin/AdminLayout.tsx` | A link back to Today |
| `scripts/crm-import/call_log_dry_run.py`, `scripts/crm-import/README.md` | Call-log dry run: review CSV plus import SQL |

---

### Task 1: Migration and database tests

**Files:**

- Create `drizzle/migrations/0004_crm_leads.sql`
- Modify `drizzle/migrations/meta/_journal.json`
- Create `drizzle/migrations/meta/0004_snapshot.json`
- Test harness (scratchpad, outside the repo):
  - a local Postgres cluster
  - `stub_schema.sql`: production column definitions for the touched tables, plus `auth.uid()`, the `has_role` and `update_updated_at_column` functions, the `anon` and `authenticated` roles, and the existing `updated_at` triggers
  - `test_crm.sql`

**Interfaces it produces:**

| Name | Kind | Purpose |
|---|---|---|
| `families` | table | `id`, `parent_name`, `phone` (unique), `email`, `area`, `parent_profile_id`, `status` (`prospect` / `active` / `paused` / `former`), `notes`, `created_at`, `updated_at` |
| `leads` | table | see below |
| `lead_activities` | table | see below |
| `crm_settings` | table | One row: `id = true`, `default_owner_id` |
| `crm_normalize_phone(text) → text` | function | Phone to international digits |
| `crm_upsert_family(phone, name, email) → uuid` | function | Find or create a family |
| `crm_open_lead(family_id, channel, source_table, source_id, at) → uuid` | function | The family's open lead, created if needed |
| `crm_record_assessment_booking(consultation_bookings) → uuid` | function | Record an assessment booking; returns the family id |
| `crm_create_lead(...) → uuid` | RPC | Admin only; returns the family id |
| `crm_team_members() → (user_id, full_name)` | RPC | Admin only |
| `crm_set_default_owner(uuid)` | RPC | Admin only |
| `family_id` | new column | On `consultation_bookings` and `whatsapp_conversations` |

`leads` columns:

- `id`, `family_id`, `channel`, `source_table`, `source_id`, `stage`
- `owner_id`, `next_step`, `next_step_at`, `next_step_owner_id`, `needs_reply`
- `student_name`, `grade_level`, `curriculum`, `subjects text[]`, `mode`, `budget`, `urgency`
- `assessment_at`, `assessment_outcome`, `recommended_tutor_id`, `quoted_rate_kes`, `quoted_package`
- `lost_reason`, `won_at`, `lost_at`, `created_at`, `updated_at`, `last_activity_at`

`leads` constraints and indexes:

- `channel` is one of whatsapp, assessment_form, website_form, phone, email, referral, walk_in, import, other.
- `stage` is one of new, contacted, call_booked, call_done, won, lost.
- `lost_reason` is one of price, timing, no_reply, not_a_fit, went_elsewhere, stale, other.
- A Lost lead must have a reason.
- Partial unique index: one open lead per family.
- Unique on `(source_table, source_id)`.

`lead_activities` columns:

- `id`, `family_id`, `lead_id`, `kind`, `body`, `meta jsonb`, `source_table`, `source_id`, `created_by`, `occurred_at`, `created_at`
- `kind` is one of note, call, whatsapp, email, stage_change, assessment, system.
- Unique on `(source_table, source_id)`.

**Steps:**

- [x] **1. Build the stub schema.** Take the production column lists (read with `information_schema` via the Lovable connection) and create a scratch Postgres cluster on port 54329 from them.
- [x] **2. Write `test_crm.sql`.** Each case is a `DO` block that raises on failure.
  1. `crm_normalize_phone`:
     - `'0712 345 678'` → `'254712345678'`
     - `'712345678'` → `'254712345678'`
     - `'+254 712-345-678'` → `'254712345678'`
     - `'00254712345678'` → `'254712345678'`
     - `'19526879279'` stays as it is
     - `'12345'` → NULL
     - NULL → NULL
  2. As `anon`, inserting a `consultation_bookings` row creates one family (normalised phone), one lead (stage `call_booked`, channel `assessment_form`, `assessment_at` from date + "02:00 PM" in Africa/Nairobi), one `assessment` activity, and stamps `family_id` on the booking.
  3. A WhatsApp chat inserted first, then a booking from the same number written in another format: the result is one family and one open lead. The lead keeps channel `whatsapp` and moves to `call_booked`.
  4. Setting `escalated` from false to true sets `needs_reply`, and the next step becomes "Reply to the WhatsApp hand-off".
  5. Appending a message with `sent_by = 'human'` clears `needs_reply` and moves a `new` lead to `contacted`.
  6. Changing a stage writes a `stage_change` activity, sets `won_at` or `lost_at`, and sets the family status to `active` on won. A Lost lead without a reason is rejected.
  7. If a trigger fails (simulated by renaming `families` inside a savepoint), the booking insert still succeeds.
  8. `authenticated` without the admin role sees 0 rows in `families`, `leads` and `lead_activities`. An admin sees all of them.
  9. Backfill on fixtures:
     - a chat from 2026-06 → lost / stale
     - a converted booking → won
     - an October booking with a past date → `call_booked`, next step "Log the assessment call outcome"
     - an escalated chat with no human reply → `needs_reply`
     - consultation notes → `note` activities
     - running the migration a second time adds no rows
  10. `crm_create_lead` as admin, given an existing phone, reuses the family and its open lead and adds the note. As a non-admin it raises an error.
- [x] **3. Run the tests against the stubs.** Command: `psql -p 54329 -f test_crm.sql`. All cases pass after the migration.
- [x] **4. Write `0004_crm_leads.sql`, the journal entry and the snapshot.**
- [x] **5. Apply the migration twice, then run the tests.** Expect: all cases pass, and the second apply raises no errors.

### Task 2: Typed client and helpers

**Files:**

- Create `crmTypes.ts`
- Create `crmMeta.ts`
- Parity test: a scratch script bundled with esbuild that runs `normalizePhone` over the Task 1 phone cases

**Produces:**

- the `Family`, `Lead`, `LeadActivity`, `Stage`, `Channel`, `LostReason`, `TeamMember` and `LeadWithFamily` types
- `crmDb`, typed `SupabaseClient<CrmDatabase>`
- `STAGES` and `OPEN_STAGES`, plus `stageLabel()`, `channelLabel()`, `lostReasonLabel()` and `metaStageFor(stage)`
- the phone helpers: `normalizePhone()`, `formatPhone()`, `waLink()`, `telLink()`
- `ageLabel(date)`
- `dueState(date)`, returning `'overdue' | 'today' | 'later' | 'none'`

**Steps:**

- [x] **1. Write the helpers.** `normalizePhone` mirrors the SQL rules exactly.
- [x] **2. Run the parity script.** Expect all phone cases to equal the SQL results from Task 1.
- [x] **3. Type-check.** `npx tsc --noEmit -p tsconfig.app.json` exits 0.

### Task 3: Shell and routes

**Files:**

- Create `CrmShell.tsx`
- Modify `App.tsx`
- Modify `AdminLayout.tsx`

**Routes:**

| Path | Page |
|---|---|
| `/admin` | `CrmToday` |
| `/admin/leads` | `CrmLeads` |
| `/admin/families/:id` | `CrmFamily` |
| `/admin/more` | the existing `AdminDashboardRedesigned`, unchanged |

- All four routes are wrapped in `RequireRole roles={["admin"]}`.
- The site `Navigation` and `WhatsAppChatButton` are hidden on the three CRM routes, because the bottom bar replaces them on phones.

**Shell:**

- A sticky top bar with the title and an action slot.
- Navigation items: Today, Leads, and More (→ `/admin/more`).
- Below `md`, the items sit in a bottom bar with safe-area padding.
- At `md` and above, they sit in a left rail.

**Steps:**

- [x] **1. Build the shell and the routes.**
- [x] **2. Type-check and build.** Run `tsc`, then `npm run build`. Both must exit 0.

### Task 4: Today, Leads and "+ Lead"

**Files:**

- Create `useCrmData.ts`
- Create `LeadRow.tsx`
- Create `NewLeadDialog.tsx`
- Create `CrmToday.tsx`
- Create `CrmLeads.tsx`

**`useOpenLeads()`:** one query over open leads with the family embedded. Today's buckets are computed on the client:

- **Next steps due:** overdue or due today, "mine" first.
- **Needs reply:** `needs_reply`.
- **New, not contacted:** oldest first.
- **Calls today:** stage `call_booked` with the call today.
- **Calls to log:** `call_booked` with the call already past.
- **No next step:** open leads other than New that have no next step.

A Mine / Everyone toggle sits on top.

**Leads page:**

- Stage tabs with counts, plus a Closed tab that loads won and lost leads from the last 90 days.
- Search across name, phone, child and subjects.
- Filters for channel and owner.
- At `lg` and above, the open stages show as board columns.
- The "+ Lead" button is a floating button on phones and a header button on desktop.

**"+ Lead" form:**

- Fields: phone first, then parent name, channel, child name, grade, curriculum, subjects and note.
- If the normalised phone matches a family, the form shows "Open existing family".
- Submitting calls `crm_create_lead`, then goes to the family page.

**Steps:**

- [x] **1. Build the hook, the pages and the dialog.**
- [x] **2. Type-check and build.**

### Task 5: Family page

**Files:**

- Create `NextStepEditor.tsx`
- Create `LogCallDialog.tsx`
- Create `AssessmentCard.tsx`
- Create `CloseLeadDialog.tsx`
- Create `FamilyTimeline.tsx`
- Create `CrmFamily.tsx`

**Behaviour:**

- **Header:** name, phone, and buttons for Call (`tel:`), WhatsApp (`wa.me`) and Log call.
- **Lead card:** stage select, owner select, and the next step editor (text, date and time, person).
- **Child details:** editable inline.
- **Assessment card:**
  - Fields: time, Meet link (from the latest booking), outcome, recommended tutor (a select of listed tutors), quoted rate and package.
  - Saving moves the lead to Call done.
- **Close buttons:** Mark won, and Mark lost (a reason is required).
- **Every stage change** also calls `sendCrmEvent(metaStageFor(stage), …)`.
- **Timeline:** `lead_activities` merged with the chat's `messages`, newest first, plus a quick-note box.
- **Earlier leads** are listed when the family has any.

**Steps:**

- [x] **1. Build the components and the page.**
- [x] **2. Type-check and build.**

### Task 6: Call-log import dry run

**Files:**

- Create `scripts/crm-import/call_log_dry_run.py`
- Create `scripts/crm-import/README.md`

**Usage:** `python3 -I call_log_dry_run.py <call-log.xlsx> <out-dir>`. The script writes two files:

- `review.csv`, one row per call: the normalised phone, a proposed stage, a proposed next step date, a flag for rows that need a decision, and an empty `decision` column for Won or Lost on Resolved rows.
- `import.sql`, which calls `crm_upsert_family`, `crm_open_lead` and plain inserts to load leads and `call` activities from a reviewed CSV.

The script uses the status mapping from spec section 6, and reads dates day-first, flagging any that fall outside the sheet's period.

**Steps:**

- [x] **1. Write the script.**
- [ ] **2. Run it on the copy of the real call log.** Expect 35 rows, the five Resolved rows flagged, and phones normalised. (A synthetic fixture of six rows has been run instead: phones normalised, the Resolved row flagged, and the generated SQL loaded twice into the stub with no duplicates.)
- [ ] **3. Test the import against the stub DB.** Load the generated `import.sql` into the stub DB after the migration, with a decision column filled in by a test fixture. Expect one lead per family and no duplicate families for numbers already seen through WhatsApp.

### Task 7: Verify and hand over

> Done on 28 Oct 2026. `tsc` and `npm run build` pass. A headless Chrome walkthrough ran the three screens at 390 px and 1280 px against a mocked Supabase, exercised "+ Lead" (known phone), Log call and Mark lost, and checked the request bodies. The migration has **not** been applied to the live database; that is the open decision for the user.

- [x] **1. Type-check and build.** Run `npx tsc --noEmit -p tsconfig.app.json`, then `npm run build`.
- [x] **2. Headless walkthrough.** Use Playwright-core with the system Chrome, installed in the scratchpad.
  - Mock Supabase: a fake session in localStorage, `has_role` returning true, and fixtures for the CRM tables.
  - Take screenshots of Today, Leads and a Family page at 390 px and 1280 px.
  - Exercise "+ Lead", Log call and Mark lost, checking the request bodies.
- [ ] **3. Report to the user.** The user chose "apply it now through the Lovable connection with the drizzle record written", but the session had no database connection, so nothing was applied. `docs/superpowers/HANDOFF-crm.md` carries the exact steps, `scripts/crm-apply/apply.sh` applies and records it in one transaction, and the script has been tested twice on a scratch cluster. **Still open.**

# CRM handoff — slice 1 is in the database; publish it, then build slice 2

_Written 2026-10-29 for a session with a database/Lovable connection, and updated
the same day once the migration was applied. Everything below was verified on
this machine; nothing here is a guess._

## State in one paragraph

Slice 1 of the CRM redesign (families, leads, lead activities, the Today / Leads
/ Family screens, the "+ Lead" form, call logging, the call-log import dry run)
is **committed, merged with `main`, and its migration is applied to
production**. `0004_crm_leads.sql` went in on 2026-10-29 through the Lovable
connector in one transaction, and it is recorded in
`drizzle.__drizzle_migrations`, so Lovable's drizzle runner will skip it when
this branch merges. The new screens are **not live yet**: they ship when this
branch is merged into `main` and published from Lovable. Until then `/admin` is
still the old dashboard, while the new triggers already turn WhatsApp chats,
bookings and web forms into leads.

So the work left is: **merge → publish → smoke-test → set the default owner → slice 2**.

---

## 1. Where everything is

| | |
|---|---|
| Worktree | `/Users/mac/lanatutors/.claude/worktrees/crm-redesign` |
| Branch | `claude/crm-redesign`: `a83b8de` (slice 1), then `b28ca38` (merge of `origin/main`) |
| Shared checkout | `/Users/mac/lanatutors`, on `main` |
| Production project | `iccemuiqcdumgxiwxzdq` (`https://iccemuiqcdumgxiwxzdq.supabase.co`) |
| Lovable project | `75fc15fb-4dcf-442a-b789-c8185bbd1cef` ("Lana Tutors"); the Lovable connector's `query_database` reaches production |

`origin/main` (PR #4, email cadence, which edited
`src/pages/AdminDashboard-Redesigned.tsx`) merged cleanly as `b28ca38`.
`npx tsc --noEmit -p tsconfig.app.json`, ESLint on the changed files and
`vite build` all pass on the merged branch.

What slice 1 adds or changes (commit `a83b8de`):

```
drizzle/migrations/0004_crm_leads.sql          new, 564 lines
drizzle/migrations/meta/_journal.json          modified: idx 4
drizzle/migrations/meta/0004_snapshot.json     new
src/components/admin/crm/*.ts(x)               11 new files
src/pages/admin/CrmToday|CrmLeads|CrmFamily.tsx 3 new files
src/App.tsx                                    modified: CRM routes
src/components/admin/AdminLayout.tsx           modified: "Today" button
scripts/crm-import/                            new: dry run + README
scripts/crm-apply/                             new: apply script
docs/superpowers/                              new: spec, both slice plans, this file
```

## 2. Step one: commit — done

Committed as `a83b8de` on 2026-10-29, then `git merge origin/main` as `b28ca38`.

## 3. Step two: apply the migration — done 2026-10-29

### What has to happen

`drizzle/migrations/0004_crm_leads.sql` must be applied **and** recorded in
`drizzle.__drizzle_migrations`, so a later Lovable/drizzle sync does not try to
run it again. The record is:

- table `drizzle.__drizzle_migrations (id serial, hash text, created_at bigint)`
- `hash` = `sha256` of the raw SQL file = `9cedfcb5b67d8d632fa79f840a108b25f1d71db9cb266b3c66f2df759896c2ab`
- `created_at` = the journal entry's `when` = `1793166530801`

### How it was applied

Lovable Cloud documents no raw Postgres connection string; its docs offer only
the in-app SQL editor (More → Database → Manage → SQL editor). So `apply.sh`
was not used. Instead, through the Lovable connector's `query_database`:

1. **Read-only preflight**, one SELECT. It showed:
   - no CRM objects yet;
   - every source table and column present, with the right types;
   - only the five `update_*_updated_at` triggers on the touched tables, none of
     them calling out;
   - `drizzle.__drizzle_migrations` holding 0000–0003 with hashes that match
     this repo.
2. **Probe:** confirmed the connector runs a multi-statement script as one
   transaction.
3. **Bundle:** one script, in this order:
   - `BEGIN`;
   - a guard that refuses if the hash is already recorded;
   - the migration;
   - the drizzle record;
   - `COMMIT`.
4. **Fingerprint:** production's columns, constraints, function bodies, indexes,
   policies, RLS flags and triggers matched a scratch database built from the
   committed file.

### Apply with a connection string (for reference)

`scripts/crm-apply/apply.sh` was written and tested for exactly this. It:

- reads `$LOVABLE_DB_MIGRATION_URL` or `~/.config/lanatutors/db-url`;
- refuses to run unless the string contains the project ref `iccemuiqcdumgxiwxzdq`
  (override only for a scratch DB with `CRM_ALLOW_ANY_DB=1`);
- skips cleanly if the hash is already recorded;
- applies the SQL and writes the drizzle record **in one transaction**;
- prints a verification table.

```bash
cd /Users/mac/lanatutors/.claude/worktrees/crm-redesign
scripts/crm-apply/apply.sh              # apply + record + verify
scripts/crm-apply/apply.sh              # second run should say "Already recorded"
scripts/crm-apply/apply.sh --verify     # counts only; errors before the apply, when the tables do not exist yet
```

Tested on a scratch cluster: first run creates 4 tables, 9 triggers, 4 policies
and the record; second run is a no-op. Against production it would now say
"Already recorded".

### Without a connection string (next migration)

Send a single script through the connector or the SQL editor:

- `BEGIN;`
- the migration file;
- the `INSERT` from `scripts/crm-apply/apply.sh --print-record`;
- `COMMIT;`

Running the migration and the record as two separate scripts risks applying one
without the other.

### Expected and actual after apply

| Check | Expected | Actual, 2026-10-29 |
|---|---|---|
| tables / triggers / policies / functions | 4 / 9 / 4 / 8 | 4 / 9 / 4 / 8 |
| admin RPCs | `crm_create_lead`, `crm_team_members`, `crm_set_default_owner` executable by `authenticated`, not `anon` | as expected |
| families | about one per distinct phone | 219 (219 distinct phones; no booking without one) |
| leads | one per family | 219: 18 new, 16 contacted, 11 call booked, 10 won, 164 lost (stale) |
| needs reply | escalated chats where the parent wrote last | 16 open leads |
| chats_linked | every `whatsapp_conversations` row | 120 of 120 |
| calls_linked | every `consultation_bookings` row | 154 of 154 |
| activities | assessments plus the copied notes | 211: 154 assessments, 44 consultation notes, 13 admin notes |
| original rows | `updated_at` unchanged | no booking or chat touched by the backfill |

If `families` is 0 while `chats_linked`/`calls_linked` are 0 too, the backfill
did not run — stop and read the backfill block at the end of the migration.

### What the migration does, in one paragraph

Creates `families` (one household, unique normalised phone), `leads` (one open
lead per family; stages new → contacted → call_booked → call_done → won/lost,
with next step + date + person), `lead_activities` (the timeline) and a one-row
`crm_settings` (default lead owner). Triggers on `consultation_bookings`,
`whatsapp_conversations` and the three web-form tables create or move the
family's lead automatically; a stage trigger writes the timeline entry, stamps
won/lost and flips the family to active on won; an activity trigger moves a New
lead to Contacted when a call is logged as reached. All of it is admin-only by
RLS, and every trigger is wrapped so it can never block the booking, chat or
form insert it hangs off. The backfill replays existing chats and bookings in
time order, copies the 44 consultation notes onto the timeline, marks converted
bookings Won, and closes anything quiet since 1 Sept 2026 as lost/stale.

## 4. Step three: smoke-test the live screens (10 minutes)

- Sign in as an admin: `/admin` is **Today**, `/admin/leads` the pipeline,
  `/admin/families/:id` a family, `/admin/more` the old dashboard.
- Add a lead with a throwaway number → family, lead and note created.
- Log a call on it → timeline entry, lead New → Contacted.
- Mark lost without a reason → blocked by `leads_lost_needs_reason`.
- Book an assessment call at `/book-consultation` with another throwaway number
  → lead appears in **Call booked**, assessment time in Nairobi time, the
  booking gets `family_id`.
- Clean up: `delete from families where phone in (...)`; leads and activities
  cascade, and the booking/chat rows fall back to `family_id = null`.

## 5. Step four: set the default owner (gap, 5 minutes)

New leads take their owner from `crm_settings.default_owner_id`, and **there is
no UI for it yet**. Until it is set, imported and new leads are unassigned; all
219 backfilled leads have no owner, and setting the default does not assign them.

From a signed-in admin session:

```sql
select public.crm_set_default_owner('<admin-user-uuid>');
```

That function checks `has_role(auth.uid(), 'admin')`, so it refuses through the
Lovable connector, which has no user. There, update the row directly:

```sql
update public.crm_settings set default_owner_id = '<admin-user-uuid>', updated_at = now();
```

Adding a small control on the Leads page is a good first slice-2 task.

## 6. Slice 2

The plan is written and ready to execute:
`docs/superpowers/plans/2026-10-29-crm-lessons-slice.md`.

It covers enrolments, session packs, Record payment, lesson reports, the
"Needs confirming" queue, top-up alerts, student progress and the tracker import,
with the pack arithmetic and the settled 70% tutor-pay rule. **Task 0 is four
pre-build checks that must be done against live data first** — most importantly
whether to reuse `package_purchases` (it has sessions and an offer, but no rate
and no M-Pesa reference) and which `bookings.status` values the reminder
functions match before a confirmed lesson is written as `completed`.

## 7. What slice 1 contains, for orientation

| Piece | Where |
|---|---|
| Migration (schema, triggers, RLS, backfill) | `drizzle/migrations/0004_crm_leads.sql` |
| Types and typed client | `src/components/admin/crm/crmTypes.ts` |
| Labels, phone/date helpers, Meta stage map | `src/components/admin/crm/crmMeta.ts` |
| Hooks | `src/components/admin/crm/useCrmData.ts` |
| Shell (desktop rail, phone bottom bar) | `src/components/admin/crm/CrmShell.tsx` |
| Rows, + Lead, log call, next step, assessment, close, timeline | `src/components/admin/crm/` |
| Screens | `src/pages/admin/CrmToday.tsx`, `CrmLeads.tsx`, `CrmFamily.tsx` |
| Routes and nav hiding | `src/App.tsx` |
| Apply helper | `scripts/crm-apply/apply.sh` |
| Call-log dry run | `scripts/crm-import/call_log_dry_run.py` + README |

### Three bugs found by testing and fixed in 0004

1. WhatsApp leads used the **phone number as the unique source id**, so a family
   whose lead had closed could never open a second lead. WhatsApp now uses the
   family's open lead; the source id is only for records with real ids.
2. A null `escalated` flag could write `needs_reply = NULL` and violate the
   column; all reads now `coalesce`.
3. Resuming the AI did not clear "needs reply"; it now does.

### How slice 1 was verified (so you can trust it, and re-check it)

- The migration was applied **twice** to a scratch Postgres built from the
  production column lists of the 9 tables it touches.
- **64 assertions** passed: phone normalisation (7 shapes), an anon booking
  creating family + lead + assessment activity and stamping `family_id`,
  WhatsApp-then-booking merging into one family and one lead, hand-off flags, a
  human reply clearing them, a returning family after a lost lead opening a new
  one, won/lost bookkeeping, a broken trigger not blocking the booking, RLS for
  admin vs non-admin, the backfill fixtures (June chat → stale, converted → won,
  past call → log the outcome, escalated → needs reply, notes copied), a second
  apply adding nothing, and `crm_create_lead` reusing the family as admin and
  refusing non-admins.
- `npx tsc --noEmit -p tsconfig.app.json`, `npm run build` and ESLint on the new
  folders all pass.
- A headless Chrome walkthrough at 390 px and 1280 px, against a mocked
  Supabase, rendered Today, Leads and a family, opened "+ Lead" with a known
  number, logged a call (checked the request body preserved the next-step date)
  and tried Mark lost without a reason (blocked). No console errors other than
  deliberately blocked third-party requests.

The scratch harness lived in `/tmp`, which was cleared overnight. To rebuild it,
follow slice-1 plan Task 1 step 1, with these gotchas learned the hard way:

- `types.ts` renders timestamps as `string`; make every `*_at` column
  `timestamptz` and `consultation_date` a `date`, or `coalesce(updated_at,
  created_at)` fails.
- `types.ts` renders `messages` as `Json`; it must be **`jsonb`** in the stub or
  `jsonb_array_elements` does not exist.
- Make every `id`, `*_id` and `created_by` column `uuid`, and `user_roles.role`
  `public.app_role`.
- `has_role` must be `security definer`, and `anon`/`authenticated`/`service_role`
  need grants, including `insert` on `consultation_bookings` for the anon-booking
  case.
- Give `escalated` a `NOT NULL DEFAULT false`; production does.

The cases themselves are listed in the slice-1 plan (Task 1, steps 2 and 9).

## 8. Known limitations and follow-ups

- **Default owner has no UI** (§5 above).
- **No merge-families action** yet; the spec asks for one. Two spellings of a
  parent with different numbers stay two families.
- **Imported leads are not reopened**: the import uses the phone as
  `source_id`, so re-running is idempotent, but a lead it closed stays closed.
- **WhatsApp only reopens leads for `prospect` families.** An active family
  messaging in does not create a lead — intentional for slice 1, revisit if
  support chatter should be visible.
- **The call-log importer has only been run on a synthetic 6-row fixture**, not
  the real sheet. Run it on the real file and check the flagged rows before
  importing anything.
- `anon` can still execute four functions (checked in production 2026-10-29):
  - `crm_normalize_phone`, `crm_assessment_time` and `crm_stage_label`, which
    only format values;
  - `crm_leads_before_update`, a trigger function that cannot be called directly.

  Harmless, but tighten them when convenient.
- The **old CRM tab and `crm_notes`** are still under `/admin/more`; retire them
  after the team has switched over.
- **Deploy order:** the migration is already live, so merging this branch and
  publishing from Lovable only ships the screens. Lovable should skip 0004
  because it is recorded. After the publish, check that
  `drizzle.__drizzle_migrations` still has exactly one `9cedfcb5…` row.

# CRM Lessons Slice Implementation Plan (slice 2)

> **For the next agentic session:** execute this plan task by task after
> `docs/superpowers/HANDOFF-crm.md` steps 1–2 (commit + apply 0004). The
> behaviour each piece must show is written as test cases; the pre-build checks
> in Task 0 are blockers, not suggestions.

- **Goal:** the CRM becomes the record of what a family has prepaid and what has
  been taught. Sessions left, balances, lesson reports, top-up alerts and
  student progress all come from the database, and the team stops using the
  payment tracker for day-to-day work.
- **Architecture:** new tables `enrolments`, `session_packs`, `lesson_reports`
  and a balance view; a security-definer trigger consumes a session and fixes
  tutor pay when a report is saved; a new `/admin/lessons` screen plus a
  Sessions card on the family page; Today gains "Top-ups due" and "Lessons to
  confirm"; a tracker import dry run reconciles opening balances.
- **Tech stack:** unchanged — Postgres on Supabase, the drizzle-kit migration
  track, React 18, Vite, TypeScript, shadcn/ui, Tailwind, supabase-js v2.
- **Spec:** `docs/superpowers/specs/2026-10-28-crm-redesign-design.md`,
  sections 5 (data model, lesson flow, payment flow) and 6 (import plan).
- **Slice 1:** `docs/superpowers/plans/2026-10-28-crm-leads-slice.md`.

## Global constraints

- **Migration track.** `drizzle/migrations/0005_crm_lessons.sql`, with a journal
  entry `idx 5` and a chained empty snapshot, exactly as 0004 did.
- **Idempotent.** Safe to run twice: `IF NOT EXISTS`, `OR REPLACE`,
  `DROP … IF EXISTS`, `ON CONFLICT DO NOTHING`.
- **Never block the original write.** Any trigger on `bookings` or
  `lesson_reports` runs inside `BEGIN … EXCEPTION WHEN OTHERS THEN RAISE
  WARNING … END`.
- **Access.** Admin-only through `public.has_role(auth.uid(), 'admin')`, with
  explicit grants, following `0004_crm_leads.sql`.
- **No new dependencies.** Money is `numeric(12,2)`; never floats in SQL.
- **Decisions already made (28 Oct):**
  - A student no-show **and** a late cancellation count as a session taken; a
    tutor no-show does not.
  - The multi-student tracker is the current payment sheet; the pipeline file is
    retired.
  - Tutors confirm their own lessons; admins can confirm for them.
  - Tutor pay is **70% of the pack's rate per session taken**, fixed when the
    lesson is confirmed. The 70% becomes a `platform_settings` value in slice 3;
    until then use the settled rule.
- **Checks.** `npx tsc --noEmit -p tsconfig.app.json`, `npm run build`, ESLint on
  the changed folders, a scratch-Postgres run of the migration twice, and a
  headless walkthrough at 390 px and 1280 px.
- **Copy.** No emoji; use the existing Lana theme tokens.

## Task 0 — pre-build checks (blockers)

1. **`package_purchases` vs a new table.** It already stores
   `total_sessions`, `sessions_used`, `sessions_remaining`, `tutor_id`,
   `student_id`, `package_offer_id`, `payment_status`, `expires_at`,
   `amount_paid`. It has **no** rate per session and **no** M-Pesa/bank
   reference, and it is tied to a package offer rather than a family enrolment.
   Recommendation: add `session_packs` and leave `package_purchases` alone; note
   the finding in the migration header. Confirm against live rows before
   deciding.
2. **Booking status.** `bookings.status` is
   `pending | confirmed | cancelled | completed`. A delivered lesson must end as
   `completed`. Before writing that, grep the reminder and post-session
   functions (`send-session-reminders`, `send-consultation-reminder`,
   `send-post-session-emails`, `send-booking-reminder`) for the statuses they
   match, so confirming a lesson does not silently cancel reminders or
   double-send.
3. **How lessons are created.** `ManualBookingDialog`, the online booking flow
   and `create-booking-with-meet` all insert `bookings`. Every lesson needs an
   `enrolment_id`; decide the fallback (create an enrolment from the booking's
   family + student + subject + tutor) rather than leaving lessons unlinked.
4. **`platform_settings`** currently holds only `deposit_percentage`, so the
   70% setting belongs to slice 3 and must not be invented here.

## File map

| File | Responsibility |
|---|---|
| `drizzle/migrations/0005_crm_lessons.sql` | Tables, view, functions, triggers, RLS |
| `drizzle/migrations/meta/_journal.json` | Add entry `idx 5` |
| `drizzle/migrations/meta/0005_snapshot.json` | Empty snapshot chained to 0004 |
| `src/components/admin/crm/crmTypes.ts` | Add `Enrolment`, `SessionPack`, `LessonReport`, `EnrolmentBalance` |
| `src/components/admin/crm/useCrmData.ts` | `useFamily` returns enrolments/packs; `useLessons`, `useBalances`, `usePendingLessons` |
| `src/components/admin/crm/SessionsCard.tsx` | Enrolments with sessions left and balance |
| `src/components/admin/crm/RecordPaymentDialog.tsx` | Amount, reference, date, sessions bought, rate |
| `src/components/admin/crm/ConfirmLessonDialog.tsx` | Attendance, covered, homework, engagement |
| `src/components/admin/crm/StudentProgress.tsx` | Attendance, lessons this month, last feedback, at-risk |
| `src/pages/admin/CrmLessons.tsx` | Week view and "Needs confirming" queue |
| `src/pages/admin/CrmFamily.tsx` | Sessions card, Record payment, progress |
| `src/pages/admin/CrmToday.tsx` | "Top-ups due" and "Lessons to confirm" buckets |
| `src/App.tsx` | `/admin/lessons` route, add to the CRM nav |
| `src/components/admin/crm/CrmShell.tsx` | Lessons in the rail and bottom bar |
| `scripts/crm-import/tracker_dry_run.py` | Tracker import dry run (same shape as the call-log one) |

## Data model

- **`enrolments`**: `id`, `family_id` → families, `student_name`, optional
  `student_id` → students, `subject`, optional `tutor_id` → tutor_profiles,
  `status` (`active | paused | ended`), `rate_per_session`, `notes`,
  `created_at`, `updated_at`. Index on `(family_id, status)`.
- **`session_packs`**: `id`, `enrolment_id` → enrolments, `amount_kes`,
  `reference`, `paid_on date`, `sessions_bought int > 0`, `rate_per_session`
  (default `amount_kes / sessions_bought`, overridable), `sessions_used int >= 0
  default 0`, `notes`, `created_at`. Index on `(enrolment_id, paid_on)`.
- **`lesson_reports`**: `id`, `booking_id` → bookings **unique**, `enrolment_id`,
  `attendance` (`delivered | student_absent | tutor_absent | late_cancellation |
  cancelled`), `covered`, `homework`, `engagement int 1..5`, `tutor_pay_kes`,
  `pack_id` → session_packs, `confirmed_by`, `confirmed_at`, `created_at`.
- **`crm_enrolment_balances`** (view, `security_invoker = true`): per enrolment,
  `sessions_bought`, `sessions_used`, `sessions_left`,
  `amount_paid`, `balance`, `rate_per_session`, `last_lesson_at`.
- **`bookings.enrolment_id`** new column.
- **`crm_record_payment(enrolment_id, amount_kes, reference, paid_on,
  sessions_bought, rate_per_session)` → uuid**: admin-only RPC that creates a
  pack and defaults the rate to `amount_kes / sessions_bought` when omitted.

## Task 1 — migration and database tests

**Test cases** (each a `DO` block that raises on failure, as in slice 1):

1. A pack of 8 sessions at KES 3,000 gives `sessions_left = 8` and
   `balance = 24,000`.
2. Confirming a `delivered` lesson consumes one session from the **oldest** pack
   with sessions left, sets `tutor_pay_kes = 2,100`, and sets the booking to
   `completed`.
3. A second pack with later `paid_on` is not touched while the first has
   sessions left.
4. `student_absent` and `late_cancellation` consume a session; `tutor_absent`
   and `cancelled` do not.
5. A second report for the same `booking_id` is rejected (unique).
6. A report for a booking whose family has no pack is still saved, with
   `pack_id` null and `tutor_pay_kes` null, and raises a warning — it must not
   block the report.
7. Re-running the migration adds no rows and changes no balances.
8. RLS: an authenticated non-admin sees 0 rows in `enrolments`, `session_packs`
   and `lesson_reports`; an admin sees all.
9. `crm_record_payment(...)` (admin RPC) creates a pack, defaults the rate to
   amount ÷ sessions, and refuses a non-admin.
10. A trigger failure (rename `session_packs` in a savepoint) still lets the
    lesson report insert succeed.

## Task 2 — types and hooks

- Extend `crmTypes.ts` with the three tables and the balance view; extend
  `useFamily` with enrolments + packs (one query each, ordered).
- `useBalances(familyId?)`, `usePendingLessons()` (past bookings with no
  report), `useWeekLessons()`.
- Keep the slice-1 rule: reads go through `crmDb`, no new client instance.

## Task 3 — the family page

- **Sessions card**, one block per enrolment: child + subject + tutor, sessions
  left, balance, rate, status; a **Record payment** button.
- **Record payment**: amount, M-Pesa/bank reference, date paid, sessions bought,
  rate (prefilled amount ÷ sessions, editable). Writing it re-renders the card.
  This is offline money — no payment gateway.
- **Pack history** per enrolment, with the reference visible.
- **Progress**: attendance %, lessons this month, last three feedback notes,
  engagement trend, at-risk flag after two absences in a row, a falling
  engagement, or no lesson in 14 days.

## Task 4 — the lessons screen

- `/admin/lessons`, admin-only, added to `CrmShell` navigation.
- **This week**: lessons by day, with child, subject, tutor and family link.
- **Needs confirming**: past lessons with no report, oldest first; a confirm
  action opens `ConfirmLessonDialog`.
- Admin can confirm all of yesterday's lessons at once.
- A tutor-facing confirmation screen is slice 3's business, but the dialog must
  be reachable by a tutor later — keep the mutation in one component.

## Task 5 — Today

- **Top-ups due**: enrolments with `sessions_left <= 1`, family + child + subject,
  call button.
- **Lessons to confirm**: count of past lessons without a report, linking to
  `/admin/lessons`.
- Keep the slice-1 de-duplication rule (reply queue first, then due steps).

## Task 6 — tracker import dry run

- `python3 -I tracker_dry_run.py <tracker.xlsx> <out-dir>` writes `review.csv`
  and `import.sql`, same shape as the call-log dry run.
- Column mapping from spec section 6: parent → family (matched by hand, no phone
  in the sheet), student/subject/tutor → enrolment, amount/reference/sessions
  paid/rate → pack, sessions taken → opening `sessions_used`, tutor pay and
  reference → opening payout fields (slice 3 will consume them).
- Split the 4 multi-tutor and 4 multi-subject lines during review; flag them.
- **Reconciliation target** — the import is correct when it reproduces:
  KES 110,925 paid, 59 sessions taken, KES 66,535 tutor pay, KES 3,150 still
  owed. Do not proceed if it does not.

## Task 7 — verify and hand over

- Migration applied twice on a scratch Postgres rebuilt from the production
  column lists; all cases in Task 1 pass.
- `tsc`, `npm run build`, ESLint on the changed folders.
- Headless walkthrough at 390 px and 1280 px: record a payment, confirm a
  lesson, check Today's top-up bucket, open a family's progress.
- Update the spec's status section and this plan's checkboxes.

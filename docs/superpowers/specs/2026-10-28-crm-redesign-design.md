# Lana Tutors CRM: audit and proposed redesign

- **Date:** 28 Oct 2026, updated the same day with the team's spreadsheets
- **Branch:** `claude/crm-redesign`, cut from `main` at `87ed63a`
- **Status:** approved on 28 Oct 2026. Slice 1 (leads) is built and verified on
  this branch. It is **not applied to the live database** and the work is
  uncommitted; `docs/superpowers/HANDOFF-crm.md` is the pick-up point.
- **What is built:** `drizzle/migrations/0004_crm_leads.sql` (families, leads,
  lead_activities, crm_settings, triggers, RLS, backfill), the Today / Leads /
  Family screens, the "+ Lead" form, call logging, and the call-log import dry
  run. The migration was applied twice to a scratch Postgres built from the
  production column lists, and the behaviour cases in the slice plan pass.

## 1. What exists today

**Where it lives.** All admin work happens on one route, `/admin`. It is rendered by `src/pages/AdminDashboard-Redesigned.tsx` (2,973 lines), which has 22 sidebar tabs in 7 groups. The open tab is kept in React state, not in the URL. A refresh goes back to the dashboard, and nobody can send a teammate a link to a lead.

**Five screens deal with leads and customers:**

| Tab | What it does | Tables |
|---|---|---|
| Consultations | Assessment-call list: follow-up status, notes, follow-up email, "mark converted", reschedule, reminders | `consultation_bookings`, `consultation_notes` |
| CRM / Customers (`AdminCrm.tsx`) | Read-only merge of 10 tables into one contact list, with a computed stage, a notes panel and CSV export | 10 source tables, `crm_notes` |
| Student Hub | Registered parents and children, with their bookings and packages | `profiles`, `students`, `bookings`, `package_purchases` |
| WhatsApp Inbox | Chats with the AI assistant: read, reply, pause the AI | `whatsapp_conversations` |
| Plan Requests | Learning-plan request forms | `general_learning_plan_requests` |

**Lessons.** Class Management and All Sessions are two views of `bookings`. There is also the Manual Booking dialog, Invoices (custom invoices, not linked to lessons), Create Plans, Sent Plans and Reports.

**Tutor payments.** Nothing. No table records what a tutor is owed or has been paid. Reports estimates "payments due" from completed lessons.

**The `drizzle/` CRM stack** is four migrations: grants on 11 CRM tables, the `crm_notes` table, and two policy fixes. It backs only the notes panel in `AdminCrm`.

## 2. What the live data shows

These are read-only counts from the production database on 28 Oct 2026.

- **The new CRM has never been used.** `crm_notes` has 0 rows.
- **Assessment calls are booked but never followed through.**
  - 152 calls booked, 38 of them since July.
  - 141 still have follow-up status "pending" and 11 are "converted". None was ever set to contacted, interested or lost.
  - None has an outcome or a next action.
  - 151 of the 152 are still "confirmed", so no call was ever marked done or no-show.
  - Call notes (`consultation_notes`): 44 in total. The last one was written on 26 Aug.
- **WhatsApp leads are not linked to anything.**
  - 117 chats since June, and 103 of them were handed to the team.
  - None is linked to a family record.
  - 48 of the 103 handed-over chats have no team reply in the system. The assistant promises a call back, and phone calls leave no trace.
- **No lesson has ever been closed out.**
  - 110 lessons recorded: 65 since August, and 75 of them entered by hand.
  - None is marked completed, and 18 are still "pending" although their dates have passed.
  - Only 1 lesson is scheduled in the future.
  - `student_notes` and `student_progress` both have 0 rows.
  - One-to-one lessons have no attendance or feedback fields at all.
- **Money moved outside the system.**
  - The last completed Pesapal payment was in January.
  - Since August, billing has run on custom invoices: 17 in total, of which 7 are paid, 5 sent and 5 drafts. They are not linked to lessons or families.
  - 23 learning plans exist, and all are still "proposed".
- **The channels don't connect.**
  - 109 phone numbers booked an assessment call. Only 7 of them match a family with lessons in the system.
  - Of the 117 WhatsApp numbers, only 3 match.

## 3. Why the team doesn't use it

1. **It's a report, not a place to work.** The CRM tab can't add a lead, change a stage, assign anyone or set a next step. Stages are computed from other tables, so the team can't change them. A spreadsheet can do all of these.
2. **Leads are spread over five screens.** WhatsApp hand-offs arrive as emails. No screen answers "who do I call today?"
3. **Phone leads can't be entered.** There is no "add lead" button anywhere.
4. **Records don't connect.**
   - The WhatsApp webhook looks up `profiles.phone`. That column doesn't exist (the real one is `phone_number`), so no chat has ever linked to a family.
   - `AdminCrm` saves notes under a key computed from email or phone. When a WhatsApp-only contact later books a call with an email address, the key changes, and the earlier notes disappear from view.
5. **Nothing gets closed out, so the numbers look wrong.** Nothing prompts anyone to mark a call done, a lesson delivered or a tutor paid. With 0 completed lessons, Reports show 0 lessons and 0 tutor pay. So the team trusts the spreadsheet instead.
6. **It's slow and will start dropping data.**
   - Opening `/admin` runs about 350 queries. Most come from All Sessions, which fetches names one booking at a time.
   - The CRM pulls whole tables into the browser. Supabase returns at most 1,000 rows per query by default, so records will silently go missing as tables grow.
7. **It's built for a desktop.** The coordinators work from WhatsApp on their phones. The admin is wide tables behind a 22-item sidebar.

### Checking the 70% tutor-pay claim

- **The rule, from the team's tracker:** tutors get 70% of the family's rate for each session taken. The tracker's formula is rate × sessions taken × 70%, and its totals agree to the shilling (section 4).
- **The code disagrees.** The tutor dashboard uses 70%, but Admin Reports pays tutors 80% (`COMMISSION_RATE = 0.20` in `AdminReports.tsx`).
- **The site copy uses two definitions.** Home, About and the tutor onboarding guide say "70% of session fees", which matches the tracker. /become-a-tutor and tutor profile setup say "70% of your set rate" (for example, a KES 3,000/hr rate earns KES 2,100/hr).
- **The wrong definition would cost a lot.** These figures cover the 97 lessons in the system where the tutor has a set rate, assuming the recorded fees are right:

  | | KES |
  |---|---|
  | Families paid (about 1,540/hr) | 149,200 |
  | Tutors' set rates, averaged per lesson-hour | about 1,840/hr |
  | Tutor pay at 70% of the fee | 104,440 |
  | Tutor pay at 70% of the set rate (84% of fees) | 125,030 |

  On 41 of those 97 lessons, 70% of the tutor's set rate is more than the family paid.
- **What to fix:** the /become-a-tutor and profile-setup wording, and the 80% in Admin Reports.

## 4. What the team's spreadsheets show

There are three files. Personal details from them stay out of the repo and this document.

| File | What it holds | Size |
|---|---|---|
| Client Call Tracking | One row per call: date, client name, phone, notes, status, follow-up needed, follow-up date | 35 calls since early September, 25 phone numbers |
| Payment Tracker (multi-student) | One block per family, with one line per child + subject + tutor: amount paid, M-Pesa reference, rate per session, sessions paid and taken, family balance, tutor pay, tutor payment reference and status | 8 families, 16 lines, August to October |
| Payment Pipeline | The older version: parent payments and tutor session payments on separate tabs, monthly tabs for August and September, and a tutor phone list | It repeats the tracker's M-Pesa references |

What they tell us:

- **The call log is mostly WhatsApp leads followed up by phone.**
  - 22 of its 25 phone numbers are already in the system, 20 of them as WhatsApp chats and 6 as assessment bookings.
  - The work on those leads (the calls, notes and follow-up dates) exists only in the sheet.
- **Families prepay for sessions.**
  - Families paid KES 110,925 for 61 sessions and have taken 59 of them. They still hold KES 15,875 of prepaid credit.
  - When a family pays again, the team adds a new line, so each top-up has its own rate and M-Pesa reference.
- **Tutor pay follows the 70% rule exactly.**
  - Tutor pay is KES 66,535, which is exactly 70% of the value of the sessions taken (rate × sessions).
  - KES 3,150 is not yet marked paid.
  - One M-Pesa transfer often covers several families, and lines can be "Partially Paid".
- **Assessment calls are handed off.** Notes pass leads to a named coordinator or to a "lead tutor" for the assessment call, so a next step needs a person, not just a date.
- **"Resolved" means closed either way.** It covers both families who were onboarded and families who went elsewhere, so each resolved row becomes Won or Lost during the import.
- **Some leads are timing, not "no".** For example: "not financially ready", or "will reach back in December". A next step with a later date covers these.
- **The system and the sheets cover different families.**
  - The payment sheets have no parent phone numbers.
  - By name, only 2 of their 8 families match a family with lessons in the system since August.
  - 5 of the 7 families with lessons in the system since August don't appear in the sheets by name.
  - Families have to be matched by hand during the import.
- **8 of the 12 tutor phone numbers in the sheets match a tutor account.**

Data problems the import has to handle:

- Phone numbers saved as numbers, so the leading 0 is lost, and some international numbers typed as formulas.
- Dates typed as text in several formats ("18/08/2026", "5th august 2026"). Some dates were also read month-first, so a September payment shows as 9 April.
- Amounts typed as text ("KES 5,800", "kshs. 6,000").
- Status and yes/no values in mixed case.
- The same parent spelled two ways.
- 4 tracker lines that list several tutors, and 4 that list several subjects. Pay is per tutor, so these must be split.
- A broken "calls by type" summary (`#REF!`) in the call log. The column it counted was deleted.

## 5. Proposed design

### Principles

- **One family record and one pipeline,** whatever channel the lead came from.
- **Every screen answers "what do I do next?"** Every open lead has a next step, a due date and a person.
- **Each loop closes with one tap,** done by whoever knows the fact. The coordinator logs the call, the tutor confirms the lesson, and whoever pays records the M-Pesa reference.
- **Phone first.** It works one-handed, every record has Call and WhatsApp buttons, and every lead has its own URL.
- **Nothing is slower than the spreadsheet.** Inline edits, filters, import and export.

### Approaches considered

| | Approach | For | Against |
|---|---|---|---|
| **A (recommended)** | A focused workspace inside the existing admin, built on new tables (families, leads, enrolments, session packs, lesson reports, payouts). Every channel feeds the pipeline automatically. | One source of truth, stable records, fits the assessment-call flow and the prepaid-sessions model. Reuses the existing auth, WhatsApp and booking code. | The most work, and it needs a careful import. |
| B | Patch `AdminCrm`: add editable stages, an add-lead form, and fix the WhatsApp link. | Takes days, not weeks. | Keeps the computed keys and the five lead screens, and does nothing for payments or lessons. It would probably stay unused. |
| C | Keep the sheets, or move to a SaaS CRM, as the source of truth and sync the app into it. | No change in habits. | Two sources of truth again. Lessons and tutor pay stay disconnected from bookings. Ongoing cost. |

### Screens and navigation

Every view gets a real URL. On a phone, the five main views sit in a bottom bar. On a desktop, they sit at the top of the sidebar.

- **Today** (`/admin`), the home screen:
  - next steps that are overdue or due today, mine first
  - new leads nobody has contacted, oldest first, with their age
  - today's assessment calls
  - families down to their last prepaid session (top-ups due)
  - yesterday's lessons that haven't been confirmed
  - tutor payouts due
- **Leads** (`/admin/leads`), the pipeline:
  - a board on desktop, and a list grouped by stage on phones
  - filters for owner, channel, stage and "needs action"
  - a **+ Lead** button that opens a 30-second form: phone, parent name, channel, child's grade and curriculum, subjects, note. If the phone number already exists, it opens that family instead.
- **Family page** (`/admin/families/:id`). Leads open here.
  - Header: name, phone with Call and WhatsApp buttons, stage, owner, next step with its due date and person.
  - Children, and each enrolment (child, subject, tutor) with sessions left and balance.
  - A **Record payment** button: amount, M-Pesa or bank reference, sessions bought, rate.
  - Assessment-call card: time, Meet link, and an outcome form (fit, recommended tutor, quoted rate or package, notes).
  - Timeline: WhatsApp messages, logged calls, notes, stage changes, payments and lessons.
- **Lessons** (`/admin/lessons`):
  - this week's lessons
  - a **Needs confirming** queue of past lessons with no report
  - progress for each student: attendance, last feedback, engagement, and an at-risk flag
- **Tutor payouts** (`/admin/payouts`): one row per tutor for the period, showing lessons, hours, amount owed, adjustments, amount paid, status and M-Pesa references.
- **More:** every current tab, unchanged.

Three tabs retire once the team has switched over: CRM / Customers (and the empty `crm_notes` table), Consultations, and Student Hub. They stay under More for one month first.

### Pipeline stages

| Stage | Meaning | How a lead gets there |
|---|---|---|
| New | The enquiry is in, and nobody has spoken to the family yet | Any channel, automatically |
| Contacted | A coordinator has talked to the family and understands the need | Logging a call or a WhatsApp reply |
| Call booked | A free assessment call is scheduled | A booking at `/book-consultation`, or the coordinator books it |
| Call done | The call happened, fit and price were discussed, and the family is deciding | Saving the call outcome |
| Won | The family paid for its first session pack, or its first lesson is booked | Recording a payment or booking a lesson. The CRM suggests the move, and it takes one tap. |
| Lost | Not going ahead. A reason is required: price, timing, no reply, not a fit, or went elsewhere. | Set by hand |

- A lead can jump to Won or Lost from any stage.
- Every open lead needs a next step, a due date and a person. The person defaults to the lead's owner and can be someone else, such as a lead tutor taking the assessment call. A lead without a next step shows up on Today.
- A "not now" lead stays open with a far-off next step, for example "call back in December".
- A won family has a status: Active (a lesson in the last 30 days), Paused or Former. A second child or a new term starts a new lead on the same family.
- Stage changes keep sending the existing Meta CRM events (`sendCrmEvent`), so lead-ad optimisation keeps working.

### Data model changes

New tables follow the existing conventions: snake_case plural names, and admin-only RLS through `has_role`.

- **`families`**: one household.
  - Fields: parent name, phone, email, area, an optional link to the parent's `profiles` row, status and notes.
  - The phone is stored as digits in international form (`2547…`, or the full number for diaspora families), and it must be unique.
  - A merge action handles duplicates and spelling variants.
- **`leads`**: one enquiry.
  - Who and how: `family_id`, channel, source record id, stage, owner, and the next step with its due date and person.
  - The child: name, grade, curriculum, subjects, mode, area, budget and urgency.
  - The call and the result: assessment time, outcome, recommended tutor, quoted rate or package, lost reason, and won or lost date.
- **`lead_activities`**: the timeline. Each entry is a note, call, WhatsApp message, email, stage change or system event, with who and when.
  - It replaces `crm_notes`, and new call notes go here instead of `consultation_notes`.
  - The 44 existing call notes are copied in.
- **`enrolments`**: one child (or sibling group), one subject and one tutor. This is the tracker's "line". It has a status: active, paused or ended.
- **`session_packs`**: what a family prepaid for an enrolment.
  - Fields: amount, M-Pesa or bank reference, date paid, sessions bought, and rate per session. The rate defaults to amount ÷ sessions and can be overridden.
  - A top-up is a new pack. Confirmed lessons use the oldest pack with sessions left.
  - Sessions left = bought − used. Balance = paid − sessions used × rate. These are the tracker's own formulas.
  - The existing `package_purchases` table already stores sessions bought and used per tutor for online packages. The build may extend it instead of adding a new table, depending on its constraints.
- **`lesson_reports`**: one per lesson (`booking_id` is unique).
  - The report: attendance (delivered, student absent, tutor absent, late cancellation, cancelled), what was covered, homework, and engagement from 1 to 5.
  - The record: who confirmed it and when, the pack it used, the tutor's pay for this lesson (fixed at confirmation), and the payout it was paid in.
  - It is a separate table so tutors can write their own reports without being able to edit the booking.
- **`tutor_payouts`, `tutor_payout_items` and `tutor_payout_transfers`**:
  - One payout per tutor per period. It moves from draft to approved, then to part-paid or paid.
  - The items are the lessons in the payout, plus adjustments (bonus, transport, deduction), each with a reason.
  - Each transfer records an M-Pesa or bank payment with its amount, date and reference. One transfer can cover several families, and a payout can be paid in parts, as the tracker does today.
- **Settings.** The tutor share (default 70%) goes in `platform_settings`, with an override for each tutor. Admin Reports reads this setting instead of its hard-coded 20%.
- **Small changes to existing tables:**
  - `family_id` on `consultation_bookings`, `bookings`, `invoices` and `whatsapp_conversations`
  - `enrolment_id` on `bookings`

To check before building:

- The four newest migrations are in `drizzle/migrations`, and the older 127 are in `supabase/migrations`. Confirm with Lovable which track it applies when it syncs.
- Current RLS lets tutors and students update their own `bookings` rows, in any column. That is outside this work but worth a separate look.

### How each lead channel gets in

| Channel | Today | Proposed |
|---|---|---|
| WhatsApp | The chat is stored and the hand-off is emailed. Never linked. The follow-up calls happen in the call-log sheet. | See the list below. |
| Assessment call (`/book-consultation`) | A row in `consultation_bookings` | A database trigger runs on insert. It finds the family by phone (or creates it) and moves the open lead to Call booked (or creates a lead). It works whichever page inserts the row. |
| Other web forms (tutor inquiry, plan request, expert consultation) | Separate tables, barely used (4 submissions in total) | The same trigger pattern, with channel "website form" |
| Phone, email, walk-in, referral | The call-log sheet | The **+ Lead** form, about 30 seconds on a phone |
| Spreadsheet history | The sheets | The one-off import (section 6) |

WhatsApp, proposed:

- The first message from an unknown number creates a family and a New lead.
- On hand-off, the lead is flagged "Needs reply", the assistant's one-line reason becomes the next step, and the hand-off email links to the lead.
- The phone lookup bug is fixed.
- **Log call** sits on every lead, so the follow-up calls the team now records in the sheet land on the same record as the chat.

### Lesson tracking flow

1. Lessons are scheduled as they are today, through the manual booking dialog or online booking. Each lesson belongs to an enrolment.
2. When a lesson's end time passes, it joins **Needs confirming**.
3. The tutor confirms it on their dashboard: whether it happened, two short lines (what was covered, homework) and engagement from 1 to 5.
   - Optionally, a WhatsApp nudge reminds the tutor after each lesson. This needs an approved WhatsApp template.
4. Admins can confirm a lesson for a tutor, or confirm all of yesterday's lessons at once.
5. A confirmed lesson uses one session from the family's oldest pack. When a family is down to its last session, Today flags it for a top-up call.
6. A delivered lesson's booking status becomes "completed", so Reports and the automations see it.
   - Before building, check the reminder and post-session functions. They currently look for "confirmed" bookings.
7. Each student has a progress view: attendance rate, lessons this month against the plan, the last three feedback notes, and the engagement trend.
   - A student is flagged at risk after two absences in a row, falling engagement, or no lesson in 14 days.

### Tutor payment flow

1. Each confirmed lesson stores the tutor's pay. The rule is the tracker's: 70% of the pack's rate per session.
2. **Prepare payouts** creates a draft for each tutor from their confirmed, unpaid lessons. It runs monthly by default (the onboarding guide promises pay within the first 5 business days), and can also run for one tutor at any time.
3. Someone reviews the drafts, adds any adjustments, and approves them.
4. Tutors are paid by M-Pesa or bank as now, and each transfer is recorded with its reference.
   - Part payments are allowed. Paid lessons are locked, and later corrections go in as adjustments.
5. Tutors see their own statement on their dashboard: lessons, amounts, paid or pending, and the references. This answers "how much am I owed?" without a WhatsApp message.

## 6. Import plan

The import uses the multi-student tracker and the call log. The pipeline file is only for cross-checks: the tracker repeats its M-Pesa references, so importing both would count payments twice. Its tutor phone list fills gaps.

**Call log → families, leads, timeline**

| Column | Goes to |
|---|---|
| Date | the lead's first contact, and the call's date on the timeline |
| Client Name | family name |
| Phone Number | family phone, cleaned to international form. Matched to the existing WhatsApp chat or booking (22 of 25 numbers), which also gives the channel. |
| Comments / Notes | a call note on the timeline |
| Status | Open, No Answer → New. In Progress, Escalated → Contacted (or Call booked or Call done where the notes say so). Resolved → Won or Lost, chosen per row. |
| Follow-Up Needed? and Follow-Up Date | the next step "Follow up", with that date |

**Payment tracker → families, enrolments, session packs, tutor pay**

| Column | Goes to |
|---|---|
| Parent (shaded row) | the family, matched by name. The phone number is added by hand. |
| Student, Subject, Tutor | an enrolment. Lines that list several tutors or subjects are split during review. |
| Amount paid, Payment reference, Sessions paid, Rate per session | a session pack |
| Sessions taken | sessions used before the cut-over. This is an opening balance, because the sheet has no lesson dates. |
| Tutor pay, Tutor payment reference, Tutor pay status | opening tutor payouts: paid with their references, or outstanding |
| Notes | a note on the family timeline. Lines with open questions are flagged. |

**Steps**

1. **Clean the data:** phones, dates (read day-first, with out-of-range dates flagged), amounts typed as text, and status spellings.
2. **Dry run into staging tables, then review together.** The review covers:
   - families to merge
   - tutor matches (8 of 12 by phone, the rest by hand)
   - Resolved rows → Won or Lost
   - mixed lines to split
   - the 5 families with lessons in the system but no match in the sheets
3. **Import, then check the totals.** Opening balances must reproduce the tracker's totals: KES 110,925 paid, 59 sessions taken, KES 66,535 tutor pay, and KES 3,150 outstanding.
4. **Cut over:** pick a day, make the sheets view-only, import their final versions, and work in the CRM from then on.

## 7. Build order

1. **Leads:**
   - families, leads and the timeline, with triggers
   - the WhatsApp link fix
   - Today, Leads, the family page and + Lead
   - the call-log import
2. **Lessons and prepaid sessions:**
   - enrolments, session packs and Record payment
   - lesson reports and tutor confirmation, the Needs confirming queue, and top-up alerts
   - student progress
   - the tracker import (families, enrolments, packs, sessions taken)
3. **Tutor payouts:**
   - the tutor share setting, payouts and transfers, and tutor statements
   - the tutor-pay history import
   - the Reports and /become-a-tutor fixes

Each slice is checked with `tsc`, `npm run build`, a headless-browser walkthrough at phone and desktop widths, and SQL checks of the triggers before handover.

## 8. Decisions

On 28 Oct 2026 the user approved this design and accepted the suggested default for each question below. The tracker had already answered the first version of question 1: tutors get 70% of the family's rate per session taken.

1. **No-shows.** Does a student no-show or a late cancellation count as a session taken, so the family is charged and the tutor is paid? *Default: yes for a student no-show or a late cancellation; no for a tutor no-show.*
2. **Current payment sheet.** Is the multi-student tracker the one you keep up to date now, with the pipeline file retired? *Default: yes.*
3. **WhatsApp replies.** Besides the admin inbox (88 replies so far) and phone calls, does anyone reply from the WhatsApp Business app on their phone? Those replies can't appear in the CRM. *Default: no.*
4. **Lead owners.** The call log passes assessment calls to a coordinator or a lead tutor. Who should own new leads by default? *Default: the learning coordinator, with reassignment.*
5. **Lesson confirmation.** Should tutors confirm their own lessons, or will the admin team do it? *Default: tutors, with admins able to confirm for them.*

# December desk: open classes, enrol reserved families and ask for payment from the CRM

Date: 2026-11-03. Status: design approved by the owner in chat on 2026-11-03, in two parts (the flow the team sees, then how it works underneath). Nothing is built. Not committed.
Branch `claude/december-desk`, cut from `origin/main` at `7e3ee87`.

## Why

The December 2026 holiday classes are live: the public page lists six classes, Lana answers the December chat button, and the team records each reservation as a `DEC26` note on the family's timeline. Nothing turns a reservation into a paid place.

An enrolment row (`intensive_enrollments`) is what Record paybill, the Pesapal recovery link, the confirmation email, the morning reminder and the class seat counter all work on. The only code that ever created one is last year's enrolment page. It needs a signed-in student login and has had no route since 2025-12-29. Most CRM families have no platform login (`families.parent_profile_id` is empty), and the team works from WhatsApp and the CRM, not the website.

What is missing is a way for the team, on Monday 30 November, to turn "6 families reserved" into "6 children enrolled, each told how to pay", and to see the counts without running SQL.

## What the team sees

A new "December" entry in the CRM (left rail and phone bottom bar), shown until 2026-12-19 and opening `/admin/december`.

```
December holiday classes                       7 to 18 December 2026
Reservations close Fri 27 Nov  ·  Pay by Fri 4 Dec

Form 3 (KCSE 2027)
 Mathematics  8:00 to 9:15                                   Ready to open
   Tutor: not assigned yet     Reserved 7 · Enrolled 0 · Paid 0 · of 12
   Amani K.   Mrs K., 07..    reserved                              [Enrol]
   ...
   [Open class]
 Chemistry  9:30 to 10:45                                    Needs 4 more
 English    11:00 to 12:15                                   Running
   Tutor: Jane O.     Reserved 8 · Enrolled 6 · Paid 3 · of 12
   Wanjiru M. ...     enrolled, unpaid      [Record paybill] [Release seat]
Grade 8 (KJSEA 2027)
 ...
```

Each class card shows the slot, the tutor (or "No tutor yet"), seats reserved, enrolled and paid out of the class limit, and one state: *Needs N more*, *Ready to open* (6 or more seats), *Running* or *Archived*. Under it are the families who hold seats: parent, child, phone, and a stage (*Reserved*, *Enrolled, unpaid*, *Paid*).

What the team does there:

1. **Open class** marks the class Running. It warns when the class has fewer than 6 seats or no tutor, and never blocks.
2. **Archive class** takes a class that missed 6 off the public page.
3. **Enrol** adds a child to the classes that are running. A dialog pre-fills the parent, child, classes and fee, asks for an email when the family has none, then creates the family's login if needed, the child record and the enrolment. It then shows the payment message to copy or open in WhatsApp.
4. **Record paybill** opens the existing dialog for the enrolment. When a child is paid in full the confirmation email goes out; for a family with no usable email the screen offers the class-links message to send on WhatsApp.
5. **Release seat** deletes an enrolment that is still unpaid, which frees the seat.
6. **Add December seats** on a family's page writes the reservation note in the exact format (child name and class ticks), so a mistyped code cannot lose a seat.

The team sends every message from the admin inbox. The system sends nothing to a family on its own.

## Goals

- The team sees, without SQL, how many seats each class has and who holds them.
- One action turns a reserved child into an enrolment that holds a seat, with a login for the family and a message to send.
- Payment keeps going through the existing Record paybill and the existing Pesapal recovery link. The confirmation email and the morning reminder work unchanged.
- A class is on the calendar and described as running only after the team has confirmed it.
- No database migration.

## Non-goals (this version)

- Sending anything to families automatically.
- A bundle discount, deposits or partial access. Families pay in full, because class access and the morning reminder need `payment_status = 'completed'`.
- Tutor pay, or changes to how tutors are told about a class.
- A self-serve enrolment page, the IGCSE and A-Level track, SAT or German.
- Adding a class to an enrolment that is already paid (done by hand in Bootcamp Admin).

## Anti-goals (a failure even if the code works)

1. A seat count on the screen that differs from the SQL counter (`december-2026/count-reservations.sql`) for the same notes.
2. A child enrolled twice in the same program, or in a class that is not running or is full.
3. A second login for a family that already has one.
4. The calendar sync creating events for a class the team has not confirmed.
5. The system messaging a family on its own, or the screen asking a family to pay for a class that is not confirmed.
6. A timeline line written by the system that starts with `DEC26`, because the counter would read it as a seat.
7. A failed read shown as zero seats.

## The owner's decisions (2026-11-03)

- The team enrols from the CRM. The alternatives were a self-serve enrolment page and a no-platform route (WhatsApp and notes only).
- The flow under "What the team sees" is right.
- The design below is right.

## My calls (the owner has not decided these; check them while reading)

1. Reservations stay `DEC26` notes. There is no reservations table.
2. A class goes `active` (taking reservations) to `confirmed` (running) to `archived`, in the free-text `status` column.
3. The default fee per subject is a constant in code, taken from the launch kit and editable in the Enrol dialog. The owner confirms it before 30 November. No bundle discount.
4. A family with no email gets a login with a placeholder email, as manual booking does today, and no welcome email. The screen says confirmation and daily reminders will not reach them.
5. One parent login per family, one child record per child, one enrolment per child.
6. The paybill wording moves to one shared constant used by the invoice email and the payment message.
7. Open never blocks, so a class can run at 5. Archive and Back to reserving are refused while any unreleased enrolment includes the class.
8. The screen and its nav entry retire themselves on 2026-12-19, like the chat button.

## Design

### Parts

- `src/utils/decemberDesk.ts` (new, pure): class codes, the note parser, class state, the message builders, and the constants (default fee, reservations close, pay by, `DECEMBER_DESK_UNTIL`). It reuses `MIN_STUDENTS_TO_OPEN` and `pickProgram` from `src/utils/holidayClasses.ts`.
- `src/utils/paybill.ts` (new): the paybill wording now written inside `AdminInvoices.tsx`, which imports it from here.
- `src/pages/admin/CrmDecember.tsx` and `src/components/admin/crm/December*.tsx` (new): the screen, class cards, family rows, and the Enrol, Open, Archive and Add seats dialogs.
- `supabase/functions/enrol-december-family/index.ts` (new): the Enrol step.
- Learning the `confirmed` status: `src/pages/DecemberClasses.tsx` (lists active and confirmed classes, shows "Running" and seats left), `src/components/admin/AdminIntensivePrograms.tsx` (Bootcamp Admin's class list) and `supabase/functions/sync-bootcamp-to-calendar/index.ts` (syncs confirmed classes only).
- `src/components/tutor/TutorBootcampTab.tsx`: the class roster shows the child's name (from `student_profile_id`) and falls back to the login's name.
- `src/App.tsx` (the route, and the CRM shell path list), `src/components/admin/crm/CrmShell.tsx` (the nav entry) and `src/components/admin/crm/FamilyTimeline.tsx` (Add December seats).

### Reservations: the rule

A reservation note is a `lead_activities` row with `kind = 'note'` whose body starts, after optional whitespace and ignoring case, with the word `DEC26`. The codes are `F3-MATHS`, `F3-CHEM`, `F3-ENG`, `G8-MATHS`, `G8-SCI` and `G8-ENG`, matched as whole words.

- Format: `DEC26 <codes> - <child name>`. To take a seat back: `DEC26 CANCEL <codes>` with an optional ` - <child name>`.
- Seats for a code = notes containing the code that are not cancel notes, minus cancel notes containing the code. A code counts once per note however often it is repeated. A body that contains `DEC26` and `CANCEL` as words is a cancel note. This is the SQL counter's rule exactly, and the screen's totals use it.
- Families for a code = distinct families with a non-cancel note containing the code.
- The family lists are best effort. Notes are applied in the order of `occurred_at` (ties by `created_at`); a reservation adds (child, code); a cancel removes it from the named child, or from the family's most recent holder of that code when no child is named. The child's name is what follows the last recognised code in the note, after one hyphen or dash with or without spaces, trimmed: `DEC26 F3-MATHS F3-ENG - Amani` gives Amani and `DEC26 F3-MATHS - Jean-Paul` gives Jean-Paul. Text after the last code with no dash is taken as the name too, and `(no name)` is used when there is none. When a card's list does not add up to its total, the card shows "check the notes".
- A `DEC26` note with no recognised code goes under "Notes the desk could not read", with the family and the text, so a typo is seen rather than lost.
- The same child reserved twice for the same code shows a "possible duplicate" mark. The totals are not changed by it; the team fixes it with a cancel note.
- A class row maps to a code by its grade level and subject (`Form 3` or `Grade 8`, with Mathematics, Chemistry, English or Integrated Science). A class that maps to no code is listed with no reservations.

### Class state

The displayed state comes from `status` and the seat total: `archived` shows Archived, `confirmed` shows Running, `active` with 6 or more seats shows Ready to open, and `active` with fewer shows Needs N more. Open sets `confirmed`, Archive sets `archived`, and Back to reserving sets `active`. Admins already have full rights on `intensive_classes`. Archive and Back to reserving are refused while an unreleased enrolment includes the class. The page counts a class as taking reservations or running when its status is `active` or `confirmed`.

### The Enrol step: `enrol-december-family`

Admin only (the shared `guardInternal` with `requireAdmin`, as in `record-intensive-payment`).

Request: `familyId`, `childName` (2 to 80 characters), `classIds` (1 to 6 UUIDs), `feePerSubject` (more than 0, at most 100000), and optionally `parentName`, `phone` and `email` (defaults come from the family). An email given for a family that has none is saved on the family.

In this order:

1. Read the family, the classes and their program. Every class must belong to one program that is active and has not ended, have status `confirmed`, and have room. When the child already has an unpaid enrolment in this program, that enrolment's own seats are not counted against the room.
2. Find the family's login: `families.parent_profile_id`; otherwise the profile whose phone number matches the family's on the last 9 digits (both reduced to digits first; a number with fewer than 9 digits never matches). More than one match is refused (`ambiguous_login`) and the message tells the team to link the right login in Bootcamp Admin. With no match, create one by calling `create-parent-profile` with the caller's own token, using the email from the request, else the family's, else a placeholder, and `sendWelcomeEmail: false`. Set `families.parent_profile_id` when it was empty.
3. Find the child's record under that login by name, ignoring case, or create it (name, grade level and curriculum from the first class).
4. Look for an existing enrolment of this child in this program. None: insert one. The same classes: return it unchanged (`alreadyEnrolled`). Different classes and still pending with no completed payment: delete it and insert the new one (`replaced`). Paid or part paid: refuse (`already_paid`).
5. Insert: `program_id`, `student_id` = the login, `student_profile_id` = the child, `enrolled_class_ids`, `total_subjects`, `total_amount` = fee times subjects, `payment_status = 'pending'`. The existing trigger counts the seats.
6. Add a timeline line to the family, kind `system`, saying who enrolled the child in which classes. It never starts with `DEC26`.

Response: `enrollmentId`, `loginId`, `childId`, `loginCreated`, `emailIsPlaceholder`, `alreadyEnrolled`, `replaced`, `totalAmount` and the classes. Errors: 400 invalid input, 401 or 403 from the guard, 404 family or class not found, 409 with a code (`class_not_running`, `class_full`, `already_paid`, `ambiguous_login`, `wrong_program`), 500 otherwise. A failure after step 2 or 3 leaves only a login or child record that the next attempt finds again, never half an enrolment.

### Messages

Built by pure functions, shown with Copy and Open in WhatsApp (a `wa.me` link to the family's phone). Nothing is sent by the system.

1. Payment request, after Enrol: the launch kit's "class opens" wording with the class or classes, start date, time, tutor's first name, amount, the pay-by date and the paybill block, and a line saying the class link comes once payment is confirmed.
2. Class links, after full payment: one line per class with name, time and meeting link, only for classes that have a link. For a family on a placeholder email this is how the links reach them.
3. Class not running, for the families of an archived class: the launch kit's wording.

### Failure handling

- A failed read of the program, classes, notes or enrolments shows an error with a retry. It never shows zero seats.
- Enrol maps each error code to a plain sentence in the dialog, and a repeated click returns the same enrolment.
- Release seat is offered only for an enrolment with `payment_status = 'pending'` and no completed payment, and the delete itself carries the `payment_status = 'pending'` filter.
- Deleting an enrolment while its class is Running is allowed; the trigger moves the seat count.

## How it is checked

- Pure logic (`npm run test:crm`): the parser against golden cases whose expected numbers come from running `count-reservations.sql` on a scratch Postgres (the SQL is copied into the repo as a test fixture, because the launch-kit folder is not tracked), including leading whitespace, lower case, `DEC26X`, repeated codes, two codes in one note and cancel notes; class state; code mapping; the message builders; and that `DECEMBER_DESK_UNTIL` equals the chat button's and Lana's cut-off dates.
- Edge function (`npm run test:edge`, fake database): a new login, an existing login by link, by phone and ambiguous, a placeholder email, a class not running, a full class, a class of another program, a duplicate request, a replaced pending enrolment, a paid enrolment, invalid input, and no admin token.
- Screen: a mocked walkthrough in the style of the CRM one at 1280 px and 390 px, covering each state, each action, the unreadable-note list and the failed read.
- Whole repo: `tsc`, eslint on the touched files, `npm run build` (the prerender is unchanged, since the route is admin only and not in the sitemap).
- Production dry run with one test family, with the owner's go-ahead, before 30 November: reserve, open, enrol, record a paybill with a test reference, release, put the class back, remove the test rows. The public page says Running while a class is open, so it is done at a quiet hour.

## Rollout (the owner decides each step)

Two pull requests.

- Phase 1, aimed at Friday 6 November so the first wave on Monday 9 November uses it: the parser, the screen with counts and family lists, Add December seats, the route and the nav entry. It is read-only apart from the note.
- Phase 2, aimed at Friday 20 November: the `confirmed` status, Open, Archive, Enrol, the messages, Record paybill and Release seat inside the screen, and the tutor roster name.

For each: merge, then publish the site. For Phase 2 also deploy `enrol-december-family` and the changed `sync-bootcamp-to-calendar` through Lovable's agent, then probe them from outside (an unauthenticated POST answers 401). Merging does not deploy functions. Then the dry run in the week of 23 November. Nothing is applied to the database.

## Cleanup after 18 December

Remove the route, the nav entry and the screen files. Archive the function (an explicit delete, if wanted). The `confirmed` handling is harmless to keep. This joins the cleanup of the public page and Lana's December reply already listed in `HANDOFF-DECEMBER.md`.

## Found along the way (not changed here)

- The seat counter moves only on insert or delete of an enrolment, never on update, and counts pending enrolments as taken seats.
- The morning reminder and the confirmation email go to the login's email. A placeholder address does not receive them.
- `validate-intensive-class-access` lets in only fully paid enrolments.

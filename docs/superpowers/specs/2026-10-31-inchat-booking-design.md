# In-chat booking: book the free assessment call inside the WhatsApp chat with Lana

Date: 2026-10-31. Status (2026-11-01): approved on 2026-11-01, including the calls under "My calls"; built on the branch and checked (see "How it is checked"); migration 0008 applied to production on 2026-11-01, after PR #11 and PR #12 were merged and published the same night; this branch is not pushed and its code is not deployed.
Branch `claude/suspicious-driscoll-69e883`, stacked on PR #12 (keep Lana answering), which is stacked on PR #11 (the bot fix). `main` is merged in.

## Why

The owner, 2026-10-31: "we can give them time options... quickly on the chat. Put in an email and stuff is done."

Today Lana's first answer ends by sending a link to the website's five-step booking form (names, curriculum, grade, subjects, challenges, urgency, budget, then a calendar). A parent on WhatsApp has to leave the chat and fill all of it in on a phone. The form also accepts only Kenyan phone numbers, so a family abroad cannot use it at all. About half of all chats start from a prefilled button message, and the goal the owner set on 2026-10-30 is "an immediate excellent first response... then hand over to our person". A booking made inside the chat turns "hello" into "call booked" with a few taps and one typed line.

## What the person sees

The owner confirmed this flow from a mockup ("Yes, that's it"). Times below are examples; today is Monday 2 November, 10:00 Nairobi time.

```
Lana    Thanks for reaching out, Jane. ... you can book a free 20-minute assessment call here:
        https://lanatutors.africa/book-consultation
        [ Book a free call ]  [ Call me back ]
Jane    (taps) Book a free call
Lana    Let's find a time for your free 20-minute call with our Learning Coordinator.
        Pick a day below. All times are Nairobi time (EAT).
        [ Pick a day ]  Today (7 times free) / Tomorrow / Wed 4 Nov / Thu 5 Nov / ... (at most 10 days)
Jane    (taps) Wed 4 Nov
Lana    Which part of the day suits you on Wednesday 4 November? All times are Nairobi time (EAT).
        [ 11:00 am - 12:40 pm ]  [ 1:00 - 2:40 pm ]  [ 7:00 - 8:40 pm ]
Jane    (taps) 1:00 - 2:40 pm
Lana    Pick a time on Wednesday 4 November. Each call is 20 minutes, in Nairobi time (EAT).
        [ Pick a time ]  1:00 pm / 1:20 pm / 1:40 pm / 2:00 pm / 2:20 pm / 2:40 pm
Jane    (taps) 1:20 pm
Lana    Thanks. What email address should we send the calendar invite to? Please type it below.
Jane    jane@example.com
Lana    Please check your booking:
        Day: Wednesday 4 November
        Time: 1:20 pm to 1:40 pm Nairobi time (EAT)
        Email: jane@example.com
        Shall I book it?
        [ Confirm ]  [ Change time ]  [ Change email ]
Jane    (taps) Confirm
Lana    Your call is booked.
        Wednesday 4 November, 1:20 pm Nairobi time (EAT)
        Google Meet: https://meet.google.com/...
        A calendar invite is on its way to jane@example.com. It will show the time in your own time zone once you add it to your calendar.
        To help our Learning Coordinator prepare, please type your child's grade and the subjects they need help with.
        [ Change or cancel ]
```

- When a day has 10 or fewer free times, the part-of-day step is skipped and the times come as one list. With more than 10, there are three buttons, and a part with nothing free is left out. If only one part has free times it goes straight to its list.
- The name comes from WhatsApp. The email is the only thing typed. Nothing is asked about the child before booking.
- What the family wrote in the chat is copied into the booking's notes for the coordinator.

## Goals

- A parent books the 20-minute free Academic Assessment Call with taps and one typed email.
- One person takes the calls, so one booking per time, shared with the website.
- Booking works when both AIs are down: the steps are fixed code, not AI.
- The booking is an ordinary booking: same table, same Google Meet event, same confirmation email, same CRM lead ("Call booked").
- The team sees every step in the WhatsApp inbox.

## Non-goals (this version)

- The family changing or cancelling by themselves. The team does it, by hand, as for website bookings.
- Asking the child's name, grade or subjects before booking.
- A WhatsApp Flow (form-style screens with a calendar picker). A possible later upgrade; it needs Meta setup and an encrypted endpoint.
- Consultation reminders. See "Found along the way".
- Any other kind of booking (lessons, packages).

## Anti-goals (a failure even if it technically works)

- Two families in one slot, or a family told "booked" when nothing was saved.
- A Google Meet link that does not work sent as if it did.
- The lead left flagged "needs reply" while the family is only waiting for its call.
- Lana talking over the team: once a person on the team has replied in the chat, the flow stops reading typed messages.
- Any message promising something the system does not do (reminders).

## The owner's decisions (their answers, 2026-10-31)

1. Tap-lists driven by Lana (days, times, email, confirm), not a WhatsApp Flow.
2. Call times as on the website: 20 minutes, Monday to Saturday, 11:00 am to 2:40 pm and 7:00 pm to 8:40 pm Nairobi time. One caller, so one booking per time.
3. Details: just the email. The name comes from WhatsApp. After booking, Lana invites them to type the child's grade and subjects; it reaches the team as an ordinary message. What they already said in the chat goes into the booking notes.
4. Nairobi time, clearly labelled everywhere; the calendar invite shows their own time zone.
5. The chat flow above.

## My calls (the owner has not decided these; check them while reading)

1. **Change or cancel is done by the team.** The "Change or cancel" button tells Lana's team by email and in the chat flag; they move or cancel it by hand. Doing it in the chat would need the Google event id stored on the booking, a new function to patch or delete the event, and much more testing.
2. **After booking**: the lead moves to "Call booked" (the existing rule), "needs reply" clears, the chat stays with the team, and a new message from the family flags it again. Only a booking made in the chat clears the flag; a website booking behaves as today.
3. **Limits**: days from today up to 14 days ahead, today included (the website has no upper limit), never Sundays (the website blocks them too); today only times that start more than an hour from now (the website's rule); the soonest 10 days that have a free time are shown; one upcoming booking per phone number (matched on the WhatsApp digits, with and without a leading `+`); at most 3 chat bookings per number in 24 hours (rows with `booked_via = 'whatsapp'`, whatever their status); the email must pass the same pattern the bookings table already requires.
4. **The website link stays in Lana's text** next to the buttons, so someone who prefers the form still has it.
5. **Buttons go only on replies that offer the call**: the reply contains the booking link, or the AI asked for it. A complaint or a tutor applicant does not get a "Book a free call" button. Replies that carry them: the AI's, the backup message, and the website's "learn more" starter.
6. **"Call me back" answers with the team's own call-back wording** (the reply they already send to the website's call-back button): it asks for a preferred time. The chat stays with the team.
7. **The website's "assessment call" starter** (the most direct request to book) now gets the day list straight away, instead of the team's script asking for a time zone and times.
8. **A notice email to info@ for every booking made in the chat**, with the details, for the launch month. Off with the secret `WHATSAPP_BOOKING_NOTICES=off`.
9. **An off switch**: the secret `WHATSAPP_BOOKING=off` removes the buttons and makes any tap answer with "our team will arrange your call".
10. **The slot rule starts on 1 November 2026** (see Database).
11. **Order of work**: PR #11, then PR #12, then this, then the learning loop. Booking is smaller and self-contained, and the learning loop's first reply ends in exactly the choice booking answers ("call from the coordinator, or a free consultation"), so that reply is written around a button that exists. Both change the webhook's reply path, so whichever lands second is reworked. Flip it if the owner wants the learning loop's review step first.

## Design

### Parts

| Where | Change |
|---|---|
| `supabase/functions/whatsapp-webhook/booking.ts` (new) | Pure code, no Deno and no network, like `lana.ts`: the call times, the day and time rules, the message builders, reading a tap's id, finding an email in text, reading the flow's state from the chat. |
| `supabase/functions/whatsapp-webhook/index.ts` | Reads a tap's id (today only its title); sends interactive messages; runs the booking steps with the database and the two booking functions; puts the two buttons on replies that offer the call; sends the alerts. |
| `supabase/functions/whatsapp-webhook/lana.ts` | Exports the team's call-back reply. |
| `drizzle/migrations/0008_inchat_booking.sql` (+ journal, snapshot) | See Database. |
| `create-consultation-calendar-event` | Copes with no child's name: the event title falls back to the parent's name, and empty lines are left out. Unchanged for the website. |
| `send-consultation-booking-confirmation` | Copes with no child's name ("your child"); the add-to-calendar links get the right time (see Found along the way). Unchanged otherwise. |
| `src/pages/BookConsultation.tsx` | A clear message if the slot rule rejects a booking ("just booked by someone else"), instead of a database error. |
| `supabase/functions/_tests/` | Harness additions and new tests. |

### Messages and Meta's limits

All booking messages are replies inside 24 hours of the person's last message (Meta allows free-form messages only then), so no approved template is needed. Limits (from Meta's documentation, read 2026-10-31): a list holds 1 to 10 rows, button text 20 characters, row title 24, row description 72, row id 200, section title 24, body 4,096; reply buttons at most 3, title 20, id 256, body 1,024. A test checks every message the code can build against these.

Ids start with `bk:` and carry their data, so a tap on an old message still means something and is checked against the current state:

| Id | Meaning |
|---|---|
| `bk:start` | "Book a free call" |
| `bk:callback` | "Call me back" |
| `bk:day:2026-11-04` | a day row |
| `bk:part:2026-11-04:am` (`pm`, `eve`) | a part-of-day button |
| `bk:time:2026-11-04:1320` | a time row (24-hour, hhmm) |
| `bk:confirm:2026-11-04:1320` | "Confirm" |
| `bk:retime`, `bk:reemail` | "Change time", "Change email" |
| `bk:change` | "Change or cancel" |

A reply that offers the call goes out as the same text with the two buttons when the text fits 1,024 characters, else as the text followed by a short second message ("Would you like to book it here?") carrying the buttons.

The chat history stores each message as readable text for the inbox: the question, then a line such as `[List: Today, Tomorrow, Wed 4 Nov]` or `[Buttons: Confirm | Change time | Change email]`. The family's tap is stored as the title they tapped, plus the id in a `tap` field.

### State: kept in the chat, no new column

Each booking message Lana sends carries a `booking` field: `step` (`offer`, `day`, `part`, `time`, `email`, `confirm`, `done`), and as far as known `day`, `time` (the website's own text, such as `01:20 PM`), `email`, `tries` (failed email attempts), `nudged`, and `id` (the booking, once made). `via` is `booking:<step>`.

- **Taps are always read**, whether or not the chat is with the team, and they skip the 5-second wait. This matters: Lana's first answer takes the chat (`escalated` becomes true), so without this every tap after that answer would be ignored.
- **Typed text is read only while a flow is open**: the last thing Lana sent has an open step (`day`, `part`, `time`, `email`, `confirm`) and no team reply has come since. Then it waits the usual 5 seconds so a burst becomes one thing, and reads all of it.
  - At `email`: it takes the first address in what they wrote (so "my email is jane@x.com" works). No address: asks again; after two tries it stops, says the team will book it with them, and the chat stays with the team.
  - At `confirm`: an address replaces the email and the card is shown again.
  - At `day`, `part`, `time` or `confirm` with anything else: one plain-text nudge ("tap one of the options above, or tell us a day and time and our team will arrange it"). A second stray message gets silence, as with any chat the team has.
- A reply from the team ends the flow for typed text. A tap is still read, but it is checked against the booking rules like any other.
- "cancel" typed alone is an existing opt-out word and still opts the number out of marketing. The buttons avoid it.

### Availability

The call times are the website's 18 times, in the website's own text (`11:00 AM` ... `02:40 PM`, `07:00 PM` ... `08:40 PM`); the module keeps its own copy and a test reads `ALL_TIME_SLOTS` out of `BookConsultation.tsx` to keep them equal, as the prefilled messages are kept equal to `WhatsAppChatButton.tsx`. Kenya has no daylight saving, so Nairobi time is UTC+3 year round.

A time is offered if it is on the grid, the day is not a Sunday, the day is within 14 days, on today it starts more than an hour from now, and no booking that is not `cancelled` holds it. One query of `consultation_bookings` from today to the last day gives every booked time.

A day is listed if it has at least one free time. With no free day in the window, Lana says she cannot see one, that the team will arrange the call and message them here, and the chat stays with the team.

### Booking, and what happens in what order

Every booking action, a tap at any step as well as the first, begins by making sure the chat is with the team (the usual atomic claim, which does nothing when the chat already is). Handing a chat to the team flags the lead, so this comes before the booking row, which then clears the flag.

Reserve first, then side effects. On "Confirm" (the day and time are in the button's id; the email comes from the confirmation card, the latest Lana message with `step: confirm`; a Confirm with no matching card is stale, so the current step is shown again):

1. Check the choice again (the list may be old). If the time has gone, say so and show the day's other times, or the day list.
2. If the number already has an upcoming booking (a day after today, or today with the call not yet over): the same time means a double tap, so say nothing new if it is still being set up (no Meet link stored yet), or repeat the details if it is finished; a different time gets "you already have a call booked for ..." with the "Change or cancel" button. If the number has made 3 chat bookings in 24 hours, say the team will arrange it. The same two checks run when "Book a free call" is tapped, so nobody walks through the list to be refused at the end.
3. **Insert the `consultation_bookings` row** (status `confirmed`, `booked_via` `whatsapp`). If the slot rule rejects it (23505), someone took the time a moment ago: step 1's message.
4. **Create the Google event and Meet link** with `create-consultation-calendar-event` (the same function the website uses; the invite goes out from Google). Store the link on the row.
5. **Send Lana's confirmation in the chat.**
6. **Send the branded confirmation email** with `send-consultation-booking-confirmation`, without a phone number (otherwise it sends a second WhatsApp text straight to Meta that the chat does not record).
7. **Send the notice to info@.**

The row's fields: `parent_name` the WhatsApp name (empty if WhatsApp gave none: a placeholder would stick in the CRM, which keeps the first name it is given), `student_name` and `grade_level` empty strings (the columns are NOT NULL; a placeholder would block the real value later), `subjects_interest` empty, `preferred_mode` `consultation`, `phone_number` the WhatsApp digits (the same form the website stores), `email` lowercased, `additional_notes` "Booked in the WhatsApp chat" plus the family's own words from the chat (typed messages only, about 600 characters), `status` `confirmed`.

Failures:

| What fails | The family gets | The team gets |
|---|---|---|
| Meta refuses a message with buttons | The same text without buttons (first answers), or a short text asking for a day and time (booking steps) | The existing "Meta refused" alert |
| The time was taken | "Sorry, that time has just been taken" and the day's other times | Nothing |
| The row cannot be saved | "Something went wrong on my side; I've asked our team to book this with you" | An alert with the cause |
| The Google event fails | The booking, without a link: "our team will send you the Google Meet link here" | An alert: booked, nobody invited, please make the link and send it (the booking keeps the `https://meet.google.com/pending` link, as the website's does) |
| The confirmation email fails | Nothing (Google's invite already went) | An alert |

### Database: migration `0008_inchat_booking.sql`

0006 (CRM lessons) and 0007 (learning loop) belong to other unmerged branches; the number only orders files and this SQL does not depend on either. Safe to run twice.

1. `consultation_bookings.booked_via text` (null for website and older bookings, `whatsapp` for the chat), so the new channel can be counted.
2. A rule that two families cannot hold one time: a unique index on `(consultation_date, consultation_time)` where `status <> 'cancelled'` **and `consultation_date >= '2026-11-01'`**. Production today (read-only, 2026-10-31): no such rule exists; 11 date-and-time pairs in the past are held twice (one three times), the latest on 2026-08-18, so a rule over all rows would fail to build. The date skips that history. One booking is upcoming, so the index builds. The website gets the same protection. Rechecked read-only on 2026-11-01: still no rule and no `booked_via` column; 3 bookings that are not cancelled on or after 1 November, none clashing, so the index still builds; the live `crm_record_assessment_booking` equals 0004's text apart from whitespace, so 0008's replacement overwrites nothing else.
3. `crm_record_assessment_booking` replaced by 0004's text plus one change: for a booking with `booked_via = 'whatsapp'` it sets the family's lead to `needs_reply = false`. The existing lead trigger (0005) then also clears a leftover "Reply to the WhatsApp hand-off" next step. The copy is compared with the live definition before applying, so it cannot overwrite a change made elsewhere.

### CRM and inbox after a booking

The write order in the chat is: the family's tap is saved (the lead is flagged, because the chat is with the team) → the booking row is inserted (the lead moves to "Call booked", next step "Hold the assessment call", flag cleared) → Lana's message is saved (it adds no flag). A scratch-Postgres replay of this order, against the real CRM triggers, is part of the checks. The inbox prints each message's text; Lana's booking messages carry the label "Lana (AI)" like the other non-human messages (an existing open item: `via` could tell them apart).

### Changes to the two booking functions

- `create-consultation-calendar-event`: the event title is `Consultation - <child>` when a child's name is known, else `Consultation - <parent>`; "Student", "Grade" and "Subjects" lines appear only when there is something to say; a `source` of `whatsapp` adds "Booked in the WhatsApp chat" to the description.
- `send-consultation-booking-confirmation`: where it names the child ("for <name>", "<name>'s learning needs", the subject line and the calendar titles) it says "your child" when there is no name. The Google and Outlook add-to-calendar links are built in Nairobi time (see below).
- Tests drive both functions through the same harness with their outside calls faked.

## How it is checked

- The Node harness (`npm run test:edge`), extended: interactive messages, a bookings table with the slot rule, the two booking functions, a controllable clock. New tests cover the whole flow and each failure above, taps while the chat is with the team, the 5-second wait being skipped for taps, a stale tap, a double tap, a team reply ending the flow, the limits, the off switches, and every message against Meta's limits.
- Strict `tsc` against the Deno shim and `eslint` on the touched files (the repo's lint count must not rise).
- A scratch Postgres with the real migrations (0004, 0005, 0008, twice): the CRM effect of an in-chat booking and of a website booking, the slot rule (also after a cancel), and the existing WhatsApp write-sequence replay still passing.
- Not verifiable from here, and said so: Meta's live behaviour with interactive messages on the production number, Google, Resend, the production migration, the site change in a browser. The first live test is a post-deploy check.
- Results, 2026-11-01: `npm run test:edge` 145 pass (booking 24, in-chat 53, consultation functions 6, migration file 4, webhook 58). Strict `tsc` against the Deno shim over the webhook with `booking.ts`, `lana.ts` and `claude.ts`: 0 errors, and a deliberate error in a probe file is caught. `tsc -p tsconfig.app.json` clean. `npm run lint` 526 problems, as before the branch; the four errors in touched files are older `any`s the branch did not add. Scratch Postgres with 0004, 0005 and 0008 twice: 41 checks pass (23 of the old WhatsApp replay, 18 new), no CRM warnings. The branch diff holds no key, token or real phone number.

## Rollout (the owner decides each step)

1. Merge and deploy PR #11, then PR #12 (already built). Done 2026-11-01: merged as `b8cd318` and `dc14ab6`, each published.
2. Apply `0008` through the Lovable connector, with the owner's go-ahead, in one transaction; check with a SELECT. Done 2026-11-01: recorded as id 7 in `drizzle.__drizzle_migrations`, and the live function body equals the file's.
3. Deploy the three edge functions through Lovable and publish the site.
4. Checks on a real phone: send the "assessment call" starter and book a call end to end; a free-text message that gets the buttons; a tap on "Call me back"; "Change or cancel"; book the same time from a second phone (expect the friendly refusal); confirm the lead shows "Call booked" with no "needs reply"; cancel the test booking by hand and delete the calendar event.
5. If anything misbehaves: `WHATSAPP_BOOKING=off`, no redeploy.

## Found along the way (not changed here unless stated)

1. **Consultation reminders probably never send.** An hourly job `send-consultation-reminders` exists in production, but `send-consultation-reminder` and `send-consultation-reminder-whatsapp` read the time with `new Date("2026-11-03T02:00 PM")`, which is an Invalid Date (checked in Node), so the 24-hour and 1-hour windows never match. The functions write no log, so production cannot show a sent or unsent reminder. The confirmation email and the website's WhatsApp text both promise reminders. The earlier email-volume work (PR #4) removed the "Send Reminders" button from the admin Consultations tab, so whether reminders should start is the owner's call. Lana's booking messages do not promise any. A fix is small; WhatsApp reminders outside 24 hours would also need an approved Meta template.
2. **The add-to-calendar links in the confirmation email are three hours late** when the function's clock is UTC: a 2:00 pm Nairobi call becomes 5:00 pm in the link (reproduced in Node with `TZ=UTC`; I could not read the production function's time zone, but Supabase's edge runtime is UTC as far as I know). Fixed here, because the function is edited anyway, with an explicit +03:00 so it is right whatever the clock; the reminder email has the same fault and is not touched.
3. **The website can leave a stray Google invite**: it creates the calendar event before saving the booking, so a family that loses a race for a time (rare) sees an error but already holds an invite. The slot rule gives them a clear message; removing the stray invite needs the website to reserve first, as the chat does. Not changed.
4. **`create-consultation-calendar-event` has no authentication and invites any address.** Existing; the webhook calls it server to server.
5. **11 past times were booked twice** (listed under Database), which the new rule leaves alone.
6. The inbox labels every non-human message "Lana (AI)".

## Review notes (2026-11-01, from reading the finished diff against this document)

The code does what this document says. Small things, none changed:

1. **Order matters at rollout.** The new code selects and writes `booked_via`. Deployed before 0008 is applied, the first "Book a free call" tap answers "something went wrong on my side" and alerts the team. It fails safe, but apply 0008 first.
2. **The `[Buttons: ...]` and `[List: ...]` lines are stored in the chat** so the inbox shows what was offered, and the AI reads them as part of Lana's earlier messages once the team clicks Resume AI. A model could copy the habit. If it ever does, strip those lines when the chat is handed to the AI.
3. **A timed-out Google call.** After 20 seconds the booking is kept with the pending link and the team is told nobody was invited, but Google may still finish the event. The alert gives the booking id; check the calendar before making a second event.
4. **"Sorry, that time has just been taken"** is also what a family sees when a time today has slipped inside the hour. The wording is slightly off; nothing is booked either way.
5. **Typed "yes, book me" after the offer** (no tap) goes to the team, as designed: typed text is read only while a booking step is open.

## What is left to the builder

Exact message wording (drafted in the plan, in Lana's voice: warm, short, no emojis, no sign-off); test names; file layout inside `booking.ts`; the journal and snapshot stubs for 0008 in the shape 0005 uses.

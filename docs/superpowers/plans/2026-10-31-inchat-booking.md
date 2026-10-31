# In-chat booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A parent books the free 20-minute assessment call inside the WhatsApp chat with Lana, with taps and one typed email.

**Architecture:** Pure rules and message builders in a new `whatsapp-webhook/booking.ts`; the work that touches the outside world (database, Meta, the two booking functions, alerts) in a new section of `whatsapp-webhook/index.ts`. Flow state is a `booking` field on Lana's own messages in the chat history, so there is no new column. Reserve the booking row first, then the side effects. Tests drive the real handler under Node with the network and database faked.

**Tech Stack:** Deno edge functions in TypeScript, Supabase Postgres, Meta WhatsApp Cloud API (interactive messages), `node:test` plus the esbuild harness already in `supabase/functions/_tests/`, plain SQL migrations.

**Spec:** `docs/superpowers/specs/2026-10-31-inchat-booking-design.md`. Read it first; this plan only adds what the spec leaves to the builder.

## Global Constraints

- Work in this worktree on branch `claude/suspicious-driscoll-69e883`. Commit locally. Never push, deploy, open a PR, or write to production; production is read-only through the Lovable connector (project `75fc15fb-4dcf-442a-b789-c8185bbd1cef`).
- Call times, in the website's own text: `11:00 AM, 11:20 AM, 11:40 AM, 12:00 PM, 12:20 PM, 12:40 PM, 01:00 PM, 01:20 PM, 01:40 PM, 02:00 PM, 02:20 PM, 02:40 PM, 07:00 PM, 07:20 PM, 07:40 PM, 08:00 PM, 08:20 PM, 08:40 PM`. 20 minutes each. Nairobi time is UTC+3 all year, labelled "Nairobi time (EAT)" everywhere.
- Offered: today to today plus 14 days inclusive, never Sunday, on today only times starting more than 60 minutes from now, at most 10 days listed, not held by a booking whose status is not `cancelled`.
- Limits: one upcoming booking per phone (match the WhatsApp digits and `+digits`); at most 3 rows with `booked_via = 'whatsapp'` per phone in the last 24 hours; the email passes `^[^@\s]+@[^@\s]+\.[^@\s]+$` and is at most 254 characters; `parent_name` at most 200.
- Meta limits: list 1 to 10 rows, button text 20, row title 24, row description 72, row id 200, section title 24, body 4,096; reply buttons at most 3, title 20, id 256, body 1,024.
- Tap ids start `bk:`: `bk:start`, `bk:callback`, `bk:day:<YYYY-MM-DD>`, `bk:part:<YYYY-MM-DD>:<am|pm|eve>`, `bk:time:<YYYY-MM-DD>:<HHMM 24h>`, `bk:confirm:<YYYY-MM-DD>:<HHMM>`, `bk:retime`, `bk:reemail`, `bk:change`. `via` of Lana's booking messages is `booking:<step>`.
- Secrets: `WHATSAPP_BOOKING` (`off` disables), `WHATSAPP_BOOKING_NOTICES` (`off` silences the info@ notice), `WHATSAPP_BOOKING_CALL_MS` (default 20000, the limit for each call to the two booking functions).
- Lana's voice in every string: warm, short, plain text, no emojis, no sign-off.
- `booking.ts` stays pure (no Deno, no network, no imports), like `lana.ts`. Use only erasable TypeScript so the strict check and esbuild both accept it.
- A booking whose Google event failed stores `https://meet.google.com/pending` as its `meeting_link`, as the website's does, and Lana never sends that link to a family.
- Baseline before this plan: `npm run test:edge` runs 59 tests, all passing; the repo's `npm run lint` reports 526 problems and must not rise.

## Review Focus

Failure modes the spec implies that no single feature test would otherwise cover, most likely first. Each has a named test in the owning task.

1. A double tap on "Confirm" (WhatsApp keeps the buttons live): exactly one booking and one confirmation. Task 4.
2. A day or time that fills between the list and the tap, and an old message tapped after the flow moved on: never a wrong booking, always a polite re-offer. Tasks 3 and 4.
3. Typing instead of tapping: no address, an address inside a sentence, a stray message mid-flow, a team reply mid-flow, and "stop" in the middle. Task 3.
4. Google or the email service failing after the row is saved: the booking stands, no dead Meet link is sent, the team is told. Task 4.
5. Clock edges: just after Nairobi midnight (still yesterday in UTC), Saturday evening rolling to Monday, a time exactly one hour away, the last day of the window. Task 1.

## File Structure

| File | Responsibility |
|---|---|
| `supabase/functions/whatsapp-webhook/booking.ts` (new) | Pure: call times and rules, tap ids, email finding, flow state, limits arithmetic, the booking row, every message the flow can send. |
| `supabase/functions/whatsapp-webhook/index.ts` | Read tap ids, send interactive messages, run the flow against the database and the two functions, alerts, offer the call on replies. Grows by about 400 lines in one delimited section ("IN-CHAT BOOKING"); not split, to match the file's pattern, since a split would mean injecting about eight of its functions. |
| `supabase/functions/whatsapp-webhook/lana.ts` | Export `CALLBACK_REPLY`. |
| `supabase/functions/_tests/harness.mjs` | Fakes: interactive messages, a bookings table with the slot rule, the two functions, Google, `loadModule`. |
| `supabase/functions/_tests/booking.test.mjs` (new) | Pure tests (Tasks 1, 2, 5). |
| `supabase/functions/_tests/inchat-booking.test.mjs` (new) | Webhook tests (Tasks 3, 4, 5). |
| `supabase/functions/_tests/consultation-functions.test.mjs` (new) | The two changed functions (Task 6). |
| `supabase/functions/_tests/migration-0008.test.mjs` (new) | The migration file and journal (Task 7). |
| `supabase/functions/_tests/whatsapp-webhook.test.mjs` | Two existing expectations change (Task 5). |
| `supabase/functions/create-consultation-calendar-event/index.ts`, `send-consultation-booking-confirmation/index.ts` | Cope with no child's name; right calendar-link time (Task 6). |
| `src/pages/BookConsultation.tsx` | Friendly message when the slot rule rejects a booking (Task 6). |
| `drizzle/migrations/0008_inchat_booking.sql`, `meta/_journal.json`, `meta/0008_snapshot.json` | Task 7. |
| `package.json` | `test:edge` runs every `*.test.mjs` in the folder (Task 1). |

---

### Task 1: Rules, ids, emails, state, limits (pure)

**Files:**
- Create: `supabase/functions/whatsapp-webhook/booking.ts`, `supabase/functions/_tests/booking.test.mjs`
- Modify: `supabase/functions/_tests/harness.mjs` (add `loadModule`), `package.json` (`"test:edge": "node --test supabase/functions/_tests/*.test.mjs"`)

**Interfaces:**
- Produces, all exported from `booking.ts`:
```ts
export type Part = "am" | "pm" | "eve";
export type Step = "offer" | "day" | "part" | "time" | "email" | "confirm" | "done";
export type BookingState = { step: Step; day?: string; time?: string; email?: string; tries?: number; nudged?: boolean; id?: string };
export type Action =
  | { kind: "start" | "callback" | "retime" | "reemail" | "change" }
  | { kind: "day"; day: string }
  | { kind: "part"; day: string; part: Part }
  | { kind: "time" | "confirm"; day: string; time: string };
export type ChatMessage = { role: "user" | "model"; content: string; sent_by?: string; tap?: string; attachment?: unknown; booking?: BookingState };
export type Booked = Record<string, string[]>; // day -> times held by a booking that is not cancelled
export type BookingRow = { id: string; consultation_date: string; consultation_time: string; status: string; booked_via?: string | null; created_at?: string; meeting_link?: string | null };
export const CALL_TIMES: readonly string[];
export const MAX_DAYS_SHOWN = 10, HORIZON_DAYS = 14, MAX_CHAT_BOOKINGS_PER_DAY = 3;
export function nairobiNow(now: Date): { day: string; minutes: number }; // day "YYYY-MM-DD", minutes since Nairobi midnight
export function addDays(day: string, n: number): string;
export function freeTimes(day: string, now: Date, booked: Booked): string[]; // grid order; [] when the day is not offerable
export function isFree(day: string, time: string, now: Date, booked: Booked): boolean;
export function openDays(now: Date, booked: Booked): { day: string; free: number }[]; // soonest first
export function partOf(time: string): Part; // am: before 13:00, pm: before 19:00, else eve
export function partsOf(times: string[]): Part[];
export function timesInPart(times: string[], part: Part): string[];
export function slotId(time: string): string; // "01:20 PM" -> "1320"
export function parseTap(id: string): Action | null;
export function findEmail(text: string): string | null; // first address in the text, lowercased
export function currentFlow(history: ChatMessage[]): BookingState | null;
export function isOpen(state: BookingState | null): state is BookingState; // day, part, time, email or confirm
export function phoneVariants(phone: string): string[];
export function isUpcoming(row: BookingRow, now: Date): boolean;
export function countRecentChatBookings(rows: BookingRow[], now: Date): number;
export function bookingRow(a: { name?: string; phone: string; email: string; day: string; time: string; history: ChatMessage[] }): Record<string, unknown>;
```
- `harness.mjs` gains `export async function loadModule(relPathFromFunctionsDir: string): Promise<Record<string, any>>`: bundle the file with esbuild (platform node, format esm), write it to a temp directory, `import()` it, delete the directory, return the module.

- [ ] **Step 1: Write the failing tests** in `booking.test.mjs`. Load with `const b = await loadModule("whatsapp-webhook/booking.ts")`. Clocks: `MON_10 = new Date("2026-11-02T07:00:00Z")` (Monday 10:00 Nairobi).
  - **"the call times are the website's, in the website's own text"**: read `src/pages/BookConsultation.tsx`, take the quoted strings inside `const ALL_TIME_SLOTS = [ ... ];`; `assert.deepEqual(b.CALL_TIMES, theirs)`, length 18, first `"11:00 AM"`, last `"08:40 PM"`.
  - **"Nairobi is three hours ahead, so just after its midnight is already tomorrow"** (Review Focus 5): `nairobiNow(new Date("2026-11-02T21:30:00Z"))` equals `{ day: "2026-11-03", minutes: 30 }`; `nairobiNow(MON_10)` equals `{ day: "2026-11-02", minutes: 600 }`. At that instant `freeTimes("2026-11-02", …, {})` is `[]` and `freeTimes("2026-11-03", …, {})` has 18.
  - **"today offers only times that start more than an hour from now"** (Review Focus 5): at 09:59 Nairobi (`06:59Z`) `freeTimes("2026-11-02", now, {})[0] === "11:00 AM"`, length 18; at 10:00 the first is `"11:20 AM"`, length 17.
  - **"a held time is not offered"**: `freeTimes("2026-11-04", MON_10, { "2026-11-04": ["01:20 PM"] })` has 17 and lacks it; `isFree` agrees both ways.
  - **"Sundays, past days and days beyond the window are never offered"**: `freeTimes("2026-11-08", …)`, `("2026-10-31", …)`, `("2026-11-17", …)` are `[]`; `("2026-11-16", …)` has 18 (the last day).
  - **"the list is the soonest ten days with a free time"**: `openDays(MON_10, {}).map(d => d.day)` equals `["2026-11-02","2026-11-03","2026-11-04","2026-11-05","2026-11-06","2026-11-07","2026-11-09","2026-11-10","2026-11-11","2026-11-12"]`; first `free === 17`, second `18`.
  - **"a fully held day is left out"**: all 18 held on 2026-11-03 → its day is absent.
  - **"Saturday evening rolls to Monday"** (Review Focus 5): at `2026-11-07T17:30:00Z` (20:30 Nairobi) the first listed day is `"2026-11-09"` with 18 free.
  - **"parts"**: `partOf("12:00 PM") === "am"`, `partOf("01:00 PM") === "pm"`, `partOf("07:00 PM") === "eve"`; `partsOf` of a full day is `["am","pm","eve"]`, of a day with the evening held `["am","pm"]`; `timesInPart(full, "pm")` equals `["01:00 PM","01:20 PM","01:40 PM","02:00 PM","02:20 PM","02:40 PM"]`; `slotId("01:20 PM") === "1320"`, `slotId("12:00 PM") === "1200"`, `slotId("08:40 PM") === "2040"`.
  - **"tap ids are read back, and anything else is refused"**: `parseTap("bk:day:2026-11-04")` → `{ kind: "day", day: "2026-11-04" }`; `"bk:part:2026-11-04:pm"` → `{ kind: "part", day: "2026-11-04", part: "pm" }`; `"bk:time:2026-11-04:1320"` → `{ kind: "time", day: "2026-11-04", time: "01:20 PM" }`; `"bk:confirm:2026-11-04:1320"` → `{ kind: "confirm", … }`; `bk:start|callback|retime|reemail|change` → `{ kind }`. Each of `"bk:day:2026-13-45"`, `"bk:time:2026-11-04:1325"`, `"bk:day:2026-11-04:x"`, `"bk:nonsense"`, `"hello"`, `""` → `null`.
  - **"an email is found inside a sentence"** (Review Focus 3): `findEmail("my email is Jane.Doe@Example.com, thanks")` → `"jane.doe@example.com"`; `"<jane@example.com>"` and `"jane@example.com."` → `"jane@example.com"`; `"a@b.co and c@d.co"` → `"a@b.co"`; `"jane@example"`, `"jane@@example.com"`, `"no email here"`, and a 255-character address → `null`.
  - **"the flow is read from Lana's latest message"**: `currentFlow` returns that message's `booking`; a later user message does not end it; a later `sent_by: "human"` model message returns `null`; a latest model message without `booking` returns `null`; empty history `null`. `isOpen` is true for exactly `day, part, time, email, confirm`, and false for `null`, `offer`, `done`.
  - **"upcoming and recent bookings"**: at `MON_10`, a `confirmed` row on 2026-11-03 is upcoming; a `cancelled` one is not; a row on 2026-11-02 at `"11:00 AM"` is upcoming (ends 11:20) and one at `"09:00 AM"` is not; yesterday's is not. `countRecentChatBookings` counts rows with `booked_via: "whatsapp"` and `created_at` within 24 hours of `now` whatever their status, and ignores website rows. `phoneVariants("254712345678")` → `["254712345678", "+254712345678"]`.
  - **"the booking row has the website's shape"**: `bookingRow({ name: "Jane", phone: "254712345678", email: "jane@example.com", day: "2026-11-03", time: "01:20 PM", history })` has `parent_name: "Jane"`, `student_name: ""`, `grade_level: ""`, `subjects_interest: []`, `preferred_mode: "consultation"`, `phone_number: "254712345678"`, `email`, `consultation_date`, `consultation_time: "01:20 PM"`, `status: "confirmed"`, `booked_via: "whatsapp"`; `additional_notes` starts `"Booked in the WhatsApp chat."` and then holds the family's typed words only (not taps, attachments, Lana's messages, or a message that is just the email), cut at 600 characters; a missing name gives `parent_name: ""`; a 300-character name is cut to 200.
- [ ] **Step 2: Run to see it fail.** `node --test supabase/functions/_tests/booking.test.mjs` → FAIL, `Could not resolve "…/booking.ts"`.
- [ ] **Step 3: Add `loadModule` to the harness and implement `booking.ts`** with the signatures above. Approach notes: Nairobi time is `new Date(now.getTime() + 3 * 3_600_000)` read through `getUTC*`; days are `YYYY-MM-DD` strings and `addDays` goes through `Date.UTC`; weekday from `new Date(day + "T00:00:00Z").getUTCDay()` (0 is Sunday); a time's minutes come from its text (`12:00 PM` is noon); offerable means `today <= day <= addDays(today, HORIZON_DAYS)`, not Sunday, and on today `start > nowMinutes + 60`.
- [ ] **Step 4: Run to see it pass.** Same command → all pass. Then `npm run test:edge` → the 59 old tests plus the new ones pass.
- [ ] **Step 5: Commit.** `git add supabase/functions/whatsapp-webhook/booking.ts supabase/functions/_tests package.json && git commit -m "In-chat booking: the rules, ids and state, as pure code"` (with the repo's `Co-Authored-By` trailer).

---

### Task 2: Every message the flow can send (pure)

**Files:**
- Modify: `supabase/functions/whatsapp-webhook/booking.ts`, `supabase/functions/_tests/booking.test.mjs`

**Interfaces:**
- Consumes: Task 1's types and functions.
- Produces:
```ts
export type Interactive = Record<string, unknown>; // Meta's "interactive" object
export type Outgoing = {
  wa: { type: "text"; body: string } | { type: "interactive"; interactive: Interactive };
  content: string;   // what the inbox shows and the AI reads: the text, then a "[List: …]" or "[Buttons: …]" line
  via: string;       // "booking:<step>", or the given via
  booking?: BookingState;
  fallback: string;  // plain text to send if Meta refuses an interactive message
};
export function dayLabel(day: string, now: Date): string; // "Today" | "Tomorrow" | "Wed 4 Nov"
export function longDay(day: string): string; // "Wednesday 4 November"
export function niceTime(time: string): string; // "01:20 PM" -> "1:20 pm"
export function endTime(time: string): string; // 20 minutes later, same style
export function textOut(via: string, body: string, booking?: BookingState): Outgoing;
export function offerOut(text: string, via: string): Outgoing[];
export function dayListOut(days: { day: string; free: number }[], now: Date, opts?: { intro?: "first" | "again" | "filled"; email?: string }): Outgoing;
export function partsOut(day: string, parts: Part[], email?: string): Outgoing;
export function timesOut(day: string, times: string[], opts?: { taken?: boolean; email?: string }): Outgoing;
export function askEmailOut(day: string, time: string, retry?: { tries: number }): Outgoing;
export function confirmOut(day: string, time: string, email: string): Outgoing;
export function bookedOut(a: { day: string; time: string; email: string; link: string | null; id: string }): Outgoing;
export function alreadyBookedOut(day: string, time: string): Outgoing;
export const COPY: { firstDays: string; againDays: string; filledDays: string; askEmail: string; emailRetry: string; emailGiveUp: string; noFreeDays: string; limit: string; changeAck: string; nudge: string; wentWrong: string; teamArranges: string; moreButtons: string };
```
`booking` on each result: `dayListOut` `{ step: "day", email }`; `partsOut` `{ step: "part", day, email }`; `timesOut` `{ step: "time", day, email }`; `askEmailOut` `{ step: "email", day, time, tries }`; `confirmOut` `{ step: "confirm", day, time, email }`; `bookedOut` and `alreadyBookedOut` `{ step: "done", id }` (the latter without `id`); `offerOut` `{ step: "offer" }`. `via` is `booking:day|part|time|email|confirm|done` for those builders. `offerOut` is the exception: when the text fits, its one message keeps the `via` it was given (`"ai"`, `"backup"`, `"prefill:learn_more"`); when it does not, the plain text keeps the given `via` and the second, button-only message has `via: "booking:offer"`.

The exact copy (fixed here; `COPY` holds the fixed strings, the rest are template literals in the builders):
```ts
firstDays:   "Let's find a time for your free 20-minute call with our Learning Coordinator. Pick a day below. All times are Nairobi time (EAT)."
againDays:   "Pick a day below. All times are Nairobi time (EAT)."
filledDays:  "Sorry, that day has just filled up. Pick another day below. All times are Nairobi time (EAT)."
askEmail:    "Thanks. What email address should we send the calendar invite to? Please type it below."
emailRetry:  "That doesn't look like an email address. Please type it like name@example.com."
emailGiveUp: "No problem. I've asked our team to book this with you, and they'll message you here shortly."
noFreeDays:  "I can't see a free time in the next two weeks. I've asked our Learning Coordinator to arrange your call, and someone will message you here shortly."
limit:       "I've reached the limit for booking in the chat today, so I've asked our team to arrange your call. They'll message you here."
changeAck:   "No problem. I've asked our team to change or cancel your call. They'll confirm with you here shortly."
nudge:       "Thanks. To keep going, please tap one of the options above. Or tell us the day and time you prefer, and our team will arrange it."
wentWrong:   "Sorry, something went wrong on my side. I've asked our team to book this with you, and they'll message you here shortly."
teamArranges:"Our team will arrange your call. Please tell us the day and time you'd like, and your time zone."
moreButtons: "Would you like to book it here?"
parts body:  `Which part of the day suits you on ${longDay(day)}? All times are Nairobi time (EAT).`
times body:  `Pick a time on ${longDay(day)}. Each call is 20 minutes, in Nairobi time (EAT).`   // taken: prefixed "Sorry, that time has just been taken. "
confirm:     `Please check your booking:\n\nDay: ${longDay}\nTime: ${niceTime} to ${endTime} Nairobi time (EAT)\nEmail: ${email}\n\nShall I book it?`
booked:      `Your call is booked.\n\n${longDay}, ${niceTime} Nairobi time (EAT)\nGoogle Meet: ${link}\n\nA calendar invite is on its way to ${email}. It will show the time in your own time zone once you add it to your calendar.\n\nTo help our Learning Coordinator prepare, please type your child's grade and the subjects they need help with.`
             // no link: replace the "Google Meet:" line and the invite paragraph with "\n\nOur team will send you the Google Meet link here before the call."
already:     `You already have a call booked for ${longDay}, ${niceTime} Nairobi time (EAT). If you need to change it, tap the button below.`
```
Buttons and lists: offer `Book a free call` (`bk:start`), `Call me back` (`bk:callback`); parts `11:00 am - 12:40 pm`, `1:00 - 2:40 pm`, `7:00 - 8:40 pm` (`bk:part:<day>:am|pm|eve`); confirm `Confirm` (`bk:confirm:<day>:<slotId>`), `Change time` (`bk:retime`), `Change email` (`bk:reemail`); booked and already `Change or cancel` (`bk:change`). Day list: list button `Pick a day`, section `Days with free times`, rows `bk:day:<day>` titled `dayLabel`, described `N times free` (`1 time free`). Time list: button `Pick a time`, section `Free times`, rows `bk:time:<day>:<slotId>` titled `niceTime`, described `<Wed 4 Nov>, 20 minutes`. `offerOut` puts the text in the button message when it is at most 1,024 characters; otherwise it returns the text as a plain message with the given `via`, then a button message whose body is `COPY.moreButtons`. `fallback` is the text itself for offers and `COPY.teamArranges` for everything else.

- [ ] **Step 1: Write the failing tests** (same file; `NOW = MON_10`):
  - **"every message the flow can build is inside Meta's limits"**: build a day list with 10 rows, parts with 3, times with 10 and with 6, ask-email, confirm with a 254-character email, booked with and without a link, already-booked, `offerOut` with a 900-character and a 1,100-character text. For each interactive: list → rows ≤ 10, `action.button` ≤ 20, each row `id` ≤ 200, `title` ≤ 24, `description` ≤ 72, section `title` ≤ 24, body ≤ 4096; buttons → ≤ 3, each `reply.title` ≤ 20, `reply.id` ≤ 256, body ≤ 1024. A confirm body with a 254-character email stays ≤ 1024.
  - **"no message contains an emoji"**: `/\p{Extended_Pictographic}/u` matches none of the above, nor any `COPY` value.
  - **"day labels, times and ranges read as people say them"**: `dayLabel("2026-11-02", NOW) === "Today"`, `"2026-11-03"` → `"Tomorrow"`, `"2026-11-04"` → `"Wed 4 Nov"`; `longDay("2026-11-04") === "Wednesday 4 November"`; `niceTime("01:20 PM") === "1:20 pm"`, `niceTime("11:00 AM") === "11:00 am"`, `niceTime("12:00 PM") === "12:00 pm"`; `endTime("12:40 PM") === "1:00 pm"`, `endTime("11:40 AM") === "12:00 pm"`, `endTime("08:40 PM") === "9:00 pm"`.
  - **"the day list has Today and Tomorrow, counts and the state"**: rows for `openDays(NOW, {})` have titles `["Today","Tomorrow","Wed 4 Nov",…]`, first description `"17 times free"`, one with a single free time `"1 time free"`; ids `bk:day:2026-11-02`…; `booking` is `{ step: "day" }`, `via` `"booking:day"`; with `intro: "again"` the body is `COPY.againDays`, with `"filled"` `COPY.filledDays`, default `COPY.firstDays`; `content` ends with `[List: Today, Tomorrow, Wed 4 Nov, …]`.
  - **"parts, times and the confirmation carry what the next tap needs"**: `partsOut("2026-11-04", ["am","pm","eve"])` titles `["11:00 am - 12:40 pm","1:00 - 2:40 pm","7:00 - 8:40 pm"]`, ids `bk:part:2026-11-04:am|pm|eve`; `timesOut("2026-11-04", ["01:20 PM"])` row `{ id: "bk:time:2026-11-04:1320", title: "1:20 pm", description: "Wed 4 Nov, 20 minutes" }`, with `taken: true` the body starts `"Sorry, that time has just been taken."`; `confirmOut("2026-11-04","01:20 PM","jane@example.com")` body contains `"Day: Wednesday 4 November"`, `"Time: 1:20 pm to 1:40 pm Nairobi time (EAT)"`, `"Email: jane@example.com"`, buttons `Confirm | Change time | Change email` with ids `bk:confirm:2026-11-04:1320`, `bk:retime`, `bk:reemail`, state `{ step: "confirm", day: "2026-11-04", time: "01:20 PM", email: "jane@example.com" }`; `content` ends `[Buttons: Confirm | Change time | Change email]`.
  - **"the booked message has the link, or says the team will send it"**: with `link: "https://meet.google.com/abc-defg-hij"` the body contains the link, `"jane@example.com"` and `"Nairobi time (EAT)"`; with `link: null` it contains `"Our team will send you the Google Meet link here before the call."` and no `meet.google.com`; both end with the grade-and-subjects invitation, have the single button `Change or cancel` (`bk:change`), state `{ step: "done", id }`.
  - **"asking for the email can retry"**: `askEmailOut("2026-11-04","01:20 PM")` body `COPY.askEmail`, state `{ step: "email", day, time }`; with `{ tries: 1 }` the body is `COPY.emailRetry` and the state carries `tries: 1`.
  - **"the offer carries the two buttons, in one message or two"**: `offerOut("Thanks. …", "ai")` → one message, `wa.type === "interactive"`, buttons `Book a free call` (`bk:start`) and `Call me back` (`bk:callback`), `via: "ai"`, `booking: { step: "offer" }`; with a 1,100-character text → two messages, the first `wa.type === "text"` with `via: "ai"` and no `booking`, the second interactive with body `COPY.moreButtons`, `via: "booking:offer"` and `booking: { step: "offer" }`. In both, `content` of the button-carrying message ends `[Buttons: Book a free call | Call me back]`.
- [ ] **Step 2: Run to see it fail.** `node --test supabase/functions/_tests/booking.test.mjs` → the new tests FAIL (`b.dayListOut is not a function`).
- [ ] **Step 3: Implement the builders** in `booking.ts` with the signatures and copy above. `content` is the body, a blank line, then the bracketed line; plain text outs have `content` equal to the body. Truncation is not needed anywhere: every string is short, and the confirm body's only unbounded part is the email.
- [ ] **Step 4: Run to see it pass.** Same command; then `npm run test:edge` all pass.
- [ ] **Step 5: Commit.** `In-chat booking: the messages Lana sends`.

---

### Task 3: Taps, interactive sending, and the flow up to the confirmation card

**Files:**
- Modify: `supabase/functions/whatsapp-webhook/index.ts`, `supabase/functions/whatsapp-webhook/lana.ts`, `supabase/functions/_tests/harness.mjs`
- Create: `supabase/functions/_tests/inchat-booking.test.mjs`

**Interfaces:**
- Consumes: everything from Tasks 1 and 2.
- Produces in `lana.ts`: `export const CALLBACK_REPLY: string` (the existing text of `TEAM_REPLIES.callback`).
- Produces in `index.ts` (module level, new section "IN-CHAT BOOKING"):
```ts
type BookingContext = { from: string; profileName?: string; parentId: string | null };
const BOOKING_ON: boolean; // WHATSAPP_BOOKING !== "off"
async function sendOutgoing(to: string, out: Outgoing): Promise<SendResult>;
async function say(ctx: BookingContext, outs: Outgoing[], history?: Msg[]): Promise<Msg[] | null>; // sends, logs, saves each; null when Meta refused
async function loadBooked(fromDay: string, toDay: string): Promise<Booked | null>; // null when the query fails
async function runBookingTap(ctx: BookingContext, action: Action, history: Msg[]): Promise<void>;
async function runBookingText(ctx: BookingContext, msgId: string): Promise<void>;
async function startBooking(ctx: BookingContext, email?: string): Promise<void>;
```
  `Msg` gains `tap?: string` and `booking?: BookingState`; `readIncoming` returns `tap` (the button or list row id) for `interactive` messages; `appendMessages` stores both.
- Produces in `harness.mjs`: `world.sent` entries for interactive messages are `{ to, text: <body text>, interactive }` (text messages stay `{ to, text }`); `loadFunction` option `bookings` seeds `world.tables.consultation_bookings`; the fake query supports `.neq .gte .lte .in .order .limit`; inserts into `consultation_bookings` get an `id` (`crypto.randomUUID()`) and a `created_at` from the current (possibly mocked) `Date`; `export function tap(id, title, { from, name, list })` builds an inbound interactive message.

Behaviour to implement in `handleIncoming`, after the opt-out check and before the `escalated` check:
```ts
const action = incoming.tap ? parseTap(incoming.tap) : null;
const ctx = { from, profileName, parentId: convo.parent_id };
if (action) { await runBookingTap(ctx, action, saved.convo.messages); return; }
if (!incoming.attachment && !incoming.tap && isOpen(currentFlow(saved.convo.messages))) { await runBookingText(ctx, msg.id); return; }
```
The saved inbound message carries `tap` when there is one. `loadBooked` reads `from("consultation_bookings").select("consultation_date, consultation_time").gte("consultation_date", fromDay).lte("consultation_date", toDay).neq("status", "cancelled")` and groups the times by day. `runBookingTap` first calls `claimForReply(from)` (a no-op when the chat is already with the team). With `BOOKING_ON` false it sends `textOut("booking:off", COPY.teamArranges)` for any tap and stops. Per action: `callback` sends `textOut("booking:callback", CALLBACK_REPLY)`; `start` runs `startBooking`; `day`/`part`/`time` carry the email of the latest open flow state if there is one; `retime` is `startBooking` with that email; `reemail` needs the latest open state's day and time (else `startBooking`) and sends `askEmailOut`; `day` shows the day's times (a list when 10 or fewer, three part buttons when more, straight to the one part when only one has times, the day list with `intro: "filled"` when none); `part` shows that part's times (else the day again); `time` checks `isFree`, then goes to `confirmOut` when an email is known, else `askEmailOut`; a time no longer free shows the day's times with `taken: true` (or the day list when none). `confirm` and `change` are Task 4. `startBooking` reads `loadBooked(today, addDays(today, HORIZON_DAYS))`, then sends `dayListOut` (intro `"again"` when an email is carried) or `textOut("booking:day", COPY.noFreeDays)` when `openDays` is empty; a failed read sends `COPY.wentWrong`.
`runBookingText` waits `REPLY_DELAY_MS`, re-reads the chat, returns if the flow is no longer open or this is not the newest user message, collects the typed messages since Lana's last message (no attachments, no taps) and acts on the open step: `email`: first `findEmail` hit → `confirmOut`; none → on `tries` already 1 send `textOut("booking:email", COPY.emailGiveUp)` without state (the flow ends), else `askEmailOut` retry with `tries: 1`; `confirm`: an address → a new `confirmOut`, otherwise the nudge; `day`/`part`/`time`: the nudge. The nudge is `textOut("booking:<step>", COPY.nudge, { ...state, nudged: true })` and is sent only when `state.nudged` is not already set.
`say` sends each `Outgoing` through `sendOutgoing` (text: the existing sign-off cleaning, `preview_url`; interactive: `type: "interactive"`), then `logComm` outbound, then `appendMessages` of `{ role: "model", content, ts, via, booking? }`. If Meta refuses an interactive message it sends `textOut(out.via, out.fallback)` instead (no `booking`, so the flow ends), emails the team with a new `alertButtonsRefused` (Meta's error, "they got the same text without buttons"), and records the plain text; if the plain text is refused too, or a text message is refused, it calls the existing `alertSendFailed` and returns `null`.

- [ ] **Step 1: Harness changes** as listed under Produces, and helpers in the test file. `chatAt(booking, extra)` returns `loadFunction` options (merged with `extra`, e.g. `bookings`, `env`, `meta`) for a chat with `escalated: true`, `phone_number: PARENT`, and these messages: the user's `"Hi, I need a maths tutor for my son in Grade 6, CBC."`, then a Lana message `{ role: "model", via: "booking:" + booking.step, booking }` (for `{ step: "offer" }` the `via` is `"ai"`). Each test calls `t.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-11-02T07:00:00Z") })` after the function is loaded and advances it 1,000 ms after each `post`. "A day-step chat", "an email-step chat" and so on below mean `chatAt` with that `step` (and the `day`/`time` the test needs).
- [ ] **Step 2: Write the failing tests** in `inchat-booking.test.mjs` (`PARENT = "254700000001"`; `last(fn)` = `fn.world.conversation(PARENT).messages.at(-1)`):
  - **"tapping 'Book a free call' lists the days with a free time, although the chat is with the team, and without the wait"**: set `WHATSAPP_REPLY_DELAY_MS: "2000"`; `const t0 = performance.now(); await fn.post(tap("bk:start", "Book a free call"))`; elapsed < 1000; `fn.world.sent[0].interactive.type === "list"`; row ids start `bk:day:2026-11-02`, `bk:day:2026-11-03`; `last(fn).booking.step === "day"`, `last(fn).via === "booking:day"`; the saved tap is `{ role: "user", content: "Book a free call", tap: "bk:start" }`; `fn.world.gatewayCalls.length === 0`; the chat is still `escalated`.
  - **"a day with more than ten free times asks which part of the day first"**: tap `bk:day:2026-11-03` → buttons with ids `bk:part:2026-11-03:am`, `:pm`, `:eve`; state `{ step: "part", day: "2026-11-03" }`.
  - **"a day with ten or fewer free times goes straight to the list of times"**: seed `bookings` holding ten times on 2026-11-03 → tap that day → a list of the 8 left.
  - **"a day with free times in only one part skips the question"**: seed all but `"01:20 PM"`, `"01:40 PM"` held → a list of two rows.
  - **"a part shows its times, and a time asks for the email"**: tap `bk:part:2026-11-03:pm` → six rows `bk:time:2026-11-03:1300`…`1440`; tap `bk:time:2026-11-03:1320` → text `COPY.askEmail`, state `{ step: "email", day: "2026-11-03", time: "01:20 PM" }`.
  - **"a typed address gets the confirmation card without the AI"** (Review Focus 3): continue with the user typing `"jane@example.com"` → buttons `Confirm | Change time | Change email`; state `{ step: "confirm", day: "2026-11-03", time: "01:20 PM", email: "jane@example.com" }`; no gateway call.
  - **"an address inside a sentence is found"**: typing `"my email is Jane@Example.com thanks"` → the card shows `jane@example.com`.
  - **"no address gets one retry, then the team"**: start from an email-step chat; type `"I don't have one"` → text `COPY.emailRetry`, state `tries: 1`; type again → `COPY.emailGiveUp`, last message has no `booking`; a third message gets no reply.
  - **"Change time returns to the days with the email kept, and the next time goes straight to the card"**: from a confirm-step chat tap `bk:retime` → a day list, state `{ step: "day", email: "jane@example.com" }`; tap a day, a part and a time → the card, never `COPY.askEmail`.
  - **"Change email asks again and keeps the day and time"**: tap `bk:reemail` → `COPY.askEmail`, state `{ step: "email", day, time }`.
  - **"a stray message while the days are on offer gets one nudge, then silence"** (Review Focus 3): day-step chat; type `"Can we do Saturday morning?"` → `COPY.nudge`, state `nudged: true`; type again → nothing more sent; both saved.
  - **"a reply from the team ends the flow for typed text, but a tap is still read"** (Review Focus 3): email-step chat followed by `{ role: "model", sent_by: "human", content: "Hello, this is Wanjiru" }`; typing `"jane@example.com"` sends nothing; tapping `bk:start` then still sends the day list.
  - **"'stop' in the middle of the flow still opts the number out"** (Review Focus 3): email-step chat; typing `"stop"` → a `whatsapp_suppressions` row and the existing confirmation text; no card.
  - **"a day that has filled up since the list was sent shows the days again"** (Review Focus 2): seed all 18 times held on 2026-11-03 → tap `bk:day:2026-11-03` → a day list whose body is `COPY.filledDays`, without 2026-11-03.
  - **"a time taken since the list was sent shows the day's other times"** (Review Focus 2): seed `"01:20 PM"` held on 2026-11-03 → tap `bk:time:2026-11-03:1320` → times list whose body starts `"Sorry, that time has just been taken."` and lacks `1320`.
  - **"a tap for a Sunday, a past day or a made-up id is answered with the days"** (Review Focus 2): taps `bk:day:2026-11-08` and `bk:day:2026-10-31` → a day list; a tap whose id is `bk:nonsense` is read as ordinary text (saved, no reply, since the chat is with the team).
  - **"with no free day in two weeks, Lana says so"**: seed every time on every offerable day → `COPY.noFreeDays`; the chat stays with the team.
  - **"'Call me back' answers with the team's own call-back wording"**: tap `bk:callback` → `fn.world.sent[0].text === CALLBACK_REPLY` (import the text from `lana.ts` via `loadModule`); `last(fn).via === "booking:callback"`; no `booking`.
  - **"Meta refusing the list sends plain text, tells the team, and ends the flow"**: `meta: [{ status: 400, body: { error: { message: "Invalid parameter", code: 100 } } }]` then tap `bk:start` → `fn.world.sent.map(m => m.text)` equals `[COPY.teamArranges]` and `sent[0].interactive` is undefined; one email whose html contains `"Invalid parameter"`; the saved message has no `booking`.
  - **"WHATSAPP_BOOKING=off answers any tap with 'our team will arrange it'"**: env `WHATSAPP_BOOKING: "off"` → `COPY.teamArranges`, no list.
- [ ] **Step 3: Run to see them fail.** `node --test supabase/functions/_tests/inchat-booking.test.mjs` → FAIL (first failure: `sent[0].interactive` undefined or `loadFunction` option unknown).
- [ ] **Step 4: Implement** the `lana.ts` export, `Msg`/`WaMessage` types, `readIncoming`, `sendOutgoing`/`say`/`alertButtonsRefused`, the flow functions and the two lines in `handleIncoming`, per the behaviour above. Extract the sign-off cleaning in `sendWhatsAppMessage` into `stripSignOff(text)` so `say` and the existing sender share it. `alertButtonsRefused` reuses `sendAlert` (amber accent, subject `⚠️ WhatsApp: buttons were refused — <name or phone>`).
- [ ] **Step 5: Run to see them pass.** The command from Step 3, then `npm run test:edge` (the 59 old tests must still pass) and `npx eslint supabase/functions/whatsapp-webhook supabase/functions/_tests` (no output). Set up the strict type-check once, as the memory note `edge-function-verification-without-deno` describes (throwaway tsconfig outside the repo with the Deno shim and `paths` for the two URL imports; prove it with a deliberate error and `--listFiles`), run it, expect no errors.
- [ ] **Step 6: Commit.** `In-chat booking: read taps, send lists and buttons, and walk a family to the confirmation card`.

---

### Task 4: Confirm, book, and everything that can go wrong after

**Files:**
- Modify: `supabase/functions/whatsapp-webhook/index.ts`, `supabase/functions/_tests/harness.mjs`, `supabase/functions/_tests/inchat-booking.test.mjs`

**Interfaces:**
- Consumes: Tasks 1 to 3.
- Produces in `index.ts`:
```ts
const BOOKING_NOTICES_ON: boolean; // WHATSAPP_BOOKING_NOTICES !== "off"
const BOOKING_CALL_MS: number; // WHATSAPP_BOOKING_CALL_MS, default 20000
async function callFunction(name: string, body: unknown): Promise<{ ok: boolean; data: any; error?: string }>; // POST SUPABASE_URL/functions/v1/<name>, Bearer service role, AbortSignal.timeout(BOOKING_CALL_MS); never throws
async function lookUpBookings(phone: string, now: Date): Promise<{ upcoming: BookingRow | null; recent: number } | null>; // null when the query fails
async function confirmBooking(ctx: BookingContext, day: string, time: string, history: Msg[]): Promise<void>;
```
  `lookUpBookings` reads that phone's rows once (`from("consultation_bookings").select("id, consultation_date, consultation_time, status, booked_via, created_at, meeting_link").in("phone_number", phoneVariants(phone))`, no date filter) and derives `upcoming` (the first row where `isUpcoming`) and `recent` (`countRecentChatBookings`). `startBooking` now also calls it first: an upcoming booking sends `alreadyBookedOut`, `recent >= MAX_CHAT_BOOKINGS_PER_DAY` sends `textOut("booking:limit", COPY.limit)`. `runBookingTap` handles `confirm` and `change` (below).
- Produces in `harness.mjs`: `world.events` (an ordered list of strings: `insert booking`, `update booking`, `call <function name>`, `send interactive`/`send text`, `email <subject>`); `loadFunction` option `functions: { "<name>": [{ status, body, delayMs? }] }` scripts the two booking functions (defaults: calendar `{ success: true, eventId: "evt_1", meetingLink: "https://meet.google.com/abc-defg-hij" }`, confirmation `{ id: "email_fake" }`) and `world.functionCalls` records `{ name, headers, body }`; an insert into `consultation_bookings` with the same `consultation_date` and `consultation_time` as a row whose status is not `cancelled`, for a date on or after 2026-11-01, returns `{ data: null, error: { code: "23505", message: "duplicate key value violates unique constraint \"consultation_bookings_one_per_slot\"" } }`; `update` on any table works by `.eq("id", …)`; an option `failInsert: true` makes the next `consultation_bookings` insert return `{ error: { code: "XX000", message: "boom" } }`; an option `rejectNextInsert: true` adds a rival row (another phone, same date and time as the insert, status `confirmed`) just before the next `consultation_bookings` insert, so the slot rule fires after the code's own free-check has passed.

Behaviour of `confirmBooking` (the order is the design):
1. The day and time come from the button's id; the email from `currentFlow(history)` only if it is `{ step: "confirm" }` for that day and time, else it is stale: send nothing new but call `startBooking` (carrying any email) so the person sees the current step.
2. `lookUpBookings` (`null` → `COPY.wentWrong` and an alert). An upcoming booking for the same day and time is a double tap: if its `meeting_link` is empty and it was created less than 120 seconds ago it is still being set up, so send nothing; otherwise repeat `bookedOut` for it (link `null` when the stored link ends `/pending`). A different upcoming booking sends `alreadyBookedOut`. `recent >= 3` sends `COPY.limit`.
3. `loadBooked(day, day)`; `!isFree` re-shows the day's times with `taken: true`, or the day list.
4. Insert `bookingRow(...)` with `.select().single()`. Error code `23505`: look up again; if this phone now holds that day and time, send nothing (the other call sends the confirmation); otherwise step 3's message. Any other error: `COPY.wentWrong` and `alertBooking("not_saved")`.
5. `callFunction("create-consultation-calendar-event", { parentName, studentName: "", email, phoneNumber: "+" + phone, consultationDate: day, consultationTime: time, subjects: [], gradeLevel: "", notes: row.additional_notes, source: "whatsapp" })`. The link is `data.meetingLink` only when the call is ok, `data.success` is true, and the link does not end `/pending`; otherwise `null` and `alertBooking("no_link")`. Update the row's `meeting_link` to the link, or `https://meet.google.com/pending`.
6. `say(ctx, [bookedOut(...)])`.
7. With a link: `callFunction("send-consultation-booking-confirmation", { email, parentName, studentName: "", consultationDate: day, consultationTime: time, meetingLink })` (no phone number); not ok → `alertBooking("email_failed")`.
8. Unless `BOOKING_NOTICES_ON` is false, `sendAlert` to info@: subject `WhatsApp: a call was booked in the chat — <name or phone>`, green accent (`{ border: "#16a34a", heading: "#15803d" }`), facts name, phone, email, the call in Nairobi time, Meet link, booking id.
`change` sends `textOut("booking:change", COPY.changeAck)` and `alertBooking("change")` (amber; facts name, phone, the booking's day and time, email and link from the latest `done` state's booking row; the chat is already flagged because the chat is with the team). `alertBooking(kind, …)` is one function over `sendAlert` with subjects `⚠️ WhatsApp: a booking in the chat could not be saved — <who>`, `⚠️ WhatsApp: booked, but no Meet link — <who>` (notes: the booking is saved, nobody has been invited, please make the link and send it in the chat), `⚠️ WhatsApp: the confirmation email did not send — <who>`, and `WhatsApp: change or cancel a call — <who>`.

- [ ] **Step 1: Harness changes** as listed. Test helper `confirmChat(extra)` is `chatAt({ step: "confirm", day: "2026-11-03", time: "01:20 PM", email: "jane@example.com" }, extra)` from Task 3, and the inbound the tests deliver is `tap("bk:confirm:2026-11-03:1320", "Confirm")`. A `done` chat for "Change or cancel" is `chatAt({ step: "done", id: "b1" }, …)`.
- [ ] **Step 2: Write the failing tests**:
  - **"Confirm books the call: the row, the event, the link, the chat message, the email and the notice, in that order"**: `fn.world.events` equals `["insert booking","call create-consultation-calendar-event","update booking","send interactive","call send-consultation-booking-confirmation","email WhatsApp: a call was booked in the chat — Test Parent"]`. The row: `parent_name: "Test Parent"`, `student_name: ""`, `grade_level: ""`, `subjects_interest: []`, `phone_number: PARENT`, `email: "jane@example.com"`, `consultation_date: "2026-11-03"`, `consultation_time: "01:20 PM"`, `status: "confirmed"`, `booked_via: "whatsapp"`, `meeting_link: "https://meet.google.com/abc-defg-hij"`, `additional_notes` containing `"Grade 6, CBC"`. The calendar call body equals `{ parentName: "Test Parent", studentName: "", email: "jane@example.com", phoneNumber: "+254700000001", consultationDate: "2026-11-03", consultationTime: "01:20 PM", subjects: [], gradeLevel: "", notes: <the row's notes>, source: "whatsapp" }` with header `Authorization: "Bearer service-role"`. The confirmation call body has `meetingLink` and no `phoneNumber` key. `fn.world.sent[0].interactive` has one button `bk:change`; its text contains the link; `last(fn).booking` is `{ step: "done", id: <the row's id> }`; the only WhatsApp message sent is Lana's (the confirmation function is faked and sends none).
  - **"two Confirm taps at once make one booking and one confirmation"** (Review Focus 1): `await Promise.all([fn.deliver(tap(...)), fn.deliver(tap(...))]); await fn.settle()`; `consultation_bookings.length === 1`, `functionCalls.filter(c => c.name === "create-consultation-calendar-event").length === 1`, exactly one sent message contains the Meet link.
  - **"a second Confirm after it finished repeats the details and books nothing"** (Review Focus 1): deliver Confirm, settle, deliver Confirm again → one row; the second reply is the booked message again; one calendar call.
  - **"a time taken since the card was shown is not booked"** (Review Focus 2): seed another phone holding `"01:20 PM"` on 2026-11-03 → Confirm → no new row, no function call, a times list with `taken`.
  - **"if the slot rule rejects the insert, the family is not told they are booked"** (Review Focus 2): option `rejectNextInsert: true` → no `done` message, no calendar call, a times list with `taken`, and `consultation_bookings` holds only the rival's row.
  - **"a number with an upcoming booking cannot book a second"**: seed a confirmed row for PARENT on 2026-11-05 `"02:00 PM"` → Confirm for 2026-11-03 gives the `alreadyBookedOut` text with `"Thursday 5 November, 2:00 pm"` and a `bk:change` button, no new row; tapping `bk:start` gives the same.
  - **"a call that is already over does not count as upcoming"**: seed a row for PARENT on 2026-11-01 → Confirm books.
  - **"three chat bookings in 24 hours is the limit"**: seed three rows `booked_via: "whatsapp"`, `status: "cancelled"`, `created_at` one hour before the mocked now → Confirm gives `COPY.limit`, no row.
  - **"Google failing leaves the booking standing, with no dead link"** (Review Focus 4): script the calendar function `{ status: 200, body: { success: false, message: "token_error", meetingLink: "https://meet.google.com/pending" } }` → the row has `meeting_link: "https://meet.google.com/pending"`; the sent text contains `"Our team will send you the Google Meet link here before the call."` and not `meet.google.com`; no confirmation-email call; an email whose subject starts `⚠️ WhatsApp: booked, but no Meet link`.
  - **"the calendar function crashing or hanging is handled the same way"** (Review Focus 4): once with `{ status: 500, body: { error: "boom" } }`, once with `delayMs: 200` and env `WHATSAPP_BOOKING_CALL_MS: "50"`; both end with the row saved, no link, the alert.
  - **"the confirmation email failing is reported; the chat confirmation was already sent"** (Review Focus 4): script it `{ status: 500, … }` → an email whose subject starts `⚠️ WhatsApp: the confirmation email did not send`; the `done` message exists.
  - **"a row that cannot be saved is reported and no event is made"**: `failInsert: true` → `COPY.wentWrong`, no function call, an email whose subject starts `⚠️ WhatsApp: a booking in the chat could not be saved`.
  - **"a Confirm for a card that is no longer current shows the current step"** (Review Focus 2): the latest flow state is `{ step: "day" }` → no row; a day list is sent.
  - **"a missing or very long WhatsApp name still books"**: `inbound({ name: "" })` → row `parent_name: ""`, calendar `parentName: ""`; a 300-character name → row `parent_name` of length 200.
  - **"the notice to info@ can be switched off, alerts cannot"**: `WHATSAPP_BOOKING_NOTICES: "off"` → no `booked in the chat` email; with Google failing the alert still goes.
  - **"'Change or cancel' tells the team and the family"**: from a `done` chat tap `bk:change` → `COPY.changeAck`; one email with subject `WhatsApp: change or cancel a call — Test Parent` whose html contains the date and email; the chat is still with the team.
  - **"Meta refusing the booked message still leaves a booking and tells the team"**: `meta` refuses the interactive message and then the plain text → the row exists; the existing Meta-refused alert goes; the notice still goes.
- [ ] **Step 3: Run to see them fail.** `node --test supabase/functions/_tests/inchat-booking.test.mjs` → the new tests FAIL.
- [ ] **Step 4: Implement** `callFunction`, `lookUpBookings`, `confirmBooking`, `alertBooking`, the notice, the `change` and `confirm` branches, the guard in `startBooking`; add the `bookingRow` import. `claimForReply` is already done at the top of `runBookingTap`, which is why the order of CRM writes is: tap saved (lead flagged), row inserted (migration 0008 clears the flag), Lana's message saved.
- [ ] **Step 5: Run to see them pass.** `npm run test:edge` all pass; eslint on the touched folders is silent; the strict check from Task 3 reports no errors.
- [ ] **Step 6: Commit.** `In-chat booking: confirm, reserve the time, make the event, and handle each way it can fail`.

---

### Task 5: Offer the call on Lana's replies

**Files:**
- Modify: `supabase/functions/whatsapp-webhook/index.ts`, `supabase/functions/whatsapp-webhook/booking.ts`, `supabase/functions/_tests/whatsapp-webhook.test.mjs`, `supabase/functions/_tests/booking.test.mjs`, `supabase/functions/_tests/inchat-booking.test.mjs`

**Interfaces:**
- Consumes: `offerOut`, `dayListOut`, `startBooking`, `say`, `BOOKING_ON`.
- Produces: `export function offersCall(reply: string, aiAskedForTheLink: boolean): boolean` in `booking.ts` (true when the flag is set or `reply` matches `/lanatutors\.africa\/book-consultation/i`); `AiResult`'s ok variant gains `offeredBooking?: boolean`, set by `askGateway` when it handled `get_booking_link` with `type: "assessment_call"`.

Behaviour: in the one-reply path of `handleIncoming`, after the reply and `via` are known, `outs = BOOKING_ON && offersCall(reply, ai.offeredBooking) ? offerOut(reply, via) : [textOut(via, reply)]`, sent with `say(ctx, outs, context)` (a `null` return is the existing "Meta refused" path, which already alerted and stops); the alerts that follow use the recorded messages. A prefilled message whose intent is `assessment_call`, with `BOOKING_ON`, sends `startBooking(ctx)` instead of the team's script (the chat is already claimed at that point). Everything else about the one-reply path stays as it is.

- [ ] **Step 1: Write the failing tests**:
  - `booking.test.mjs` **"the call is offered when the reply carries the booking link or the AI asked for it"**: `offersCall("… https://lanatutors.africa/book-consultation", false)` true; `offersCall("Our coordinator will call you.", false)` false; `offersCall("Our coordinator will call you.", true)` true; a reply linking `https://lanatutors.africa/become-a-tutor` false.
  - `inchat-booking.test.mjs`:
    - **"a reply that offers the call goes out with the two buttons, and the link stays"**: gateway `aiText("Thanks, Jane. …book a free 20-minute assessment call here:\nhttps://lanatutors.africa/book-consultation")` → `sent[0].interactive.action.buttons` ids `["bk:start","bk:callback"]`; `sent[0].text` contains the link; saved `via: "ai"`, `booking: { step: "offer" }`, `content` ends `[Buttons: Book a free call | Call me back]`.
    - **"a reply that does not offer the call has no buttons"**: gateway text without a link → `sent[0].interactive` undefined, `saved.booking` undefined.
    - **"an AI that fetched the booking link counts as offering the call even if its text has no link"**: `aiToolCall("get_booking_link", { type: "assessment_call" })` then `aiText("Our coordinator can speak to you for 20 minutes.")` → buttons present.
    - **"a complaint does not get a booking button"**: `aiToolCall("escalate_to_team", …)` then a text with no link → no buttons.
    - **"the backup message carries the buttons, and the alert email still goes"**: gateway `aiFailure(500)` → `sent[0].interactive` present, `via: "backup"`, one alert email.
    - **"Claude's reply can carry them too"**: gateway fails, `claudeText` containing the link, `ANTHROPIC_API_KEY` set → buttons, `via: "ai_fallback"`.
    - **"a reply longer than 1,024 characters goes out as text, then a short message with the buttons"**: a 1,100-character AI reply with the link → two sent messages, the second's text `COPY.moreButtons`.
    - **"the website's 'learn more' starter gets the buttons; 'apply to become a tutor' does not"**: loop over both prefilled texts.
    - **"the website's 'assessment call' starter gets the day list straight away"**: text `"Hi Lana Tutors! I'd like to book a 20-minute assessment call."` → `sent[0].interactive.type === "list"`; `last(fn).via === "booking:day"`; gateway calls 0; the chat `escalated`.
    - **"with WHATSAPP_BOOKING=off nothing changes for the family"**: env off → a link reply has no buttons; the assessment-call starter gets the team's old script (`/time zone/i`).
    - **"Meta refusing the buttons still delivers Lana's answer"**: `meta` refuses once (status 400) → the plain AI text is sent (no `interactive`), saved without `booking`, and an email whose subject starts `⚠️ WhatsApp: buttons were refused`.
  - `whatsapp-webhook.test.mjs`: in `BUTTON_MESSAGES` remove the `assessment_call` entry (now covered above); change the check in **"every message the website's chat button prefills is answered without the AI"** to `/^(prefill:|booking:)/`.
- [ ] **Step 2: Run to see them fail.** `npm run test:edge` → the new tests FAIL, the old ones still pass.
- [ ] **Step 3: Implement** `offersCall`, the `offeredBooking` flag, the changed one-reply path and the assessment-call branch.
- [ ] **Step 4: Run to see them pass.** `npm run test:edge` all pass; eslint silent; strict check clean.
- [ ] **Step 5: Commit.** `In-chat booking: offer the call with two buttons on Lana's replies`.

---

### Task 6: The two booking functions, and the website's message

**Files:**
- Modify: `supabase/functions/create-consultation-calendar-event/index.ts`, `supabase/functions/send-consultation-booking-confirmation/index.ts`, `src/pages/BookConsultation.tsx`, `supabase/functions/_tests/harness.mjs`
- Create: `supabase/functions/_tests/consultation-functions.test.mjs`

**Interfaces:**
- Produces: `CalendarEventRequest` gains `source?: string`; behaviour as below. `harness.mjs`: `denoUrlImports` also fakes `https://deno.land/x/djwt@v2.8/mod.ts` (`export const create = async () => "fake.jwt";`); `world.fetch` answers `https://oauth2.googleapis.com/token` with `{ access_token: "tok" }` and `https://www.googleapis.com/calendar/v3/calendars/primary/events?…` by recording `world.googleEvents.push(body)` and returning `{ id: "evt_1", hangoutLink: "https://meet.google.com/abc-defg-hij" }`; `loadFunction` wraps the dynamic `import()` so any `setInterval` created at import time (the shared rate limiter's) is `unref()`ed, then restores `setInterval`. The two functions are driven with the existing `fn.deliver(body)`, which posts the JSON body to the handler and returns its `Response`.
- `create-consultation-calendar-event`: the event `summary` is `Consultation - <studentName>` when `studentName` is not blank, else `Consultation - <parentName>`, else `Consultation`; the description keeps its line order but leaves out `Student:`, `Grade Level:` and `Subjects:` lines that would be empty (and treats a missing `subjects` as `[]`); `source === "whatsapp"` adds the line `Booked in the WhatsApp chat`. With a student name, grade and subjects the event is exactly as today.
- `send-consultation-booking-confirmation`: where the HTML and the WhatsApp text name the child, a blank `studentName` reads "your child" (and "your child's" where `'s` follows), and the Google/Outlook titles drop the ` - <name>`; the add-to-calendar start is built as `new Date(`${consultationDate}T${hh}:${mm}:00+03:00`)`; `formattedDate` is formatted with `timeZone: "UTC"`. Output with a student name is otherwise unchanged.
- `BookConsultation.tsx`: in `handleSubmit`'s `catch`, when `error?.code === "23505"` show `toast.error("This time slot was just booked by someone else. Please select a different time.")`, clear `selectedTime`, and reload `bookedSlots` for `selectedDate` with the same `get_booked_consultation_times` call the effect uses; any other error is handled as today.

- [ ] **Step 1: Harness changes**, then write the failing tests in `consultation-functions.test.mjs` (env for the calendar function: `GOOGLE_SERVICE_ACCOUNT_JSON` holding `{ client_email: "svc@example.iam.gserviceaccount.com", private_key: <a PKCS8 PEM generated in the test with node:crypto generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } })> }`):
  - **"the website's booking makes the same event as before"**: `parentName: "Wanjiru"`, `studentName: "Amani"`, grade `"CBC - Grade 6"`, subjects `["Maths","English"]` → `googleEvents[0].summary === "Consultation - Amani"`; description lines in order `Free Consultation`, `Parent: Wanjiru`, `Student: Amani`, `Email: …`, `Phone: …`, `Grade Level: CBC - Grade 6`, `Subjects: Maths, English`; start `2026-11-03T11:00:00.000Z` for `consultationTime: "02:00 PM"` on `2026-11-03`; response `{ success: true, eventId: "evt_1", meetingLink: "https://meet.google.com/abc-defg-hij" }`.
  - **"a family whose child is not named gets the parent's name and no empty lines"**: `studentName: ""`, `gradeLevel: ""`, `subjects: []`, `source: "whatsapp"` → summary `"Consultation - Jane"`; description has no line ending `: ` or `:` alone, and contains `Booked in the WhatsApp chat`.
  - **"the confirmation email for the website is unchanged, except that the calendar links now have the right time"**: `studentName: "Amani"`, date `2026-11-03`, time `02:00 PM`, `meetingLink`, `phoneNumber: "254700000001"` → the email html contains `"for <strong>Amani</strong>"`, `"Amani's academic goals"`; the Google link contains `dates=20261103T110000Z/20261103T112000Z`; the Outlook link `startdt=2026-11-03T11:00:00.000Z`; the WhatsApp text is still sent (`world.sent.length === 1`).
  - **"with no child's name the email says 'your child' and nothing reads broken"**: `studentName: ""`, no `phoneNumber` → html contains `"for <strong>your child</strong>"` and `"your child's academic goals"`; matches none of `/undefined|for ,|<strong><\/strong>|\s's /`; the calendar title is `Free Consultation with Lana Tutors` with no trailing dash; `world.sent.length === 0`.
  - **"the date is the right day whatever the server's time zone"**: set `process.env.TZ = "America/Los_Angeles"` for the test (Node applies a changed `TZ` at runtime; restore the old value in `t.after`) and repeat the website call: the html contains `"Tuesday, November 3, 2026"` and the Google link still has `dates=20261103T110000Z/20261103T112000Z`.
- [ ] **Step 2: Run to see them fail.** `node --test supabase/functions/_tests/consultation-functions.test.mjs` → FAIL.
- [ ] **Step 3: Implement** the two functions' changes and the site's `catch` branch as described.
- [ ] **Step 4: Run to see them pass**, then `npm run test:edge`, `npx eslint supabase/functions/create-consultation-calendar-event supabase/functions/send-consultation-booking-confirmation src/pages/BookConsultation.tsx`, and `npx tsc -p tsconfig.app.json --noEmit` (no new errors against a pre-change run of the same command).
- [ ] **Step 5: Commit.** `In-chat booking: the booking functions cope with no child's name, calendar links get the right time, the site explains a taken slot`.

---

### Task 7: Migration 0008, checked in a scratch Postgres

**Files:**
- Create: `drizzle/migrations/0008_inchat_booking.sql`, `drizzle/migrations/meta/0008_snapshot.json`, `supabase/functions/_tests/migration-0008.test.mjs`
- Modify: `drizzle/migrations/meta/_journal.json`
- Outside the repo: `check_0008.sh` and `test_booking_flow.sql` next to `run.sh` in `/Users/mac/Library/Application Support/Claude/side-session-notes/local_f9164583-f97c-49f6-9299-27a3eb00f8ef/crm-trigger-check/`

**Interfaces:**
- Produces: `consultation_bookings.booked_via text`; unique index `consultation_bookings_one_per_slot` on `(consultation_date, consultation_time) WHERE status <> 'cancelled' AND consultation_date >= DATE '2026-11-01'`; `crm_record_assessment_booking(p public.consultation_bookings)` equal to 0004's text plus `needs_reply = CASE WHEN p.booked_via = 'whatsapp' THEN false ELSE needs_reply END` in the lead `UPDATE`; the `REVOKE ALL … FROM PUBLIC, anon, authenticated` of 0004 repeated for it. Journal entry `{ idx: 6, version: "7", when: <above 1793335163143>, tag: "0008_inchat_booking", breakpoints: true }`; snapshot a stub shaped like `0005_snapshot.json` with a new `id` and `prevId` `0286ee90-779f-4b27-83df-fdad7b350fd8`.

- [ ] **Step 1: Write the failing test** `migration-0008.test.mjs`: the file exists; contains `ADD COLUMN IF NOT EXISTS booked_via`, `CREATE UNIQUE INDEX IF NOT EXISTS consultation_bookings_one_per_slot`, `DATE '2026-11-01'`; the `crm_record_assessment_booking` body in 0008 equals the one in `0004_crm_leads.sql` once the single added `needs_reply = CASE …` line is removed (compare after trimming whitespace); `_journal.json` has a last entry with tag `0008_inchat_booking`, `idx` 6 and a `when` above every earlier one; the snapshot parses and its `prevId` is `0005_snapshot.json`'s `id`.
- [ ] **Step 2: Run to see it fail**, then **write the migration** (idempotent: `ADD COLUMN IF NOT EXISTS`, `CREATE UNIQUE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`), the journal entry (`when` from `Date.now()`, which must exceed the previous) and the snapshot; run again → pass.
- [ ] **Step 3: Scratch Postgres.** In `crm-trigger-check/` add `check_0008.sh` (a copy of `run.sh` with `MIG` pointing at this worktree's `drizzle/migrations`, port 54333, loading `stub_schema.sql`, 0004, 0005, then **0008 twice**, then the kit's existing `test_whatsapp_flow.sql`, then `test_booking_flow.sql`) and `test_booking_flow.sql` with these checks, each printing `ok` or failing the script:
  - A: a chat is handed to the team (lead `needs_reply` true), the family inserts a booking with `booked_via = 'whatsapp'` → lead stage `call_booked`, `next_step = 'Hold the assessment call'`, `needs_reply` false; Lana's message appended afterwards leaves it false; the family writing again sets it true.
  - B: a booking with `booked_via` null for a family whose lead is flagged leaves `needs_reply` true.
  - C: a second non-cancelled booking at the same future date and time raises `unique_violation`; after the first is set to `cancelled` the second succeeds; two rows on 2026-10-01 at the same time are accepted.
  - D: after running 0008 twice, `SELECT count(*) FROM pg_indexes WHERE indexname = 'consultation_bookings_one_per_slot'` is 1, and no `CRM:` warning was raised.
  If `stub_schema.sql` lacks a column the checks need (`status`, `meeting_link`, `booked_via` is added by 0008), extend the stub in the kit, not the repo.
- [ ] **Step 4: Run it.** `bash "<kit>/check_0008.sh"` → every check `ok`, the old WhatsApp replay still passes, `CRM warnings during the scenarios: 0`.
- [ ] **Step 5: Compare with production, read-only.** Through the Lovable connector (`query_database`, `SELECT` only): `select pg_get_functiondef('public.crm_record_assessment_booking(public.consultation_bookings)'::regprocedure)` and confirm it matches 0004's text apart from whitespace; re-run `select indexname from pg_indexes where tablename = 'consultation_bookings'` and the duplicates query for dates on or after 2026-11-01 (expect none). If the live function differs, stop and report instead of committing a replacement.
- [ ] **Step 6: Commit** the repo files. `In-chat booking: migration 0008 (booked_via, one booking per time from 2026-11-01, chat bookings clear "needs reply")`. Do not apply it.

---

### Task 8: The whole branch, and the record

**Files:**
- Modify: `docs/superpowers/specs/2026-10-31-inchat-booking-design.md` (status line), this plan (tick the boxes)
- Outside the repo: the memory files `lana-whatsapp-bot.md`, `lana-crm-redesign.md` if the CRM change matters there, and `MEMORY.md`

- [ ] **Step 1: Everything, fresh.** `npm run test:edge` (note the count; all pass); `npx eslint` over every file the branch touched (silent) and `npm run lint` (the total is still 526 problems); the strict type-check against the Deno shim over `whatsapp-webhook/index.ts` (which pulls in `booking.ts`, `lana.ts` and `claude.ts`; no errors; the two changed functions import URLs the shim does not map, so they are covered by their tests and eslint); `npx tsc -p tsconfig.app.json --noEmit` (unchanged from before the branch); `bash "<kit>/check_0008.sh"` (all ok).
- [ ] **Step 2: Read the branch diff as the reviewer.** `git diff adb705e..HEAD --stat` and the diff of `index.ts`; check against the spec section by section (spec coverage), and that no secret, key or personal number was written anywhere (grep the diff for `service_role`, `Bearer ` with a literal, and real phone numbers).
- [ ] **Step 3: Update the spec's status line** to "built on the branch, not pushed, not deployed, migration not applied", the plan's boxes, and commit: `In-chat booking: record the build`.
- [ ] **Step 4: Update memory.** `lana-whatsapp-bot.md`: the in-chat booking entry becomes built (branch, commits, test count, what is verified and what is not, the rollout order, the secrets, the found-along-the-way list); `MEMORY.md` hook line updated; add a `reference` or `project` note only if something new and non-obvious remains. Call `hindsight_ingest_document` only if a Hindsight page turned out wrong.
- [ ] **Step 5: Report.** Say what is built, what the checks showed and did not show (Meta, Google, Resend, production migration, the site in a browser), the rollout steps that need the owner, and the reminders finding as a separate decision.

---

## Self-review (run once, fixed inline)

- **Spec coverage:** flow and ids (Tasks 1 to 4); state and typed-text rules (3); availability (1); order of effects and failures (4); database (7); CRM order (4, 7); changes to the two functions and the site (6); alerts and the notice (3, 4); off switches and offer rules (3, 5); limits (1, 4); checks and rollout (8, spec). The inbox label and the reminders are deliberately untouched, as the spec says.
- **Type consistency:** `Outgoing`, `BookingState`, `Action`, `Booked`, `BookingRow`, `ChatMessage` are defined once (Tasks 1, 2) and used by name in Tasks 3 to 5; `say` returns `Msg[] | null` everywhere; `runBookingTap` takes `(ctx, action, history)` in Tasks 3 and 4.
- **Proportion:** the plan carries tests and signatures, with bodies only for the copy and the order of the booking sequence, both fixed by the spec.

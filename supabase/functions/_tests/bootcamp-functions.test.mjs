// Run with `npm run test:edge`. The two functions behind the holiday classes that had last December's dates written
// in: the enrolment confirmation email (send-intensive-enrollment-confirmation) and the calendar sync
// (sync-bootcamp-to-calendar). They must say and do what the program in the database says, for any year.
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import { loadFunction } from "./harness.mjs";

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const GOOGLE = JSON.stringify({ client_email: "svc@example.iam.gserviceaccount.com", private_key: privateKey });

// ---------------------------------------------------------------------------------------------------------------
// The enrolment confirmation email
// ---------------------------------------------------------------------------------------------------------------

const PROGRAM_2026 = { name: "December 2026 Holiday Classes", start_date: "2026-12-07", end_date: "2026-12-18" };
const MATHS = {
  id: "c1000000-0000-4000-8000-000000000001", subject: "Mathematics", curriculum: "8-4-4", grade_levels: ["Form 3"],
  time_slot: "8:00 AM - 9:15 AM", meeting_link: "https://meet.google.com/aaa-bbbb-ccc", tutor_id: "t1",
};
const ENGLISH = {
  id: "c1000000-0000-4000-8000-000000000003", subject: "English", curriculum: "8-4-4", grade_levels: ["Form 3"],
  time_slot: "11:00 AM - 12:15 PM", meeting_link: "", tutor_id: null,
};

// Sets up one paid enrolment and asks the function for its email.
async function confirmation(t, { program = PROGRAM_2026, classes = [MATHS, ENGLISH], studentProfile = false } = {}) {
  const fn = await loadFunction("send-intensive-enrollment-confirmation");
  t.after(() => fn.dispose());
  const { tables, users } = fn.world;
  tables.intensive_enrollments = [{
    id: "enr-1", student_id: "stu-1", student_profile_id: studentProfile ? "child-1" : null,
    enrolled_class_ids: classes.map((c) => c.id), total_subjects: classes.length, intensive_programs: program,
  }];
  tables.intensive_classes = classes.map((c) => ({ ...c, status: "active" }));
  tables.profiles.push({ id: "stu-1", full_name: "Wanjiru" }, { id: "tutor-user-1", full_name: "Mr Otieno" });
  tables.tutor_profiles = [{ id: "t1", user_id: "tutor-user-1" }];
  tables.students = studentProfile ? [{ id: "child-1", full_name: "Amani" }] : [];
  users["stu-1"] = { id: "stu-1", email: "wanjiru@example.com" };
  const response = await fn.deliver({ enrollmentId: "enr-1" });
  return { fn, response, email: fn.world.emails[0] };
}

test("the confirmation email says the program's own name and dates, not last December's", async (t) => {
  const { response, email } = await confirmation(t);

  assert.equal(response.status, 200);
  assert.deepEqual(email.to, ["wanjiru@example.com"]);
  assert.match(email.subject, /December 2026 Holiday Classes/);
  assert.ok(email.html.includes("Welcome to December 2026 Holiday Classes!"));
  assert.ok(email.html.includes("Thank you for enrolling in <strong>December 2026 Holiday Classes</strong>"));
  assert.ok(email.html.includes("December 7-18, 2026 (Mon-Fri)"));
  assert.ok(email.html.includes("on December 7th"));
  assert.doesNotMatch(email.html, /2025|December 8|8th|Bootcamp/);
  assert.doesNotMatch(email.subject, /2025|Bootcamp/);
});

test("a program that crosses a month is written out in full", async (t) => {
  const program = { name: "Early December Classes", start_date: "2026-11-30", end_date: "2026-12-11" };
  const { email } = await confirmation(t, { program });

  assert.ok(email.html.includes("November 30 - December 11, 2026 (Mon-Fri)"));
  assert.ok(email.html.includes("on November 30th"));
});

test("the student's day is read from the classes they are in", async (t) => {
  const { email } = await confirmation(t);

  assert.ok(email.html.includes("8:00 AM - 12:15 PM EAT"), "first class's start to last class's end");
  assert.doesNotMatch(email.html, /5:15 PM/);
});

test("last December's slot labels still read: the student's day is right for them too", async (t) => {
  const classes = [{ ...MATHS, time_slot: "8:00 - 9:15 AM" }, { ...ENGLISH, time_slot: "2:30 - 3:45 PM" }];
  const { email } = await confirmation(t, { classes });

  assert.ok(email.html.includes("8:00 AM - 3:45 PM EAT"));
});

test("when no class time can be read the schedule line is left out rather than guessed", async (t) => {
  const { email } = await confirmation(t, { classes: [{ ...MATHS, time_slot: "after lunch" }] });

  assert.doesNotMatch(email.html, /Daily Schedule/);
  assert.ok(email.html.includes("after lunch EAT"), "the class table still shows what is stored");
});

test("an enrolment with no program on it still sends, and nothing reads broken or old", async (t) => {
  const { response, email } = await confirmation(t, { program: null });

  assert.equal(response.status, 200);
  assert.doesNotMatch(email.html, /undefined|null|NaN|2025|Bootcamp/);
  assert.doesNotMatch(email.subject, /undefined|null|2025|Bootcamp/);
  assert.ok(email.html.includes("Holiday Classes"));
  assert.doesNotMatch(email.html, /Dates:/, "no dates known, no dates line");
});

test("what the email already did is unchanged: the tutor, the join link, the child's name", async (t) => {
  const { email } = await confirmation(t, { studentProfile: true });

  assert.ok(email.html.includes("Hi Wanjiru,"));
  assert.ok(email.html.includes("Enrollment for: <strong>Amani</strong>"));
  assert.ok(email.html.includes("Mr Otieno"));
  assert.ok(email.html.includes('href="https://meet.google.com/aaa-bbbb-ccc"'));
  assert.ok(email.html.includes("Link coming soon"), "English has no link yet");
  assert.ok(email.html.includes("8:00 AM - 9:15 AM EAT") && email.html.includes("11:00 AM - 12:15 PM EAT"));
});

// ---------------------------------------------------------------------------------------------------------------
// The calendar sync
// ---------------------------------------------------------------------------------------------------------------

// Dates far in the future, so "the program has not ended" stays true whenever these tests run. 7 Dec 2099 is a
// Monday, like 7 Dec 2026, so it has the same ten class days.
const FUTURE = { id: "prog-2099", name: "December 2099 Holiday Classes", start_date: "2099-12-07", end_date: "2099-12-18", is_active: true };
const OTHER = { id: "prog-2098", name: "Another Holiday Program", start_date: "2098-12-07", end_date: "2098-12-18", is_active: true };
const PAST = { id: "prog-2025", name: "December 2025 Intensive", start_date: "2025-12-08", end_date: "2025-12-19", is_active: true };
const TEN_DAYS = [
  "2099-12-07", "2099-12-08", "2099-12-09", "2099-12-10", "2099-12-11",
  "2099-12-14", "2099-12-15", "2099-12-16", "2099-12-17", "2099-12-18",
];

const klass = (id, program_id, subject, time_slot, extra = {}) => ({
  id: `c${id}000000-0000-4000-8000-000000000000`, program_id, subject, curriculum: "8-4-4", grade_levels: ["Form 3"],
  time_slot, meeting_link: "https://meet.google.com/x", tutor_id: "t1", current_enrollment: 3, status: "active", ...extra,
});

async function syncWith(t, { programs, classes }) {
  const fn = await loadFunction("sync-bootcamp-to-calendar", {
    env: { GOOGLE_SERVICE_ACCOUNT_JSON: GOOGLE, BOOTCAMP_SYNC_DELAY_MS: "0" },
  });
  t.after(() => fn.dispose());
  fn.world.tables.intensive_programs = programs;
  fn.world.tables.intensive_classes = classes;
  fn.world.tables.tutor_profiles = [{ id: "t1", user_id: "u1" }];
  fn.world.tables.profiles.push({ id: "u1", full_name: "Test Tutor" });
  return fn;
}

test("the sync fills the program's own class days, for its own classes only", async (t) => {
  const maths = klass(1, "prog-2099", "Mathematics", "8:00 - 9:15 AM"); // the style last December's rows are stored in
  const english = klass(2, "prog-2099", "English", "11:00 AM - 12:15 PM");
  const archived = klass(3, "prog-2099", "Physics", "9:30 AM - 10:45 AM", { status: "archived" });
  const lastYears = klass(4, "prog-2025", "Biology", "8:00 - 9:15 AM"); // still active in the database
  const fn = await syncWith(t, { programs: [FUTURE, PAST], classes: [maths, english, archived, lastYears] });

  const response = await fn.deliver(undefined); // the admin screen calls it with no body
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.success, true);
  assert.equal(result.created, 20, "two classes on ten days");
  assert.equal(fn.world.googleEvents.length, 20);
  assert.deepEqual([...new Set(fn.world.googleEvents.map((e) => e.start.dateTime.slice(0, 10)))].sort(), TEN_DAYS);
  assert.ok(fn.world.googleEvents.every((e) => !/Physics|Biology/.test(e.summary)), "no archived class, no other year's class");

  const first = fn.world.googleEvents.find((e) => e.summary.includes("Mathematics") && e.start.dateTime.startsWith("2099-12-07"));
  assert.equal(first.summary, "Bootcamp: Mathematics (8-4-4 Form 3) - Test Tutor");
  assert.equal(first.start.dateTime, "2099-12-07T08:00:00+03:00");
  assert.equal(first.end.dateTime, "2099-12-07T09:15:00+03:00");
  assert.equal(first.start.timeZone, "Africa/Nairobi");
  assert.equal(first.description.split("\n")[0], "December 2099 Holiday Classes - Day 1");
  assert.ok(first.description.includes("Meeting Link: https://meet.google.com/x"));
  const last = fn.world.googleEvents.find((e) => e.summary.includes("English") && e.start.dateTime.startsWith("2099-12-18"));
  assert.equal(last.start.dateTime, "2099-12-18T11:00:00+03:00");
  assert.equal(last.description.split("\n")[0], "December 2099 Holiday Classes - Day 10");
});

test("syncing again adds nothing: every event has its own id and Google refuses a repeat", async (t) => {
  const fn = await syncWith(t, { programs: [FUTURE], classes: [klass(1, "prog-2099", "Mathematics", "8:00 AM - 9:15 AM")] });

  const firstRun = await (await fn.deliver(undefined)).json();
  const secondRun = await (await fn.deliver(undefined)).json();

  assert.equal(firstRun.created, 10);
  assert.equal(firstRun.already_synced, 0);
  assert.equal(secondRun.created, 0);
  assert.equal(secondRun.already_synced, 10);
  assert.equal(secondRun.errors, 0, "a repeat is not a failure");
  assert.equal(fn.world.googleEvents.length, 10);
  assert.ok(fn.world.googleEvents.every((e) => /^[a-v0-9]{5,1024}$/.test(e.id)), "ids Google accepts");
});

test("a class whose time slot cannot be read is skipped and named, and the others still sync", async (t) => {
  const good = klass(1, "prog-2099", "Mathematics", "8:00 AM - 9:15 AM");
  const bad = klass(2, "prog-2099", "English", "after lunch");
  const fn = await syncWith(t, { programs: [FUTURE], classes: [good, bad] });

  const result = await (await fn.deliver(undefined)).json();

  assert.equal(result.created, 10);
  assert.equal(result.skipped.length, 1);
  assert.match(result.skipped[0].class, /English/);
  assert.match(result.skipped[0].reason, /time slot/i);
});

test("a program that has ended is left alone even if it is still marked active", async (t) => {
  const fn = await syncWith(t, { programs: [PAST], classes: [klass(4, "prog-2025", "Biology", "8:00 - 9:15 AM")] });

  const response = await fn.deliver(undefined);
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.created, 0);
  assert.equal(fn.world.googleEvents.length, 0, "nothing is dated in the past");
  assert.match(result.message, /no active program/i);
});

test("a program can be named in the request and only its classes sync", async (t) => {
  const here = klass(1, "prog-2099", "Mathematics", "8:00 AM - 9:15 AM");
  const there = klass(2, "prog-2098", "English", "8:00 AM - 9:15 AM");
  const fn = await syncWith(t, { programs: [FUTURE, OTHER], classes: [here, there] });

  const result = await (await fn.deliver({ programId: "prog-2099" })).json();

  assert.equal(result.created, 10);
  assert.ok(fn.world.googleEvents.every((e) => e.summary.includes("Mathematics")));
});

test("with nothing to sync it answers plainly instead of failing", async (t) => {
  const fn = await syncWith(t, { programs: [FUTURE], classes: [] });

  const response = await fn.deliver(undefined);
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.created, 0);
});

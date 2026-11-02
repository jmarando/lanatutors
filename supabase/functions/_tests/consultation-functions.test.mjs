// Run with `npm run test:edge`. The two functions the website's booking form calls, which the WhatsApp chat calls too:
// the calendar event with its Google Meet link, and the confirmation email. They must still do what the website needs,
// and cope with a family whose child's name is not known.
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
const MEET = "https://meet.google.com/abc-defg-hij";

// Runs the test with the server's clock in the given time zone for the rest of the test. Supabase's runs in UTC; this
// Mac runs in Nairobi time, which hides a fault that depends on it.
function inTimeZone(t, zone) {
  const before = process.env.TZ;
  process.env.TZ = zone;
  t.after(() => {
    if (before === undefined) delete process.env.TZ;
    else process.env.TZ = before;
  });
}

async function load(t, name) {
  const fn = await loadFunction(name, { env: { GOOGLE_SERVICE_ACCOUNT_JSON: GOOGLE } });
  t.after(() => fn.dispose());
  return fn;
}

// What the website sends the calendar function for a booking on Tuesday 3 November at 2:00 pm Nairobi time.
const WEBSITE_EVENT = {
  parentName: "Wanjiru",
  studentName: "Amani",
  email: "wanjiru@example.com",
  phoneNumber: "254700000001",
  consultationDate: "2026-11-03",
  consultationTime: "02:00 PM",
  subjects: ["Maths", "English"],
  gradeLevel: "CBC - Grade 6",
};

test("the website's booking makes the same event as before", async (t) => {
  const fn = await load(t, "create-consultation-calendar-event");

  const response = await fn.deliver(WEBSITE_EVENT);

  assert.deepEqual(await response.json(), { success: true, eventId: "evt_1", meetingLink: MEET });
  const [event] = fn.world.googleEvents;
  assert.equal(event.summary, "Consultation - Amani");
  assert.deepEqual(event.description.split("\n"), [
    "Free Consultation",
    "Parent: Wanjiru",
    "Student: Amani",
    "Email: wanjiru@example.com",
    "Phone: 254700000001",
    "Grade Level: CBC - Grade 6",
    "Subjects: Maths, English",
  ]);
  assert.equal(new Date(event.start.dateTime).toISOString(), "2026-11-03T11:00:00.000Z");
  assert.equal(event.start.timeZone, "Africa/Nairobi");
  assert.deepEqual(event.attendees, [{ email: "wanjiru@example.com" }, { email: "info@lanatutors.africa" }]);
});

test("a family whose child is not named gets the parent's name and no empty lines", async (t) => {
  const fn = await load(t, "create-consultation-calendar-event");

  await fn.deliver({
    parentName: "Jane",
    studentName: "",
    email: "jane@example.com",
    phoneNumber: "+254700000001",
    consultationDate: "2026-11-03",
    consultationTime: "01:20 PM",
    subjects: [],
    gradeLevel: "",
    notes: "They wrote: a maths tutor for my son",
    source: "whatsapp",
  });

  const [event] = fn.world.googleEvents;
  assert.equal(event.summary, "Consultation - Jane");
  const lines = event.description.split("\n");
  assert.ok(!lines.some((line) => /:\s*$/.test(line)), `an empty line in: ${lines.join(" | ")}`);
  assert.ok(lines.includes("Booked in the WhatsApp chat"));
  assert.ok(lines.includes("Notes: They wrote: a maths tutor for my son"));
});

test("the chat's own note is not repeated in the event", async (t) => {
  const fn = await load(t, "create-consultation-calendar-event");

  await fn.deliver({
    parentName: "Jane",
    studentName: "",
    email: "jane@example.com",
    phoneNumber: "+254700000001",
    consultationDate: "2026-11-03",
    consultationTime: "01:20 PM",
    notes: "Booked in the WhatsApp chat.\nThey wrote: a maths tutor",
    source: "whatsapp",
  });

  const text = fn.world.googleEvents[0].description;
  assert.equal(text.split("Booked in the WhatsApp chat").length - 1, 1);
});

// What the website sends the confirmation function for the same booking.
const CONFIRMATION = {
  email: "wanjiru@example.com",
  parentName: "Wanjiru",
  studentName: "Amani",
  consultationDate: "2026-11-03",
  consultationTime: "02:00 PM",
  meetingLink: MEET,
  phoneNumber: "254700000001",
};
const linkIn = (html, host) => html.match(new RegExp(`href="(https://${host}[^"]+)"`))[1];

test("the confirmation email for the website is unchanged, except that the calendar links now have the right time", async (t) => {
  inTimeZone(t, "UTC");
  const fn = await load(t, "send-consultation-booking-confirmation");

  const response = await fn.deliver(CONFIRMATION);

  assert.equal(response.status, 200);
  const html = fn.world.emails[0].html;
  assert.ok(html.includes("for <strong>Amani</strong>"));
  assert.ok(html.includes("Amani's academic goals"));
  assert.ok(html.includes("List of subjects Amani needs help with"));
  assert.ok(linkIn(html, "calendar.google.com").includes("dates=20261103T110000Z/20261103T112000Z"), "2:00 pm Nairobi is 11:00 UTC");
  assert.ok(linkIn(html, "outlook.live.com").includes("startdt=2026-11-03T11:00:00.000Z"));
  assert.equal(new URL(linkIn(html, "calendar.google.com")).searchParams.get("text"), "Free Consultation with Lana Tutors - Amani");
  assert.equal(fn.world.sent.length, 1, "the WhatsApp text is still sent when a phone number is given");
  assert.match(fn.world.sent[0].text, /for \*Amani\* is confirmed/);
});

test("with no child's name the email says 'your child' and nothing reads broken", async (t) => {
  const fn = await load(t, "send-consultation-booking-confirmation");

  await fn.deliver({ ...CONFIRMATION, studentName: "", phoneNumber: undefined });

  const html = fn.world.emails[0].html;
  assert.ok(html.includes("for <strong>your child</strong>"));
  assert.ok(html.includes("your child's academic goals"));
  assert.ok(html.includes("List of subjects your child needs help with"));
  assert.doesNotMatch(html, /undefined|for ,|<strong><\/strong>|\s's /);
  assert.equal(new URL(linkIn(html, "calendar.google.com")).searchParams.get("text"), "Free Consultation with Lana Tutors");
  assert.ok(html.includes("subject=Reschedule Consultation\""), "no trailing dash in the reschedule link");
  assert.equal(fn.world.sent.length, 0, "no phone number, no WhatsApp text");
});

test("the date is the right day whatever the server's time zone", async (t) => {
  inTimeZone(t, "America/Los_Angeles");
  const fn = await load(t, "send-consultation-booking-confirmation");

  await fn.deliver(CONFIRMATION);

  const html = fn.world.emails[0].html;
  assert.ok(html.includes("Tuesday, November 3, 2026"));
  assert.ok(linkIn(html, "calendar.google.com").includes("dates=20261103T110000Z/20261103T112000Z"));
});

// Run with `npm run test:edge`. The pure rules and messages behind booking a call in the WhatsApp chat
// (whatsapp-webhook/booking.ts); the flow itself is tested in inchat-booking.test.mjs.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { loadModule } from "./harness.mjs";

const b = await loadModule("whatsapp-webhook/booking.ts");

const MON_10 = new Date("2026-11-02T07:00:00Z"); // Monday 10:00 in Nairobi

test("the call times are the website's, in the website's own text", async () => {
  const source = await readFile(new URL("../../../src/pages/BookConsultation.tsx", import.meta.url), "utf8");
  const block = source.match(/const ALL_TIME_SLOTS = \[([\s\S]*?)\];/)?.[1] ?? "";
  const theirs = [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1]);

  assert.deepEqual([...b.CALL_TIMES], theirs);
  assert.equal(b.CALL_TIMES.length, 18);
  assert.equal(b.CALL_TIMES[0], "11:00 AM");
  assert.equal(b.CALL_TIMES.at(-1), "08:40 PM");
});

test("Nairobi is three hours ahead, so just after its midnight is already tomorrow", () => {
  const late = new Date("2026-11-02T21:30:00Z");

  assert.deepEqual(b.nairobiNow(late), { day: "2026-11-03", minutes: 30 });
  assert.deepEqual(b.nairobiNow(MON_10), { day: "2026-11-02", minutes: 600 });
  assert.deepEqual(b.freeTimes("2026-11-02", late, {}), []);
  assert.equal(b.freeTimes("2026-11-03", late, {}).length, 18);
});

test("today offers only times that start more than an hour from now", () => {
  const before = b.freeTimes("2026-11-02", new Date("2026-11-02T06:59:00Z"), {});
  assert.equal(before[0], "11:00 AM");
  assert.equal(before.length, 18);

  const exactly = b.freeTimes("2026-11-02", MON_10, {});
  assert.equal(exactly[0], "11:20 AM");
  assert.equal(exactly.length, 17);
});

test("a held time is not offered", () => {
  const booked = { "2026-11-04": ["01:20 PM"] };

  const times = b.freeTimes("2026-11-04", MON_10, booked);
  assert.equal(times.length, 17);
  assert.ok(!times.includes("01:20 PM"));
  assert.equal(b.isFree("2026-11-04", "01:20 PM", MON_10, booked), false);
  assert.equal(b.isFree("2026-11-04", "01:40 PM", MON_10, booked), true);
  assert.equal(b.isFree("2026-11-04", "09:00 AM", MON_10, booked), false, "a time that is not on the grid");
});

test("Sundays, past days and days beyond the window are never offered", () => {
  assert.deepEqual(b.freeTimes("2026-11-08", MON_10, {}), [], "a Sunday");
  assert.deepEqual(b.freeTimes("2026-10-31", MON_10, {}), [], "a past day");
  assert.deepEqual(b.freeTimes("2026-11-17", MON_10, {}), [], "15 days ahead");
  assert.equal(b.freeTimes("2026-11-16", MON_10, {}).length, 18, "14 days ahead is the last day");
});

test("the list is the soonest ten days with a free time", () => {
  const days = b.openDays(MON_10, {});

  assert.deepEqual(days.map((d) => d.day), [
    "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06",
    "2026-11-07", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12",
  ]);
  assert.equal(days[0].free, 17);
  assert.equal(days[1].free, 18);
});

test("a fully held day is left out", () => {
  const booked = { "2026-11-03": [...b.CALL_TIMES] };

  const days = b.openDays(MON_10, booked).map((d) => d.day);
  assert.ok(!days.includes("2026-11-03"));
  assert.equal(days.length, 10);
});

test("Saturday evening rolls to Monday", () => {
  const saturdayEvening = new Date("2026-11-07T17:30:00Z"); // 20:30 in Nairobi

  const days = b.openDays(saturdayEvening, {});
  assert.deepEqual(days[0], { day: "2026-11-09", free: 18 });
});

test("parts of the day, and the id of a time", () => {
  const full = b.freeTimes("2026-11-03", MON_10, {});
  assert.equal(b.partOf("12:00 PM"), "am");
  assert.equal(b.partOf("01:00 PM"), "pm");
  assert.equal(b.partOf("07:00 PM"), "eve");
  assert.deepEqual(b.partsOf(full), ["am", "pm", "eve"]);

  const evening = ["07:00 PM", "07:20 PM", "07:40 PM", "08:00 PM", "08:20 PM", "08:40 PM"];
  assert.deepEqual(b.partsOf(b.freeTimes("2026-11-03", MON_10, { "2026-11-03": evening })), ["am", "pm"]);
  assert.deepEqual(b.timesInPart(full, "pm"), ["01:00 PM", "01:20 PM", "01:40 PM", "02:00 PM", "02:20 PM", "02:40 PM"]);

  assert.equal(b.slotId("01:20 PM"), "1320");
  assert.equal(b.slotId("12:00 PM"), "1200");
  assert.equal(b.slotId("08:40 PM"), "2040");
});

test("tap ids are read back, and anything else is refused", () => {
  assert.deepEqual(b.parseTap("bk:day:2026-11-04"), { kind: "day", day: "2026-11-04" });
  assert.deepEqual(b.parseTap("bk:part:2026-11-04:pm"), { kind: "part", day: "2026-11-04", part: "pm" });
  assert.deepEqual(b.parseTap("bk:time:2026-11-04:1320"), { kind: "time", day: "2026-11-04", time: "01:20 PM" });
  assert.deepEqual(b.parseTap("bk:confirm:2026-11-04:1320"), { kind: "confirm", day: "2026-11-04", time: "01:20 PM" });
  for (const kind of ["start", "callback", "retime", "reemail", "change"]) {
    assert.deepEqual(b.parseTap(`bk:${kind}`), { kind });
  }
  for (const id of ["bk:day:2026-13-45", "bk:time:2026-11-04:1325", "bk:day:2026-11-04:x", "bk:part:2026-11-04:noon", "bk:nonsense", "hello", ""]) {
    assert.equal(b.parseTap(id), null, id);
  }
});

test("an email is found inside a sentence", () => {
  assert.equal(b.findEmail("my email is Jane.Doe@Example.com, thanks"), "jane.doe@example.com");
  assert.equal(b.findEmail("<jane@example.com>"), "jane@example.com");
  assert.equal(b.findEmail("jane@example.com."), "jane@example.com");
  assert.equal(b.findEmail("a@b.co and c@d.co"), "a@b.co");
  for (const text of ["jane@example", "jane@@example.com", "no email here", `${"a".repeat(243)}@example.com`]) {
    assert.equal(b.findEmail(text), null, text.slice(0, 30));
  }
});

test("the flow is read from Lana's latest message", () => {
  const card = { step: "confirm", day: "2026-11-03", time: "01:20 PM", email: "jane@example.com" };
  const history = [
    { role: "user", content: "hi" },
    { role: "model", content: "Please check your booking", via: "booking:confirm", booking: card },
  ];

  assert.deepEqual(b.currentFlow(history), card);
  assert.deepEqual(b.currentFlow([...history, { role: "user", content: "thanks" }]), card, "the family writing does not end it");
  assert.equal(b.currentFlow([...history, { role: "model", content: "Hello, this is Wanjiru", sent_by: "human" }]), null);
  assert.equal(b.currentFlow([...history, { role: "model", content: "An ordinary reply", via: "ai" }]), null);
  assert.equal(b.currentFlow([]), null);

  for (const step of ["day", "part", "time", "email", "confirm"]) assert.equal(b.isOpen({ step }), true, step);
  for (const step of ["offer", "done"]) assert.equal(b.isOpen({ step }), false, step);
  assert.equal(b.isOpen(null), false);
});

test("upcoming and recent bookings", () => {
  const row = (over = {}) => ({ id: "r", consultation_date: "2026-11-03", consultation_time: "01:20 PM", status: "confirmed", ...over });
  assert.equal(b.isUpcoming(row(), MON_10), true);
  assert.equal(b.isUpcoming(row({ status: "cancelled" }), MON_10), false);
  assert.equal(b.isUpcoming(row({ consultation_date: "2026-11-02", consultation_time: "11:00 AM" }), MON_10), true, "today, not yet over");
  assert.equal(b.isUpcoming(row({ consultation_date: "2026-11-02", consultation_time: "09:00 AM" }), MON_10), false, "today, over");
  assert.equal(b.isUpcoming(row({ consultation_date: "2026-11-01" }), MON_10), false, "yesterday");

  const hoursAgo = (hours) => new Date(MON_10.getTime() - hours * 3_600_000).toISOString();
  const rows = [
    row({ booked_via: "whatsapp", created_at: hoursAgo(1) }),
    row({ booked_via: "whatsapp", status: "cancelled", created_at: hoursAgo(23) }),
    row({ booked_via: "whatsapp", created_at: hoursAgo(25) }),
    row({ booked_via: null, created_at: hoursAgo(1) }),
  ];
  assert.equal(b.countRecentChatBookings(rows, MON_10), 2, "chat bookings in the last day, whatever their status");

  assert.deepEqual(b.phoneVariants("254712345678"), ["254712345678", "+254712345678"]);
  assert.deepEqual(b.phoneVariants("+254712345678"), ["254712345678", "+254712345678"]);
});

test("the booking row has the website's shape", () => {
  const history = [
    { role: "user", content: "Hi, I need a maths tutor for my son in Grade 6, CBC." },
    { role: "model", content: "Thanks! Which subjects?", via: "ai" },
    { role: "user", content: "Book a free call", tap: "bk:start" },
    { role: "user", content: "[Image]", attachment: { type: "image" } },
    { role: "user", content: "He struggles with fractions." },
    { role: "user", content: "jane@example.com" },
  ];
  const make = (over = {}) =>
    b.bookingRow({ name: "Jane", phone: "254712345678", email: "jane@example.com", day: "2026-11-03", time: "01:20 PM", history, ...over });

  const row = make();
  assert.equal(row.parent_name, "Jane");
  assert.equal(row.student_name, "");
  assert.equal(row.grade_level, "");
  assert.deepEqual(row.subjects_interest, []);
  assert.equal(row.preferred_mode, "consultation");
  assert.equal(row.phone_number, "254712345678");
  assert.equal(row.email, "jane@example.com");
  assert.equal(row.consultation_date, "2026-11-03");
  assert.equal(row.consultation_time, "01:20 PM");
  assert.equal(row.status, "confirmed");
  assert.equal(row.booked_via, "whatsapp");
  assert.match(row.additional_notes, /^Booked in the WhatsApp chat\./);
  assert.match(row.additional_notes, /Grade 6, CBC/);
  assert.match(row.additional_notes, /fractions/);
  for (const left of ["Book a free call", "[Image]", "Which subjects", "jane@example.com"]) {
    assert.ok(!row.additional_notes.includes(left), `notes should not hold "${left}"`);
  }

  const long = make({ history: [{ role: "user", content: "x".repeat(1000) }] });
  assert.ok(long.additional_notes.length <= 641, "the family's words are cut at 600 characters");
  assert.equal(make({ name: undefined }).parent_name, "");
  assert.equal(make({ name: "N".repeat(300) }).parent_name.length, 200);
  assert.equal(make({ history: [] }).additional_notes, "Booked in the WhatsApp chat.");
});

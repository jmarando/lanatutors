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

// ---------------- the messages Lana sends ----------------

const NOW = MON_10;
const listRows = (out) => out.wa.interactive.action.sections.flatMap((section) => section.rows);
const buttonsOf = (out) => out.wa.interactive.action.buttons.map((button) => button.reply);
const LONG_EMAIL = `${"a".repeat(242)}@example.com`; // 254 characters
const MEET = "https://meet.google.com/abc-defg-hij";

function everyMessage() {
  const times = b.freeTimes("2026-11-03", NOW, {});
  return [
    b.dayListOut(b.openDays(NOW, {}), NOW),
    b.partsOut("2026-11-04", ["am", "pm", "eve"]),
    b.timesOut("2026-11-03", times.slice(0, 10)),
    b.timesOut("2026-11-03", times.slice(0, 6), { taken: true }),
    b.askEmailOut("2026-11-04", "01:20 PM"),
    b.askEmailOut("2026-11-04", "01:20 PM", { tries: 1 }),
    b.confirmOut("2026-11-04", "01:20 PM", LONG_EMAIL),
    b.bookedOut({ day: "2026-11-04", time: "01:20 PM", email: LONG_EMAIL, link: MEET, id: "b1" }),
    b.bookedOut({ day: "2026-11-04", time: "01:20 PM", email: "jane@example.com", link: null, id: "b1" }),
    b.alreadyBookedOut("2026-11-05", "02:00 PM"),
    ...b.offerOut("x".repeat(900), "ai"),
    ...b.offerOut("y".repeat(1100), "ai"),
  ];
}

test("every message the flow can build is inside Meta's limits", () => {
  for (const out of everyMessage()) {
    if (out.wa.type !== "interactive") continue;
    const interactive = out.wa.interactive;
    if (interactive.type === "list") {
      const rows = listRows(out);
      assert.ok(rows.length >= 1 && rows.length <= 10, "1 to 10 rows");
      assert.ok(interactive.action.sections.length <= 10);
      assert.ok(interactive.action.button.length <= 20, "list button");
      assert.ok(interactive.body.text.length <= 4096);
      for (const section of interactive.action.sections) assert.ok(section.title.length <= 24, "section title");
      for (const row of rows) {
        assert.ok(row.id.length <= 200, row.id);
        assert.ok(row.title.length <= 24, row.title);
        assert.ok(row.description.length <= 72, row.description);
      }
    } else {
      assert.equal(interactive.type, "button");
      const buttons = buttonsOf(out);
      assert.ok(buttons.length >= 1 && buttons.length <= 3, "at most 3 buttons");
      assert.ok(interactive.body.text.length <= 1024, "button message body");
      for (const button of buttons) {
        assert.ok(button.title.length <= 20, button.title);
        assert.ok(button.id.length <= 256, button.id);
      }
    }
  }
});

test("no message contains an emoji", () => {
  const emoji = /\p{Extended_Pictographic}/u;
  for (const out of everyMessage()) {
    const sent = out.wa.type === "text" ? out.wa.body : JSON.stringify(out.wa.interactive);
    assert.ok(!emoji.test(sent), sent.slice(0, 40));
    assert.ok(!emoji.test(out.content));
    assert.ok(!emoji.test(out.fallback));
  }
  for (const [name, text] of Object.entries(b.COPY)) assert.ok(!emoji.test(text), name);
});

test("day labels, times and ranges read as people say them", () => {
  assert.equal(b.dayLabel("2026-11-02", NOW), "Today");
  assert.equal(b.dayLabel("2026-11-03", NOW), "Tomorrow");
  assert.equal(b.dayLabel("2026-11-04", NOW), "Wed 4 Nov");
  assert.equal(b.longDay("2026-11-04"), "Wednesday 4 November");
  assert.equal(b.niceTime("01:20 PM"), "1:20 pm");
  assert.equal(b.niceTime("11:00 AM"), "11:00 am");
  assert.equal(b.niceTime("12:00 PM"), "12:00 pm");
  assert.equal(b.endTime("12:40 PM"), "1:00 pm");
  assert.equal(b.endTime("11:40 AM"), "12:00 pm");
  assert.equal(b.endTime("08:40 PM"), "9:00 pm");
});

test("the day list has Today and Tomorrow, counts and the state", () => {
  const days = [...b.openDays(NOW, {}).slice(0, 2), { day: "2026-11-04", free: 1 }];

  const out = b.dayListOut(days, NOW);
  const rows = listRows(out);
  assert.deepEqual(rows.map((row) => row.title), ["Today", "Tomorrow", "Wed 4 Nov"]);
  assert.deepEqual(rows.map((row) => row.id), ["bk:day:2026-11-02", "bk:day:2026-11-03", "bk:day:2026-11-04"]);
  assert.deepEqual(rows.map((row) => row.description), ["17 times free", "18 times free", "1 time free"]);
  assert.deepEqual(out.booking, { step: "day" });
  assert.equal(out.via, "booking:day");
  assert.equal(out.wa.interactive.body.text, b.COPY.firstDays);
  assert.match(out.content, /\n\n\[List: Today, Tomorrow, Wed 4 Nov\]$/);

  assert.equal(b.dayListOut(days, NOW, { intro: "again" }).wa.interactive.body.text, b.COPY.againDays);
  assert.equal(b.dayListOut(days, NOW, { intro: "filled" }).wa.interactive.body.text, b.COPY.filledDays);
  assert.deepEqual(b.dayListOut(days, NOW, { email: "jane@example.com" }).booking, { step: "day", email: "jane@example.com" });
});

test("parts, times and the confirmation carry what the next tap needs", () => {
  const parts = b.partsOut("2026-11-04", ["am", "pm", "eve"]);
  assert.deepEqual(buttonsOf(parts).map((button) => button.title), ["11:00 am - 12:40 pm", "1:00 - 2:40 pm", "7:00 - 8:40 pm"]);
  assert.deepEqual(buttonsOf(parts).map((button) => button.id), ["bk:part:2026-11-04:am", "bk:part:2026-11-04:pm", "bk:part:2026-11-04:eve"]);
  assert.deepEqual(parts.booking, { step: "part", day: "2026-11-04" });

  const times = b.timesOut("2026-11-04", ["01:20 PM"]);
  assert.deepEqual(listRows(times), [{ id: "bk:time:2026-11-04:1320", title: "1:20 pm", description: "Wed 4 Nov, 20 minutes" }]);
  assert.deepEqual(times.booking, { step: "time", day: "2026-11-04" });
  assert.ok(!times.wa.interactive.body.text.startsWith("Sorry"));
  assert.ok(b.timesOut("2026-11-04", ["01:20 PM"], { taken: true }).wa.interactive.body.text.startsWith("Sorry, that time has just been taken."));

  const card = b.confirmOut("2026-11-04", "01:20 PM", "jane@example.com");
  const body = card.wa.interactive.body.text;
  assert.match(body, /Day: Wednesday 4 November/);
  assert.match(body, /Time: 1:20 pm to 1:40 pm Nairobi time \(EAT\)/);
  assert.match(body, /Email: jane@example\.com/);
  assert.deepEqual(buttonsOf(card).map((button) => button.title), ["Confirm", "Change time", "Change email"]);
  assert.deepEqual(buttonsOf(card).map((button) => button.id), ["bk:confirm:2026-11-04:1320", "bk:retime", "bk:reemail"]);
  assert.deepEqual(card.booking, { step: "confirm", day: "2026-11-04", time: "01:20 PM", email: "jane@example.com" });
  assert.match(card.content, /\n\n\[Buttons: Confirm \| Change time \| Change email\]$/);
});

test("the booked message has the link, or says the team will send it", () => {
  const withLink = b.bookedOut({ day: "2026-11-04", time: "01:20 PM", email: "jane@example.com", link: MEET, id: "b1" });
  const text = withLink.wa.interactive.body.text;
  assert.ok(text.includes(MEET));
  assert.ok(text.includes("jane@example.com"));
  assert.ok(text.includes("Nairobi time (EAT)"));

  const withoutLink = b.bookedOut({ day: "2026-11-04", time: "01:20 PM", email: "jane@example.com", link: null, id: "b1" });
  assert.ok(withoutLink.wa.interactive.body.text.includes("Our team will send you the Google Meet link here before the call."));
  assert.ok(!withoutLink.wa.interactive.body.text.includes("meet.google.com"));

  for (const out of [withLink, withoutLink]) {
    assert.ok(out.wa.interactive.body.text.endsWith("please type your child's grade and the subjects they need help with."));
    assert.deepEqual(buttonsOf(out), [{ id: "bk:change", title: "Change or cancel" }]);
    assert.deepEqual(out.booking, { step: "done", id: "b1" });
    assert.equal(out.via, "booking:done");
  }

  const already = b.alreadyBookedOut("2026-11-05", "02:00 PM");
  assert.ok(already.wa.interactive.body.text.includes("You already have a call booked for Thursday 5 November, 2:00 pm Nairobi time (EAT)."));
  assert.deepEqual(buttonsOf(already), [{ id: "bk:change", title: "Change or cancel" }]);
  assert.deepEqual(already.booking, { step: "done" });
});

test("asking for the email can retry", () => {
  const first = b.askEmailOut("2026-11-04", "01:20 PM");
  assert.equal(first.wa.body, b.COPY.askEmail);
  assert.deepEqual(first.booking, { step: "email", day: "2026-11-04", time: "01:20 PM" });
  assert.equal(first.via, "booking:email");

  const retry = b.askEmailOut("2026-11-04", "01:20 PM", { tries: 1 });
  assert.equal(retry.wa.body, b.COPY.emailRetry);
  assert.deepEqual(retry.booking, { step: "email", day: "2026-11-04", time: "01:20 PM", tries: 1 });
});

test("the offer carries the two buttons, in one message or two", () => {
  const [single, ...rest] = b.offerOut("Thanks. Book a free call here: https://lanatutors.africa/book-consultation", "ai");
  assert.equal(rest.length, 0);
  assert.equal(single.wa.type, "interactive");
  assert.deepEqual(buttonsOf(single), [{ id: "bk:start", title: "Book a free call" }, { id: "bk:callback", title: "Call me back" }]);
  assert.equal(single.via, "ai");
  assert.deepEqual(single.booking, { step: "offer" });
  assert.match(single.content, /\[Buttons: Book a free call \| Call me back\]$/);

  const [text, buttons, ...more] = b.offerOut("z".repeat(1100), "backup");
  assert.equal(more.length, 0);
  assert.equal(text.wa.type, "text");
  assert.equal(text.via, "backup");
  assert.equal(text.booking, undefined);
  assert.equal(buttons.wa.interactive.body.text, b.COPY.moreButtons);
  assert.equal(buttons.via, "booking:offer");
  assert.deepEqual(buttons.booking, { step: "offer" });
  assert.match(buttons.content, /\[Buttons: Book a free call \| Call me back\]$/);
});

test("a refused booked message still gives the details as plain text, because the call is booked", () => {
  const booked = b.bookedOut({ day: "2026-11-04", time: "01:20 PM", email: "jane@example.com", link: MEET, id: "b1" });
  assert.equal(booked.fallback, booked.wa.interactive.body.text);
  assert.ok(booked.fallback.includes(MEET));

  const already = b.alreadyBookedOut("2026-11-05", "02:00 PM");
  assert.equal(already.fallback, already.wa.interactive.body.text);
});

// Run with `npm run test:edge`. Booking the free assessment call in the WhatsApp chat: the webhook reading taps,
// sending lists and buttons, and walking a family from the days to the confirmation card. The rules and the wording
// themselves are tested in booking.test.mjs.
import assert from "node:assert/strict";
import { test } from "node:test";
import { aiFailure, aiText, aiToolCall, claudeText, inbound, loadFunction, loadModule, tap } from "./harness.mjs";

const PARENT = "254700000001";
const NOW = Date.parse("2026-11-02T07:00:00Z"); // Monday 10:00 in Nairobi
const { COPY, CALL_TIMES } = await loadModule("whatsapp-webhook/booking.ts");
const { CALLBACK_REPLY } = await loadModule("whatsapp-webhook/lana.ts");

const FIRST = "Hi, I need a maths tutor for my son in Grade 6, CBC.";

// A chat as Lana leaves it: the family's first message, then her message carrying the given flow state. The chat is
// with the team, which is where Lana's one answer leaves it. `extra` can hold `bookings`, `env`, `meta`, and `after`:
// messages that came later.
function chatAt(state, extra = {}) {
  const { after = [], ...rest } = extra;
  return {
    conversations: [{
      phone_number: PARENT,
      escalated: true,
      messages: [
        { role: "user", content: FIRST, ts: "2026-11-02T06:50:00.000Z" },
        {
          role: "model",
          content: "Lana's last message",
          ts: "2026-11-02T06:55:00.000Z",
          via: state.step === "offer" ? "ai" : `booking:${state.step}`,
          booking: state,
        },
        ...after,
      ],
    }],
    ...rest,
  };
}

// Loads the function with the clock stopped at NOW; every post moves it on a second, as real time would.
async function start(t, options = {}) {
  const fn = await loadFunction("whatsapp-webhook", options);
  t.after(() => fn.dispose());
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  const post = fn.post;
  return {
    ...fn,
    async post(payload) {
      const response = await post(payload);
      t.mock.timers.tick(1000);
      return response;
    },
  };
}

const messages = (fn) => fn.world.conversation(PARENT).messages;
const last = (fn) => messages(fn).at(-1);
const rowsOf = (message) => message.interactive.action.sections.flatMap((section) => section.rows);
const buttonsOf = (message) => message.interactive.action.buttons.map((button) => button.reply);
const held = (day, times, phone = "254711111111") => times.map((time) => ({ consultation_date: day, consultation_time: time, phone_number: phone }));
const row = (id, title) => tap(id, title, { list: true });

test("tapping 'Book a free call' lists the days with a free time, although the chat is with the team, and without the wait", async (t) => {
  const fn = await start(t, chatAt({ step: "offer" }, { env: { WHATSAPP_REPLY_DELAY_MS: "2000" } }));

  const started = performance.now();
  await fn.post(tap("bk:start", "Book a free call"));

  assert.ok(performance.now() - started < 1000, "a tap does not wait");
  const sent = fn.world.sent[0];
  assert.equal(sent.interactive.type, "list");
  assert.deepEqual(rowsOf(sent).slice(0, 2).map((r) => r.id), ["bk:day:2026-11-02", "bk:day:2026-11-03"]);
  assert.equal(last(fn).booking.step, "day");
  assert.equal(last(fn).via, "booking:day");
  const saved = messages(fn).at(-2);
  assert.equal(saved.role, "user");
  assert.equal(saved.content, "Book a free call");
  assert.equal(saved.tap, "bk:start");
  assert.equal(fn.world.gatewayCalls.length, 0);
  assert.equal(fn.world.conversation(PARENT).escalated, true);
});

test("a day with more than ten free times asks which part of the day first", async (t) => {
  const fn = await start(t, chatAt({ step: "day" }));

  await fn.post(row("bk:day:2026-11-03", "Tomorrow"));

  assert.equal(fn.world.sent[0].interactive.type, "button");
  assert.deepEqual(buttonsOf(fn.world.sent[0]).map((b) => b.id), ["bk:part:2026-11-03:am", "bk:part:2026-11-03:pm", "bk:part:2026-11-03:eve"]);
  assert.deepEqual(last(fn).booking, { step: "part", day: "2026-11-03" });
});

test("a day with ten or fewer free times goes straight to the list of times", async (t) => {
  const fn = await start(t, chatAt({ step: "day" }, { bookings: held("2026-11-03", CALL_TIMES.slice(0, 10)) }));

  await fn.post(row("bk:day:2026-11-03", "Tomorrow"));

  assert.equal(fn.world.sent[0].interactive.type, "list");
  assert.equal(rowsOf(fn.world.sent[0]).length, 8);
});

test("a day with free times in only one part skips the question", async (t) => {
  const onlyTwo = CALL_TIMES.filter((time) => time !== "01:20 PM" && time !== "01:40 PM");
  const fn = await start(t, chatAt({ step: "day" }, { bookings: held("2026-11-03", onlyTwo) }));

  await fn.post(row("bk:day:2026-11-03", "Tomorrow"));

  assert.deepEqual(rowsOf(fn.world.sent[0]).map((r) => r.id), ["bk:time:2026-11-03:1320", "bk:time:2026-11-03:1340"]);
});

test("a part shows its times, and a time asks for the email", async (t) => {
  const fn = await start(t, chatAt({ step: "part", day: "2026-11-03" }));

  await fn.post(tap("bk:part:2026-11-03:pm", "1:00 - 2:40 pm"));
  assert.deepEqual(rowsOf(fn.world.sent[0]).map((r) => r.id), [
    "bk:time:2026-11-03:1300", "bk:time:2026-11-03:1320", "bk:time:2026-11-03:1340",
    "bk:time:2026-11-03:1400", "bk:time:2026-11-03:1420", "bk:time:2026-11-03:1440",
  ]);

  await fn.post(row("bk:time:2026-11-03:1320", "1:20 pm"));
  assert.equal(fn.world.sent[1].text, COPY.askEmail);
  assert.deepEqual(last(fn).booking, { step: "email", day: "2026-11-03", time: "01:20 PM" });
});

test("a typed address gets the confirmation card without the AI", async (t) => {
  const fn = await start(t, chatAt({ step: "email", day: "2026-11-03", time: "01:20 PM" }));

  await fn.post(inbound({ from: PARENT, text: "jane@example.com" }));

  assert.deepEqual(buttonsOf(fn.world.sent[0]).map((b) => b.title), ["Confirm", "Change time", "Change email"]);
  assert.deepEqual(last(fn).booking, { step: "confirm", day: "2026-11-03", time: "01:20 PM", email: "jane@example.com" });
  assert.equal(fn.world.gatewayCalls.length, 0);
});

test("an address inside a sentence is found", async (t) => {
  const fn = await start(t, chatAt({ step: "email", day: "2026-11-03", time: "01:20 PM" }));

  await fn.post(inbound({ from: PARENT, text: "my email is Jane@Example.com thanks" }));

  assert.ok(fn.world.sent[0].text.includes("Email: jane@example.com"));
});

test("no address gets one retry, then the team", async (t) => {
  const fn = await start(t, chatAt({ step: "email", day: "2026-11-03", time: "01:20 PM" }));

  await fn.post(inbound({ from: PARENT, text: "I don't have one" }));
  assert.equal(fn.world.sent.at(-1).text, COPY.emailRetry);
  assert.deepEqual(last(fn).booking, { step: "email", day: "2026-11-03", time: "01:20 PM", tries: 1 });

  await fn.post(inbound({ from: PARENT, text: "really I do not" }));
  assert.equal(fn.world.sent.at(-1).text, COPY.emailGiveUp);
  assert.equal(last(fn).booking, undefined, "the flow has ended");

  const before = fn.world.sent.length;
  await fn.post(inbound({ from: PARENT, text: "hello?" }));
  assert.equal(fn.world.sent.length, before, "a third message gets no reply: the team has the chat");
});

test("Change time returns to the days with the email kept, and the next time goes straight to the card", async (t) => {
  const fn = await start(t, chatAt({ step: "confirm", day: "2026-11-03", time: "01:20 PM", email: "jane@example.com" }));

  await fn.post(tap("bk:retime", "Change time"));
  assert.equal(fn.world.sent.at(-1).interactive.type, "list");
  assert.deepEqual(last(fn).booking, { step: "day", email: "jane@example.com" });

  await fn.post(row("bk:day:2026-11-04", "Wed 4 Nov"));
  await fn.post(tap("bk:part:2026-11-04:pm", "1:00 - 2:40 pm"));
  await fn.post(row("bk:time:2026-11-04:1340", "1:40 pm"));

  assert.deepEqual(last(fn).booking, { step: "confirm", day: "2026-11-04", time: "01:40 PM", email: "jane@example.com" });
  assert.ok(!fn.world.sent.some((m) => m.text === COPY.askEmail), "the email is not asked for again");
});

test("Change email asks again and keeps the day and time", async (t) => {
  const fn = await start(t, chatAt({ step: "confirm", day: "2026-11-03", time: "01:20 PM", email: "jane@example.com" }));

  await fn.post(tap("bk:reemail", "Change email"));

  assert.equal(fn.world.sent[0].text, COPY.askEmail);
  assert.deepEqual(last(fn).booking, { step: "email", day: "2026-11-03", time: "01:20 PM" });
});

test("a stray message while the days are on offer gets one nudge, then silence", async (t) => {
  const fn = await start(t, chatAt({ step: "day" }));

  await fn.post(inbound({ from: PARENT, text: "Can we do Saturday morning?" }));
  assert.equal(fn.world.sent.at(-1).text, COPY.nudge);
  assert.deepEqual(last(fn).booking, { step: "day", nudged: true });

  const before = fn.world.sent.length;
  await fn.post(inbound({ from: PARENT, text: "hello?" }));
  assert.equal(fn.world.sent.length, before);
  const texts = messages(fn).map((m) => m.content);
  assert.ok(texts.includes("Can we do Saturday morning?") && texts.includes("hello?"), "both are saved for the team");
});

test("a reply from the team ends the flow for typed text, but a tap is still read", async (t) => {
  const after = [{ role: "model", content: "Hello, this is Wanjiru", ts: "2026-11-02T06:58:00.000Z", sent_by: "human" }];
  const fn = await start(t, chatAt({ step: "email", day: "2026-11-03", time: "01:20 PM" }, { after }));

  await fn.post(inbound({ from: PARENT, text: "jane@example.com" }));
  assert.deepEqual(fn.world.sent, []);

  await fn.post(tap("bk:start", "Book a free call"));
  assert.equal(fn.world.sent[0].interactive.type, "list");
});

test("'stop' in the middle of the flow still opts the number out", async (t) => {
  const fn = await start(t, chatAt({ step: "email", day: "2026-11-03", time: "01:20 PM" }));

  await fn.post(inbound({ from: PARENT, text: "stop" }));

  assert.equal(fn.world.tables.whatsapp_suppressions.length, 1);
  assert.match(fn.world.sent[0].text, /removed you from our WhatsApp marketing list/);
  assert.equal(fn.world.sent[0].interactive, undefined);
});

test("a day that has filled up since the list was sent shows the days again", async (t) => {
  const fn = await start(t, chatAt({ step: "day" }, { bookings: held("2026-11-03", CALL_TIMES) }));

  await fn.post(row("bk:day:2026-11-03", "Tomorrow"));

  const sent = fn.world.sent[0];
  assert.equal(sent.text, COPY.filledDays);
  assert.ok(!rowsOf(sent).some((r) => r.id === "bk:day:2026-11-03"));
});

test("a time taken since the list was sent shows the day's other times", async (t) => {
  const fn = await start(t, chatAt({ step: "time", day: "2026-11-03" }, { bookings: held("2026-11-03", ["01:20 PM"]) }));

  await fn.post(row("bk:time:2026-11-03:1320", "1:20 pm"));

  const sent = fn.world.sent[0];
  assert.ok(sent.text.startsWith("Sorry, that time has just been taken."));
  assert.deepEqual(rowsOf(sent).map((r) => r.id), [
    "bk:time:2026-11-03:1300", "bk:time:2026-11-03:1340", "bk:time:2026-11-03:1400",
    "bk:time:2026-11-03:1420", "bk:time:2026-11-03:1440",
  ]);
});

test("a tap for a Sunday, a past day or a made-up id is answered with the days", async (t) => {
  const fn = await start(t, chatAt({ step: "day" }));

  await fn.post(row("bk:day:2026-11-08", "Sun 8 Nov"));
  await fn.post(row("bk:day:2026-10-31", "Sat 31 Oct"));
  assert.equal(fn.world.sent.length, 2);
  for (const sent of fn.world.sent) {
    assert.equal(sent.text, COPY.againDays);
    assert.equal(sent.interactive.type, "list");
  }

  await fn.post(tap("bk:nonsense", "Whatever"));
  assert.equal(fn.world.sent.length, 2, "an id that is not ours is read as ordinary text: saved, no reply");
  assert.equal(messages(fn).at(-1).content, "Whatever");
});

test("with no free day in two weeks, Lana says so", async (t) => {
  const everyTime = [];
  for (let ahead = 0; ahead <= 14; ahead++) {
    everyTime.push(...held(new Date(NOW + ahead * 86_400_000).toISOString().slice(0, 10), CALL_TIMES));
  }
  const fn = await start(t, chatAt({ step: "offer" }, { bookings: everyTime }));

  await fn.post(tap("bk:start", "Book a free call"));

  assert.equal(fn.world.sent.at(-1).text, COPY.noFreeDays);
  assert.equal(fn.world.conversation(PARENT).escalated, true);
});

test("'Call me back' answers with the team's own call-back wording", async (t) => {
  const fn = await start(t, chatAt({ step: "offer" }));

  await fn.post(tap("bk:callback", "Call me back"));

  assert.equal(fn.world.sent[0].text, CALLBACK_REPLY);
  assert.match(CALLBACK_REPLY, /preferred time for the call/);
  assert.equal(last(fn).via, "booking:callback");
  assert.equal(last(fn).booking, undefined);
});

test("Meta refusing the list sends plain text, tells the team, and ends the flow", async (t) => {
  const refused = { status: 400, body: { error: { message: "Invalid parameter", code: 100 } } };
  const fn = await start(t, chatAt({ step: "offer" }, { meta: [refused] }));

  await fn.post(tap("bk:start", "Book a free call"));

  assert.deepEqual(fn.world.sent.map((m) => m.text), [COPY.teamArranges]);
  assert.equal(fn.world.sent[0].interactive, undefined);
  assert.equal(fn.world.emails.length, 1);
  assert.match(fn.world.emails[0].html, /Invalid parameter/);
  assert.equal(last(fn).booking, undefined);
});

test("WHATSAPP_BOOKING=off answers any tap with 'our team will arrange it'", async (t) => {
  const fn = await start(t, chatAt({ step: "offer" }, { env: { WHATSAPP_BOOKING: "off" } }));

  await fn.post(tap("bk:start", "Book a free call"));

  assert.deepEqual(fn.world.sent.map((m) => m.text), [COPY.teamArranges]);
  assert.equal(fn.world.sent[0].interactive, undefined);
});

// ---------------- confirming and booking ----------------

const MEET = "https://meet.google.com/abc-defg-hij";
const CALENDAR = "create-consultation-calendar-event";
const CONFIRMATION = "send-consultation-booking-confirmation";
const confirmChat = (extra = {}) => chatAt({ step: "confirm", day: "2026-11-03", time: "01:20 PM", email: "jane@example.com" }, extra);
const CONFIRM = (options) => tap("bk:confirm:2026-11-03:1320", "Confirm", options);
const mine = (fn) => fn.world.tables.consultation_bookings.filter((booking) => booking.phone_number === PARENT);
const callsTo = (fn, name) => fn.world.functionCalls.filter((call) => call.name === name);
const subjects = (fn) => fn.world.emails.map((email) => email.subject);
const googleFailed = { [CALENDAR]: [{ status: 200, body: { success: false, message: "token_error", meetingLink: "https://meet.google.com/pending" } }] };

test("Confirm books the call: the row, the event, the link, the chat message, the email and the notice, in that order", async (t) => {
  const fn = await start(t, confirmChat());

  await fn.post(CONFIRM());

  assert.deepEqual(fn.world.events, [
    "insert booking",
    `call ${CALENDAR}`,
    "update booking",
    "send interactive",
    `call ${CONFIRMATION}`,
    "email WhatsApp: a call was booked in the chat — Test Parent",
  ]);
  assert.equal(mine(fn).length, 1);
  const [booking] = mine(fn);
  const expected = {
    parent_name: "Test Parent", student_name: "", phone_number: PARENT, email: "jane@example.com", grade_level: "",
    subjects_interest: [], preferred_mode: "consultation", consultation_date: "2026-11-03", consultation_time: "01:20 PM",
    status: "confirmed", booked_via: "whatsapp", meeting_link: MEET,
  };
  for (const [key, value] of Object.entries(expected)) assert.deepEqual(booking[key], value, key);
  assert.match(booking.additional_notes, /Grade 6, CBC/);

  const [calendar] = callsTo(fn, CALENDAR);
  assert.deepEqual(calendar.body, {
    parentName: "Test Parent", studentName: "", email: "jane@example.com", phoneNumber: "+254700000001",
    consultationDate: "2026-11-03", consultationTime: "01:20 PM", subjects: [], gradeLevel: "",
    notes: booking.additional_notes, source: "whatsapp",
  });
  assert.equal(calendar.headers.Authorization, "Bearer service-role");
  const [confirmation] = callsTo(fn, CONFIRMATION);
  assert.equal(confirmation.body.meetingLink, MEET);
  assert.equal(confirmation.body.email, "jane@example.com");
  assert.ok(!("phoneNumber" in confirmation.body), "no phone number, or the function would send its own WhatsApp text");

  assert.equal(fn.world.sent.length, 1, "only Lana's message is sent");
  assert.deepEqual(buttonsOf(fn.world.sent[0]), [{ id: "bk:change", title: "Change or cancel" }]);
  assert.ok(fn.world.sent[0].text.includes(MEET));
  assert.deepEqual(last(fn).booking, { step: "done", id: booking.id });
});

test("two Confirm taps at once make one booking and one confirmation", async (t) => {
  const fn = await start(t, confirmChat());

  await Promise.all([fn.deliver(CONFIRM()), fn.deliver(CONFIRM())]);
  await fn.settle();

  assert.equal(mine(fn).length, 1);
  assert.equal(callsTo(fn, CALENDAR).length, 1);
  assert.equal(fn.world.sent.filter((message) => message.text.includes(MEET)).length, 1);
});

test("a second Confirm after it finished repeats the details and books nothing", async (t) => {
  const fn = await start(t, confirmChat());

  await fn.post(CONFIRM());
  await fn.post(CONFIRM());

  assert.equal(mine(fn).length, 1);
  assert.equal(callsTo(fn, CALENDAR).length, 1);
  assert.equal(fn.world.sent.length, 2);
  assert.equal(fn.world.sent[1].text, fn.world.sent[0].text, "the same details again");
});

test("a time taken since the card was shown is not booked", async (t) => {
  const fn = await start(t, confirmChat({ bookings: held("2026-11-03", ["01:20 PM"]) }));

  await fn.post(CONFIRM());

  assert.equal(mine(fn).length, 0);
  assert.equal(fn.world.functionCalls.length, 0);
  assert.ok(fn.world.sent[0].text.startsWith("Sorry, that time has just been taken."));
});

test("if the slot rule rejects the insert, the family is not told they are booked", async (t) => {
  const fn = await start(t, confirmChat({ rejectNextInsert: true }));

  await fn.post(CONFIRM());

  assert.equal(fn.world.tables.consultation_bookings.length, 1, "only the rival's booking");
  assert.equal(mine(fn).length, 0);
  assert.equal(fn.world.functionCalls.length, 0);
  assert.ok(fn.world.sent[0].text.startsWith("Sorry, that time has just been taken."));
  assert.notEqual(last(fn).booking?.step, "done");
});

test("a number with an upcoming booking cannot book a second", async (t) => {
  const existing = [{ phone_number: PARENT, consultation_date: "2026-11-05", consultation_time: "02:00 PM", email: "jane@example.com", meeting_link: MEET }];
  const fn = await start(t, confirmChat({ bookings: existing }));

  await fn.post(CONFIRM());
  await fn.post(tap("bk:start", "Book a free call"));

  assert.equal(mine(fn).length, 1, "no second booking");
  for (const sent of fn.world.sent) {
    assert.ok(sent.text.includes("Thursday 5 November, 2:00 pm"), sent.text);
    assert.deepEqual(buttonsOf(sent), [{ id: "bk:change", title: "Change or cancel" }]);
  }
  assert.equal(fn.world.sent.length, 2);
});

test("a call that is already over does not count as upcoming", async (t) => {
  const over = [{ phone_number: PARENT, consultation_date: "2026-11-01", consultation_time: "02:00 PM", meeting_link: MEET }];
  const fn = await start(t, confirmChat({ bookings: over }));

  await fn.post(CONFIRM());

  assert.equal(mine(fn).length, 2);
  assert.ok(fn.world.sent[0].text.includes("Your call is booked."));
});

test("three chat bookings in 24 hours is the limit", async (t) => {
  const anHourAgo = new Date(NOW - 3_600_000).toISOString();
  const recent = ["2026-11-09", "2026-11-10", "2026-11-11"].map((day) => ({
    phone_number: PARENT, consultation_date: day, consultation_time: "11:00 AM", status: "cancelled", booked_via: "whatsapp", created_at: anHourAgo,
  }));
  const fn = await start(t, confirmChat({ bookings: recent }));

  await fn.post(CONFIRM());

  assert.equal(fn.world.sent[0].text, COPY.limit);
  assert.equal(mine(fn).length, 3);
});

test("Google failing leaves the booking standing, with no dead link", async (t) => {
  const fn = await start(t, confirmChat({ functions: googleFailed }));

  await fn.post(CONFIRM());

  assert.equal(mine(fn).length, 1);
  assert.equal(mine(fn)[0].meeting_link, "https://meet.google.com/pending");
  assert.ok(fn.world.sent[0].text.includes("Our team will send you the Google Meet link here before the call."));
  assert.ok(!fn.world.sent[0].text.includes("meet.google.com"));
  assert.equal(callsTo(fn, CONFIRMATION).length, 0, "no confirmation email with a dead link");
  assert.ok(subjects(fn).some((subject) => subject.startsWith("⚠️ WhatsApp: booked, but no Meet link")));
});

for (const [name, outcome, env] of [
  ["crashing", { status: 500, body: { error: "boom" } }, {}],
  ["hanging", { status: 200, body: { success: true, meetingLink: MEET }, delayMs: 200 }, { WHATSAPP_BOOKING_CALL_MS: "50" }],
]) {
  test(`the calendar function ${name} is handled the same way`, async (t) => {
    const fn = await start(t, confirmChat({ functions: { [CALENDAR]: [outcome] }, env }));

    await fn.post(CONFIRM());

    assert.equal(mine(fn).length, 1);
    assert.equal(mine(fn)[0].meeting_link, "https://meet.google.com/pending");
    assert.ok(fn.world.sent[0].text.includes("Our team will send you the Google Meet link"));
    assert.ok(subjects(fn).some((subject) => subject.startsWith("⚠️ WhatsApp: booked, but no Meet link")));
  });
}

test("the confirmation email failing is reported; the chat confirmation was already sent", async (t) => {
  const fn = await start(t, confirmChat({ functions: { [CONFIRMATION]: [{ status: 500, body: { error: "Resend is down" } }] } }));

  await fn.post(CONFIRM());

  assert.ok(subjects(fn).some((subject) => subject.startsWith("⚠️ WhatsApp: the confirmation email did not send")));
  assert.equal(last(fn).booking.step, "done");
  assert.ok(fn.world.sent[0].text.includes(MEET));
});

test("a row that cannot be saved is reported and no event is made", async (t) => {
  const fn = await start(t, confirmChat({ failInsert: true }));

  await fn.post(CONFIRM());

  assert.equal(fn.world.sent[0].text, COPY.wentWrong);
  assert.equal(fn.world.functionCalls.length, 0);
  assert.ok(subjects(fn).some((subject) => subject.startsWith("⚠️ WhatsApp: a booking in the chat could not be saved")));
});

test("a Confirm for a card that is no longer current shows the current step", async (t) => {
  const fn = await start(t, chatAt({ step: "day" }));

  await fn.post(CONFIRM());

  assert.equal(mine(fn).length, 0);
  assert.equal(fn.world.sent[0].interactive.type, "list");
});

test("a missing WhatsApp name still books", async (t) => {
  const fn = await start(t, confirmChat());

  await fn.post(CONFIRM({ name: "" }));

  assert.equal(mine(fn)[0].parent_name, "");
  assert.equal(callsTo(fn, CALENDAR)[0].body.parentName, "");
  assert.ok(fn.world.sent[0].text.includes("Your call is booked."));
});

test("a very long WhatsApp name is cut to 200 characters", async (t) => {
  const fn = await start(t, confirmChat());

  await fn.post(CONFIRM({ name: "N".repeat(300) }));

  assert.equal(mine(fn)[0].parent_name.length, 200);
});

test("the notice to info@ can be switched off", async (t) => {
  const fn = await start(t, confirmChat({ env: { WHATSAPP_BOOKING_NOTICES: "off" } }));

  await fn.post(CONFIRM());

  assert.equal(mine(fn).length, 1);
  assert.equal(fn.world.emails.length, 0);
});

test("the alerts about a booking that went wrong cannot be switched off", async (t) => {
  const fn = await start(t, confirmChat({ env: { WHATSAPP_BOOKING_NOTICES: "off" }, functions: googleFailed }));

  await fn.post(CONFIRM());

  assert.equal(fn.world.emails.length, 1);
  assert.ok(fn.world.emails[0].subject.startsWith("⚠️ WhatsApp: booked, but no Meet link"));
});

test("'Change or cancel' tells the team and the family", async (t) => {
  const existing = [{ id: "b1", phone_number: PARENT, consultation_date: "2026-11-03", consultation_time: "01:20 PM", email: "jane@example.com", meeting_link: MEET }];
  const fn = await start(t, chatAt({ step: "done", id: "b1" }, { bookings: existing }));

  await fn.post(tap("bk:change", "Change or cancel"));

  assert.equal(fn.world.sent[0].text, COPY.changeAck);
  assert.equal(fn.world.emails.length, 1);
  assert.equal(fn.world.emails[0].subject, "WhatsApp: change or cancel a call — Test Parent");
  assert.ok(fn.world.emails[0].html.includes("Tuesday 3 November"));
  assert.ok(fn.world.emails[0].html.includes("jane@example.com"));
  assert.equal(fn.world.conversation(PARENT).escalated, true);
});

test("Meta refusing the booked message still leaves a booking and tells the team", async (t) => {
  const refused = { status: 400, body: { error: { message: "Invalid parameter", code: 100 } } };
  const fn = await start(t, confirmChat({ meta: [refused, refused] }));

  await fn.post(CONFIRM());

  assert.equal(mine(fn).length, 1);
  assert.equal(fn.world.sent.length, 0, "nothing reached the family");
  assert.ok(subjects(fn).some((subject) => subject.startsWith("⚠️ WhatsApp: Meta refused Lana's reply")));
  assert.ok(subjects(fn).some((subject) => subject.startsWith("WhatsApp: a call was booked in the chat")), "the notice still goes");
});

// ---------------- offering the call on Lana's replies ----------------

const LINK = "https://lanatutors.africa/book-consultation";
const OFFER = `Thanks, Jane. Our Learning Coordinator can help. You can book a free 20-minute assessment call here:\n${LINK}`;
const offerIds = (message) => buttonsOf(message).map((button) => button.id);

test("a reply that offers the call goes out with the two buttons, and the link stays", async (t) => {
  const fn = await start(t, { gateway: [aiText(OFFER)] });

  await fn.post(inbound({ from: PARENT, name: "Jane", text: FIRST }));

  const sent = fn.world.sent[0];
  assert.deepEqual(offerIds(sent), ["bk:start", "bk:callback"]);
  assert.ok(sent.text.includes(LINK));
  assert.equal(last(fn).via, "ai");
  assert.deepEqual(last(fn).booking, { step: "offer" });
  assert.match(last(fn).content, /\[Buttons: Book a free call \| Call me back\]$/);
});

test("a reply that does not offer the call has no buttons", async (t) => {
  const fn = await start(t, { gateway: [aiText("Thanks. Which subjects is he struggling with?")] });

  await fn.post(inbound({ from: PARENT, text: FIRST }));

  assert.equal(fn.world.sent[0].interactive, undefined);
  assert.equal(last(fn).booking, undefined);
});

test("an AI that fetched the booking link counts as offering the call, even if its text has no link", async (t) => {
  const fn = await start(t, {
    gateway: [aiToolCall("get_booking_link", { type: "assessment_call" }), aiText("Our coordinator can speak to you for 20 minutes.")],
  });

  await fn.post(inbound({ from: PARENT, text: FIRST }));

  assert.deepEqual(offerIds(fn.world.sent[0]), ["bk:start", "bk:callback"]);
});

test("a complaint does not get a booking button", async (t) => {
  const fn = await start(t, {
    gateway: [aiToolCall("escalate_to_team", { reason: "Charged twice" }), aiText("I'm sorry about that. Our Learning Coordinator will call you back.")],
  });

  await fn.post(inbound({ from: PARENT, text: "I was charged twice for one lesson" }));

  assert.equal(fn.world.sent[0].interactive, undefined);
});

test("the backup message carries the buttons, and the alert email still goes", async (t) => {
  const fn = await start(t, { gateway: [aiFailure(500)] });

  await fn.post(inbound({ from: PARENT, text: FIRST }));

  assert.deepEqual(offerIds(fn.world.sent[0]), ["bk:start", "bk:callback"]);
  assert.equal(last(fn).via, "backup");
  assert.equal(fn.world.emails.length, 1);
  assert.match(fn.world.emails[0].subject, /Lana's AI could not reply/);
});

test("Claude's reply can carry the buttons too", async (t) => {
  const fn = await start(t, {
    gateway: [aiFailure(500)],
    anthropic: [claudeText(OFFER)],
    env: { ANTHROPIC_API_KEY: "sk-ant-test" },
  });

  await fn.post(inbound({ from: PARENT, text: FIRST }));

  assert.deepEqual(offerIds(fn.world.sent[0]), ["bk:start", "bk:callback"]);
  assert.equal(last(fn).via, "ai_fallback");
});

test("a reply longer than 1,024 characters goes out as text, then a short message with the buttons", async (t) => {
  const long = `${"A long, careful answer. ".repeat(45)}\n${LINK}`;
  assert.ok(long.length > 1024);
  const fn = await start(t, { gateway: [aiText(long)] });

  await fn.post(inbound({ from: PARENT, text: FIRST }));

  assert.equal(fn.world.sent.length, 2);
  assert.equal(fn.world.sent[0].interactive, undefined);
  assert.ok(fn.world.sent[0].text.includes(LINK));
  assert.equal(fn.world.sent[1].text, COPY.moreButtons);
  assert.deepEqual(offerIds(fn.world.sent[1]), ["bk:start", "bk:callback"]);
});

test("the website's 'learn more' starter gets the buttons", async (t) => {
  const fn = await start(t);

  await fn.post(inbound({ from: PARENT, text: "Hi Lana Tutors! I'd like to learn more about your tutoring services." }));

  assert.match(fn.world.sent[0].text, /welcome to Lana Tutors/i);
  assert.deepEqual(offerIds(fn.world.sent[0]), ["bk:start", "bk:callback"]);
  assert.equal(last(fn).via, "prefill:learn_more");
});

test("the website's 'apply to become a tutor' starter does not", async (t) => {
  const fn = await start(t);

  await fn.post(inbound({ from: PARENT, text: "Hi Lana Tutors! I'd like to apply to become a tutor." }));

  assert.equal(fn.world.sent[0].interactive, undefined);
});

test("the website's 'assessment call' starter gets the day list straight away", async (t) => {
  const fn = await start(t);

  await fn.post(inbound({ from: PARENT, text: "Hi Lana Tutors! I'd like to book a 20-minute assessment call." }));

  assert.equal(fn.world.sent[0].interactive.type, "list");
  assert.equal(last(fn).via, "booking:day");
  assert.equal(fn.world.gatewayCalls.length, 0);
  assert.equal(fn.world.conversation(PARENT).escalated, true);
});

test("with WHATSAPP_BOOKING=off a reply with the link has no buttons", async (t) => {
  const fn = await start(t, { gateway: [aiText(OFFER)], env: { WHATSAPP_BOOKING: "off" } });

  await fn.post(inbound({ from: PARENT, text: FIRST }));

  assert.equal(fn.world.sent[0].interactive, undefined);
  assert.ok(fn.world.sent[0].text.includes(LINK));
});

test("with WHATSAPP_BOOKING=off the 'assessment call' starter gets the team's old script", async (t) => {
  const fn = await start(t, { env: { WHATSAPP_BOOKING: "off" } });

  await fn.post(inbound({ from: PARENT, text: "Hi Lana Tutors! I'd like to book a 20-minute assessment call." }));

  assert.match(fn.world.sent[0].text, /time zone/i);
  assert.equal(fn.world.sent[0].interactive, undefined);
});

test("Meta refusing the buttons still delivers Lana's answer", async (t) => {
  const refused = { status: 400, body: { error: { message: "Invalid parameter", code: 100 } } };
  const fn = await start(t, { gateway: [aiText(OFFER)], meta: [refused] });

  await fn.post(inbound({ from: PARENT, text: FIRST }));

  assert.equal(fn.world.sent.length, 1);
  assert.equal(fn.world.sent[0].interactive, undefined);
  assert.equal(fn.world.sent[0].text, OFFER);
  assert.equal(last(fn).booking, undefined);
  assert.ok(fn.world.emails.some((email) => email.subject.startsWith("⚠️ WhatsApp: buttons were refused")));
});

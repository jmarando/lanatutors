// Run with `npm run test:edge`. Booking the free assessment call in the WhatsApp chat: the webhook reading taps,
// sending lists and buttons, and walking a family from the days to the confirmation card. The rules and the wording
// themselves are tested in booking.test.mjs.
import assert from "node:assert/strict";
import { test } from "node:test";
import { inbound, loadFunction, loadModule, tap } from "./harness.mjs";

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

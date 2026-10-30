// Run with `npm run test:edge`. See harness.mjs for what is real and what is faked.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { aiFailure, aiText, aiToolCall, inbound, loadFunction } from "./harness.mjs";

const PARENT = "254700000001";

async function start(t, options = {}) {
  const fn = await loadFunction("whatsapp-webhook", options);
  t.after(() => fn.dispose());
  return fn;
}

test("stays silent while the team has the chat", async (t) => {
  const fn = await start(t, {
    conversations: [{
      phone_number: PARENT,
      escalated: true,
      messages: [
        { role: "user", content: "Hello", ts: "2026-10-30T08:00:00.000Z" },
        { role: "model", content: "Hi, how can we help?", ts: "2026-10-30T08:05:00.000Z", sent_by: "human" },
      ],
    }],
  });

  await fn.post(inbound({ from: PARENT, text: "Thanks, he is in Grade 6." }));

  assert.deepEqual(fn.world.sent, []);
  assert.equal(fn.world.gatewayCalls.length, 0);
  const saved = fn.world.conversation(PARENT);
  assert.equal(saved.messages.at(-1).content, "Thanks, he is in Grade 6.");
});

test("answers a new chat through the Lovable AI gateway, then hands the chat to the team", async (t) => {
  const fn = await start(t, { gateway: [aiText("Thanks for reaching out. Which subjects is he struggling with?")] });

  await fn.post(inbound({ from: PARENT, text: "Hi, I need a maths tutor for my son in Grade 6, CBC." }));

  assert.equal(fn.world.gatewayCalls.length, 1, "one gateway call");
  assert.equal(fn.world.geminiCalls.length, 0, "no direct Gemini call");
  assert.equal(fn.world.gatewayCalls[0].headers.Authorization, "Bearer test-lovable-key");
  assert.equal(fn.world.gatewayCalls[0].body.model, "google/gemini-2.5-flash");
  assert.deepEqual(fn.world.sent, [{ to: PARENT, text: "Thanks for reaching out. Which subjects is he struggling with?" }]);
  assert.equal(fn.world.conversation(PARENT).escalated, true, "the chat is handed to the team after the reply");
  assert.equal(fn.world.emails.length, 0, "no alert when the AI worked");
  assert.equal(fn.world.conversation(PARENT).messages.at(-1).via, "ai");
});

test("emails the team when the AI hands a chat over, and sends the AI's holding reply", async (t) => {
  const fn = await start(t, {
    gateway: [
      aiToolCall("escalate_to_team", { reason: "Parent says she was charged twice" }),
      aiText("I'm sorry about that. Our Learning Coordinator will call you back."),
    ],
  });

  await fn.post(inbound({ from: PARENT, name: "Amina", text: "I was charged twice for the same lesson" }));

  assert.equal(fn.world.gatewayCalls.length, 2, "the tool result goes back to the model");
  const toolMessage = fn.world.gatewayCalls[1].body.messages.at(-1);
  assert.equal(toolMessage.role, "tool");
  assert.equal(toolMessage.tool_call_id, "call_1");
  assert.equal(fn.world.emails.length, 1);
  assert.match(fn.world.emails[0].subject, /WhatsApp escalation/);
  assert.match(fn.world.emails[0].html, /Parent says she was charged twice/);
  assert.deepEqual(fn.world.sent.map((m) => m.text), ["I'm sorry about that. Our Learning Coordinator will call you back."]);
});

test("gives the AI the booking link it asks for", async (t) => {
  const fn = await start(t, {
    gateway: [aiToolCall("get_booking_link", { type: "assessment_call" }), aiText("You can book a time here.")],
  });

  await fn.post(inbound({ from: PARENT, text: "Can I book an assessment?" }));

  const toolMessage = fn.world.gatewayCalls[1].body.messages.at(-1);
  assert.equal(toolMessage.role, "tool");
  assert.match(toolMessage.content, /https:\/\/lanatutors\.africa\/book-consultation/);
  assert.deepEqual(fn.world.sent.map((m) => m.text), ["You can book a time here."]);
});

const PARENT_MESSAGE = "Hello, I need help with maths for my daughter";

test("when the AI call fails, the person still gets a reply, and it does not assume they are a parent", async (t) => {
  const fn = await start(t, { gateway: [aiFailure(402, "Not enough credits")] });

  await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));

  assert.equal(fn.world.sent.length, 1);
  assert.match(fn.world.sent[0].text, /are you a parent or student/i);
  assert.match(fn.world.sent[0].text, /lanatutors\.africa\/book-consultation/);
  assert.match(fn.world.sent[0].text, /lanatutors\.africa\/become-a-tutor/);
});

test("when the AI call fails, the team gets an alert that says why", async (t) => {
  const fn = await start(t, { gateway: [aiFailure(402, "Not enough credits")] });

  await fn.post(inbound({ from: PARENT, name: "Amina", text: PARENT_MESSAGE }));

  assert.equal(fn.world.emails.length, 1);
  assert.deepEqual(fn.world.emails[0].to, ["info@lanatutors.africa"]);
  assert.match(fn.world.emails[0].subject, /AI could not reply/);
  assert.match(fn.world.emails[0].html, /402/);
  assert.match(fn.world.emails[0].html, /Not enough credits/);
  assert.match(fn.world.emails[0].html, new RegExp(PARENT_MESSAGE));
});

test("when the AI call fails, the chat is handed to the team and the reply is marked as a backup", async (t) => {
  const fn = await start(t, { gateway: [aiFailure(500)] });

  await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));

  const saved = fn.world.conversation(PARENT);
  assert.equal(saved.escalated, true);
  assert.equal(saved.messages.at(-1).via, "backup");
});

test("a network failure calling the AI is handled the same way, and the alert names it", async (t) => {
  const fn = await start(t, { gateway: [{ throws: new Error("fetch failed") }] });

  await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));

  assert.equal(fn.world.sent.length, 1);
  assert.equal(fn.world.emails.length, 1);
  assert.match(fn.world.emails[0].html, /fetch failed/);
});

test("a timeout calling the AI is reported as a timeout", async (t) => {
  const timeout = Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
  const fn = await start(t, { gateway: [{ throws: timeout }] });

  await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));

  assert.equal(fn.world.emails.length, 1);
  assert.match(fn.world.emails[0].html, /timed out/i);
});

test("an empty answer from the AI counts as a failure", async (t) => {
  const fn = await start(t, { gateway: [aiText("")] });

  await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));

  assert.match(fn.world.sent[0].text, /are you a parent or student/i);
  assert.equal(fn.world.emails.length, 1);
  assert.match(fn.world.emails[0].html, /empty/i);
});

test("answers again after the team clicks Resume AI, then hands the chat back", async (t) => {
  const fn = await start(t, {
    gateway: [aiText("Happy to help with fractions. Which curriculum is he following?")],
    // What the inbox's "Resume AI" leaves behind: the escalation flag cleared, the earlier replies still there.
    conversations: [{
      phone_number: PARENT,
      escalated: false,
      messages: [
        { role: "user", content: "Hi", ts: "2026-10-30T08:00:00.000Z" },
        { role: "model", content: "Hi, thanks for reaching out.", ts: "2026-10-30T08:00:30.000Z", via: "ai" },
        { role: "model", content: "Hello, this is Wanjiru from the team.", ts: "2026-10-30T08:30:00.000Z", sent_by: "human" },
        { role: "user", content: "My son is in Grade 6.", ts: "2026-10-30T09:00:00.000Z" },
      ],
    }],
  });

  await fn.post(inbound({ from: PARENT, text: "He needs help with fractions." }));

  assert.deepEqual(fn.world.sent.map((m) => m.text), ["Happy to help with fractions. Which curriculum is he following?"]);
  assert.equal(fn.world.conversation(PARENT).escalated, true, "handed back to the team after her reply");
  const sentToTheModel = fn.world.gatewayCalls[0].body.messages.map((m) => m.content);
  assert.ok(sentToTheModel.includes("Hello, this is Wanjiru from the team."), "the team's earlier reply is part of the context");
});

// The messages the website's chat button prefills, and what the team already sends back to each.
const BUTTON_MESSAGES = [
  { intent: "tutor_apply", text: "Hi Lana Tutors! I'd like to apply to become a tutor.", reply: /lanatutors\.africa\/become-a-tutor/ },
  { intent: "assessment_call", text: "Hi Lana Tutors! I'd like to book a 20-minute assessment call.", reply: /time zone/i },
  { intent: "learning_plan", text: "Hi Lana Tutors! I'd like a custom learning plan for my child.", reply: /time zone/i },
  { intent: "callback", text: "Hi Lana Tutors! Please have a learning coordinator call me back.", reply: /preferred time for the call/i },
  { intent: "learn_more", text: "Hi Lana Tutors! I'd like to learn more about your tutoring services.", reply: /welcome to Lana Tutors/i },
];

for (const { intent, text, reply } of BUTTON_MESSAGES) {
  test(`answers the "${intent}" button message with the team's own reply, without asking the AI`, async (t) => {
    const fn = await start(t);

    await fn.post(inbound({ from: PARENT, text }));

    assert.equal(fn.world.gatewayCalls.length, 0);
    assert.equal(fn.world.sent.length, 1);
    assert.match(fn.world.sent[0].text, reply);
    assert.equal(fn.world.emails.length, 0, "a ready-made reply is not a failure");
    const saved = fn.world.conversation(PARENT);
    assert.equal(saved.escalated, true);
    assert.equal(saved.messages.at(-1).via, `prefill:${intent}`);
  });
}

test("still recognises a button message when the apostrophe or punctuation changes", async (t) => {
  const fn = await start(t);

  await fn.post(inbound({ from: PARENT, text: "hi lana tutors! i\u2019d like to apply to become a tutor" }));

  assert.equal(fn.world.gatewayCalls.length, 0);
  assert.match(fn.world.sent[0].text, /lanatutors\.africa\/become-a-tutor/);
});

test("sends a button message with the person's own details added to the AI instead", async (t) => {
  const fn = await start(t, { gateway: [aiText("Thanks. Which subjects is he struggling with?")] });

  await fn.post(inbound({
    from: PARENT,
    text: "Hi Lana Tutors! I'd like a custom learning plan for my child. He is in Grade 6 CBC and struggles with maths.",
  }));

  assert.equal(fn.world.gatewayCalls.length, 1);
  assert.deepEqual(fn.world.sent.map((m) => m.text), ["Thanks. Which subjects is he struggling with?"]);
});

test("every message the website's chat button prefills is answered without the AI", async () => {
  const source = await readFile(new URL("../../../src/components/WhatsAppChatButton.tsx", import.meta.url), "utf8");
  const messages = [...source.matchAll(/message:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.ok(messages.length >= 4, "found the chat button's messages");

  for (const text of messages) {
    const fn = await loadFunction("whatsapp-webhook"); // disposed inside the loop: each load swaps the globals
    try {
      await fn.post(inbound({ from: PARENT, text }));
      assert.equal(fn.world.gatewayCalls.length, 0, `the AI was asked about the button message "${text}"`);
      assert.match(fn.world.conversation(PARENT).messages.at(-1).via, /^prefill:/, text);
    } finally {
      await fn.dispose();
    }
  }
});

const SCAM =
  "President William Samoei Ruto: KSh 8,500 Cash Gift for All. As part of this year's celebration of Mashujaa Day, claim your gift here: http://ke-gift-claim.example/ruto";

test("says nothing to a prize scam, and does not hand it to the team", async (t) => {
  const fn = await start(t);

  await fn.post(inbound({ from: PARENT, text: SCAM }));

  assert.deepEqual(fn.world.sent, []);
  assert.equal(fn.world.gatewayCalls.length, 0);
  assert.equal(fn.world.emails.length, 0);
  const saved = fn.world.conversation(PARENT);
  assert.equal(saved.messages.at(-1).content, SCAM, "the message is still saved");
  assert.equal(saved.escalated, false);
});

for (const text of [
  "Is the assessment call really free?",
  "My son won a maths prize last term and now needs IGCSE help.",
  "Here is the syllabus https://example.com/grade6.pdf. Can you help with maths?",
]) {
  test(`does not mistake an ordinary message for spam: "${text.slice(0, 40)}..."`, async (t) => {
    const fn = await start(t, { gateway: [aiText("Happy to help.")] });

    await fn.post(inbound({ from: PARENT, text }));

    assert.deepEqual(fn.world.sent.map((m) => m.text), ["Happy to help."]);
  });
}

test("tells the AI how to treat tutors and teachers, and to carry on from the team's earlier replies", async (t) => {
  const fn = await start(t, { gateway: [aiText("You can register here.")] });

  await fn.post(inbound({ from: PARENT, text: "Hello, I teach mathematics and would like to know about opportunities" }));

  const system = fn.world.gatewayCalls[0].body.messages[0].content;
  assert.match(system, /tutors? or teachers? looking for work/i);
  assert.match(system, /lanatutors\.africa\/become-a-tutor/);
  assert.match(system, /messages from our team/i);
});

test("never sends a tutor profile link, even if the AI writes one", async (t) => {
  const fn = await start(t, { gateway: [aiText("Try https://lanatutors.africa/tutor/abc123, she is great with maths.")] });

  await fn.post(inbound({ from: PARENT, text: "Can you recommend a maths tutor?" }));

  assert.doesNotMatch(fn.world.sent[0].text, /lanatutors\.africa\/tutor\//);
  assert.match(fn.world.sent[0].text, /Learning Coordinator/);
});

test("honours a request to stop: confirms, suppresses the number and does not ask the AI", async (t) => {
  const fn = await start(t);

  await fn.post(inbound({ from: PARENT, text: "Stop" }));

  assert.equal(fn.world.gatewayCalls.length, 0);
  assert.match(fn.world.sent[0].text, /removed you from our WhatsApp marketing list/);
  assert.equal(fn.world.tables.whatsapp_suppressions.length, 1);
});

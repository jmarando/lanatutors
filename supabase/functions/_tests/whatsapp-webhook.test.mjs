// Run with `npm run test:edge`. See harness.mjs for what is real and what is faked.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { aiFailure, aiText, aiToolCall, claudeFailure, claudeRefusal, claudeText, inbound, loadFunction } from "./harness.mjs";

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
      assert.match(fn.world.conversation(PARENT).messages.at(-1).via, /^(prefill:|booking:)/, text);
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

// ---------------- Messages in bursts, twice, or while the team is writing ----------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const userMessages = (conversation) => conversation.messages.filter((m) => m.role === "user").map((m) => m.content);
// What the person said, as the model was shown it.
const userTurns = (call) => (call?.body.messages ?? []).filter((m) => m.role === "user").map((m) => m.content);

test("two messages sent back to back get one reply that reads both, and both are saved", async (t) => {
  const fn = await start(t, { gateway: [{ ...aiText("Thanks for your interest. Please register here."), delayMs: 20 }] });

  await fn.deliver(inbound({ from: PARENT, text: "Hello, I'd like to apply to teach chemistry with you." }));
  await fn.deliver(inbound({ from: PARENT, text: "My email is tutor@example.com" }));
  await fn.settle();

  assert.equal(fn.world.sent.length, 1, "one reply");
  assert.deepEqual(userMessages(fn.world.conversation(PARENT)), [
    "Hello, I'd like to apply to teach chemistry with you.",
    "My email is tutor@example.com",
  ]);
  assert.equal(fn.world.gatewayCalls.length, 1);
  assert.deepEqual(userTurns(fn.world.gatewayCalls[0]), [
    "Hello, I'd like to apply to teach chemistry with you.",
    "My email is tutor@example.com",
  ]);
});

test("a bare greeting waits for the question that usually follows, and one reply answers both", async (t) => {
  const fn = await start(t, { gateway: [aiText("Happy to help with Form 3 chemistry. What's a good time to call you?")] });

  await fn.deliver(inbound({ from: PARENT, text: "Hello" }));
  await sleep(40); // longer than the usual pause (20 ms in tests), shorter than the pause after a greeting
  await fn.deliver(inbound({ from: PARENT, text: "I need a chemistry tutor for my son in Form 3" }));
  await fn.settle();

  assert.equal(fn.world.gatewayCalls.length, 1);
  assert.deepEqual(userTurns(fn.world.gatewayCalls[0]), ["Hello", "I need a chemistry tutor for my son in Form 3"]);
  assert.deepEqual(fn.world.sent.map((m) => m.text), ["Happy to help with Form 3 chemistry. What's a good time to call you?"]);
});

test("a message Meta delivers twice is saved and answered once", async (t) => {
  const fn = await start(t, { gateway: [aiText("Happy to help with IB physics. What's a good time to call you?"), aiText("A SECOND REPLY")] });
  const message = inbound({ from: PARENT, id: "wamid.same", text: "Do you have IB physics tutors?" });

  await fn.post(message);
  await fn.post(message);

  assert.deepEqual(fn.world.sent.map((m) => m.text), ["Happy to help with IB physics. What's a good time to call you?"]);
  assert.deepEqual(userMessages(fn.world.conversation(PARENT)), ["Do you have IB physics tutors?"]);
});

test("a reply the team sends from the inbox while Lana is writing is kept", async (t) => {
  const teamReply = { role: "model", content: "Hi, this is Wanjiru from the team. Calling you now.", ts: "2026-10-30T09:00:01.000Z", sent_by: "human" };
  const fn = await start(t, {
    gateway: [{
      ...aiText("Thanks. What's a good time for our Learning Coordinator to call?"),
      delayMs: 20,
      // What whatsapp-send does when the team replies: append to the chat and write it back.
      meanwhile: (world) => {
        const row = world.tables.whatsapp_conversations.find((c) => c.phone_number === PARENT);
        row.messages = [...row.messages, teamReply];
        row.updated_at = world.timestamp();
      },
    }],
  });

  await fn.post(inbound({ from: PARENT, text: "Please call me about Grade 8 maths." }));

  const contents = fn.world.conversation(PARENT).messages.map((m) => m.content);
  assert.ok(contents.includes(teamReply.content), "the team's reply is still in the chat");
  assert.ok(contents.includes("Thanks. What's a good time for our Learning Coordinator to call?"));
});

test("hands its background work to the runtime, so the reply is not cut off once Meta has its answer", async (t) => {
  const fn = await start(t, { gateway: [aiText("Happy to help.")] });

  await fn.deliver(inbound({ from: PARENT, text: "Do you teach IGCSE French?" }));

  assert.equal(fn.world.background.length, 1, "the work was given to EdgeRuntime.waitUntil");
  await fn.settle();
});

test("an AI that keeps asking for tools without ever answering counts as a failure", async (t) => {
  const fn = await start(t, {
    gateway: Array.from({ length: 4 }, (_, i) => aiToolCall("get_booking_link", { type: "assessment_call" }, `call_${i}`)),
  });

  await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));

  assert.match(fn.world.sent[0].text, /are you a parent or student/i);
  assert.equal(fn.world.conversation(PARENT).messages.at(-1).via, "backup");
  assert.equal(fn.world.emails.length, 1);
});

// ---------------- Photos, voice notes, reactions and buttons ----------------

test("a photo sent while the team has the chat is saved for them, and Lana says nothing", async (t) => {
  const fn = await start(t, {
    conversations: [{ phone_number: PARENT, escalated: true, messages: [{ role: "user", content: "Hello", ts: "2026-10-30T08:00:00.000Z" }] }],
  });

  await fn.post(inbound({ from: PARENT, type: "image", image: { id: "media.1", mime_type: "image/jpeg", caption: "Here is his homework" } }));

  assert.deepEqual(fn.world.sent, []);
  const last = fn.world.conversation(PARENT).messages.at(-1);
  assert.equal(last.role, "user");
  assert.match(last.content, /image/i);
  assert.match(last.content, /Here is his homework/);
});

test("a voice note in a new chat gets one request to type, and Lana still answers what they type next", async (t) => {
  const fn = await start(t, { gateway: [aiText("Happy to help with Grade 4 maths. What's a good time to call you?")] });

  await fn.post(inbound({ from: PARENT, type: "audio", audio: { id: "media.2", mime_type: "audio/ogg; codecs=opus", voice: true } }));

  assert.equal(fn.world.sent.length, 1);
  assert.match(fn.world.sent[0].text, /type/i);
  assert.equal(fn.world.gatewayCalls.length, 0);
  assert.equal(fn.world.conversation(PARENT)?.escalated, false, "asking them to type does not hand the chat over");

  await fn.post(inbound({ from: PARENT, text: "I need a maths tutor for my Grade 4 son" }));

  assert.equal(fn.world.sent.length, 2);
  assert.equal(fn.world.sent[1].text, "Happy to help with Grade 4 maths. What's a good time to call you?");
  assert.equal(fn.world.conversation(PARENT).escalated, true);
});

test("a second voice note in a row goes to the team instead of repeating the request to type", async (t) => {
  const fn = await start(t);

  await fn.post(inbound({ from: PARENT, type: "audio", audio: { id: "media.3", voice: true } }));
  await fn.post(inbound({ from: PARENT, type: "audio", audio: { id: "media.4", voice: true } }));

  assert.equal(fn.world.sent.length, 1, "asked to type only once");
  assert.equal(fn.world.conversation(PARENT)?.escalated, true, "the team takes it from here");
});

test("an emoji reaction gets no reply", async (t) => {
  const fn = await start(t);

  await fn.post(inbound({ from: PARENT, type: "reaction", reaction: { message_id: "wamid.out.1", emoji: "👍" } }));

  assert.deepEqual(fn.world.sent, []);
  assert.equal(fn.world.gatewayCalls.length, 0);
});

test("a tapped reply button is read like a typed message", async (t) => {
  const fn = await start(t, { gateway: [aiText("Great. What's a good time for our Learning Coordinator to call you?")] });

  await fn.post(inbound({ from: PARENT, type: "button", button: { text: "Yes, call me", payload: "CALL_ME" } }));

  assert.deepEqual(fn.world.sent.map((m) => m.text), ["Great. What's a good time for our Learning Coordinator to call you?"]);
  assert.deepEqual(userTurns(fn.world.gatewayCalls[0]), ["Yes, call me"]);
});

test("a choice picked from an interactive message is read like a typed message", async (t) => {
  const fn = await start(t, { gateway: [aiText("Great, let's book it. Which country are you in?")] });

  await fn.post(inbound({
    from: PARENT,
    type: "interactive",
    interactive: { type: "button_reply", button_reply: { id: "book", title: "Book a call" } },
  }));

  assert.deepEqual(userTurns(fn.world.gatewayCalls[0]), ["Book a call"]);
  assert.deepEqual(fn.world.sent.map((m) => m.text), ["Great, let's book it. Which country are you in?"]);
});

test("a write that lands between Lana reading the chat and saving her reply is kept", async (t) => {
  const teamReply = { role: "model", content: "Hello from the team, we'll call you at 4pm.", ts: "2026-10-30T09:00:02.000Z", sent_by: "human" };
  const fn = await start(t, {
    gateway: [{
      ...aiText("Thanks. Our Learning Coordinator will call you."),
      // The next write is Lana saving her reply: the team's message lands just before it.
      meanwhile: (world) => {
        world.beforeNextUpdate = (w) => {
          const row = w.tables.whatsapp_conversations.find((c) => c.phone_number === PARENT);
          row.messages = [...row.messages, teamReply];
          row.updated_at = w.timestamp();
        };
      },
    }],
  });

  await fn.post(inbound({ from: PARENT, text: "Can someone call me about A-Level physics?" }));

  const contents = fn.world.conversation(PARENT).messages.map((m) => m.content);
  assert.ok(contents.includes(teamReply.content), "the team's message survived");
  assert.ok(contents.includes("Thanks. Our Learning Coordinator will call you."), "and so did Lana's");
});

test("if the team takes over just as Lana is about to answer, she stays silent", async (t) => {
  const fn = await start(t, { gateway: [aiText("THIS SHOULD NOT BE SENT")] });

  await fn.deliver(inbound({ from: PARENT, text: "Do you have a German tutor for an adult learner?" }));
  // Lana is waiting for follow-up messages; her next write is taking the chat to answer. The team's
  // "Take over" lands just before it.
  fn.world.beforeNextUpdate = (w) => {
    const row = w.tables.whatsapp_conversations.find((c) => c.phone_number === PARENT);
    row.escalated = true;
    row.updated_at = w.timestamp();
  };
  await fn.settle();

  assert.deepEqual(fn.world.sent, []);
  assert.equal(fn.world.gatewayCalls.length, 0);
});

// ---------------- Keeping Lana answering ----------------

test("a gateway that answers too slowly is cut off at the time limit, and the backup goes out", async (t) => {
  const fn = await start(t, { env: { WHATSAPP_AI_BUDGET_MS: "60" }, gateway: [{ ...aiText("TOO LATE"), delayMs: 400 }] });
  await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));
  assert.equal(fn.world.sent.length, 1);
  assert.match(fn.world.sent[0].text, /are you a parent or student/i);
  assert.match(fn.world.emails[0].html, /timed out/i);
  assert.equal(fn.world.conversation(PARENT).messages.at(-1).via, "backup");
});

for (const [name, body] of [
  ["a number where the text should be", { choices: [{ message: { role: "assistant", content: 42 } }] }],
  ["no choices at all", {}],
]) {
  test(`a gateway reply with ${name} is a reported failure, not a silent crash`, async (t) => {
    const fn = await start(t, { gateway: [{ status: 200, body }] });
    await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));
    assert.match(fn.world.sent[0].text, /are you a parent or student/i);
    assert.equal(fn.world.emails.length, 1);
  });
}

const claudeKey = { ANTHROPIC_API_KEY: "sk-ant-test" };

test("when the first AI fails, Claude answers, the reply is marked as the fallback's, and the team is told why", async (t) => {
  const reply = "Happy to help with Grade 6 maths. Would you like a call from our Learning Coordinator?";
  const fn = await start(t, { env: claudeKey, gateway: [aiFailure(402, "Not enough credits")], anthropic: [claudeText(reply)] });
  await fn.post(inbound({ from: PARENT, name: "Amina", text: PARENT_MESSAGE }));
  assert.deepEqual(fn.world.sent.map((m) => m.text), [reply]);
  const saved = fn.world.conversation(PARENT);
  assert.deepEqual([saved.escalated, saved.messages.at(-1).via], [true, "ai_fallback"]);
  assert.equal(fn.world.emails.length, 1);
  assert.match(fn.world.emails[0].subject, /fallback AI/i);
  assert.match(fn.world.emails[0].html, /402/);
  assert.match(fn.world.emails[0].html, /Not enough credits/);
});

test("the request to Claude is well formed", async (t) => {
  const fn = await start(t, { env: claudeKey, gateway: [aiFailure(500)], anthropic: [claudeText("Happy to help.")] });
  await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));
  const { headers, body } = fn.world.anthropicCalls[0];
  assert.equal(headers["x-api-key"], "sk-ant-test");
  assert.equal(headers["anthropic-version"], "2026-10-21");
  assert.equal(body.model, "claude-haiku-5-5");
  assert.deepEqual(body.output_config, { effort: "low" });
  for (const field of ["tools", "temperature", "top_p", "top_k", "thinking"]) assert.equal(field in body, false, field);
  assert.match(body.system, /Learning Coordinator/);
  assert.match(body.system, /Tools are not available/);
  assert.equal(body.messages.at(-1).role, "user");
});

test("the chat is reshaped for Claude: user first, never two in a row from one side", async (t) => {
  const fn = await start(t, {
    env: claudeKey, gateway: [aiFailure(500)], anthropic: [claudeText("Happy to help.")],
    conversations: [{ phone_number: PARENT, escalated: false, messages: [
      { role: "model", content: "Hello, this is Wanjiru from the team.", ts: "2026-10-30T08:00:00.000Z", sent_by: "human" },
      { role: "user", content: "Hi, I saw your ad", ts: "2026-10-30T08:01:00.000Z" },
      { role: "model", content: "Great, what grade is he in?", ts: "2026-10-30T08:02:00.000Z", sent_by: "human" },
      { role: "user", content: "Grade 6", ts: "2026-10-30T08:03:00.000Z" },
    ] }],
  });
  await fn.post(inbound({ from: PARENT, text: "Please call me" }));
  const { messages } = fn.world.anthropicCalls[0].body;
  assert.deepEqual(messages.map((m) => m.role), ["user", "assistant", "user"]);
  assert.match(messages[0].content, /Hi, I saw your ad/);
  assert.match(messages[2].content, /Grade 6\n\nPlease call me/);
});

test("a slow first AI hands over to Claude, and its late answer is never sent", async (t) => {
  const fn = await start(t, {
    env: { ...claudeKey, WHATSAPP_AI_BUDGET_MS: "60" },
    gateway: [{ ...aiText("TOO LATE"), delayMs: 400 }], anthropic: [claudeText("Happy to help.")],
  });
  await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));
  assert.deepEqual(fn.world.sent.map((m) => m.text), ["Happy to help."]);
  assert.equal(fn.world.conversation(PARENT).messages.at(-1).via, "ai_fallback");
});

test("when Claude fails too, the backup goes out and one alert names both failures", async (t) => {
  const fn = await start(t, { env: claudeKey, gateway: [aiFailure(402, "Not enough credits")], anthropic: [claudeFailure(529, "Overloaded")] });
  await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));
  assert.match(fn.world.sent[0].text, /are you a parent or student/i);
  assert.equal(fn.world.conversation(PARENT).messages.at(-1).via, "backup");
  assert.equal(fn.world.emails.length, 1);
  for (const word of [/402/, /Not enough credits/, /529/, /Overloaded/]) assert.match(fn.world.emails[0].html, word);
});

for (const [name, response] of [["declining", claudeRefusal()], ["answering with no text", claudeText("")]]) {
  test(`Claude ${name} counts as a failure: the backup goes out`, async (t) => {
    const fn = await start(t, { env: claudeKey, gateway: [aiFailure(500)], anthropic: [response] });
    await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));
    assert.equal(fn.world.anthropicCalls.length, 1, "Claude was asked");
    assert.equal(fn.world.conversation(PARENT).messages.at(-1).via, "backup");
  });
}

test("Claude taking too long is cut off at its own limit", async (t) => {
  const fn = await start(t, { env: { ...claudeKey, WHATSAPP_FALLBACK_BUDGET_MS: "60" }, gateway: [aiFailure(500)], anthropic: [{ ...claudeText("TOO LATE"), delayMs: 400 }] });
  await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));
  assert.equal(fn.world.anthropicCalls.length, 1, "Claude was asked");
  assert.ok(!fn.world.sent.some((m) => m.text === "TOO LATE"), "its late answer is not sent");
  assert.equal(fn.world.conversation(PARENT).messages.at(-1).via, "backup");
});

test("Claude is not asked when the first AI worked", async (t) => {
  const fn = await start(t, { env: claudeKey, gateway: [aiText("Happy to help.")] });
  await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));
  assert.equal(fn.world.anthropicCalls.length, 0);
  assert.equal(fn.world.emails.length, 0);
});

test("with no key, a failing first AI goes straight to the backup and Claude is never called", async (t) => {
  const fn = await start(t, { gateway: [aiFailure(500)] });
  await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));
  assert.equal(fn.world.anthropicCalls.length, 0);
  assert.equal(fn.world.conversation(PARENT).messages.at(-1).via, "backup");
});

test("Claude's reply gets the same tutor-link check, and the key is never in an email or a log", async (t) => {
  const fn = await start(t, { env: claudeKey, gateway: [aiFailure(500)], anthropic: [claudeText("Try https://lanatutors.africa/tutor/abc123, she is great.")] });
  await fn.post(inbound({ from: PARENT, text: PARENT_MESSAGE }));
  assert.equal(fn.world.conversation(PARENT).messages.at(-1).via, "ai_fallback", "it was Claude's reply that was checked");
  assert.doesNotMatch(fn.world.sent[0].text, /lanatutors\.africa\/tutor\//);
  assert.match(fn.world.sent[0].text, /Learning Coordinator/);
  const everything = JSON.stringify(fn.world.emails) + fn.world.logs.map((l) => l.text).join("\n");
  assert.doesNotMatch(everything, /sk-ant-test/);
});

const META_REFUSAL = { status: 401, body: { error: { message: "Invalid OAuth access token.", code: 190 } } };

test("when Meta refuses the reply, the team is emailed Meta's error, nothing is recorded as sent, and the chat stays with the team", async (t) => {
  const fn = await start(t, { gateway: [aiText("Happy to help.")], meta: [META_REFUSAL] });
  await fn.post(inbound({ from: PARENT, text: "Do you teach on Saturdays?" }));
  assert.deepEqual(fn.world.sent, []);
  const saved = fn.world.conversation(PARENT);
  assert.equal(saved.escalated, true);
  assert.equal(saved.messages.filter((m) => m.role === "model").length, 0);
  assert.equal(fn.world.emails.length, 1);
  assert.match(fn.world.emails[0].subject, /Meta refused/i);
  assert.match(fn.world.emails[0].html, /Invalid OAuth access token/);
  assert.match(fn.world.emails[0].html, /WHATSAPP_ACCESS_TOKEN/);
});

test("a network failure sending the reply is reported the same way", async (t) => {
  const fn = await start(t, { gateway: [aiText("Happy to help.")], meta: [{ throws: new Error("fetch failed") }] });
  await fn.post(inbound({ from: PARENT, text: "Do you teach on Saturdays?" }));
  assert.equal(fn.world.emails.length, 1);
  assert.match(fn.world.emails[0].html, /fetch failed/);
});

for (const [name, message] of [
  ["request to type", () => inbound({ from: PARENT, type: "audio", audio: { id: "m1", voice: true } })],
  ["stop confirmation", () => inbound({ from: PARENT, text: "Stop" })],
]) {
  test(`a refused ${name} is reported to the team too`, async (t) => {
    const fn = await start(t, { meta: [META_REFUSAL] });
    await fn.post(message());
    assert.deepEqual(fn.world.sent, []);
    assert.equal(fn.world.emails.length, 1);
    assert.match(fn.world.emails[0].subject, /Meta refused/i);
  });
}

test("an unexpected crash emails the team what it knows, and sends nothing", async (t) => {
  const fn = await start(t, { gateway: [aiText("NEVER SENT")] });
  await fn.deliver(inbound({ from: PARENT, name: "Amina", text: "Do you teach on Saturdays?" }));
  // Lana is waiting for follow-ups; her next write is taking the chat. Make that write blow up.
  fn.world.beforeNextUpdate = () => { throw new Error("database exploded"); };
  await fn.settle();
  assert.deepEqual(fn.world.sent, []);
  assert.equal(fn.world.emails.length, 1);
  assert.match(fn.world.emails[0].subject, /unexpected error/i);
  for (const word of [/database exploded/, /Do you teach on Saturdays/, /Amina/, new RegExp(PARENT)]) {
    assert.match(fn.world.emails[0].html, word);
  }
});

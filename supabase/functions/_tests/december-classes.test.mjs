// Run with `npm run test:edge`. Lana's side of the December holiday classes (HANDOFF-DECEMBER.md, 2.6 d): the
// website chat button's "December holiday classes" starter, the reply every reservation message gets without the AI,
// the note that teaches the AI about the classes while they run, and the tutor sign-up list. Written before the code.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { aiText, inbound, loadFunction, loadModule } from "./harness.mjs";

const lana = await loadModule("whatsapp-webhook/lana.ts");
const button = await readFile(new URL("../../../src/components/WhatsAppChatButton.tsx", import.meta.url), "utf8");
const signup = await readFile(new URL("../../../src/pages/TutorSignup.tsx", import.meta.url), "utf8");

const PARENT = "254700000001";
const STARTER = "Hi Lana Tutors! I'd like to reserve a seat in the December holiday classes.";

// Neither the price nor the dates are settled, and public pages show no prices, so Lana says neither.
const PRICE = /\b(?:kes|ksh|kshs|shillings?)\b|\$|\d[\d,]{3,}/i;
const DATES = /\bDecember\s+\d|\b\d{1,2}(?:st|nd|rd|th)?\s*(?:to|-|–)\s*\d{1,2}(?:st|nd|rd|th)?\s+(?:December|November)|\b(?:November|January)\b|\b20\d\d\b/i;

const replyTo = (text) => {
  const reply = lana.matchPrefill(text)?.reply;
  assert.ok(reply, `Lana has a ready-made reply to: ${text}`);
  return reply;
};

test("the December starter is recognised, so the AI is not asked", () => {
  const matched = lana.matchPrefill(STARTER);
  assert.equal(matched?.intent, "december_classes");
  assert.ok(matched.reply.length > 0);
});

test("the starter is recognised however a phone keyboard changes it", () => {
  assert.equal(lana.matchPrefill("hi lana tutors! i’d like to reserve a seat in the december holiday classes")?.intent, "december_classes");
  assert.equal(lana.matchPrefill("  Hi Lana Tutors!!  I'd like to reserve a seat in the December holiday classes.  ")?.intent, "december_classes");
});

test("someone who adds their own details gets the AI, not the ready-made reply", () => {
  assert.equal(lana.matchPrefill(`${STARTER} My son Amani is in Form 3 and also needs help with physics, can he join?`), null);
});

test("the reply asks for the child's name and grade and for the subjects", () => {
  const reply = replyTo(STARTER);
  assert.match(reply, /name/i);
  assert.match(reply, /grade/i);
  assert.match(reply, /subjects/i);
});

test("the reply says reserving is free, nothing is paid until a class is confirmed, and a class needs at least 6", () => {
  const reply = replyTo(STARTER);
  assert.match(reply, /free/i);
  assert.match(reply, /nothing is paid/i);
  assert.match(reply, /at least 6\b/);
});

test("the reply names the two groups and the three subjects", () => {
  const reply = replyTo(STARTER);
  for (const word of ["Form 3", "Grade 8", "Mathematics", "Science", "English"]) assert.ok(reply.includes(word), word);
});

test("the reply quotes no price and no date", () => {
  const reply = replyTo(STARTER);
  assert.doesNotMatch(reply, PRICE);
  assert.doesNotMatch(reply, DATES);
});

test("the reply is plain text with no emoji, as Lana writes", () => {
  assert.doesNotMatch(replyTo(STARTER), /\p{Extended_Pictographic}/u);
});

test("the chat button offers the starter, and takes it down on the day Lana stops mentioning the classes", () => {
  assert.ok(button.includes(`message: "${STARTER}"`), "the button prefills the starter message");
  assert.match(lana.DECEMBER_CLASSES_UNTIL, /^\d{4}-\d{2}-\d{2}$/, "the day the classes stop being mentioned");
  const until = button.match(/until:\s*"(\d{4}-\d{2}-\d{2})"/)?.[1];
  assert.equal(until, lana.DECEMBER_CLASSES_UNTIL);
});

test("the AI is told about the classes until the day after they end, and not before or after the window", () => {
  assert.notEqual(lana.seasonalNotes(new Date("2026-11-01T00:00:00Z")), "");
  assert.notEqual(lana.seasonalNotes(new Date("2026-12-18T23:59:59Z")), "");
  assert.equal(lana.seasonalNotes(new Date("2026-12-19T00:00:00Z")), "");
  assert.equal(lana.seasonalNotes(new Date("2027-02-01T00:00:00Z")), "");
});

test("the note tells the AI how to take a reservation and what never to say", () => {
  const note = lana.seasonalNotes(new Date("2026-11-20T00:00:00Z"));
  assert.match(note, /DECEMBER HOLIDAY CLASSES/);
  for (const word of ["Form 3", "Grade 8", "Mathematics", "English"]) assert.ok(note.includes(word), word);
  assert.match(note, /at least 6\b/);
  assert.match(note, /escalate_to_team/);
  assert.match(note, /never quote a price/i);
  assert.match(note, /dates/i, "it says the team confirms the dates");
  assert.doesNotMatch(note, PRICE);
  assert.doesNotMatch(note, DATES);
  assert.doesNotMatch(note, /https?:\/\//, "no link: the page may not be live when the function is");
});

test("a free-text question about the classes reaches the AI with the note in its prompt, while the classes run", async (t) => {
  const fn = await loadFunction("whatsapp-webhook", { gateway: [aiText("We are opening small online classes this December.")] });
  t.after(() => fn.dispose());

  await fn.post(inbound({ from: PARENT, text: "Hello, do you have holiday classes for my son in Form 3?" }));

  assert.equal(fn.world.gatewayCalls.length, 1);
  const prompt = fn.world.gatewayCalls[0].body.messages[0].content;
  assert.match(lana.DECEMBER_CLASSES_UNTIL, /^\d{4}-\d{2}-\d{2}$/);
  const running = Date.now() < Date.parse(lana.DECEMBER_CLASSES_UNTIL);
  assert.equal(prompt.includes("DECEMBER HOLIDAY CLASSES"), running, "the prompt carries the note exactly while the window is open");
});

test("tutors can offer German for IGCSE when they sign up, next to French and Spanish", () => {
  const list = signup.match(/const IGCSE_SUBJECTS = \[([\s\S]*?)\];/)?.[1] ?? "";
  const subjects = [...list.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  for (const subject of ["French", "Spanish", "German"]) assert.ok(subjects.includes(subject), `${subject} is offered`);
});

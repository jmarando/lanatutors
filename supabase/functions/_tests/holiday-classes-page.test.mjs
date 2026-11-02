// Run with `npm run test:edge`. The pure rules behind the December classes page (src/utils/holidayClasses.ts): which
// program to show, how dates and time slots read, how classes are grouped, and the messages the page's buttons send,
// which Lana must answer without the AI (whatsapp-webhook/lana.ts). Written before the code.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { loadModule } from "./harness.mjs";

const h = await loadModule("../../src/utils/holidayClasses.ts");
const w = await loadModule("../../src/utils/whatsapp.ts");
const lana = await loadModule("whatsapp-webhook/lana.ts");

const program = (id, start, end) => ({ id, name: id, description: null, start_date: start, end_date: end });
const LAST_YEAR = program("p25", "2025-12-08", "2025-12-19");
const THIS_YEAR = program("p26", "2026-12-07", "2026-12-18");

const klass = (id, subject, curriculum, grade, slot) => ({
  id,
  subject,
  curriculum,
  grade_levels: [grade],
  time_slot: slot,
  max_students: 12,
});
const CLASSES = [
  klass("g8-eng", "English", "CBC", "Grade 8", "11:00 AM - 12:15 PM"),
  klass("f3-maths", "Mathematics", "8-4-4", "Form 3", "8:00 AM - 9:15 AM"),
  klass("f3-chem", "Chemistry", "8-4-4", "Form 3", "9:30 AM - 10:45 AM"),
  klass("g8-maths", "Mathematics", "CBC", "Grade 8", "8:00 - 9:15 AM"),
];

test("last December's program stays active in the database but is never shown", () => {
  assert.equal(h.pickProgram([LAST_YEAR, THIS_YEAR], "2026-11-01")?.id, "p26");
  assert.equal(h.pickProgram([LAST_YEAR], "2026-11-01"), null);
});

test("a program is shown through its last day and not after", () => {
  assert.equal(h.pickProgram([THIS_YEAR], "2026-12-18")?.id, "p26");
  assert.equal(h.pickProgram([THIS_YEAR], "2026-12-19"), null);
});

test("of two programs still to come, the one that starts first is shown", () => {
  const later = program("p27", "2027-04-05", "2027-04-16");
  assert.equal(h.pickProgram([later, THIS_YEAR], "2026-11-01")?.id, "p26");
});

test("with no programs there is nothing to show", () => {
  assert.equal(h.pickProgram([], "2026-11-01"), null);
});

test("dates read as weekdays and days, with the month and year said once", () => {
  assert.equal(h.formatProgramRange("2026-12-07", "2026-12-18"), "Monday 7 to Friday 18 December 2026");
  assert.equal(h.formatProgramRange("2026-11-30", "2026-12-11"), "Monday 30 November to Friday 11 December 2026");
  assert.equal(h.formatProgramRange("2026-12-28", "2027-01-08"), "Monday 28 December 2026 to Friday 8 January 2027");
  assert.equal(h.formatProgramRange("2026-12-07", "2026-12-07"), "Monday 7 December 2026");
  assert.equal(h.formatProgramRange("2026-12-07T00:00:00+00:00", "2026-12-18"), "Monday 7 to Friday 18 December 2026");
});

test("dates that cannot be read give no text, so the page leaves the line out", () => {
  assert.equal(h.formatProgramRange("soon", "2026-12-18"), "");
  assert.equal(h.formatProgramRange(undefined, "2026-12-18"), "");
  assert.equal(h.formatProgramRange("2026-12-18", "2026-12-07"), "");
  assert.equal(h.formatProgramRange("2026-02-30", "2026-03-05"), "", "a day that does not exist");
});

test("a time slot reads the same in both label styles, with AM or PM said once when it is shared", () => {
  assert.equal(h.formatSlot("8:00 AM - 9:15 AM"), "8:00 – 9:15 AM");
  assert.equal(h.formatSlot("8:00 - 9:15 AM"), "8:00 – 9:15 AM");
  assert.equal(h.formatSlot("9:30 AM - 10:45 AM"), "9:30 – 10:45 AM");
  assert.equal(h.formatSlot("11:00 AM - 12:15 PM"), "11:00 AM – 12:15 PM");
  assert.equal(h.formatSlot("11:00 - 12:15 PM"), "11:00 AM – 12:15 PM");
});

test("a time slot that cannot be read is shown as it was stored", () => {
  assert.equal(h.formatSlot("Mornings"), "Mornings");
  assert.equal(h.formatSlot("  Mornings  "), "Mornings");
});

test("classes are grouped by grade with the KCSE group first, and run in time order inside a group", () => {
  const groups = h.groupByGrade(CLASSES);
  assert.deepEqual(groups.map((group) => group.grade), ["Form 3", "Grade 8"]);
  assert.deepEqual(groups[0].classes.map((c) => c.id), ["f3-maths", "f3-chem"]);
  assert.deepEqual(groups[1].classes.map((c) => c.id), ["g8-maths", "g8-eng"]);
});

test("each group says which exam its students are heading for", () => {
  const groups = h.groupByGrade(CLASSES);
  assert.equal(groups[0].exam, "KCSE 2027");
  assert.equal(groups[1].exam, "KJSEA 2027");
});

test("a grade the page has no name for still gets a group, after the known ones", () => {
  const groups = h.groupByGrade([...CLASSES, klass("f4", "Physics", "8-4-4", "Form 4", "8:00 AM - 9:15 AM")]);
  assert.deepEqual(groups.map((group) => group.grade), ["Form 3", "Grade 8", "Form 4"]);
  assert.equal(groups[2].exam, null);
});

test("a class for two grades is grouped under both names", () => {
  const both = { ...klass("x", "Mathematics", "8-4-4", "Form 3", "8:00 AM - 9:15 AM"), grade_levels: ["Form 3", "Form 4"] };
  assert.equal(h.groupByGrade([both])[0].grade, "Form 3 and Form 4");
});

test("no classes, no groups", () => {
  assert.deepEqual(h.groupByGrade([]), []);
});

test("the page's plain button sends exactly the chat button's starter, and Lana answers it without the AI", () => {
  assert.equal(h.reserveMessage(), "Hi Lana Tutors! I'd like to reserve a seat in the December holiday classes.");
  assert.equal(lana.matchPrefill(h.reserveMessage())?.intent, "december_classes");
});

test("each class's button names the class, and Lana answers its message without the AI", () => {
  for (const c of CLASSES) {
    const message = h.reserveMessage({ grade: c.grade_levels.join(" and "), subject: c.subject });
    assert.ok(message.includes(`${c.grade_levels[0]} ${c.subject}`), `it names the class: ${message}`);
    assert.equal(lana.matchPrefill(message)?.intent, "december_classes", message);
  }
});

test("a class with an unusual name still gets the ready-made reply", () => {
  const message = h.reserveMessage({ grade: "Form 3", subject: "Art & Design" });
  assert.equal(lana.matchPrefill(message)?.intent, "december_classes", message);
});

test("the number of reservations a class needs is the one Lana's reply and note state", () => {
  assert.equal(h.MIN_STUDENTS_TO_OPEN, 6);
  const needs = new RegExp(`at least ${h.MIN_STUDENTS_TO_OPEN}\\b`);
  assert.match(lana.matchPrefill(h.reserveMessage()).reply, needs);
  assert.match(lana.seasonalNotes(new Date("2026-11-20T00:00:00Z")), needs);
});

test("the WhatsApp link carries the message, encoded, to the business number", () => {
  assert.equal(
    w.whatsappLink("Hi Lana Tutors! I'd like a seat."),
    "https://wa.me/254117512316?text=Hi%20Lana%20Tutors!%20I'd%20like%20a%20seat.",
  );
});

test("the business number is the one the chat button uses", async () => {
  const button = await readFile(new URL("../../../src/components/WhatsAppChatButton.tsx", import.meta.url), "utf8");
  assert.match(w.WHATSAPP_NUMBER, /^\d{12}$/);
  assert.ok(button.includes(`PHONE_NUMBER = "${w.WHATSAPP_NUMBER}"`), "the chat button has the same number");
});

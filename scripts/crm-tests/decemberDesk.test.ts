import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DECEMBER_CODES,
  DECEMBER_DESK_UNTIL,
  buildLinksMessage,
  buildNotRunningMessage,
  buildPaymentMessage,
  buildSeatNote,
  childCodes,
  classCode,
  classState,
  isDeskActive,
  listsDisagree,
  longDay,
  parseDecemberNote,
  readLists,
  shortDay,
  tallyNotes,
  holderStage,
  waMessageLink,
  type DeskNote,
  type Holding,
} from "../../src/utils/decemberDesk";
import fixture from "./fixtures/december-notes.json";
import { PAYBILL } from "../../src/utils/paybill";

type Fixture = {
  notes: (DeskNote & { kind: string })[];
  expected: { code: string; seats: number; families: number }[];
};
const { notes: allNotes, expected } = fixture as unknown as Fixture;
// The desk reads timeline notes only, as the SQL counter does (kind = 'note').
const notes = allNotes.filter((n) => n.kind === "note");

describe("parseDecemberNote", () => {
  it("reads the codes and the child's name", () => {
    assert.deepEqual(parseDecemberNote("DEC26 F3-MATHS F3-ENG - Amani"), {
      kind: "reserve",
      codes: ["F3-MATHS", "F3-ENG"],
      child: "Amani",
    });
  });
  it("keeps a hyphen inside the name", () => {
    assert.deepEqual(parseDecemberNote("DEC26 F3-MATHS - Jean-Paul"), {
      kind: "reserve",
      codes: ["F3-MATHS"],
      child: "Jean-Paul",
    });
  });
  it("ignores leading spaces and letter case", () => {
    assert.deepEqual(parseDecemberNote("  dec26 f3-maths - Wanjiru"), {
      kind: "reserve",
      codes: ["F3-MATHS"],
      child: "Wanjiru",
    });
  });
  it("reads a cancel, with or without a name", () => {
    assert.deepEqual(parseDecemberNote("DEC26 CANCEL F3-ENG - Amani"), { kind: "cancel", codes: ["F3-ENG"], child: "Amani" });
    assert.deepEqual(parseDecemberNote("DEC26 CANCEL G8-SCI"), { kind: "cancel", codes: ["G8-SCI"], child: "" });
  });
  it("takes text after the last code as the name even without a dash", () => {
    assert.equal((parseDecemberNote("DEC26 G8-ENG Zawadi") as { child: string }).child, "Zawadi");
  });
  it("counts a code once however often it is repeated", () => {
    assert.deepEqual((parseDecemberNote("DEC26 F3-MATHS F3-MATHS - Kip") as { codes: string[] }).codes, ["F3-MATHS"]);
  });
  it("is not a December note unless it starts with the word DEC26", () => {
    for (const body of ["DEC26X F3-CHEM", "Remember to ask about DEC26 F3-CHEM", "", null, undefined]) {
      assert.equal(parseDecemberNote(body), null, String(body));
    }
  });
  it("calls a December note with no class code unreadable", () => {
    assert.deepEqual(parseDecemberNote("DEC26 hello"), { kind: "unreadable", text: "DEC26 hello" });
    assert.deepEqual(parseDecemberNote("DEC26 CANCEL"), { kind: "unreadable", text: "DEC26 CANCEL" });
  });
});

describe("tallyNotes", () => {
  it("gives the totals the SQL counter gives for the same notes", () => {
    const got = tallyNotes(notes).map((row) => ({ code: row.code, seats: row.seats, families: row.families }));
    assert.deepEqual(got, expected);
  });
  it("lists the six classes in code order even with no notes", () => {
    assert.deepEqual(tallyNotes([]).map((row) => row.code), [...DECEMBER_CODES]);
    assert.ok(tallyNotes([]).every((row) => row.seats === 0 && row.families === 0));
  });
});

describe("readLists", () => {
  const lists = readLists(notes);
  const holders = (code: string) => lists.held.filter((h) => h.code === code).map((h) => h.child || "(no name)");

  it("lists who holds each seat, applying cancels in the order the notes were written", () => {
    assert.deepEqual(holders("F3-MATHS"), ["Amani", "Wanjiru", "Kip"]);
    assert.deepEqual(holders("F3-CHEM"), ["(no name)"]);
    assert.deepEqual(holders("F3-ENG"), []);
    assert.deepEqual(holders("G8-MATHS"), ["Baraka"]);
    assert.deepEqual(holders("G8-ENG"), ["Zawadi", "Zawadi"]);
  });
  it("marks a child reserved twice for the same class", () => {
    assert.equal(lists.duplicates.length, 2);
    assert.ok(lists.duplicates.every((d) => d.code === "G8-ENG" && d.child === "Zawadi"));
  });
  it("lists December notes it could not read, and cancels that match no seat", () => {
    assert.deepEqual(lists.unreadable.map((u) => u.text), ["DEC26 hello"]);
    assert.deepEqual(lists.unmatchedCancels.map((u) => u.code), ["G8-ENG"]);
  });
  it("names the classes whose list does not add up to the total", () => {
    assert.deepEqual(listsDisagree(tallyNotes(notes), lists), ["G8-ENG"]);
  });
  it("takes a seat back from the most recent holder when the cancel names no child", () => {
    const own = readLists([
      { id: "1", family_id: "f", body: "DEC26 F3-ENG - Amani", occurred_at: "2026-11-09T07:00:00+00:00" },
      { id: "2", family_id: "f", body: "DEC26 F3-ENG - Baraka", occurred_at: "2026-11-09T07:01:00+00:00" },
      { id: "3", family_id: "f", body: "DEC26 CANCEL F3-ENG", occurred_at: "2026-11-09T07:02:00+00:00" },
    ]);
    assert.deepEqual(own.held.map((h) => h.child), ["Amani"]);
  });
});

describe("classState", () => {
  it("needs more until 6 seats, then is ready to open", () => {
    assert.deepEqual(classState("active", 0), { state: "needs", needed: 6 });
    assert.deepEqual(classState("active", 5), { state: "needs", needed: 1 });
    assert.deepEqual(classState("active", 6), { state: "ready", needed: 0 });
    assert.deepEqual(classState("active", 9), { state: "ready", needed: 0 });
  });
  it("is running when confirmed and archived when archived, whatever the seats", () => {
    assert.equal(classState("confirmed", 2).state, "running");
    assert.equal(classState("archived", 8).state, "archived");
  });
  it("never counts a negative seat total", () => {
    assert.deepEqual(classState("active", -1), { state: "needs", needed: 6 });
  });
});

describe("classCode", () => {
  const row = (subject: string, grade: string) => ({ subject, grade_levels: [grade] });
  it("maps the six seeded classes to their codes", () => {
    assert.equal(classCode(row("Mathematics", "Form 3")), "F3-MATHS");
    assert.equal(classCode(row("Chemistry", "Form 3")), "F3-CHEM");
    assert.equal(classCode(row("English", "Form 3")), "F3-ENG");
    assert.equal(classCode(row("Mathematics", "Grade 8")), "G8-MATHS");
    assert.equal(classCode(row("Integrated Science", "Grade 8")), "G8-SCI");
    assert.equal(classCode(row("English", "Grade 8")), "G8-ENG");
  });
  it("gives no code to any other class", () => {
    assert.equal(classCode(row("Physics", "Form 3")), null);
    assert.equal(classCode(row("English", "Form 4")), null);
  });
});

describe("buildSeatNote", () => {
  it("writes the exact note format, codes in class order", () => {
    assert.equal(buildSeatNote({ codes: ["F3-ENG", "F3-MATHS"], child: "  Amani  " }), "DEC26 F3-MATHS F3-ENG - Amani");
    assert.equal(buildSeatNote({ codes: ["F3-ENG"], child: "Amani", cancel: true }), "DEC26 CANCEL F3-ENG - Amani");
  });
  it("refuses a note with no child or no class", () => {
    assert.equal(buildSeatNote({ codes: [], child: "Amani" }), null);
    assert.equal(buildSeatNote({ codes: ["F3-ENG"], child: "   " }), null);
  });
  it("is read back by the parser as it was written", () => {
    const note = buildSeatNote({ codes: ["G8-SCI", "G8-MATHS"], child: "Jean-Paul" }) as string;
    assert.deepEqual(parseDecemberNote(note), { kind: "reserve", codes: ["G8-MATHS", "G8-SCI"], child: "Jean-Paul" });
  });
});

describe("dates", () => {
  it("shows the desk through 18 December and not from 19 December", () => {
    assert.equal(DECEMBER_DESK_UNTIL, "2026-12-19");
    assert.equal(isDeskActive("2026-12-18"), true);
    assert.equal(isDeskActive("2026-12-19"), false);
  });
  it("writes days short and long", () => {
    assert.equal(shortDay("2026-11-27"), "Fri 27 Nov");
    assert.equal(longDay("2026-12-04"), "Friday 4 December");
    assert.equal(longDay("2026-12-07"), "Monday 7 December");
  });
});

describe("messages", () => {
  const classes = [
    { grade: "Form 3", subject: "Mathematics", slot: "8:00 AM - 9:15 AM", tutorFirstName: "Jane", meetingLink: "https://meet.example/maths" },
    { grade: "Form 3", subject: "English", slot: "11:00 AM - 12:15 PM", tutorFirstName: null, meetingLink: null },
  ];

  it("asks for payment: the classes, the amount, the day to pay by and the paybill details", () => {
    const text = buildPaymentMessage({ parentName: "Mrs Test", childName: "Amani", classes, startDate: "2026-12-07", amount: 8000, payBy: "2026-12-04" });
    assert.match(text, /Good news, Mrs Test: Amani's classes are running from Monday 7 December/);
    assert.match(text, /- Form 3 Mathematics, 8:00 – 9:15 AM, with Jane/);
    assert.match(text, /- Form 3 English, 11:00 AM – 12:15 PM\n/); // no tutor yet, so no "with"
    assert.match(text, /please pay KES 8,000 by Friday 4 December/);
    assert.ok(text.includes(PAYBILL.number) && text.includes(PAYBILL.account) && text.includes(PAYBILL.recipient));
    assert.match(text, /class links once payment is confirmed/);
  });
  it("speaks of one class and one seat in the singular", () => {
    const text = buildPaymentMessage({ parentName: "Mrs Test", childName: "Amani", classes: [classes[0]], startDate: "2026-12-07", amount: 4000, payBy: "2026-12-04" });
    assert.match(text, /Amani's class is running/);
    assert.match(text, /keep Amani's seat/);
    assert.match(text, /the class link once/);
  });
  it("sends the class links only for classes that have one, and nothing when none has", () => {
    const text = buildLinksMessage({ parentName: "Mrs Test", childName: "Amani", classes }) as string;
    assert.match(text, /Form 3 Mathematics, 8:00 – 9:15 AM: https:\/\/meet\.example\/maths/);
    assert.doesNotMatch(text, /English/);
    assert.equal(buildLinksMessage({ parentName: "Mrs Test", childName: "Amani", classes: [classes[1]] }), null);
  });
  it("tells a family a class is not running, that nothing was charged, and offers the assessment call", () => {
    const text = buildNotRunningMessage({ parentName: "Mrs Test", childName: "Amani", className: "Form 3 Chemistry" });
    assert.match(text, /Form 3 Chemistry did not reach the 6 students it needs/);
    assert.match(text, /nothing has been charged/);
    assert.match(text, /book-consultation/);
  });
  it("opens WhatsApp with the text in the link, and gives no link without a number", () => {
    assert.equal(waMessageLink("254712345678", "Hi there & you"), "https://wa.me/254712345678?text=Hi%20there%20%26%20you");
    assert.equal(waMessageLink(null, "x"), null);
    assert.equal(waMessageLink("", "x"), null);
  });
});

describe("holderStage", () => {
  const holding: Holding = { familyId: "fam-1", child: "Amani", code: "F3-MATHS" };
  const family = { parent_profile_id: "login-1" };
  const children = [{ id: "kid-1", full_name: "amani" }];
  const enrolment = (extra = {}) => ({
    id: "e1", student_id: "login-1", student_profile_id: "kid-1", enrolled_class_ids: ["class-maths"],
    payment_status: "pending", total_amount: 4000, ...extra,
  });
  const stage = (over: Record<string, unknown> = {}) =>
    holderStage({ holding, classId: "class-maths", family, enrolments: [enrolment()], children, ...over } as Parameters<typeof holderStage>[0]);

  it("is enrolled while the enrolment is unpaid or part paid, whatever the letter case of the name", () => {
    assert.equal(stage().stage, "enrolled");
    assert.equal(stage({ enrolments: [enrolment({ payment_status: "deposit_paid" })] }).stage, "enrolled");
  });
  it("is paid once the enrolment is completed", () => {
    const found = stage({ enrolments: [enrolment({ payment_status: "completed" })] });
    assert.equal(found.stage, "paid");
    assert.equal(found.enrolment?.id, "e1");
  });
  it("stays reserved when the child is not enrolled in that class, or the family has no login, or the note names no child", () => {
    assert.equal(stage({ classId: "class-english" }).stage, "reserved");
    assert.equal(stage({ family: { parent_profile_id: null } }).stage, "reserved");
    assert.equal(stage({ family: undefined }).stage, "reserved");
    assert.equal(stage({ holding: { ...holding, child: "" } }).stage, "reserved");
    assert.equal(stage({ enrolments: [enrolment({ student_id: "someone-else" })] }).stage, "reserved");
  });
});

describe("childCodes", () => {
  const A = "a0000000-0000-4000-8000-00000000000a";
  const lists = readLists(notes);
  it("lists the classes one child holds, in class order, whatever the letter case", () => {
    assert.deepEqual(childCodes(lists, A, "amani"), ["F3-MATHS"]); // F3-ENG was cancelled
    assert.deepEqual(childCodes(lists, A, "Baraka"), ["G8-MATHS"]);
  });
  it("finds a child the note gave no name, and nobody else's", () => {
    const B = "b0000000-0000-4000-8000-00000000000b";
    assert.deepEqual(childCodes(lists, B, ""), ["F3-CHEM", "G8-SCI"]);
    assert.deepEqual(childCodes(lists, A, "Nobody"), []);
  });
});

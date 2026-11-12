import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DECEMBER_CODES,
  DECEMBER_DESK_UNTIL,
  buildSeatNote,
  classCode,
  classState,
  isDeskActive,
  listsDisagree,
  longDay,
  parseDecemberNote,
  readLists,
  shortDay,
  tallyNotes,
  type DeskNote,
} from "../../src/utils/decemberDesk";
import fixture from "./fixtures/december-notes.json";

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

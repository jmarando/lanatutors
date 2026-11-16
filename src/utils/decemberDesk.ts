// The rules behind the December desk (src/pages/admin/CrmDecember.tsx), kept free of React and of the database client so
// they can be tested on their own (scripts/crm-tests/decemberDesk.test.ts).
//
// The team records a reservation as a timeline note, `DEC26 F3-MATHS F3-ENG - Amani`, and takes a seat back with
// `DEC26 CANCEL F3-ENG - Amani`. The seat totals here follow the SQL counter the team used before the desk existed
// (scripts/crm-verify/december-count.sql) rule for rule, and scripts/crm-tests/fixtures/december-notes.json is checked
// against both.

import { MIN_STUDENTS_TO_OPEN, formatSlot } from "./holidayClasses";
import { PAYBILL } from "./paybill";

export const DECEMBER_CODES = ["F3-MATHS", "F3-CHEM", "F3-ENG", "G8-MATHS", "G8-SCI", "G8-ENG"] as const;
export type DecemberCode = (typeof DECEMBER_CODES)[number];

export const CODE_INFO: Record<DecemberCode, { grade: string; subject: string }> = {
  "F3-MATHS": { grade: "Form 3", subject: "Mathematics" },
  "F3-CHEM": { grade: "Form 3", subject: "Chemistry" },
  "F3-ENG": { grade: "Form 3", subject: "English" },
  "G8-MATHS": { grade: "Grade 8", subject: "Mathematics" },
  "G8-SCI": { grade: "Grade 8", subject: "Integrated Science" },
  "G8-ENG": { grade: "Grade 8", subject: "English" },
};

// The day (exclusive) the desk and its menu entry stop showing. The chat button and Lana's December reply stop on the same
// day; supabase/functions/_tests/december-classes.test.mjs keeps the three equal.
export const DECEMBER_DESK_UNTIL = "2026-12-19";
export const RESERVATIONS_CLOSE = "2026-11-27";
export const PAY_BY = "2026-12-04";
// What the Enrol dialog starts from; the team can change it for a family.
export const DEFAULT_FEE_PER_SUBJECT = 4000;

/** `today` is a YYYY-MM-DD day in Nairobi. */
export const isDeskActive = (today: string): boolean => today < DECEMBER_DESK_UNTIL;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function dayParts(day: string): { weekday: string; date: number; month: string } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(day);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return { weekday: WEEKDAYS[date.getUTCDay()], date: date.getUTCDate(), month: MONTH_NAMES[date.getUTCMonth()] };
}

/** "Fri 27 Nov" from "2026-11-27". */
export function shortDay(day: string): string {
  const p = dayParts(day);
  return p ? `${p.weekday.slice(0, 3)} ${p.date} ${p.month.slice(0, 3)}` : day;
}

/** "Friday 4 December" from "2026-12-04". */
export function longDay(day: string): string {
  const p = dayParts(day);
  return p ? `${p.weekday} ${p.date} ${p.month}` : day;
}

// A code is a whole word, as in the SQL counter's \m ... \M. (JavaScript has no \m, and a look-behind would not run on
// older phones, so the character before the code is matched instead of looked at.)
const WORD = "A-Za-z0-9_";
const codePattern = (code: string, flags = "i"): RegExp => new RegExp(`(^|[^${WORD}])(${code})(?![${WORD}])`, flags);

const IS_DEC26 = /^\s*DEC26\b/i; // SQL: ^\s*DEC26\M
const IS_CANCEL = /DEC26\s+CANCEL/i; // SQL: DEC26\s+CANCEL, anywhere in the body

export type ParsedNote =
  | { kind: "reserve"; codes: DecemberCode[]; child: string }
  | { kind: "cancel"; codes: DecemberCode[]; child: string }
  | { kind: "unreadable"; text: string };

// Where the last class code in the body ends, or -1.
function lastCodeEnd(body: string): number {
  let end = -1;
  for (const code of DECEMBER_CODES) {
    for (const match of body.matchAll(codePattern(code, "gi"))) {
      end = Math.max(end, (match.index ?? 0) + match[1].length + match[2].length);
    }
  }
  return end;
}

/**
 * Reads one timeline note. null when it is not a December note (it must start with the word DEC26). A December note with no
 * class code is "unreadable". The child's name is what follows the last class code, after one hyphen or dash, trimmed.
 */
export function parseDecemberNote(body: string | null | undefined): ParsedNote | null {
  if (!body || !IS_DEC26.test(body)) return null;
  const codes = DECEMBER_CODES.filter((code) => codePattern(code).test(body));
  if (codes.length === 0) return { kind: "unreadable", text: body.trim() };
  const child = body
    .slice(lastCodeEnd(body))
    .replace(/^[\s\-–—:,]+/, "")
    .replace(/\s+/g, " ")
    .trim();
  return { kind: IS_CANCEL.test(body) ? "cancel" : "reserve", codes, child };
}

export type DeskNote = { id: string; family_id: string; body: string | null; occurred_at: string; created_at?: string | null };

export type CodeTally = { code: DecemberCode; reserved: number; takenBack: number; seats: number; families: number };

/**
 * Seats per class by the SQL counter's rule: notes containing the code that are not cancel notes, minus cancel notes
 * containing it, a code counting once per note. `families` is the distinct families with a non-cancel note for the code.
 * Pass timeline notes only (kind = 'note').
 */
export function tallyNotes(notes: DeskNote[]): CodeTally[] {
  const rows = DECEMBER_CODES.map((code) => ({ code, reserved: 0, takenBack: 0, families: new Set<string>() }));
  for (const note of notes) {
    const parsed = parseDecemberNote(note.body);
    if (!parsed || parsed.kind === "unreadable") continue;
    for (const code of parsed.codes) {
      const row = rows.find((r) => r.code === code);
      if (!row) continue;
      if (parsed.kind === "cancel") {
        row.takenBack += 1;
      } else {
        row.reserved += 1;
        row.families.add(note.family_id);
      }
    }
  }
  return rows.map((r) => ({ code: r.code, reserved: r.reserved, takenBack: r.takenBack, seats: r.reserved - r.takenBack, families: r.families.size }));
}

export type Holding = { familyId: string; child: string; code: DecemberCode };

export type DeskLists = {
  held: Holding[];
  unreadable: { familyId: string; text: string }[];
  unmatchedCancels: { familyId: string; code: DecemberCode }[];
  duplicates: Holding[];
};

const sameChild = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Who holds each seat. Best effort: notes are applied in the order written (occurred_at, then created_at, then id); a
 * reservation adds a holding; a cancel removes it from the named child, or from the family's most recent holder of the code
 * when no child is named. The totals come from tallyNotes, not from here.
 */
export function readLists(notes: DeskNote[]): DeskLists {
  const sorted = [...notes].sort(
    (a, b) =>
      a.occurred_at.localeCompare(b.occurred_at) ||
      (a.created_at ?? "").localeCompare(b.created_at ?? "") ||
      a.id.localeCompare(b.id),
  );
  const held: Holding[] = [];
  const unreadable: DeskLists["unreadable"] = [];
  const unmatchedCancels: DeskLists["unmatchedCancels"] = [];

  for (const note of sorted) {
    const parsed = parseDecemberNote(note.body);
    if (!parsed) continue;
    if (parsed.kind === "unreadable") {
      unreadable.push({ familyId: note.family_id, text: parsed.text });
      continue;
    }
    for (const code of parsed.codes) {
      if (parsed.kind === "reserve") {
        held.push({ familyId: note.family_id, child: parsed.child, code });
        continue;
      }
      let index = -1;
      for (let i = held.length - 1; i >= 0; i--) {
        const h = held[i];
        if (h.familyId === note.family_id && h.code === code && (!parsed.child || sameChild(h.child, parsed.child))) {
          index = i;
          break;
        }
      }
      if (index === -1) unmatchedCancels.push({ familyId: note.family_id, code });
      else held.splice(index, 1);
    }
  }

  const key = (h: Holding): string => `${h.familyId}|${h.child.trim().toLowerCase()}|${h.code}`;
  const counts = new Map<string, number>();
  for (const h of held) counts.set(key(h), (counts.get(key(h)) ?? 0) + 1);
  return { held, unreadable, unmatchedCancels, duplicates: held.filter((h) => (counts.get(key(h)) ?? 0) > 1) };
}

/** The classes whose family list does not add up to the total (or that have a cancel matching no seat): "check the notes". */
export function listsDisagree(tally: CodeTally[], lists: DeskLists): DecemberCode[] {
  return tally
    .filter(
      (row) =>
        lists.held.filter((h) => h.code === row.code).length !== Math.max(row.seats, 0) ||
        lists.unmatchedCancels.some((u) => u.code === row.code),
    )
    .map((row) => row.code);
}

export type ClassState = "needs" | "ready" | "running" | "archived";

/** What the card says: Needs N more, Ready to open (6 or more seats), Running (confirmed) or Archived. */
export function classState(status: string, seats: number): { state: ClassState; needed: number } {
  const needed = Math.max(MIN_STUDENTS_TO_OPEN - Math.max(seats, 0), 0);
  if (status === "archived") return { state: "archived", needed };
  if (status === "confirmed") return { state: "running", needed };
  return { state: needed === 0 ? "ready" : "needs", needed };
}

/** The reservation code of a class row, by its grade and subject; null for any other class. */
export function classCode(c: { subject: string; grade_levels: string[] }): DecemberCode | null {
  const grade = c.grade_levels.join(" and ");
  return DECEMBER_CODES.find((code) => CODE_INFO[code].grade === grade && CODE_INFO[code].subject === c.subject) ?? null;
}

/** The note the Add December seats box writes, or null without a child or a class. */
export function buildSeatNote(input: { codes: DecemberCode[]; child: string; cancel?: boolean }): string | null {
  const child = input.child.replace(/\s+/g, " ").trim();
  const codes = DECEMBER_CODES.filter((code) => input.codes.includes(code));
  if (!child || codes.length === 0) return null;
  return `DEC26 ${input.cancel ? "CANCEL " : ""}${codes.join(" ")} - ${child}`;
}

export type MessageClass = {
  grade: string;
  subject: string;
  slot: string;
  tutorFirstName: string | null;
  meetingLink: string | null;
};

const kes = (amount: number): string => `KES ${Math.round(amount).toLocaleString("en-US")}`;

/** The M-Pesa paybill details, as the invoice shows them. */
export function paybillBlock(): string {
  return [
    "How to pay (M-Pesa)",
    `${PAYBILL.label}: ${PAYBILL.number}`,
    `Account number: ${PAYBILL.account}`,
    `Recipient: ${PAYBILL.recipient}`,
    `After paying, send your M-Pesa confirmation to ${PAYBILL.sendTo}.`,
  ].join("\n");
}

/** The message that asks a family to pay, sent by the team after Enrol. */
export function buildPaymentMessage(m: {
  parentName: string;
  childName: string;
  classes: MessageClass[];
  startDate: string;
  amount: number;
  payBy: string;
}): string {
  const one = m.classes.length === 1;
  return [
    `Good news, ${m.parentName}: ${m.childName}'s ${one ? "class is" : "classes are"} running from ${longDay(m.startDate)}, online (Nairobi time):`,
    ...m.classes.map(
      (c) => `- ${c.grade} ${c.subject}, ${formatSlot(c.slot)}${c.tutorFirstName ? `, with ${c.tutorFirstName}` : ""}`,
    ),
    "",
    `To keep ${m.childName}'s ${one ? "seat" : "seats"}, please pay ${kes(m.amount)} by ${longDay(m.payBy)}.`,
    "",
    paybillBlock(),
    "",
    `You will get the class ${one ? "link" : "links"} once payment is confirmed.`,
  ].join("\n");
}

/** The class links, for a family that has paid; null when no class has a link yet. */
export function buildLinksMessage(m: { parentName: string; childName: string; classes: MessageClass[] }): string | null {
  const withLinks = m.classes.filter((c) => c.meetingLink);
  if (withLinks.length === 0) return null;
  return [
    `Thank you, ${m.parentName}. We have received the payment for ${m.childName}. The class ${withLinks.length === 1 ? "link is" : "links are"} below (Nairobi time):`,
    ...withLinks.map((c) => `- ${c.grade} ${c.subject}, ${formatSlot(c.slot)}: ${c.meetingLink}`),
  ].join("\n");
}

/** For the families of a class that did not reach the seats it needs. */
export function buildNotRunningMessage(m: { parentName: string; childName: string; className: string }): string {
  return [
    `Thank you for reserving, ${m.parentName}. ${m.className} did not reach the ${MIN_STUDENTS_TO_OPEN} students it needs, so it will not run this December and nothing has been charged for ${m.childName}.`,
    "If you would like, we can arrange a free 20-minute assessment call with our Learning Coordinator and look at one-to-one options for January: https://lanatutors.africa/book-consultation",
  ].join("\n\n");
}

/** A WhatsApp link to a number with the text filled in; null without a number. */
export function waMessageLink(phone: string | null | undefined, text: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
}

export type DeskEnrolment = {
  id: string;
  student_id: string;
  student_profile_id: string | null;
  enrolled_class_ids: string[];
  payment_status: string;
  total_amount: number;
};
export type DeskChild = { id: string; full_name: string };
export type HolderStage = "reserved" | "enrolled" | "paid";

/**
 * Where one reservation stands: reserved, enrolled (waiting for payment) or paid. The enrolment is found by the family's login and
 * the child's name (the reservation note names the child; the enrolment points at the child's record).
 */
export function holderStage(args: {
  holding: Holding;
  classId: string;
  family: { parent_profile_id: string | null } | undefined;
  enrolments: DeskEnrolment[];
  children: DeskChild[];
}): { stage: HolderStage; enrolment: DeskEnrolment | null } {
  const { holding, classId, family, enrolments, children } = args;
  const login = family?.parent_profile_id;
  if (!login || !holding.child) return { stage: "reserved", enrolment: null };
  const kidIds = children.filter((k) => sameChild(k.full_name, holding.child)).map((k) => k.id);
  const found = enrolments.find(
    (e) =>
      e.student_id === login &&
      e.student_profile_id !== null &&
      kidIds.includes(e.student_profile_id) &&
      e.enrolled_class_ids.includes(classId),
  );
  if (!found) return { stage: "reserved", enrolment: null };
  return { stage: found.payment_status === "completed" ? "paid" : "enrolled", enrolment: found };
}

/** The classes one child of a family holds, in class order, from the family's reservation notes. */
export function childCodes(lists: DeskLists, familyId: string, child: string): DecemberCode[] {
  const held = lists.held.filter((h) => h.familyId === familyId && sameChild(h.child, child)).map((h) => h.code);
  return DECEMBER_CODES.filter((code) => held.includes(code));
}

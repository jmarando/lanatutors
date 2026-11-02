// The rules behind the December classes page (src/pages/DecemberClasses.tsx), kept free of React and of the database
// client so they can be tested on their own (supabase/functions/_tests/holiday-classes-page.test.mjs).

export type HolidayProgram = {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
};

export type HolidayClass = {
  id: string;
  subject: string;
  curriculum: string;
  grade_levels: string[];
  time_slot: string;
  max_students: number;
};

// A class runs once this many families have reserved. Lana says the same number (whatsapp-webhook/lana.ts); a test
// checks the two match.
export const MIN_STUDENTS_TO_OPEN = 6;

const day = (value: string): string => value.slice(0, 10);

// The program to show: one that has not ended, the one that starts first. Last December's program is still marked
// active in the database; its end date is what keeps it off the page. `today` is a YYYY-MM-DD day.
export function pickProgram<T extends Pick<HolidayProgram, "start_date" | "end_date">>(programs: T[], today: string): T | null {
  const upcoming = programs.filter((program) => day(program.end_date) >= today);
  upcoming.sort((a, b) => day(a.start_date).localeCompare(day(b.start_date)));
  return upcoming[0] ?? null;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Day = { year: number; month: number; day: number; weekday: number; time: number };

// Reads the day from a date or a timestamp ("2026-12-07" or "2026-12-07T00:00:00+00:00"). A day that does not exist,
// such as 30 February, is not read.
function readDay(value: unknown): Day | null {
  const match = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  if (!match) return null;
  const [year, month, dayOfMonth] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, dayOfMonth));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== dayOfMonth) return null;
  return { year, month, day: dayOfMonth, weekday: date.getUTCDay(), time: date.getTime() };
}

// "Monday 7 to Friday 18 December 2026": the weekday and day of the first and last class days, with the month and the
// year said once when they are shared. Dates that cannot be read give "", so the page leaves the line out.
export function formatProgramRange(start: unknown, end: unknown): string {
  const a = readDay(start);
  const b = readDay(end);
  if (!a || !b || b.time < a.time) return "";
  const first = `${WEEKDAYS[a.weekday]} ${a.day}`;
  const last = `${WEEKDAYS[b.weekday]} ${b.day}`;
  const monthA = MONTHS[a.month - 1];
  const monthB = MONTHS[b.month - 1];
  if (a.year !== b.year) return `${first} ${monthA} ${a.year} to ${last} ${monthB} ${b.year}`;
  if (a.month !== b.month) return `${first} ${monthA} to ${last} ${monthB} ${a.year}`;
  if (a.day !== b.day) return `${first} to ${last} ${monthA} ${a.year}`;
  return `${first} ${monthA} ${a.year}`;
}

const SLOT = /^\s*(\d{1,2}):(\d{2})\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2}):(\d{2})\s*(am|pm)?\s*$/i;

// Reads a class's time slot into minutes after midnight. Both label styles the platform has used work: "8:00 AM - 9:15 AM"
// and "8:00 - 9:15 AM" (AM or PM said once, at the end). The calendar sync reads them the same way
// (supabase/functions/_shared/bootcamp.ts). A slot that cannot be read gives null.
function readSlot(label: string): { start: number; end: number } | null {
  const match = SLOT.exec(label);
  if (!match) return null;
  const [startH, startM, endH, endM] = [Number(match[1]), Number(match[2]), Number(match[4]), Number(match[5])];
  const startMeridiem = match[3]?.toLowerCase();
  const endMeridiem = match[6]?.toLowerCase();
  if (!startMeridiem && !endMeridiem) return null; // "8:00 - 9:15" could be morning or afternoon
  if (startH < 1 || startH > 12 || endH < 1 || endH > 12 || startM > 59 || endM > 59) return null;

  const minutes = (h: number, m: number, pm: boolean): number => ((h % 12) + (pm ? 12 : 0)) * 60 + m;
  let start: number;
  let end: number;
  if (startMeridiem && endMeridiem) {
    start = minutes(startH, startM, startMeridiem === "pm");
    end = minutes(endH, endM, endMeridiem === "pm");
  } else if (endMeridiem) {
    // "8:00 - 9:15 AM": the one AM or PM covers both, unless that puts the start after the end ("11:00 - 12:15 PM").
    end = minutes(endH, endM, endMeridiem === "pm");
    start = minutes(startH, startM, endMeridiem === "pm");
    if (start > end) start = minutes(startH, startM, endMeridiem !== "pm");
  } else {
    start = minutes(startH, startM, startMeridiem === "pm");
    end = minutes(endH, endM, startMeridiem === "pm");
    if (end < start) end = minutes(endH, endM, startMeridiem !== "pm");
  }
  return end > start ? { start, end } : null;
}

const clock = (total: number): string => `${Math.floor(total / 60) % 12 || 12}:${String(total % 60).padStart(2, "0")}`;
const meridiem = (total: number): string => (total >= 12 * 60 ? "PM" : "AM");

// "8:00 – 9:15 AM", or "11:00 AM – 12:15 PM" when the slot crosses noon. A slot that cannot be read is shown as it was
// stored.
export function formatSlot(label: string): string {
  const slot = readSlot(label);
  if (!slot) return label.trim();
  const from = meridiem(slot.start);
  const to = meridiem(slot.end);
  return from === to
    ? `${clock(slot.start)} – ${clock(slot.end)} ${to}`
    : `${clock(slot.start)} ${from} – ${clock(slot.end)} ${to}`;
}

// The two groups the December classes are for, in the order the page shows them, and the exam each is heading for.
const GRADE_ORDER = ["Form 3", "Grade 8"];
const EXAM_BY_GRADE: Record<string, string> = { "Form 3": "KCSE 2027", "Grade 8": "KJSEA 2027" };

export type GradeGroup<T> = { grade: string; exam: string | null; classes: T[] };

// Groups classes by grade, the KCSE group first and any grade the page has no name for after the known ones, and puts
// each group's classes in time order.
export function groupByGrade<T extends Pick<HolidayClass, "grade_levels" | "time_slot" | "subject">>(classes: T[]): GradeGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const c of classes) {
    const grade = c.grade_levels.join(" and ");
    groups.set(grade, [...(groups.get(grade) ?? []), c]);
  }
  const rank = (grade: string): number => {
    const index = GRADE_ORDER.indexOf(grade);
    return index === -1 ? GRADE_ORDER.length : index;
  };
  const start = (label: string): number => readSlot(label)?.start ?? Number.MAX_SAFE_INTEGER;
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([grade, list]) => ({
      grade,
      exam: EXAM_BY_GRADE[grade] ?? null,
      classes: [...list].sort((x, y) => start(x.time_slot) - start(y.time_slot) || x.subject.localeCompare(y.subject)),
    }));
}

// What a "Reserve a seat" button sends on WhatsApp. With no class it is exactly the chat button's starter; with one it
// names the class. Lana answers both without the AI (matchPrefill in whatsapp-webhook/lana.ts; a test checks).
export function reserveMessage(cls?: { grade: string; subject: string }): string {
  return cls
    ? `Hi Lana Tutors! I'd like to reserve a seat in ${cls.grade} ${cls.subject} for the December holiday classes.`
    : "Hi Lana Tutors! I'd like to reserve a seat in the December holiday classes.";
}

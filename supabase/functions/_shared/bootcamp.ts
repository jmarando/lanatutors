// Dates and time slots for the holiday classes (the intensive_programs, intensive_classes and intensive_enrollments
// tables). Pure: no Deno and no network, so the functions that use it and the tests share one set of rules.
// Before this, the enrolment confirmation email and the calendar sync had last December's dates and slot labels
// written into them.

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Day {
  y: number;
  m: number;
  d: number;
}

// A date column comes back as "2026-12-07"; a timestamp starts with the same ten characters.
function parseDay(iso: unknown): Day | null {
  if (typeof iso !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  // Refuse 2026-02-31 and the like: the date has to survive the round trip.
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return { y, m, d };
}

const utc = (day: Day): number => Date.UTC(day.y, day.m - 1, day.d);

// "December 7-18, 2026", the way the old email wrote last year's. Empty when the dates cannot be read.
export function formatProgramDates(startIso: unknown, endIso: unknown): string {
  const a = parseDay(startIso);
  const b = parseDay(endIso);
  if (!a || !b || utc(b) < utc(a)) return "";
  const first = `${MONTHS[a.m - 1]} ${a.d}`;
  if (a.y === b.y && a.m === b.m) return a.d === b.d ? `${first}, ${a.y}` : `${first}-${b.d}, ${a.y}`;
  if (a.y === b.y) return `${first} - ${MONTHS[b.m - 1]} ${b.d}, ${a.y}`;
  return `${first}, ${a.y} - ${MONTHS[b.m - 1]} ${b.d}, ${b.y}`;
}

export function ordinalDay(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

// "December 7th": a day said the way a sentence needs it. Empty when the date cannot be read.
export function formatLongDay(iso: unknown): string {
  const day = parseDay(iso);
  return day ? `${MONTHS[day.m - 1]} ${ordinalDay(day.d)}` : "";
}

// Every Monday to Friday from the first day to the last, as "YYYY-MM-DD". Weekdays are worked out in UTC, which
// has no daylight saving, so the server's own time zone cannot move a day.
export function weekdayDates(startIso: unknown, endIso: unknown): string[] {
  const a = parseDay(startIso);
  const b = parseDay(endIso);
  if (!a || !b || utc(b) < utc(a)) return [];
  const days: string[] = [];
  for (let t = utc(a); t <= utc(b); t += 86_400_000) {
    const date = new Date(t);
    const weekday = date.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    days.push(date.toISOString().slice(0, 10));
  }
  return days;
}

const SLOT = /^\s*(\d{1,2}):(\d{2})\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2}):(\d{2})\s*(am|pm)?\s*$/i;

const pad = (n: number): string => String(n).padStart(2, "0");

// Reads a class's time slot into 24-hour start and end ("08:00", "09:15"). Both label styles the platform has
// used work: "8:00 AM - 9:15 AM" (what the calendar sync always expected) and "8:00 - 9:15 AM" (how last
// December's classes were stored, with the AM or PM said once, at the end). A slot that cannot be read gives null.
export function parseTimeSlot(label: unknown): { start: string; end: string } | null {
  if (typeof label !== "string") return null;
  const match = SLOT.exec(label);
  if (!match) return null;

  const startH = Number(match[1]);
  const startM = Number(match[2]);
  const endH = Number(match[4]);
  const endM = Number(match[5]);
  const startMeridiem = match[3]?.toLowerCase();
  const endMeridiem = match[6]?.toLowerCase();
  if (!startMeridiem && !endMeridiem) return null; // "8:00 - 9:15" could be morning or afternoon
  if (startH < 1 || startH > 12 || endH < 1 || endH > 12 || startM > 59 || endM > 59) return null;

  const to24 = (h: number, m: number, pm: boolean): number => ((h % 12) + (pm ? 12 : 0)) * 60 + m;

  let start: number;
  let end: number;
  if (startMeridiem && endMeridiem) {
    start = to24(startH, startM, startMeridiem === "pm");
    end = to24(endH, endM, endMeridiem === "pm");
  } else if (endMeridiem) {
    // "8:00 - 9:15 AM": the one AM or PM covers both, unless that puts the start after the end ("11:00 - 12:15 PM").
    end = to24(endH, endM, endMeridiem === "pm");
    start = to24(startH, startM, endMeridiem === "pm");
    if (start > end) start = to24(startH, startM, endMeridiem !== "pm");
  } else {
    start = to24(startH, startM, startMeridiem === "pm");
    end = to24(endH, endM, startMeridiem === "pm");
    if (end < start) end = to24(endH, endM, startMeridiem !== "pm");
  }
  if (end <= start) return null;

  const clock = (minutes: number): string => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  return { start: clock(start), end: clock(end) };
}

// "13:00" as "1:00 PM".
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`;
}

// A student's day across the classes they are in: from the first class's start to the last class's end, or null
// when none of the slots can be read.
export function dailyWindow(slots: unknown): string | null {
  if (!Array.isArray(slots)) return null;
  const read = slots.map(parseTimeSlot).filter((slot): slot is { start: string; end: string } => slot !== null);
  if (read.length === 0) return null;
  const first = read.map((slot) => slot.start).sort()[0];
  const last = read.map((slot) => slot.end).sort().at(-1) as string;
  return `${formatClock(first)} - ${formatClock(last)}`;
}

// The id the calendar sync gives each event: the same for one class on one day, so syncing twice makes no
// duplicates (Google refuses an id that already exists). Google allows only the letters a to v and digits, 5 to
// 1024 characters; a class id is hex, which fits.
export function calendarEventId(classId: string, isoDate: string): string {
  const clean = (text: string): string => text.toLowerCase().replace(/[^a-v0-9]/g, "");
  return `lanab${clean(classId)}${clean(isoDate)}`;
}

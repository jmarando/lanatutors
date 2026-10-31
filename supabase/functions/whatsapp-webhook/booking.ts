// Booking the free assessment call inside the WhatsApp chat: which times can be offered, how a tapped button or list
// row is read, the state the flow keeps in the chat, and the booking row it makes. Plain functions with no Deno or
// network calls, so they can be tested without Deno (see supabase/functions/_tests).

export type Part = "am" | "pm" | "eve";
export type Step = "offer" | "day" | "part" | "time" | "email" | "confirm" | "done";

// What Lana's own messages remember about the flow, so nothing else has to be stored. `time` is the website's text
// for the time ("01:20 PM"); `tries` counts failed attempts at the email; `nudged` means the family has already been
// reminded once to use the buttons; `id` is the booking, once there is one.
export type BookingState = { step: Step; day?: string; time?: string; email?: string; tries?: number; nudged?: boolean; id?: string };

export type Action =
  | { kind: "start" | "callback" | "retime" | "reemail" | "change" }
  | { kind: "day"; day: string }
  | { kind: "part"; day: string; part: Part }
  | { kind: "time" | "confirm"; day: string; time: string };

// The part of a saved chat message that the flow looks at.
export type ChatMessage = {
  role: "user" | "model";
  content: string;
  sent_by?: string;
  tap?: string;
  attachment?: unknown;
  booking?: BookingState;
};

// Day ("2026-11-04") -> the times held by a booking that is not cancelled.
export type Booked = Record<string, string[]>;

export type BookingRow = {
  id: string;
  consultation_date: string;
  consultation_time: string;
  status: string;
  booked_via?: string | null;
  created_at?: string;
  meeting_link?: string | null;
};

// The website's call times, in its own text (ALL_TIME_SLOTS in src/pages/BookConsultation.tsx; a test keeps the two
// equal). Monday to Saturday, Nairobi time, 20 minutes each.
export const CALL_TIMES: readonly string[] = [
  "11:00 AM", "11:20 AM", "11:40 AM", "12:00 PM", "12:20 PM", "12:40 PM",
  "01:00 PM", "01:20 PM", "01:40 PM", "02:00 PM", "02:20 PM", "02:40 PM",
  "07:00 PM", "07:20 PM", "07:40 PM", "08:00 PM", "08:20 PM", "08:40 PM",
];
export const CALL_MINUTES = 20;
export const MAX_DAYS_SHOWN = 10;
export const HORIZON_DAYS = 14;
export const MAX_CHAT_BOOKINGS_PER_DAY = 3;

const NAIROBI_OFFSET_MS = 3 * 3_600_000; // Kenya has no daylight saving
const SOON_MINUTES = 60; // a time today must start more than this far away
const pad = (n: number) => String(n).padStart(2, "0");

// Minutes after midnight for a time written like "01:20 PM" ("12:00 PM" is noon). Not limited to the call times:
// older bookings used others.
function minutesOf(time: string): number {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  if (!match) return Number.NaN;
  const hours = (Number(match[1]) % 12) + (match[3].toUpperCase() === "PM" ? 12 : 0);
  return hours * 60 + Number(match[2]);
}

// The day in Nairobi ("YYYY-MM-DD") and the minutes since its midnight, at the given moment.
export function nairobiNow(now: Date): { day: string; minutes: number } {
  const local = new Date(now.getTime() + NAIROBI_OFFSET_MS);
  return {
    day: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
    minutes: local.getUTCHours() * 60 + local.getUTCMinutes(),
  };
}

// A day written "YYYY-MM-DD" as a Date at 00:00 UTC, or null when it is not a real day.
function dayDate(day: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === day ? date : null;
}

export function addDays(day: string, n: number): string {
  const date = dayDate(day);
  if (!date) throw new Error(`Not a day: ${day}`);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

// The times that can be offered on a day, in order: never a Sunday, from today to HORIZON_DAYS ahead, on today only
// those starting more than an hour from now, and none that a booking already holds.
export function freeTimes(day: string, now: Date, booked: Booked): string[] {
  const date = dayDate(day);
  if (!date || date.getUTCDay() === 0) return [];
  const today = nairobiNow(now);
  if (day < today.day || day > addDays(today.day, HORIZON_DAYS)) return [];
  const held = new Set(booked[day] ?? []);
  return CALL_TIMES.filter((time) => !held.has(time) && (day !== today.day || minutesOf(time) > today.minutes + SOON_MINUTES));
}

export function isFree(day: string, time: string, now: Date, booked: Booked): boolean {
  return freeTimes(day, now, booked).includes(time);
}

// The soonest days that have a free time, at most MAX_DAYS_SHOWN of them, with how many times each has.
export function openDays(now: Date, booked: Booked): { day: string; free: number }[] {
  const today = nairobiNow(now).day;
  const days: { day: string; free: number }[] = [];
  for (let ahead = 0; ahead <= HORIZON_DAYS && days.length < MAX_DAYS_SHOWN; ahead++) {
    const day = addDays(today, ahead);
    const free = freeTimes(day, now, booked).length;
    if (free > 0) days.push({ day, free });
  }
  return days;
}

// Morning times (11:00 to 12:40), early afternoon (1:00 to 2:40) and evening (7:00 to 8:40).
export function partOf(time: string): Part {
  const minutes = minutesOf(time);
  return minutes < 13 * 60 ? "am" : minutes < 19 * 60 ? "pm" : "eve";
}

export function partsOf(times: string[]): Part[] {
  const present = new Set(times.map(partOf));
  return (["am", "pm", "eve"] as const).filter((part) => present.has(part));
}

export function timesInPart(times: string[], part: Part): string[] {
  return times.filter((time) => partOf(time) === part);
}

// A time as it travels in a tap id: 24-hour hhmm, so "01:20 PM" is "1320".
export function slotId(time: string): string {
  const minutes = minutesOf(time);
  return `${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}`;
}

const isPart = (text: string): text is Part => text === "am" || text === "pm" || text === "eve";

// Reads the id of a tapped button or list row. Anything that is not one of ours, or names a day or time that does not
// exist, is null.
export function parseTap(id: string): Action | null {
  if (!id.startsWith("bk:")) return null;
  const fields = id.slice(3).split(":");
  const [kind, day, last] = fields;
  switch (kind) {
    case "start":
    case "callback":
    case "retime":
    case "reemail":
    case "change":
      return fields.length === 1 ? { kind } : null;
    case "day":
      return fields.length === 2 && dayDate(day) ? { kind, day } : null;
    case "part":
      return fields.length === 3 && dayDate(day) && isPart(last) ? { kind, day, part: last } : null;
    case "time":
    case "confirm": {
      const time = CALL_TIMES.find((candidate) => slotId(candidate) === last);
      return fields.length === 3 && dayDate(day) && time ? { kind, day, time } : null;
    }
    default:
      return null;
  }
}

// The same pattern the bookings table already requires of an email.
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// The first email address in what someone typed, lowercased, or null.
export function findEmail(text: string): string | null {
  for (const word of text.split(/[\s,;]+/)) {
    const token = word.replace(/^[<>()[\]{}"'.:!?]+|[<>()[\]{}"'.:!?]+$/g, "");
    if (token.length <= 254 && EMAIL.test(token)) return token.toLowerCase();
  }
  return null;
}

const OPEN_STEPS: readonly Step[] = ["day", "part", "time", "email", "confirm"];

// What the flow last asked, read from Lana's latest message in the chat. A reply from the team ends it.
export function currentFlow(history: ChatMessage[]): BookingState | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const message = history[i];
    if (message.role === "model") return message.sent_by === "human" ? null : (message.booking ?? null);
  }
  return null;
}

// Whether the flow is waiting for the family to pick or type something.
export function isOpen(state: BookingState | null): state is BookingState {
  return state !== null && OPEN_STEPS.includes(state.step);
}

// The forms a WhatsApp number can be stored in: the digits Meta sends, and with a leading +.
export function phoneVariants(phone: string): string[] {
  const digits = phone.replace(/^\+/, "");
  return [digits, `+${digits}`];
}

// A booking whose call has not finished yet, in Nairobi time.
export function isUpcoming(row: BookingRow, now: Date): boolean {
  if (row.status === "cancelled") return false;
  const today = nairobiNow(now);
  if (row.consultation_date !== today.day) return row.consultation_date > today.day;
  return minutesOf(row.consultation_time) + CALL_MINUTES > today.minutes;
}

// How many bookings made in the chat were made in the last 24 hours, whatever their status.
export function countRecentChatBookings(rows: BookingRow[], now: Date): number {
  const since = now.getTime() - 24 * 3_600_000;
  return rows.filter((row) => row.booked_via === "whatsapp" && row.created_at !== undefined && Date.parse(row.created_at) > since).length;
}

// The row for consultation_bookings, shaped like the website's. What the family does not give is empty, not made
// up: the columns are NOT NULL, and the CRM keeps the first name or grade it is given, so a placeholder would stick.
export function bookingRow(a: { name?: string; phone: string; email: string; day: string; time: string; history: ChatMessage[] }) {
  const email = a.email.toLowerCase();
  const words = a.history
    .filter((m) => m.role === "user" && !m.tap && !m.attachment && m.content.trim() !== "" && m.content.trim().toLowerCase() !== email)
    .map((m) => m.content.trim())
    .join(" / ")
    .slice(0, 600);
  return {
    parent_name: (a.name ?? "").trim().slice(0, 200),
    student_name: "",
    phone_number: a.phone,
    email,
    grade_level: "",
    subjects_interest: [] as string[],
    preferred_mode: "consultation",
    additional_notes: words ? `Booked in the WhatsApp chat.\nThey wrote: ${words}` : "Booked in the WhatsApp chat.",
    consultation_date: a.day,
    consultation_time: a.time,
    status: "confirmed",
    booked_via: "whatsapp",
  };
}

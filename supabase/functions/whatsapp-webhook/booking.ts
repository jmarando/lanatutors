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
export const MAX_LIST_ROWS = 10; // a WhatsApp list holds at most 10 rows
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

// ---------------- what Lana says ----------------

// Meta's "interactive" object: a list or reply buttons.
export type Interactive = Record<string, unknown>;

export type Outgoing = {
  wa: { type: "text"; body: string } | { type: "interactive"; interactive: Interactive };
  content: string; // what the inbox shows and the AI reads: the text, then a "[List: ...]" or "[Buttons: ...]" line
  via: string; // "booking:<step>", or the via it was given
  booking?: BookingState; // the state the next tap or message is read against
  fallback: string; // plain text to send if Meta refuses an interactive message; empty when there is nothing to send
};

// Lana's voice: warm, short, plain text, no emojis, no sign-off.
export const COPY = {
  firstDays: "Let's find a time for your free 20-minute call with our Learning Coordinator. Pick a day below. All times are Nairobi time (EAT).",
  againDays: "Pick a day below. All times are Nairobi time (EAT).",
  filledDays: "Sorry, that day has just filled up. Pick another day below. All times are Nairobi time (EAT).",
  askEmail: "Thanks. What email address should we send the calendar invite to? Please type it below.",
  emailRetry: "That doesn't look like an email address. Please type it like name@example.com.",
  emailGiveUp: "No problem. I've asked our team to book this with you, and they'll message you here shortly.",
  noFreeDays: "I can't see a free time in the next two weeks. I've asked our Learning Coordinator to arrange your call, and someone will message you here shortly.",
  limit: "I've reached the limit for booking in the chat today, so I've asked our team to arrange your call. They'll message you here.",
  changeAck: "No problem. I've asked our team to change or cancel your call. They'll confirm with you here shortly.",
  nudge: "Thanks. To keep going, please tap one of the options above. Or tell us the day and time you prefer, and our team will arrange it.",
  wentWrong: "Sorry, something went wrong on my side. I've asked our team to book this with you, and they'll message you here shortly.",
  teamArranges: "Our team will arrange your call. Please tell us the day and time you'd like, and your time zone.",
  moreButtons: "Would you like to book it here?",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function dayFields(day: string): { weekday: number; date: number; month: number } {
  const date = dayDate(day);
  if (!date) throw new Error(`Not a day: ${day}`);
  return { weekday: date.getUTCDay(), date: date.getUTCDate(), month: date.getUTCMonth() };
}

function shortDay(day: string): string {
  const { weekday, date, month } = dayFields(day);
  return `${WEEKDAYS[weekday]} ${date} ${MONTHS[month]}`;
}

export function dayLabel(day: string, now: Date): string {
  const today = nairobiNow(now).day;
  if (day === today) return "Today";
  return day === addDays(today, 1) ? "Tomorrow" : shortDay(day);
}

export function longDay(day: string): string {
  const { weekday, date, month } = dayFields(day);
  return `${WEEKDAYS_LONG[weekday]} ${date} ${MONTHS_LONG[month]}`;
}

function clock(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  return `${hours % 12 === 0 ? 12 : hours % 12}:${pad(minutes % 60)} ${hours < 12 ? "am" : "pm"}`;
}

export function niceTime(time: string): string {
  return clock(minutesOf(time));
}

export function endTime(time: string): string {
  return clock(minutesOf(time) + CALL_MINUTES);
}

// A flow state without the fields that are not known, so it compares and saves cleanly.
function state(step: Step, rest: Omit<BookingState, "step"> = {}): BookingState {
  const out: BookingState = { step };
  for (const [key, value] of Object.entries(rest)) if (value !== undefined) (out as Record<string, unknown>)[key] = value;
  return out;
}

function buttonsOut(via: string, body: string, buttons: { id: string; title: string }[], booking: BookingState | undefined, fallback: string): Outgoing {
  const interactive: Interactive = {
    type: "button",
    body: { text: body },
    action: { buttons: buttons.map(({ id, title }) => ({ type: "reply", reply: { id, title } })) },
  };
  return {
    wa: { type: "interactive", interactive },
    content: `${body}\n\n[Buttons: ${buttons.map((button) => button.title).join(" | ")}]`,
    via,
    ...(booking && { booking }),
    fallback,
  };
}

function listOut(via: string, body: string, button: string, section: string, rows: { id: string; title: string; description: string }[], booking: BookingState, fallback: string): Outgoing {
  const interactive: Interactive = {
    type: "list",
    body: { text: body },
    action: { button, sections: [{ title: section, rows }] },
  };
  return {
    wa: { type: "interactive", interactive },
    content: `${body}\n\n[List: ${rows.map((row) => row.title).join(", ")}]`,
    via,
    booking,
    fallback,
  };
}

export function textOut(via: string, body: string, booking?: BookingState): Outgoing {
  return { wa: { type: "text", body }, content: body, via, ...(booking && { booking }), fallback: body };
}

const OFFER_BUTTONS = [
  { id: "bk:start", title: "Book a free call" },
  { id: "bk:callback", title: "Call me back" },
];
const REPLY_BUTTONS_BODY_LIMIT = 1024;

// Lana's answer with the two buttons that offer the call: in the same message when the text fits, else as the text
// followed by a short message that carries the buttons.
export function offerOut(text: string, via: string): Outgoing[] {
  if (text.length <= REPLY_BUTTONS_BODY_LIMIT) return [buttonsOut(via, text, OFFER_BUTTONS, state("offer"), text)];
  return [textOut(via, text), buttonsOut("booking:offer", COPY.moreButtons, OFFER_BUTTONS, state("offer"), "")];
}

export function dayListOut(days: { day: string; free: number }[], now: Date, opts: { intro?: "first" | "again" | "filled"; email?: string } = {}): Outgoing {
  const body = opts.intro === "again" ? COPY.againDays : opts.intro === "filled" ? COPY.filledDays : COPY.firstDays;
  const rows = days.map(({ day, free }) => ({
    id: `bk:day:${day}`,
    title: dayLabel(day, now),
    description: free === 1 ? "1 time free" : `${free} times free`,
  }));
  return listOut("booking:day", body, "Pick a day", "Days with free times", rows, state("day", { email: opts.email }), COPY.teamArranges);
}

const PART_TITLES: Record<Part, string> = { am: "11:00 am - 12:40 pm", pm: "1:00 - 2:40 pm", eve: "7:00 - 8:40 pm" };

export function partsOut(day: string, parts: Part[], email?: string): Outgoing {
  const body = `Which part of the day suits you on ${longDay(day)}? All times are Nairobi time (EAT).`;
  const buttons = parts.map((part) => ({ id: `bk:part:${day}:${part}`, title: PART_TITLES[part] }));
  return buttonsOut("booking:part", body, buttons, state("part", { day, email }), COPY.teamArranges);
}

export function timesOut(day: string, times: string[], opts: { taken?: boolean; email?: string } = {}): Outgoing {
  const body = `${opts.taken ? "Sorry, that time has just been taken. " : ""}Pick a time on ${longDay(day)}. Each call is ${CALL_MINUTES} minutes, in Nairobi time (EAT).`;
  const rows = times.map((time) => ({
    id: `bk:time:${day}:${slotId(time)}`,
    title: niceTime(time),
    description: `${shortDay(day)}, ${CALL_MINUTES} minutes`,
  }));
  return listOut("booking:time", body, "Pick a time", "Free times", rows, state("time", { day, email: opts.email }), COPY.teamArranges);
}

export function askEmailOut(day: string, time: string, retry?: { tries: number }): Outgoing {
  return textOut("booking:email", retry ? COPY.emailRetry : COPY.askEmail, state("email", { day, time, tries: retry?.tries }));
}

export function confirmOut(day: string, time: string, email: string): Outgoing {
  const body = `Please check your booking:\n\nDay: ${longDay(day)}\nTime: ${niceTime(time)} to ${endTime(time)} Nairobi time (EAT)\nEmail: ${email}\n\nShall I book it?`;
  const buttons = [
    { id: `bk:confirm:${day}:${slotId(time)}`, title: "Confirm" },
    { id: "bk:retime", title: "Change time" },
    { id: "bk:reemail", title: "Change email" },
  ];
  return buttonsOut("booking:confirm", body, buttons, state("confirm", { day, time, email }), COPY.teamArranges);
}

const CHANGE_BUTTON = [{ id: "bk:change", title: "Change or cancel" }];
const PREPARE = "To help our Learning Coordinator prepare, please type your child's grade and the subjects they need help with.";

export function bookedOut(a: { day: string; time: string; email: string; link: string | null; id: string }): Outgoing {
  const lines = ["Your call is booked.", "", `${longDay(a.day)}, ${niceTime(a.time)} Nairobi time (EAT)`];
  if (a.link) {
    lines.push(`Google Meet: ${a.link}`, "", `A calendar invite is on its way to ${a.email}. It will show the time in your own time zone once you add it to your calendar.`);
  } else {
    lines.push("", "Our team will send you the Google Meet link here before the call.");
  }
  lines.push("", PREPARE);
  return buttonsOut("booking:done", lines.join("\n"), CHANGE_BUTTON, state("done", { id: a.id }), COPY.teamArranges);
}

export function alreadyBookedOut(day: string, time: string): Outgoing {
  const body = `You already have a call booked for ${longDay(day)}, ${niceTime(time)} Nairobi time (EAT). If you need to change it, tap the button below.`;
  return buttonsOut("booking:done", body, CHANGE_BUTTON, state("done"), COPY.teamArranges);
}

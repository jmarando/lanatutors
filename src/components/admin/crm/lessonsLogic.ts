/**
 * The lessons slice's rules, kept free of React and Supabase so scripts/crm-tests can run them:
 * which attendance uses a session, the Nairobi week and "yesterday" windows, who needs a top-up
 * call, which lessons still need confirming, and the student progress read-out.
 *
 * The database makes the same attendance decision when a report is saved (migration 0006); the
 * options table below must agree with it.
 */
import { dateKey, nairobiDate } from "./crmMeta";

export type Attendance =
  | "delivered"
  | "student_absent"
  | "tutor_absent"
  | "late_cancellation"
  | "cancelled";

export const ATTENDANCE_OPTIONS: {
  value: Attendance;
  label: string;
  hint: string;
  counts: boolean;
}[] = [
  { value: "delivered", label: "The lesson happened", hint: "Uses one session; the tutor is paid", counts: true },
  { value: "student_absent", label: "The student did not show", hint: "Uses one session; the tutor is paid", counts: true },
  { value: "late_cancellation", label: "The family cancelled late", hint: "Uses one session; the tutor is paid", counts: true },
  { value: "tutor_absent", label: "The tutor did not show", hint: "No session used, no tutor pay", counts: false },
  { value: "cancelled", label: "Cancelled in good time", hint: "No session used, no tutor pay", counts: false },
];

export function attendanceLabel(attendance: Attendance | string | null | undefined): string {
  return ATTENDANCE_OPTIONS.find((o) => o.value === attendance)?.label ?? "";
}

/** A student no-show and a late cancellation count as a session taken; a tutor no-show does not. */
export function countsAsSession(attendance: Attendance): boolean {
  return ATTENDANCE_OPTIONS.find((o) => o.value === attendance)?.counts ?? false;
}

// ---------------------------------------------------------------- Nairobi windows

const NAIROBI_OFFSET = "+03:00"; // Nairobi has no daylight saving.

function addDays(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function nairobiMidnight(key: string): Date {
  return new Date(`${key}T00:00:00${NAIROBI_OFFSET}`);
}

export interface WeekRange {
  start: Date;
  end: Date;
  /** The seven Nairobi dates, Monday first, as YYYY-MM-DD. */
  days: string[];
}

/** Monday 00:00 to the next Monday 00:00 in Nairobi time, `offsetWeeks` away from now's week. */
export function weekRange(now: Date = new Date(), offsetWeeks = 0): WeekRange {
  const today = nairobiDate(now);
  const sinceMonday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const first = addDays(today, -sinceMonday + offsetWeeks * 7);
  return {
    start: nairobiMidnight(first),
    end: nairobiMidnight(addDays(first, 7)),
    days: Array.from({ length: 7 }, (_, i) => addDays(first, i)),
  };
}

export interface DayRange {
  /** YYYY-MM-DD in Nairobi. */
  day: string;
  start: Date;
  end: Date;
}

/** All of yesterday, Nairobi time. */
export function yesterdayRange(now: Date = new Date()): DayRange {
  const today = nairobiDate(now);
  const day = addDays(today, -1);
  return { day, start: nairobiMidnight(day), end: nairobiMidnight(today) };
}

// ---------------------------------------------------------------- queues and alerts

/** The columns of the crm_lessons view these rules read. */
export interface LessonLike {
  starts_at: string;
  ends_at: string;
  booking_status: string;
  attendance: Attendance | null;
  engagement: number | null;
  covered: string | null;
  homework: string | null;
  tutor_name?: string | null;
  tracked: boolean;
  report_id: string | null;
}

/** A lesson that ended after the cut-over, is not cancelled and has no report yet. */
export function needsConfirming(lesson: LessonLike, now: Date = new Date()): boolean {
  return (
    lesson.tracked &&
    !lesson.report_id &&
    lesson.booking_status !== "cancelled" &&
    Date.parse(lesson.ends_at) < now.getTime()
  );
}

/** Down to the last prepaid session (or past it). Enrolments that never bought a pack are not chased. */
export function isTopUpDue(balance: {
  sessions_bought: number;
  sessions_left: number;
  status: string;
}): boolean {
  return balance.status === "active" && balance.sessions_bought > 0 && balance.sessions_left <= 1;
}

// ---------------------------------------------------------------- student progress

export interface Progress {
  /** Delivered lessons as a share of those the student was expected at, 0 to 100. */
  attendanceRate: number | null;
  countedLessons: number;
  deliveredThisMonth: number;
  scheduledThisMonth: number;
  /** The last three lessons with a note, newest first. */
  feedback: { at: string; covered: string | null; homework: string | null; tutor: string | null }[];
  /** Average of the latest three engagement scores. */
  engagementAverage: number | null;
  /** Latest three against the three before; needs at least four scores. */
  engagementTrend: "up" | "steady" | "down" | null;
  lastLessonAt: string | null;
  atRisk: boolean;
  reasons: string[];
}

const DAY_MS = 86_400_000;
const QUIET_DAYS = 14;

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const clean = (text: string | null | undefined) => (text ?? "").trim() || null;

function isAbsence(attendance: Attendance | null): boolean {
  return attendance === "student_absent" || attendance === "late_cancellation";
}

/**
 * Attendance, this month, last notes and engagement for one student, and whether to worry.
 * At risk after two absences in a row, falling engagement, or no lesson in 14 days (for an active
 * enrolment with a lesson behind it and none booked).
 */
export function computeProgress(
  lessons: LessonLike[],
  now: Date,
  options: { active: boolean },
): Progress {
  const newestFirst = (a: LessonLike, b: LessonLike) => Date.parse(b.starts_at) - Date.parse(a.starts_at);
  const reported = lessons.filter((l) => l.attendance !== null).sort(newestFirst);
  const counted = reported.filter((l) => l.attendance && countsAsSession(l.attendance));
  const delivered = reported.filter((l) => l.attendance === "delivered");

  const month = nairobiDate(now).slice(0, 7);
  const inMonth = (iso: string) => dateKey(iso)?.slice(0, 7) === month;

  const scores = delivered
    .map((l) => l.engagement)
    .filter((v): v is number => typeof v === "number");
  const latest = scores.slice(0, 3);
  const before = scores.slice(3, 6);
  let engagementTrend: Progress["engagementTrend"] = null;
  if (scores.length >= 4) {
    const delta = mean(latest) - mean(before);
    engagementTrend = delta >= 1 ? "up" : delta <= -1 ? "down" : "steady";
  }

  const lastLessonAt = delivered[0]?.ends_at ?? null;
  const upcoming = lessons.some(
    (l) =>
      l.booking_status !== "cancelled" && l.attendance === null && Date.parse(l.starts_at) > now.getTime(),
  );

  const reasons: string[] = [];
  if (counted.length >= 2 && isAbsence(counted[0].attendance) && isAbsence(counted[1].attendance)) {
    reasons.push("Missed the last two lessons");
  }
  if (engagementTrend === "down") reasons.push("Engagement is falling");
  if (
    options.active &&
    lastLessonAt &&
    !upcoming &&
    now.getTime() - Date.parse(lastLessonAt) > QUIET_DAYS * DAY_MS
  ) {
    reasons.push(`No lesson in ${QUIET_DAYS} days`);
  }

  return {
    attendanceRate: counted.length ? Math.round((100 * delivered.length) / counted.length) : null,
    countedLessons: counted.length,
    deliveredThisMonth: delivered.filter((l) => inMonth(l.starts_at)).length,
    scheduledThisMonth: lessons.filter((l) => l.booking_status !== "cancelled" && inMonth(l.starts_at)).length,
    feedback: reported
      .filter((l) => clean(l.covered) || clean(l.homework))
      .slice(0, 3)
      .map((l) => ({
        at: l.starts_at,
        covered: clean(l.covered),
        homework: clean(l.homework),
        tutor: l.tutor_name ?? null,
      })),
    engagementAverage: latest.length ? Math.round(mean(latest) * 10) / 10 : null,
    engagementTrend,
    lastLessonAt,
    atRisk: reasons.length > 0,
    reasons,
  };
}

// ---------------------------------------------------------------- money

/** KES 24,000 · KES 2,333.33 · -KES 1,300 (money the family owes). */
export function formatKes(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = Number(amount);
  if (Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  const hasCents = Math.round(abs * 100) % 100 !== 0;
  const text = abs.toLocaleString("en-US", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? "-" : ""}KES ${text}`;
}

/**
 * "8", "8.5" and "3,5" read as sessions bought. Half sessions are real (the tracker has them), and the
 * database holds up to 9999.99 (numeric(6,2)). Anything else, or zero, is NaN.
 */
export function parseSessions(text: string): number {
  const cleaned = text.trim().replace(",", ".");
  if (!/^(?:\d{1,4}(?:\.\d{1,2})?|\.\d{1,2})$/.test(cleaned)) return NaN;
  const value = Number(cleaned);
  return value > 0 ? value : NaN;
}

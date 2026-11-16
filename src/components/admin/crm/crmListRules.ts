// The CRM list's rules, kept free of React and the database so they can be tested on their own
// (scripts/crm-tests/crmList.test.ts; named apart from the CrmList screen, which differs only in case): which next-step pill a row shows, what each quick filter keeps, and the band's
// counts. "Today", "late" and "this month" are read on the Nairobi calendar. Nairobi has no daylight saving, so a time
// there is the UTC time plus three hours, and days and times are written with fixed English names rather than the
// machine's locale.
import { dateKey, formatPhone, isOpen } from "./crmMeta";
import type { Lead, LeadWithFamily } from "./crmTypes";

export type ListFilter =
  | "open"
  | "reply"
  | "overdue"
  | "booked"
  | "topup"
  | "mine"
  | "closed"
  | "new"
  | "progress"
  | "wonMonth";

export type PillTone = "red" | "amber" | "neutral";

export interface ListContext {
  /** Today in Nairobi, YYYY-MM-DD. */
  today: string;
  /** Now, as an ISO time. */
  now: string;
  /** The signed-in team member, for Mine. */
  me: string | null;
  /** Families down to their last prepaid session: family id to sessions left. */
  topUps: Map<string, number>;
}

const NAIROBI_OFFSET_MS = 3 * 3_600_000;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const IN_PROGRESS = new Set(["contacted", "call_booked", "call_done"]);

const inNairobi = (iso: string): Date => new Date(Date.parse(iso) + NAIROBI_OFFSET_MS);

/** "4:00 pm" */
function clock(iso: string): string {
  const t = inNairobi(iso);
  const hours = t.getUTCHours();
  const minutes = String(t.getUTCMinutes()).padStart(2, "0");
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? "am" : "pm"}`;
}

/** "Wed 18 Nov" */
function shortDay(iso: string): string {
  const t = inNairobi(iso);
  return `${DAYS[t.getUTCDay()]} ${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]}`;
}

/** Whole days from one YYYY-MM-DD to another. */
const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

const monthStart = (day: string): string => `${day.slice(0, 7)}-01`;

function previousMonthStart(day: string): string {
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7));
  return month === 1 ? `${year - 1}-12-01` : `${year}-${String(month - 1).padStart(2, "0")}-01`;
}

const callHasPassed = (lead: Lead, now: string): boolean =>
  lead.stage === "call_booked" && lead.assessment_at != null && Date.parse(lead.assessment_at) < Date.parse(now);

const wonBetween = (lead: Lead, from: string, before: string | null): boolean => {
  if (lead.stage !== "won") return false;
  const key = dateKey(lead.won_at);
  return key != null && key >= from && (before == null || key < before);
};

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** The one pill a row shows under Next step, the first of the spec's rules that applies; null for none. */
export function nextStepPill(lead: Lead, ctx: ListContext): { text: string; tone: PillTone } | null {
  if (lead.needs_reply) return { text: "Reply on WhatsApp", tone: "red" };
  if (callHasPassed(lead, ctx.now)) return { text: "Log the call", tone: "red" };
  if (lead.stage === "call_booked" && lead.assessment_at && dateKey(lead.assessment_at) === ctx.today) {
    return { text: `Assessment call today, ${clock(lead.assessment_at)}`, tone: "neutral" };
  }
  if (lead.next_step) {
    const key = dateKey(lead.next_step_at);
    if (!key || !lead.next_step_at) return { text: lead.next_step, tone: "neutral" };
    if (key < ctx.today) {
      return { text: `${lead.next_step} · ${plural(daysBetween(key, ctx.today), "day", "days")} late`, tone: "red" };
    }
    if (key === ctx.today) return { text: `${lead.next_step} · today`, tone: "amber" };
    return { text: `${lead.next_step} · ${shortDay(lead.next_step_at)}`, tone: "neutral" };
  }
  if (lead.stage === "new") return { text: "Needs first call", tone: "neutral" };
  if (lead.stage === "won" && ctx.topUps.has(lead.family_id)) {
    const left = ctx.topUps.get(lead.family_id) ?? 0;
    return {
      text: left <= 0 ? "Top-up: no sessions left" : `Top-up: ${plural(left, "session", "sessions")} left`,
      tone: "amber",
    };
  }
  if (isOpen(lead.stage)) return { text: "No next step", tone: "amber" };
  return null;
}

/** Whether a lead belongs under a quick filter (or under one of the band's counts). */
export function matchesFilter(lead: Lead, filter: ListFilter, ctx: ListContext): boolean {
  const open = isOpen(lead.stage);
  switch (filter) {
    case "open":
      return open;
    case "reply":
      return open && lead.needs_reply;
    case "overdue": {
      const key = dateKey(lead.next_step_at);
      return open && ((key != null && key <= ctx.today) || callHasPassed(lead, ctx.now));
    }
    case "booked":
      return lead.stage === "call_booked";
    case "topup":
      return ctx.topUps.has(lead.family_id);
    case "mine":
      return open && ctx.me != null && (lead.owner_id === ctx.me || lead.next_step_owner_id === ctx.me);
    case "closed":
      return lead.stage === "won" || lead.stage === "lost";
    case "new":
      return lead.stage === "new";
    case "progress":
      return IN_PROGRESS.has(lead.stage);
    case "wonMonth":
      return wonBetween(lead, monthStart(ctx.today), null);
  }
}

/** The band's three counts and the small numbers beside them. */
export function bandCounts(
  open: Lead[],
  closed: Lead[],
  ctx: ListContext,
): { newCount: number; newThisWeek: number; inProgress: number; dueToday: number; wonThisMonth: number; wonLastMonth: number } {
  const fresh = open.filter((l) => l.stage === "new");
  const progressing = open.filter((l) => IN_PROGRESS.has(l.stage));
  const thisMonth = monthStart(ctx.today);
  return {
    newCount: fresh.length,
    newThisWeek: fresh.filter((l) => {
      const key = dateKey(l.created_at);
      return key != null && daysBetween(key, ctx.today) >= 0 && daysBetween(key, ctx.today) <= 6;
    }).length,
    inProgress: progressing.length,
    dueToday: progressing.filter((l) => dateKey(l.next_step_at) === ctx.today).length,
    wonThisMonth: closed.filter((l) => wonBetween(l, thisMonth, null)).length,
    wonLastMonth: closed.filter((l) => wonBetween(l, previousMonthStart(ctx.today), thisMonth)).length,
  };
}

/** The Leads screen's search: parent, phone, child, grade, curriculum, subjects and next step, ignoring case. */
export function searchLead(lead: LeadWithFamily, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    lead.families?.parent_name,
    lead.families?.phone,
    lead.student_name,
    lead.grade_level,
    lead.curriculum,
    ...(lead.subjects ?? []),
    lead.next_step,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

/** The parent's name, else the phone number, else the child's family, else "Unknown family". */
export function familyName(lead: LeadWithFamily): string {
  const parent = lead.families?.parent_name?.trim();
  if (parent) return parent;
  const phone = formatPhone(lead.families?.phone);
  if (phone) return phone;
  return lead.student_name ? `${lead.student_name}'s family` : "Unknown family";
}

export const newestFirst = (a: Lead, b: Lead): number => b.created_at.localeCompare(a.created_at);

/** Labels, colours and small helpers shared by the CRM screens. */
import type { CrmStage } from "@/utils/metaCrm";
import type { Channel, FamilyStatus, LostReason, Stage } from "./crmTypes";

export const NAIROBI = "Africa/Nairobi";

export const STAGES: { value: Stage; label: string; hint: string }[] = [
  { value: "new", label: "New", hint: "Nobody has spoken to the family yet" },
  { value: "contacted", label: "Contacted", hint: "A coordinator understands the need" },
  { value: "call_booked", label: "Call booked", hint: "A free assessment call is scheduled" },
  { value: "call_done", label: "Call done", hint: "Fit and price were discussed" },
  { value: "won", label: "Won", hint: "The family paid or started lessons" },
  { value: "lost", label: "Lost", hint: "Not going ahead" },
];

export const CHANNELS: { value: Channel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "assessment_form", label: "Assessment booking" },
  { value: "website_form", label: "Website form" },
  { value: "phone", label: "Phone call" },
  { value: "email", label: "Email" },
  { value: "referral", label: "Referral" },
  { value: "walk_in", label: "Walk-in" },
  { value: "import", label: "Imported" },
  { value: "other", label: "Other" },
];

export const LOST_REASONS: { value: LostReason; label: string }[] = [
  { value: "price", label: "Price" },
  { value: "timing", label: "Timing" },
  { value: "no_reply", label: "No reply" },
  { value: "not_a_fit", label: "Not a fit" },
  { value: "went_elsewhere", label: "Went elsewhere" },
  { value: "stale", label: "Stale" },
  { value: "other", label: "Other" },
];

export const FAMILY_STATUS_LABELS: Record<FamilyStatus, string> = {
  prospect: "Prospect",
  active: "Active",
  paused: "Paused",
  former: "Former",
};

const STAGE_CLASSNAMES: Record<Stage, string> = {
  new: "bg-sky-100 text-sky-800 border-sky-200",
  contacted: "bg-amber-100 text-amber-800 border-amber-200",
  call_booked: "bg-indigo-100 text-indigo-800 border-indigo-200",
  call_done: "bg-violet-100 text-violet-800 border-violet-200",
  won: "bg-emerald-100 text-emerald-800 border-emerald-200",
  lost: "bg-rose-100 text-rose-800 border-rose-200",
};

export function stageLabel(stage: Stage | string): string {
  return STAGES.find((s) => s.value === stage)?.label ?? stage;
}

export function stageClass(stage: Stage | string): string {
  return STAGE_CLASSNAMES[stage as Stage] ?? "bg-muted text-muted-foreground border-border";
}

export function channelLabel(channel: Channel | string): string {
  return CHANNELS.find((c) => c.value === channel)?.label ?? channel;
}

export function lostReasonLabel(reason: LostReason | string | null): string {
  if (!reason) return "";
  return LOST_REASONS.find((r) => r.value === reason)?.label ?? reason;
}

/** Map a CRM stage change onto the Meta CRM events the old screens sent. */
export function metaStageFor(stage: Stage): CrmStage | null {
  switch (stage) {
    case "new":
      return "lead";
    case "contacted":
      return "contacted";
    case "call_booked":
      return "qualified";
    case "call_done":
      return "scheduled";
    case "won":
      return "converted";
    case "lost":
      return "disqualified";
  }
}

/**
 * Mirror of the SQL `crm_normalize_phone`: international digits, or null.
 * Keep the two in step; the import dry run checks the parity.
 */
export function normalizePhone(input?: string | null): string | null {
  let d = (input ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 13 && d.startsWith("2540")) d = `254${d.slice(4)}`;
  if (d.length < 9) return null;
  if (d.length === 10 && d.startsWith("0")) return `254${d.slice(1)}`;
  if (d.length === 9 && (d.startsWith("7") || d.startsWith("1"))) return `254${d}`;
  return d;
}

/** +254 712 345 678 for Kenyan numbers, +… otherwise. */
export function formatPhone(phone?: string | null): string {
  const d = (phone ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 12 && d.startsWith("254")) {
    return `+254 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
  }
  return `+${d}`;
}

export function waLink(phone?: string | null): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  return d ? `https://wa.me/${d}` : null;
}

export function telLink(phone?: string | null): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  return d ? `tel:+${d}` : null;
}

/** Today's date in Nairobi as YYYY-MM-DD. */
export function nairobiDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NAIROBI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function dateKey(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return nairobiDate(d);
}

export type DueState = "overdue" | "today" | "later" | "none";

/** Where a due date sits relative to today, in Nairobi time. */
export function dueState(iso?: string | null): DueState {
  const key = dateKey(iso);
  if (!key) return "none";
  const today = nairobiDate();
  if (key < today) return "overdue";
  if (key === today) return "today";
  return "later";
}

export function isOpen(stage: string): boolean {
  return stage === "new" || stage === "contacted" || stage === "call_booked" || stage === "call_done";
}

/** "today", "yesterday" or "6 days old". */
export function ageLabel(iso?: string | null): string {
  const key = dateKey(iso);
  if (!key) return "";
  const today = nairobiDate();
  const days = Math.round(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${key}T00:00:00Z`)) / 86_400_000,
  );
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days old`;
}

/** "Today 2:00 PM", "Fri 6 Nov, 2:00 PM" in Nairobi time. */
export function formatDue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = dateKey(iso);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: NAIROBI,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  if (day === nairobiDate()) return `Today ${time}`;
  const dayLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: NAIROBI,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
  return `${dayLabel}, ${time}`;
}

/** YYYY-MM-DDTHH:mm for a datetime-local input, in Nairobi time. */
export function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: NAIROBI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** A Nairobi wall-clock value from a datetime-local input, as ISO UTC. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}:00+03:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function initials(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

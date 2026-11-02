import { Link } from "react-router-dom";
import { CheckCircle2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CrmLesson } from "./crmTypes";
import { formatSlot } from "./crmMeta";
import { attendanceLabel, countsAsSession, formatKes, needsConfirming } from "./lessonsLogic";

interface LessonRowProps {
  lesson: CrmLesson;
  now: Date;
  onConfirm?: (lesson: CrmLesson) => void;
  onUndo?: (lesson: CrmLesson) => void;
}

const TONES = {
  good: "bg-emerald-100 text-emerald-800 border-emerald-200",
  warn: "bg-amber-100 text-amber-800 border-amber-200",
  bad: "bg-rose-100 text-rose-800 border-rose-200",
  info: "bg-sky-100 text-sky-800 border-sky-200",
  quiet: "bg-muted text-muted-foreground border-border",
} as const;

function state(lesson: CrmLesson, now: Date): { label: string; tone: keyof typeof TONES } {
  if (lesson.report_id && lesson.attendance) {
    const tone =
      lesson.attendance === "delivered"
        ? "good"
        : lesson.attendance === "tutor_absent"
          ? "bad"
          : countsAsSession(lesson.attendance)
            ? "warn"
            : "quiet";
    return { label: attendanceLabel(lesson.attendance), tone };
  }
  if (lesson.booking_status === "cancelled") return { label: "Cancelled", tone: "quiet" };
  if (needsConfirming(lesson, now)) return { label: "Needs confirming", tone: "warn" };
  if (Date.parse(lesson.ends_at) > now.getTime()) {
    return Date.parse(lesson.starts_at) <= now.getTime()
      ? { label: "In progress", tone: "info" }
      : { label: "Upcoming", tone: "info" };
  }
  return { label: "Before the CRM", tone: "quiet" };
}

/** One lesson: when, who, with whom, and either its confirmation or a button to confirm it. */
export function LessonRow({ lesson, now, onConfirm, onUndo }: LessonRowProps) {
  const current = state(lesson, now);
  const confirmable = needsConfirming(lesson, now);
  const counted = lesson.attendance ? countsAsSession(lesson.attendance) : false;

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-semibold">
            {[lesson.student_name, lesson.subject].filter(Boolean).join(" · ")}
          </span>
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", TONES[current.tone])}>
            {current.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{formatSlot(lesson.starts_at, lesson.ends_at)}</p>
        <p className="text-xs text-muted-foreground">
          with {lesson.tutor_name}
          {lesson.family_id ? (
            <>
              {" · "}
              <Link to={`/admin/families/${lesson.family_id}`} className="text-primary hover:underline">
                {lesson.family_name || "Family"}
              </Link>
            </>
          ) : null}
        </p>
        {lesson.report_id && lesson.covered && <p className="text-xs">{lesson.covered}</p>}
        {lesson.report_id && counted && (
          <p
            className={cn(
              "text-[11px]",
              lesson.tutor_pay_kes == null ? "text-amber-700" : "text-muted-foreground",
            )}
          >
            {lesson.tutor_pay_kes == null
              ? "No paid session was left, so tutor pay is not set yet"
              : `Tutor pay ${formatKes(lesson.tutor_pay_kes)}`}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {confirmable && onConfirm && (
          <Button size="sm" onClick={() => onConfirm(lesson)}>
            <CheckCircle2 className="h-4 w-4" /> Confirm
          </Button>
        )}
        {lesson.report_id && onUndo && (
          <Button size="sm" variant="ghost" onClick={() => onUndo(lesson)} aria-label="Undo the confirmation">
            <Undo2 className="h-4 w-4" />
            <span className="hidden sm:inline">Undo</span>
          </Button>
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, CheckCheck, ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CrmShell } from "@/components/admin/crm/CrmShell";
import { ConfirmLessonDialog } from "@/components/admin/crm/ConfirmLessonDialog";
import { LessonRow } from "@/components/admin/crm/LessonRow";
import { useCrmSettings, usePendingLessons, useWeekLessons } from "@/components/admin/crm/useCrmData";
import type { CrmLesson } from "@/components/admin/crm/crmTypes";
import { dateKey, formatDay, formatDayHeading, nairobiDate } from "@/components/admin/crm/crmMeta";
import { confirmLessons, undoConfirmation } from "@/components/admin/crm/lessonActions";
import { weekRange, yesterdayRange } from "@/components/admin/crm/lessonsLogic";

const SHOWN = 40;

/** Lessons: the "Needs confirming" queue first, then the week. */
export default function CrmLessons() {
  const pending = usePendingLessons();
  const [weekOffset, setWeekOffset] = useState(0);
  const week = useWeekLessons(weekOffset);
  const { settings } = useCrmSettings();
  const [confirming, setConfirming] = useState<CrmLesson | null>(null);
  const [undoing, setUndoing] = useState<CrmLesson | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const now = new Date();
  const range = useMemo(() => weekRange(new Date(), weekOffset), [weekOffset]);
  const yesterday = yesterdayRange(now);
  const yesterdays = pending.data.filter((l) => dateKey(l.ends_at) === yesterday.day);
  const today = nairobiDate();

  const byDay = useMemo(() => {
    const map = new Map<string, CrmLesson[]>(range.days.map((day) => [day, []]));
    for (const lesson of week.data) {
      const key = dateKey(lesson.starts_at);
      if (key && map.has(key)) map.get(key)?.push(lesson);
    }
    return map;
  }, [week.data, range]);

  const refresh = () => {
    void pending.reload();
    void week.reload();
  };

  const confirmYesterday = async () => {
    setBusy(true);
    const result = await confirmLessons(
      yesterdays.map((l) => ({ booking_id: l.booking_id, attendance: "delivered" as const })),
    );
    setBusy(false);
    if (result.error) {
      toast.error(`Could not confirm yesterday's lessons: ${result.error}. Refresh and try again.`);
      return;
    }
    if (result.unpriced > 0) {
      toast.warning(
        `Confirmed ${result.reports.length} ${result.reports.length === 1 ? "lesson" : "lessons"}. ${result.unpriced} had no paid session left, so tutor pay is not set yet.`,
      );
    } else {
      toast.success(
        `Confirmed ${result.reports.length} ${result.reports.length === 1 ? "lesson" : "lessons"} as delivered`,
      );
    }
    setBulkOpen(false);
    refresh();
  };

  const undo = async () => {
    if (!undoing?.report_id) return;
    setBusy(true);
    const error = await undoConfirmation(undoing.report_id);
    setBusy(false);
    if (error) {
      toast.error(`Could not undo the confirmation: ${error}`);
      return;
    }
    toast.success("Back in Needs confirming. The session went back to the pack.");
    setUndoing(null);
    refresh();
  };

  const queue = showAll ? pending.data : pending.data.slice(0, SHOWN);
  const error = pending.error ?? week.error;

  return (
    <CrmShell
      title="Lessons"
      subtitle={`${pending.data.length} to confirm`}
      active="lessons"
      actions={
        <Button variant="outline" size="sm" onClick={refresh} className="hidden sm:inline-flex">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      }
    >
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Could not load lessons: {error}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="space-y-2 pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold">Needs confirming</CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Oldest first
                  {settings?.lessons_from ? ` · lessons that ended after ${formatDay(settings.lessons_from)}` : ""}
                </p>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {pending.data.length}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-center sm:w-auto sm:self-start"
              disabled={yesterdays.length === 0}
              onClick={() => setBulkOpen(true)}
            >
              <CheckCheck className="h-4 w-4" />
              Confirm yesterday's lessons ({yesterdays.length})
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : queue.length === 0 ? (
              <p className="py-3 text-xs text-muted-foreground">Every lesson has a report. Nothing to confirm.</p>
            ) : (
              queue.map((lesson) => (
                <LessonRow key={lesson.booking_id} lesson={lesson} now={now} onConfirm={setConfirming} />
              ))
            )}
            {!showAll && pending.data.length > SHOWN && (
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowAll(true)}>
                Show all {pending.data.length}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-2 pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold">
                {weekOffset === 0 ? "This week" : weekOffset === 1 ? "Next week" : weekOffset === -1 ? "Last week" : "Week"}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Previous week"
                  onClick={() => setWeekOffset((n) => n - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={weekOffset === 0}
                  onClick={() => setWeekOffset(0)}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Next week"
                  onClick={() => setWeekOffset((n) => n + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {formatDayHeading(range.days[0])} to {formatDayHeading(range.days[6])}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {week.loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              range.days.map((day) => {
                const lessons = byDay.get(day) ?? [];
                return (
                  <section key={day} className="space-y-1.5">
                    <h3
                      className={cn(
                        "text-xs font-semibold",
                        day === today ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {formatDayHeading(day)}
                      {day === today ? " · today" : ""}
                    </h3>
                    {lessons.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">No lessons.</p>
                    ) : (
                      lessons.map((lesson) => (
                        <LessonRow
                          key={lesson.booking_id}
                          lesson={lesson}
                          now={now}
                          onConfirm={setConfirming}
                          onUndo={setUndoing}
                        />
                      ))
                    )}
                  </section>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmLessonDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        lesson={confirming}
        onConfirmed={refresh}
      />

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm yesterday's lessons?</DialogTitle>
            <DialogDescription>
              {yesterdays.length} lesson{yesterdays.length === 1 ? "" : "s"} from {formatDayHeading(yesterday.day)} will
              be marked as happened. Each uses one session and fixes the tutor's pay. Lessons where someone did not
              show are better confirmed one by one.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
            {yesterdays.map((l) => (
              <li key={l.booking_id} className="rounded-md bg-muted/40 px-2.5 py-1.5">
                {[l.student_name, l.subject].filter(Boolean).join(" · ")} with {l.tutor_name}
              </li>
            ))}
          </ul>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmYesterday} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              Confirm {yesterdays.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={undoing !== null}
        onOpenChange={(open) => {
          if (!open) setUndoing(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Undo this confirmation?</DialogTitle>
            <DialogDescription>
              The lesson goes back to Needs confirming and its session goes back to the family's pack.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setUndoing(null)}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={undo} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Undo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CrmShell>
  );
}

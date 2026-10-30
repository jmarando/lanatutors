import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { CrmLesson } from "./crmTypes";
import { formatSlot } from "./crmMeta";
import { confirmLessons } from "./lessonActions";
import { ATTENDANCE_OPTIONS, countsAsSession, formatKes } from "./lessonsLogic";
import type { Attendance } from "./lessonsLogic";

interface ConfirmLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: CrmLesson | null;
  onConfirmed: () => void;
}

const ENGAGEMENT_LABELS: Record<number, string> = {
  1: "Distracted",
  2: "Low",
  3: "Okay",
  4: "Good",
  5: "Excellent",
};

/**
 * Confirm what happened in a lesson: attendance, what was covered, homework and engagement. An
 * admin uses it today; it only calls `confirmLessons`, so a tutor's screen can reuse it later.
 */
export function ConfirmLessonDialog({ open, onOpenChange, lesson, onConfirmed }: ConfirmLessonDialogProps) {
  const [attendance, setAttendance] = useState<Attendance>("delivered");
  const [covered, setCovered] = useState("");
  const [homework, setHomework] = useState("");
  const [engagement, setEngagement] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAttendance("delivered");
      setCovered("");
      setHomework("");
      setEngagement(null);
    }
  }, [open, lesson?.booking_id]);

  if (!lesson) return null;
  const happened = attendance === "delivered";
  const usesSession = countsAsSession(attendance);

  const save = async () => {
    setSaving(true);
    const result = await confirmLessons([
      {
        booking_id: lesson.booking_id,
        attendance,
        covered: happened ? covered.trim() || null : null,
        homework: happened ? homework.trim() || null : null,
        engagement: happened ? engagement : null,
      },
    ]);
    setSaving(false);
    if (result.error) {
      toast.error(`Could not confirm the lesson: ${result.error}`);
      return;
    }
    const pay = result.reports[0]?.tutor_pay_kes;
    if (result.unpriced > 0) {
      toast.warning(
        "Confirmed, but this family has no paid session left. Record their payment and the tutor's pay is set.",
      );
    } else if (usesSession && pay != null) {
      toast.success(`Confirmed. One session used, tutor pay ${formatKes(pay)}.`);
    } else {
      toast.success("Confirmed. No session used.");
    }
    onOpenChange(false);
    onConfirmed();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirm the lesson</DialogTitle>
          <DialogDescription>
            {[lesson.student_name, lesson.subject].filter(Boolean).join(" · ")} with {lesson.tutor_name}
            <br />
            {formatSlot(lesson.starts_at, lesson.ends_at)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>What happened</Label>
            <RadioGroup
              value={attendance}
              onValueChange={(value) => setAttendance(value as Attendance)}
              className="gap-1.5"
            >
              {ATTENDANCE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  htmlFor={`attendance-${option.value}`}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-2.5 text-sm transition-colors",
                    attendance === option.value ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                  )}
                >
                  <RadioGroupItem id={`attendance-${option.value}`} value={option.value} className="mt-0.5" />
                  <span>
                    <span className="block font-medium">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">{option.hint}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {happened && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="lesson-covered">What was covered</Label>
                <Textarea
                  id="lesson-covered"
                  rows={2}
                  placeholder="Fractions: adding unlike denominators"
                  value={covered}
                  onChange={(e) => setCovered(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lesson-homework">Homework</Label>
                <Input
                  id="lesson-homework"
                  placeholder="Exercise 4B, questions 1 to 6"
                  value={homework}
                  onChange={(e) => setHomework(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Engagement</Label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setEngagement(engagement === score ? null : score)}
                      aria-pressed={engagement === score}
                      className={cn(
                        "rounded-md border px-1 py-2 text-center text-xs transition-colors",
                        engagement === score
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:bg-muted",
                      )}
                    >
                      <span className="block text-sm font-semibold">{score}</span>
                      <span className="block text-[10px] opacity-80">{ENGAGEMENT_LABELS[score]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {usesSession ? "Confirm and use a session" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

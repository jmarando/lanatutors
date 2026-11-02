import { useMemo } from "react";
import { AlertTriangle, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CrmLesson, Enrolment } from "./crmTypes";
import { formatDay } from "./crmMeta";
import { computeProgress } from "./lessonsLogic";

interface StudentProgressProps {
  enrolments: Enrolment[];
  lessons: CrmLesson[];
}

interface Student {
  key: string;
  name: string;
  enrolmentIds: Set<string>;
  active: boolean;
}

function studentKey(e: Enrolment): string {
  return e.student_id ?? `name:${(e.student_name ?? "").trim().toLowerCase().replace(/\s+/g, " ")}`;
}

/** Per child: attendance, lessons this month, the last notes, engagement and whether to worry. */
export function StudentProgress({ enrolments, lessons }: StudentProgressProps) {
  const students = useMemo(() => {
    const map = new Map<string, Student>();
    for (const e of enrolments) {
      const key = studentKey(e);
      const existing = map.get(key) ?? {
        key,
        name: e.student_name || "Child",
        enrolmentIds: new Set<string>(),
        active: false,
      };
      existing.enrolmentIds.add(e.id);
      existing.active = existing.active || e.status === "active";
      map.set(key, existing);
    }
    return [...map.values()];
  }, [enrolments]);

  const now = useMemo(() => new Date(), []);

  if (students.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {students.map((student) => {
          const mine = lessons.filter((l) => l.enrolment_id && student.enrolmentIds.has(l.enrolment_id));
          const progress = computeProgress(mine, now, { active: student.active });
          const Trend =
            progress.engagementTrend === "up"
              ? TrendingUp
              : progress.engagementTrend === "down"
                ? TrendingDown
                : Minus;
          return (
            <div key={student.key} className="space-y-2.5 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{student.name}</p>
                {progress.atRisk && (
                  <Badge className="h-5 gap-1 border-amber-200 bg-amber-100 px-1.5 text-[10px] text-amber-800 hover:bg-amber-100">
                    <AlertTriangle className="h-3 w-3" /> At risk
                  </Badge>
                )}
              </div>

              {progress.atRisk && (
                <ul className="list-disc space-y-0.5 pl-4 text-xs text-amber-900">
                  {progress.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}

              {mine.length === 0 ? (
                <p className="text-xs text-muted-foreground">No lessons booked yet.</p>
              ) : (
                <>
                  <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <div>
                      <dt className="text-muted-foreground">Attendance</dt>
                      <dd className="text-sm font-semibold">
                        {progress.attendanceRate === null ? "—" : `${progress.attendanceRate}%`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">This month</dt>
                      <dd className="text-sm font-semibold">
                        {progress.deliveredThisMonth} of {progress.scheduledThisMonth}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Engagement</dt>
                      <dd className="flex items-center gap-1 text-sm font-semibold">
                        {progress.engagementAverage === null ? (
                          "—"
                        ) : (
                          <>
                            {progress.engagementAverage}
                            {progress.engagementTrend && (
                              <Trend
                                className="h-3.5 w-3.5 text-muted-foreground"
                                aria-label={`engagement is ${progress.engagementTrend === "steady" ? "steady" : progress.engagementTrend === "up" ? "rising" : "falling"}`}
                              />
                            )}
                          </>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Last lesson</dt>
                      <dd className="text-sm font-semibold">
                        {progress.lastLessonAt ? formatDay(progress.lastLessonAt) : "—"}
                      </dd>
                    </div>
                  </dl>

                  {progress.feedback.length > 0 && (
                    <ul className="space-y-1.5">
                      {progress.feedback.map((note) => (
                        <li key={note.at} className="rounded-md bg-muted/40 px-2.5 py-1.5 text-xs">
                          <span className="text-muted-foreground">
                            {formatDay(note.at)}
                            {note.tutor ? ` · ${note.tutor}` : ""}
                          </span>
                          {note.covered && <p>{note.covered}</p>}
                          {note.homework && <p className="text-muted-foreground">Homework: {note.homework}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

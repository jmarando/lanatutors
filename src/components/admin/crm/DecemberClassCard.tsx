import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatSlot } from "@/utils/holidayClasses";
import { classCode, classState, type ClassState, type DeskEnrolment, type HolderStage } from "@/utils/decemberDesk";
import { formatPhone } from "./crmMeta";
import type { DeskClass } from "./useDecemberDesk";

export interface HolderRow {
  key: string;
  familyId: string;
  child: string;
  parentName: string;
  phone: string | null;
  email: string | null;
  duplicate: boolean;
  stage: HolderStage;
  enrolment: DeskEnrolment | null;
}

const CHIP: Record<ClassState, { label: (needed: number) => string; className: string }> = {
  needs: { label: (n) => `Needs ${n} more`, className: "bg-amber-100 text-amber-800" },
  ready: { label: () => "Ready to open", className: "bg-emerald-100 text-emerald-800" },
  running: { label: () => "Running", className: "bg-primary/10 text-primary" },
  archived: { label: () => "Archived", className: "bg-muted text-muted-foreground" },
};

export interface ClassCardActions {
  onOpenClass: () => void;
  onArchive: () => void;
  /** Puts a running class back to taking reservations, or restores an archived one. */
  onReopenReservations: () => void;
  onEnrol: (row: HolderRow) => void;
  onPaymentMessage: (row: HolderRow) => void;
  onPaybill: (row: HolderRow) => void;
  onRelease: (row: HolderRow) => void;
  onLinks: (row: HolderRow) => void;
  onNotRunning: (row: HolderRow) => void;
}

interface DecemberClassCardProps extends ClassCardActions {
  cls: DeskClass;
  seats: number;
  holders: HolderRow[];
  checkNotes: boolean;
  /** Enrolments that include this class, and how many of them are paid. */
  enrolled: number;
  paid: number;
}

const small = "h-7 px-2 text-xs";

/** One class: its slot, tutor, seats and state, the families who hold the seats, and what the team can do with them. */
export function DecemberClassCard({ cls, seats, holders, checkNotes, enrolled, paid, ...actions }: DecemberClassCardProps) {
  const { state, needed } = classState(cls.status, seats);
  const chip = CHIP[state];
  const label = `${cls.grade_levels.join(" and ")} ${cls.subject}`;
  const hasEnrolments = enrolled > 0;
  const lockedTitle = hasEnrolments ? "Release its enrolments first" : undefined;

  return (
    <Card className={cn(state === "archived" && "opacity-70")} data-class-code={classCode(cls) ?? ""}>
      <CardHeader className="space-y-1 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">{cls.subject}</CardTitle>
            <p className="text-xs text-muted-foreground">{formatSlot(cls.time_slot)}</p>
          </div>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", chip.className)}>{chip.label(needed)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Tutor: {cls.tutor_name ?? "No tutor yet"} · Reserved {Math.max(seats, 0)} · Enrolled {enrolled} · Paid {paid} · of {cls.max_students}
          {checkNotes && <span className="ml-1 font-medium text-amber-700">· check the notes</span>}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {(state === "needs" || state === "ready") && (
            <Button size="sm" className={small} aria-label={`Open class ${label}`} onClick={actions.onOpenClass}>
              Open class
            </Button>
          )}
          {state === "running" && (
            <Button size="sm" variant="outline" className={small} aria-label={`Back to reserving ${label}`} disabled={hasEnrolments} title={lockedTitle} onClick={actions.onReopenReservations}>
              Back to reserving
            </Button>
          )}
          {state === "archived" && (
            <Button size="sm" variant="outline" className={small} aria-label={`Restore class ${label}`} onClick={actions.onReopenReservations}>
              Restore
            </Button>
          )}
          {state !== "archived" && (
            <Button size="sm" variant="outline" className={small} aria-label={`Archive class ${label}`} disabled={hasEnrolments} title={lockedTitle} onClick={actions.onArchive}>
              Archive
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {holders.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nobody has reserved yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {holders.map((h) => {
              const name = h.child || h.parentName;
              return (
                <li key={h.key} className="space-y-2 px-3 py-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {h.child || "(no name)"}
                        {h.duplicate && <span className="ml-2 text-xs font-normal text-amber-700">possible duplicate</span>}
                      </p>
                      <Link to={`/admin/families/${h.familyId}`} className="text-xs text-muted-foreground hover:underline">
                        {h.parentName}
                        {h.phone ? ` · ${formatPhone(h.phone)}` : ""}
                      </Link>
                    </div>
                    {h.stage !== "reserved" && (
                      <span className={cn("shrink-0 text-xs font-medium", h.stage === "paid" ? "text-emerald-700" : "text-amber-700")}>
                        {h.stage === "paid" ? "Paid" : "Enrolled, unpaid"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {state === "running" && h.stage === "reserved" && (
                      <Button size="sm" className={small} aria-label={`Enrol ${name}`} onClick={() => actions.onEnrol(h)}>
                        Enrol
                      </Button>
                    )}
                    {state === "running" && h.stage === "enrolled" && (
                      <>
                        <Button size="sm" variant="outline" className={small} aria-label={`Payment message for ${name}`} onClick={() => actions.onPaymentMessage(h)}>
                          Payment message
                        </Button>
                        <Button size="sm" variant="outline" className={small} aria-label={`Record paybill for ${name}`} onClick={() => actions.onPaybill(h)}>
                          Record paybill
                        </Button>
                        <Button size="sm" variant="outline" className={small} aria-label={`Release seat of ${name}`} onClick={() => actions.onRelease(h)}>
                          Release seat
                        </Button>
                      </>
                    )}
                    {state === "running" && h.stage === "paid" && (
                      <Button size="sm" variant="outline" className={small} aria-label={`Class links for ${name}`} onClick={() => actions.onLinks(h)}>
                        Class links
                      </Button>
                    )}
                    {state === "archived" && (
                      <Button size="sm" variant="outline" className={small} aria-label={`Message ${name}`} onClick={() => actions.onNotRunning(h)}>
                        Not-running message
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

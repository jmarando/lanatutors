import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatSlot } from "@/utils/holidayClasses";
import { classCode, classState, type ClassState } from "@/utils/decemberDesk";
import { formatPhone } from "./crmMeta";
import type { DeskClass } from "./useDecemberDesk";

export interface HolderRow {
  key: string;
  familyId: string;
  child: string;
  parentName: string;
  phone: string | null;
  duplicate: boolean;
}

const CHIP: Record<ClassState, { label: (needed: number) => string; className: string }> = {
  needs: { label: (n) => `Needs ${n} more`, className: "bg-amber-100 text-amber-800" },
  ready: { label: () => "Ready to open", className: "bg-emerald-100 text-emerald-800" },
  running: { label: () => "Running", className: "bg-primary/10 text-primary" },
  archived: { label: () => "Archived", className: "bg-muted text-muted-foreground" },
};

interface DecemberClassCardProps {
  cls: DeskClass;
  seats: number;
  holders: HolderRow[];
  checkNotes: boolean;
}

/** One class: its slot, tutor, seats and state, and the families who hold the seats. */
export function DecemberClassCard({ cls, seats, holders, checkNotes }: DecemberClassCardProps) {
  const { state, needed } = classState(cls.status, seats);
  const chip = CHIP[state];
  return (
    <Card className={cn(state === "archived" && "opacity-60")} data-class-code={classCode(cls) ?? ""}>
      <CardHeader className="space-y-1 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">{cls.subject}</CardTitle>
            <p className="text-xs text-muted-foreground">{formatSlot(cls.time_slot)}</p>
          </div>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", chip.className)}>{chip.label(needed)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Tutor: {cls.tutor_name ?? "No tutor yet"} · Reserved {Math.max(seats, 0)} of {cls.max_students}
          {checkNotes && <span className="ml-1 font-medium text-amber-700">· check the notes</span>}
        </p>
      </CardHeader>
      <CardContent>
        {holders.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nobody has reserved yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {holders.map((h) => (
              <li key={h.key} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 text-sm">
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
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

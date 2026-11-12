import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CrmShell } from "@/components/admin/crm/CrmShell";
import { DecemberClassCard, type HolderRow } from "@/components/admin/crm/DecemberClassCard";
import { useDecemberDesk } from "@/components/admin/crm/useDecemberDesk";
import { formatProgramRange, groupByGrade } from "@/utils/holidayClasses";
import {
  PAY_BY,
  RESERVATIONS_CLOSE,
  classCode,
  listsDisagree,
  readLists,
  shortDay,
  tallyNotes,
  type DecemberCode,
} from "@/utils/decemberDesk";

/** December: seats per class from the DEC26 timeline notes, and who holds them. */
export default function CrmDecember() {
  const desk = useDecemberDesk();
  const { program, classes, notes } = desk.data;

  const tally = useMemo(() => tallyNotes(notes), [notes]);
  const lists = useMemo(() => readLists(notes), [notes]);
  const disagree = useMemo(() => new Set(listsDisagree(tally, lists)), [tally, lists]);
  const families = useMemo(() => new Map(notes.flatMap((n) => (n.families ? [[n.family_id, n.families] as const] : []))), [notes]);
  const groups = useMemo(() => groupByGrade(classes), [classes]);

  const holdersOf = (code: DecemberCode | null): HolderRow[] =>
    code
      ? lists.held
          .filter((h) => h.code === code)
          .map((h, index) => ({
            key: `${h.familyId}-${h.child}-${index}`,
            familyId: h.familyId,
            child: h.child,
            parentName: families.get(h.familyId)?.parent_name || "Unknown parent",
            phone: families.get(h.familyId)?.phone ?? null,
            duplicate: lists.duplicates.some(
              (d) => d.familyId === h.familyId && d.code === h.code && d.child.trim().toLowerCase() === h.child.trim().toLowerCase(),
            ),
          }))
      : [];

  const subtitle = program
    ? `${formatProgramRange(program.start_date, program.end_date)} · reservations close ${shortDay(RESERVATIONS_CLOSE)} · pay by ${shortDay(PAY_BY)}`
    : undefined;

  return (
    <CrmShell
      title="December"
      subtitle={subtitle}
      active="december"
      actions={
        <Button variant="outline" size="sm" onClick={() => void desk.reload()} className="hidden sm:inline-flex">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      }
    >
      {desk.error ? (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-2">
            <p>Could not load the December desk: {desk.error}. The seat counts are not shown, so nothing here is zero by mistake.</p>
            <Button size="sm" variant="outline" onClick={() => void desk.reload()}>
              Try again
            </Button>
          </div>
        </div>
      ) : desk.loading && !program ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !program ? (
        <p className="py-6 text-sm text-muted-foreground">No December program is running, or it has already ended.</p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.grade} aria-label={group.grade}>
              <h2 className="text-base font-semibold">
                {group.grade}
                {group.exam && <span className="ml-2 text-sm font-normal text-muted-foreground">Heading for {group.exam}</span>}
              </h2>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                {group.classes.map((cls) => {
                  const code = classCode(cls);
                  const seats = tally.find((t) => t.code === code)?.seats ?? 0;
                  return (
                    <DecemberClassCard
                      key={cls.id}
                      cls={cls}
                      seats={seats}
                      holders={holdersOf(code)}
                      checkNotes={code !== null && disagree.has(code)}
                    />
                  );
                })}
              </div>
            </section>
          ))}

          {lists.unreadable.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Notes the desk could not read</CardTitle>
                <p className="text-xs text-muted-foreground">
                  They start with DEC26 but name no class code, so they count as no seat. Fix them on the family's timeline.
                </p>
              </CardHeader>
              <CardContent>
                <ul className="divide-y rounded-md border">
                  {lists.unreadable.map((u, index) => (
                    <li key={`${u.familyId}-${index}`} className="px-3 py-2 text-sm">
                      <p className="break-words">{u.text}</p>
                      <Link to={`/admin/families/${u.familyId}`} className="text-xs text-muted-foreground hover:underline">
                        {families.get(u.familyId)?.parent_name || "Open the family"}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </CrmShell>
  );
}

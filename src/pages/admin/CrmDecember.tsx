import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordPaybillDialog, type PaybillEnrollment } from "@/components/admin/RecordPaybillDialog";
import { CrmShell } from "@/components/admin/crm/CrmShell";
import { DecemberClassCard, type HolderRow } from "@/components/admin/crm/DecemberClassCard";
import { DecemberEnrolDialog, type EnrolTarget } from "@/components/admin/crm/DecemberEnrolDialog";
import { DecemberMessageDialog } from "@/components/admin/crm/DecemberMessageDialog";
import { releaseSeat, setClassStatus, type ClassStatus, type EnrolResult } from "@/components/admin/crm/decemberActions";
import { useDecemberDesk, type DeskClass } from "@/components/admin/crm/useDecemberDesk";
import { MIN_STUDENTS_TO_OPEN, formatProgramRange, groupByGrade } from "@/utils/holidayClasses";
import {
  PAY_BY,
  RESERVATIONS_CLOSE,
  buildLinksMessage,
  buildNotRunningMessage,
  buildPaymentMessage,
  childCodes,
  classCode,
  holderStage,
  listsDisagree,
  readLists,
  shortDay,
  tallyNotes,
  type DecemberCode,
  type DeskEnrolment,
  type MessageClass,
} from "@/utils/decemberDesk";

interface Confirm {
  title: string;
  body: string;
  label: string;
  done: string;
  run: () => Promise<string | null>;
}

interface Message {
  title: string;
  text: string;
  phone: string | null;
}

const gradeOf = (c: DeskClass): string => c.grade_levels.join(" and ");

const messageClass = (c: DeskClass): MessageClass => ({
  grade: gradeOf(c),
  subject: c.subject,
  slot: c.time_slot,
  tutorFirstName: c.tutor_name ? c.tutor_name.split(" ")[0] : null,
  meetingLink: c.meeting_link,
});

/** December: seats per class from the DEC26 notes, who holds them, and what the team does with them until the classes start. */
export default function CrmDecember() {
  const desk = useDecemberDesk();
  const { program, classes, notes, enrolments, children } = desk.data;

  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busy, setBusy] = useState(false);
  const [enrol, setEnrol] = useState<EnrolTarget | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [paybill, setPaybill] = useState<PaybillEnrollment | null>(null);

  const tally = useMemo(() => tallyNotes(notes), [notes]);
  const lists = useMemo(() => readLists(notes), [notes]);
  const disagree = useMemo(() => new Set(listsDisagree(tally, lists)), [tally, lists]);
  const families = useMemo(() => new Map(notes.flatMap((n) => (n.families ? [[n.family_id, n.families] as const] : []))), [notes]);
  const groups = useMemo(() => groupByGrade(classes), [classes]);

  const classById = (id: string) => classes.find((c) => c.id === id);
  const classesOf = (enrolment: DeskEnrolment): DeskClass[] =>
    enrolment.enrolled_class_ids.map(classById).filter((c): c is DeskClass => Boolean(c));

  const holdersOf = (cls: DeskClass, code: DecemberCode | null): HolderRow[] =>
    code
      ? lists.held
          .filter((h) => h.code === code)
          .map((h, index) => {
            const family = families.get(h.familyId);
            const { stage, enrolment } = holderStage({ holding: h, classId: cls.id, family, enrolments, children });
            return {
              key: `${h.familyId}-${h.child}-${index}`,
              familyId: h.familyId,
              child: h.child,
              parentName: family?.parent_name || "Unknown parent",
              phone: family?.phone ?? null,
              email: family?.email ?? null,
              duplicate: lists.duplicates.some(
                (d) => d.familyId === h.familyId && d.code === h.code && d.child.trim().toLowerCase() === h.child.trim().toLowerCase(),
              ),
              stage,
              enrolment,
            };
          })
      : [];

  // ---- class actions
  const changeStatus = (cls: DeskClass, status: ClassStatus, c: Pick<Confirm, "title" | "body" | "label" | "done">) =>
    setConfirm({ ...c, run: () => setClassStatus(cls.id, status) });

  const openClass = (cls: DeskClass, seats: number) => {
    const warnings = [
      seats < MIN_STUDENTS_TO_OPEN ? `It has ${Math.max(seats, 0)} of the ${MIN_STUDENTS_TO_OPEN} seats a class usually needs.` : "",
      !cls.tutor_name ? "It has no tutor yet." : "",
    ].filter(Boolean);
    changeStatus(cls, "confirmed", {
      title: `Open ${gradeOf(cls)} ${cls.subject}?`,
      body: `${warnings.join(" ")} The public page will say it is running, and the calendar sync will include it.`.trim(),
      label: "Open class",
      done: "Class opened",
    });
  };

  const archiveClass = (cls: DeskClass) =>
    changeStatus(cls, "archived", {
      title: `Archive ${gradeOf(cls)} ${cls.subject}?`,
      body: "It leaves the public page. The families who reserved can be sent the not-running message from this card.",
      label: "Archive class",
      done: "Class archived",
    });

  const reopenReservations = (cls: DeskClass) =>
    changeStatus(cls, "active", {
      title: `Take ${gradeOf(cls)} ${cls.subject} back to reservations?`,
      body: "The public page will say it opens when enough families reserve.",
      label: "Yes, take it back",
      done: "Class is taking reservations",
    });

  const runConfirmed = async () => {
    if (!confirm) return;
    setBusy(true);
    const problem = await confirm.run();
    setBusy(false);
    if (problem) {
      toast.error(problem);
      return;
    }
    toast.success(confirm.done);
    setConfirm(null);
    await desk.reload();
  };

  // ---- family actions
  const startEnrol = (row: HolderRow) => {
    const codes = childCodes(lists, row.familyId, row.child);
    setEnrol({
      familyId: row.familyId,
      parentName: row.parentName === "Unknown parent" ? "" : row.parentName,
      phone: row.phone ?? "",
      email: row.email ?? "",
      child: row.child,
      preselected: classes.filter((c) => c.status === "confirmed" && codes.includes(classCode(c) as DecemberCode)).map((c) => c.id),
    });
  };

  const showPaymentMessage = (
    who: { parentName: string; childName: string; phone: string | null },
    classIds: string[],
    amount: number,
  ) => {
    if (!program) return;
    setMessage({
      title: `Payment message for ${who.childName}`,
      phone: who.phone,
      text: buildPaymentMessage({
        parentName: who.parentName,
        childName: who.childName,
        classes: classIds.map(classById).filter((c): c is DeskClass => Boolean(c)).map(messageClass),
        startDate: program.start_date.slice(0, 10),
        amount,
        payBy: PAY_BY,
      }),
    });
  };

  const onEnrolled = async (result: EnrolResult, as: { parentName: string; childName: string; phone: string; classIds: string[] }) => {
    setEnrol(null);
    if (result.emailIsPlaceholder) {
      toast.warning("This family has no usable email, so the confirmation and daily reminders will not reach them. Send the class links on WhatsApp.");
    }
    showPaymentMessage({ parentName: as.parentName, childName: as.childName, phone: as.phone || null }, as.classIds, result.totalAmount);
    await desk.reload();
  };

  const paymentMessageFor = (row: HolderRow) => {
    if (!row.enrolment) return;
    showPaymentMessage(
      { parentName: row.parentName, childName: row.child || row.parentName, phone: row.phone },
      row.enrolment.enrolled_class_ids,
      Number(row.enrolment.total_amount),
    );
  };

  const recordPaybill = (row: HolderRow) => {
    if (!row.enrolment || !program) return;
    setPaybill({
      id: row.enrolment.id,
      totalAmount: Number(row.enrolment.total_amount),
      paymentStatus: row.enrolment.payment_status,
      who: row.child || row.parentName,
      subjects: classesOf(row.enrolment).map((c) => c.subject),
      programName: program.name,
    });
  };

  const release = (row: HolderRow) => {
    const enrolment = row.enrolment;
    if (!enrolment) return;
    setConfirm({
      title: `Release ${row.child || row.parentName}'s seats?`,
      body: "Deletes the unpaid enrolment and gives its seats back. Nothing has been paid on it.",
      label: "Release seats",
      done: "Seats released",
      run: () => releaseSeat(enrolment.id),
    });
  };

  const showLinks = (row: HolderRow) => {
    if (!row.enrolment) return;
    const text = buildLinksMessage({
      parentName: row.parentName,
      childName: row.child || row.parentName,
      classes: classesOf(row.enrolment).map(messageClass),
    });
    if (!text) {
      toast.info("No class has a meeting link yet. Generate the links in Bootcamp Admin first.");
      return;
    }
    setMessage({ title: `Class links for ${row.child || row.parentName}`, text, phone: row.phone });
  };

  const showNotRunning = (row: HolderRow, cls: DeskClass) =>
    setMessage({
      title: `Not-running message for ${row.child || row.parentName}`,
      phone: row.phone,
      text: buildNotRunningMessage({ parentName: row.parentName, childName: row.child || "your child", className: `${gradeOf(cls)} ${cls.subject}` }),
    });

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
                  const mine = enrolments.filter((e) => e.enrolled_class_ids.includes(cls.id));
                  return (
                    <DecemberClassCard
                      key={cls.id}
                      cls={cls}
                      seats={seats}
                      holders={holdersOf(cls, code)}
                      checkNotes={code !== null && disagree.has(code)}
                      enrolled={mine.length}
                      paid={mine.filter((e) => e.payment_status === "completed").length}
                      onOpenClass={() => openClass(cls, seats)}
                      onArchive={() => archiveClass(cls)}
                      onReopenReservations={() => reopenReservations(cls)}
                      onEnrol={startEnrol}
                      onPaymentMessage={paymentMessageFor}
                      onPaybill={recordPaybill}
                      onRelease={release}
                      onLinks={showLinks}
                      onNotRunning={(row) => showNotRunning(row, cls)}
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
                      <Link to={`/admin/crm/${u.familyId}`} className="text-xs text-muted-foreground hover:underline">
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

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && !busy && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void runConfirmed();
              }}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {confirm?.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {enrol && (
        <DecemberEnrolDialog
          target={enrol}
          runningClasses={classes.filter((c) => c.status === "confirmed")}
          onClose={() => setEnrol(null)}
          onEnrolled={onEnrolled}
        />
      )}

      <DecemberMessageDialog
        open={message !== null}
        onOpenChange={(open) => !open && setMessage(null)}
        title={message?.title ?? ""}
        text={message?.text ?? ""}
        phone={message?.phone ?? null}
      />

      <RecordPaybillDialog
        open={paybill !== null}
        onOpenChange={(open) => !open && setPaybill(null)}
        enrollment={paybill}
        onRecorded={() => void desk.reload()}
      />
    </CrmShell>
  );
}

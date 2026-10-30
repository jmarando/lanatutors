import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { RecordPaymentDialog } from "./RecordPaymentDialog";
import { crmDb } from "./crmTypes";
import type {
  Enrolment,
  EnrolmentBalance,
  EnrolmentStatus,
  ListedTutor,
  SessionPack,
} from "./crmTypes";
import { formatKes, isTopUpDue } from "./lessonsLogic";

interface SessionsCardProps {
  familyId: string;
  enrolments: Enrolment[];
  packs: SessionPack[];
  balances: EnrolmentBalance[];
  /** Set when the sessions queries failed, e.g. before the lessons migration is applied. */
  error: string | null;
  tutors: ListedTutor[];
  onChanged: () => void;
  /** Called after a payment is saved, so the page can suggest marking the lead won. */
  onRecorded: () => void;
}

const STATUS_LABELS: Record<EnrolmentStatus, string> = {
  active: "Active",
  paused: "Paused",
  ended: "Ended",
};

function packDate(paidOn: string | null): string {
  if (!paidOn) return "Date not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${paidOn}T00:00:00Z`));
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "warn" | "bad" }) {
  return (
    <div className="rounded-md bg-muted/40 px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-sm font-semibold",
          tone === "warn" && "text-amber-700",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * The children and subjects a family pays for, with sessions left, the credit they still hold and
 * every pack with its M-Pesa reference. Record payment lives here.
 */
export function SessionsCard({
  familyId,
  enrolments,
  packs,
  balances,
  error,
  tutors,
  onChanged,
  onRecorded,
}: SessionsCardProps) {
  const [paying, setPaying] = useState<{ enrolmentId: string | null } | null>(null);
  const [openPacks, setOpenPacks] = useState<Record<string, boolean>>({});

  const balanceById = useMemo(() => new Map(balances.map((b) => [b.enrolment_id, b])), [balances]);
  const packsById = useMemo(() => {
    const map = new Map<string, SessionPack[]>();
    for (const pack of packs) map.set(pack.enrolment_id, [...(map.get(pack.enrolment_id) ?? []), pack]);
    return map;
  }, [packs]);
  const tutorName = (id: string | null) => tutors.find((t) => t.id === id)?.name;
  const credit = balances.reduce((sum, b) => sum + Number(b.balance), 0);

  const setStatus = async (enrolmentId: string, status: EnrolmentStatus) => {
    const { error: err } = await crmDb.from("enrolments").update({ status }).eq("id", enrolmentId);
    if (err) {
      toast.error(`Could not change the status: ${err.message}`);
      return;
    }
    toast.success(`Marked ${STATUS_LABELS[status].toLowerCase()}`);
    onChanged();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">Sessions</CardTitle>
            {enrolments.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {enrolments.length} {enrolments.length === 1 ? "child and subject" : "children and subjects"}
                {" · "}
                {credit < 0 ? `owes ${formatKes(-credit)}` : `${formatKes(credit)} credit held`}
              </p>
            )}
          </div>
          <Button size="sm" onClick={() => setPaying({ enrolmentId: null })} disabled={Boolean(error)}>
            <Plus className="h-4 w-4" /> Record payment
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Sessions could not be loaded: {error}</span>
          </p>
        ) : enrolments.length === 0 ? (
          <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
            No children or subjects yet. Record the first payment to add one; lessons booked for this family
            are matched to it automatically.
          </p>
        ) : (
          enrolments.map((enrolment) => {
            const balance = balanceById.get(enrolment.id);
            const history = packsById.get(enrolment.id) ?? [];
            const left = balance?.sessions_left ?? 0;
            const due = balance ? isTopUpDue(balance) : false;
            const tutor = balance?.tutor_name ?? tutorName(enrolment.tutor_id);
            const expanded = Boolean(openPacks[enrolment.id]);
            return (
              <div key={enrolment.id} className="space-y-3 rounded-lg border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {enrolment.student_name || "Child"} · {enrolment.subject}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tutor ? `with ${tutor}` : "No tutor chosen yet"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {due && (
                      <Badge className="h-5 border-amber-200 bg-amber-100 px-1.5 text-[10px] text-amber-800 hover:bg-amber-100">
                        Top-up due
                      </Badge>
                    )}
                    <Select
                      value={enrolment.status}
                      onValueChange={(value) => void setStatus(enrolment.id, value as EnrolmentStatus)}
                    >
                      <SelectTrigger className="h-7 w-[6.5rem] text-xs" aria-label="Status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS_LABELS) as EnrolmentStatus[]).map((status) => (
                          <SelectItem key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Metric
                    label="Sessions left"
                    value={left < 0 ? `${-left} over` : String(left)}
                    tone={left < 0 ? "bad" : left <= 1 && (balance?.sessions_bought ?? 0) > 0 ? "warn" : undefined}
                  />
                  <Metric
                    label={Number(balance?.balance ?? 0) < 0 ? "Owes" : "Credit held"}
                    value={formatKes(Math.abs(Number(balance?.balance ?? 0)))}
                    tone={Number(balance?.balance ?? 0) < 0 ? "bad" : undefined}
                  />
                  <Metric label="Rate" value={formatKes(balance?.rate_per_session ?? enrolment.rate_per_session)} />
                  <Metric label="Paid so far" value={formatKes(balance?.amount_paid ?? 0)} />
                </div>

                {(balance?.unpriced_lessons ?? 0) > 0 && (
                  <p className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      {balance?.unpriced_lessons} lesson{balance?.unpriced_lessons === 1 ? " was" : "s were"} confirmed
                      before a payment was recorded. They use the next pack, and the tutor's pay is set then.
                    </span>
                  </p>
                )}

                {enrolment.opening_tutor_pay_kes != null && (
                  <p className="text-[11px] text-muted-foreground">
                    Tutor pay before the CRM: {formatKes(enrolment.opening_tutor_pay_kes)}, paid{" "}
                    {formatKes(enrolment.opening_tutor_paid_kes ?? 0)}
                    {enrolment.opening_tutor_reference ? ` (${enrolment.opening_tutor_reference})` : ""}.
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPaying({ enrolmentId: enrolment.id })}
                  >
                    <Plus className="h-4 w-4" /> Payment
                  </Button>
                  {history.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setOpenPacks((prev) => ({ ...prev, [enrolment.id]: !expanded }))}
                      aria-expanded={expanded}
                    >
                      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {history.length} {history.length === 1 ? "payment" : "payments"}
                    </Button>
                  )}
                </div>

                {expanded && (
                  <ul className="divide-y rounded-md border text-xs">
                    {history.map((pack) => (
                      <li key={pack.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-2.5 py-2">
                        <span className="font-medium">
                          {formatKes(pack.amount_kes)} · {pack.sessions_bought}{" "}
                          {pack.sessions_bought === 1 ? "session" : "sessions"}
                        </span>
                        <span className="text-muted-foreground">
                          {pack.sessions_used} used · {formatKes(pack.rate_per_session)} each
                        </span>
                        <span className="w-full text-muted-foreground">
                          {packDate(pack.paid_on)}
                          {pack.reference ? ` · ref ${pack.reference}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </CardContent>

      <RecordPaymentDialog
        open={paying !== null}
        onOpenChange={(open) => {
          if (!open) setPaying(null);
        }}
        familyId={familyId}
        enrolments={enrolments}
        defaultEnrolmentId={paying?.enrolmentId ?? null}
        tutors={tutors}
        onRecorded={() => {
          onChanged();
          onRecorded();
        }}
      />
    </Card>
  );
}

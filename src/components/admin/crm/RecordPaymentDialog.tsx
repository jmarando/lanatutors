import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Banknote, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Enrolment, ListedTutor } from "./crmTypes";
import { crmDb } from "./crmTypes";
import { nairobiDate } from "./crmMeta";
import { formatKes, parseSessions } from "./lessonsLogic";

const NEW_ENROLMENT = "__new__";
const NO_TUTOR = "__none__";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: string;
  enrolments: Enrolment[];
  /** The child and subject to pre-select, when opened from one of their blocks. */
  defaultEnrolmentId?: string | null;
  tutors: ListedTutor[];
  onRecorded: () => void;
}

/** "KES 24,000", "24 000" and "24000" all read as 24000. */
function parseMoney(text: string): number {
  const cleaned = text.replace(/kes|kshs?\.?/gi, "").replace(/[,\s]/g, "");
  return cleaned === "" ? NaN : Number(cleaned);
}

function describe(e: Enrolment): string {
  return [e.student_name || "Child", e.subject].join(" · ");
}

/**
 * Record money the family already paid by M-Pesa or bank: a new pack of sessions for a child and
 * subject. Nothing is charged here. The rate fills in as amount ÷ sessions until it is typed over.
 */
export function RecordPaymentDialog({
  open,
  onOpenChange,
  familyId,
  enrolments,
  defaultEnrolmentId,
  tutors,
  onRecorded,
}: RecordPaymentDialogProps) {
  const [target, setTarget] = useState<string>(NEW_ENROLMENT);
  const [childName, setChildName] = useState("");
  const [subject, setSubject] = useState("");
  const [tutorId, setTutorId] = useState<string>(NO_TUTOR);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState(nairobiDate());
  const [sessions, setSessions] = useState("");
  const [rate, setRate] = useState("");
  const [rateTouched, setRateTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTarget(defaultEnrolmentId ?? enrolments[0]?.id ?? NEW_ENROLMENT);
    setChildName("");
    setSubject("");
    setTutorId(NO_TUTOR);
    setAmount("");
    setReference("");
    setPaidOn(nairobiDate());
    setSessions("");
    setRate("");
    setRateTouched(false);
  }, [open, defaultEnrolmentId, enrolments]);

  const amountValue = parseMoney(amount);
  const sessionsValue = parseSessions(sessions);
  const autoRate =
    amountValue > 0 && sessionsValue > 0 ? Math.round((amountValue / sessionsValue) * 100) / 100 : null;
  const rateShown = rateTouched ? rate : autoRate !== null ? String(autoRate) : "";
  const creating = target === NEW_ENROLMENT;

  const save = async () => {
    if (!(amountValue > 0)) {
      toast.error("Enter the amount that was paid");
      return;
    }
    if (!(sessionsValue > 0)) {
      toast.error("Enter how many sessions were bought, for example 8 or 8.5");
      return;
    }
    if (creating && !subject.trim()) {
      toast.error("Which subject is this payment for?");
      return;
    }
    const rateValue = rateTouched ? parseMoney(rate) : null;
    if (rateTouched && !(rateValue !== null && rateValue >= 0)) {
      toast.error("The rate per session is not a number");
      return;
    }

    setSaving(true);
    let enrolmentId = target;
    let createdId: string | null = null;
    if (creating) {
      const { data, error } = await crmDb
        .from("enrolments")
        .insert({
          family_id: familyId,
          student_name: childName.trim() || null,
          subject: subject.trim(),
          tutor_id: tutorId === NO_TUTOR ? null : tutorId,
        })
        .select("id")
        .single();
      if (error || !data) {
        setSaving(false);
        toast.error(`Could not add the child and subject: ${error?.message ?? "no answer"}`);
        return;
      }
      enrolmentId = data.id;
      createdId = data.id;
    }

    const { error } = await crmDb.rpc("crm_record_payment", {
      p_enrolment_id: enrolmentId,
      p_amount_kes: amountValue,
      p_reference: reference.trim() || null,
      p_paid_on: paidOn || null,
      p_sessions_bought: sessionsValue,
      p_rate_per_session: rateValue,
    });
    if (error) {
      // Do not leave an empty child and subject behind when the payment itself failed.
      if (createdId) await crmDb.from("enrolments").delete().eq("id", createdId);
      setSaving(false);
      toast.error(`Could not record the payment: ${error.message}`);
      return;
    }
    setSaving(false);
    toast.success(
      `Recorded ${formatKes(amountValue)} for ${sessionsValue} session${sessionsValue === 1 ? "" : "s"}`,
    );
    onOpenChange(false);
    onRecorded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>
            Money the family already paid by M-Pesa or bank. Nothing is charged here. It becomes a pack of
            sessions that lessons use, oldest first.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Child and subject</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {enrolments.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {describe(e)}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_ENROLMENT}>+ A new child or subject</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {creating && (
            <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pay-child">Child</Label>
                <Input
                  id="pay-child"
                  placeholder="Amani"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-subject">Subject</Label>
                <Input
                  id="pay-subject"
                  placeholder="Maths"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Tutor</Label>
                <Select value={tutorId} onValueChange={setTutorId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TUTOR}>Not chosen yet</SelectItem>
                    {tutors.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Lessons booked with this tutor for this child and subject are matched to it automatically.
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pay-amount">Amount paid (KES)</Label>
              <Input
                id="pay-amount"
                inputMode="decimal"
                placeholder="24000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-sessions">Sessions bought</Label>
              <Input
                id="pay-sessions"
                inputMode="decimal"
                placeholder="8"
                value={sessions}
                onChange={(e) => setSessions(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Half sessions are fine, for example 8.5.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-rate">Rate per session (KES)</Label>
              <Input
                id="pay-rate"
                inputMode="decimal"
                placeholder="Amount ÷ sessions"
                value={rateShown}
                onChange={(e) => {
                  setRate(e.target.value);
                  setRateTouched(true);
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                Tutor pay is 70% of this, per session taken. Type over it if you agreed a different rate.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-date">Date paid</Label>
              <Input
                id="pay-date"
                type="date"
                max={nairobiDate()}
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pay-ref">M-Pesa or bank reference</Label>
              <Input
                id="pay-ref"
                placeholder="UJR0ABC123"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

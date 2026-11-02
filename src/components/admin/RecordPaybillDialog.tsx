import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export interface PaybillEnrollment {
  id: string;
  totalAmount: number;
  paymentStatus: string;
  who: string;
  subjects: string[];
  programName: string;
}

interface RecordPaybillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollment: PaybillEnrollment | null;
  onRecorded: () => void;
}

// The server says why it refused (the amount is more than is owed, the reference is used already); the invoke
// error only carries the response, so read the message out of it.
async function messageFrom(error: unknown): Promise<string> {
  const response = (error as { context?: Response } | null)?.context;
  if (response && typeof response.json === "function") {
    try {
      const body = await response.json();
      if (body?.error) return String(body.error);
    } catch {
      // not JSON: fall through to the generic message
    }
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

/**
 * Record a payment a family made to the paybill. The browser cannot write payments, so this calls the
 * record-intensive-payment function, which also marks the enrolment paid and sends the confirmation email.
 */
export function RecordPaybillDialog({ open, onOpenChange, enrollment, onRecorded }: RecordPaybillDialogProps) {
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [received, setReceived] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [saving, setSaving] = useState(false);

  // A deposit is 30% of the total, so what is left after one is 70%. The server checks the real balance.
  useEffect(() => {
    if (!open || !enrollment) return;
    const owed = enrollment.paymentStatus === "deposit_paid" ? Math.round(enrollment.totalAmount * 0.7) : enrollment.totalAmount;
    setAmount(String(owed));
    setReference("");
    setReceived(format(new Date(), "yyyy-MM-dd"));
    setSendEmail(true);
  }, [open, enrollment]);

  if (!enrollment) return null;

  const save = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter the amount received");
      return;
    }
    if (reference.trim().length < 4) {
      toast.error("Enter the M-Pesa reference from the payment message");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("record-intensive-payment", {
      body: {
        enrollmentId: enrollment.id,
        amount: value,
        reference: reference.trim(),
        receivedOn: received || undefined,
        sendEmail,
      },
    });
    setSaving(false);
    if (error) {
      toast.error(await messageFrom(error));
      return;
    }
    if (data?.already_recorded) {
      toast.success("That payment was already recorded");
    } else if (data?.status === "completed") {
      toast.success(
        data.email_sent
          ? "Payment recorded. The enrolment is paid and the confirmation email was sent"
          : sendEmail
            ? "Payment recorded and the enrolment is paid, but the confirmation email did not send. Tell the family another way"
            : "Payment recorded and the enrolment is paid",
      );
    } else {
      toast.success(`Part payment recorded. The balance is KES ${Number(data?.balance ?? 0).toLocaleString()}`);
    }
    onOpenChange(false);
    onRecorded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a paybill payment</DialogTitle>
          <DialogDescription>
            {enrollment.who}: {enrollment.subjects.join(", ") || "no classes"}
            {enrollment.programName ? ` (${enrollment.programName})` : ""}. Total KES {enrollment.totalAmount.toLocaleString()}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="paybill-amount">Amount received (KES)</Label>
            <Input
              id="paybill-amount"
              type="number"
              inputMode="decimal"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Less than the total records a part payment. The enrolment is marked paid once the total is covered.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paybill-reference">M-Pesa reference</Label>
            <Input
              id="paybill-reference"
              autoComplete="off"
              placeholder="From the payment message, e.g. SBK3F9XXXX"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paybill-date">Date received</Label>
            <Input
              id="paybill-date"
              type="date"
              max={format(new Date(), "yyyy-MM-dd")}
              value={received}
              onChange={(e) => setReceived(e.target.value)}
            />
          </div>
          <div className="flex items-start gap-2">
            <Checkbox id="paybill-email" checked={sendEmail} onCheckedChange={(checked) => setSendEmail(checked === true)} />
            <Label htmlFor="paybill-email" className="text-sm font-normal leading-snug">
              Send the confirmation email when this completes the payment
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

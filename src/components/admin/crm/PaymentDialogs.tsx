import { useState } from "react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SessionPack } from "./crmTypes";
import { crmDb } from "./crmTypes";
import { nairobiDate } from "./crmMeta";
import { formatKes } from "./lessonsLogic";

/** What a payment is called in these dialogs: "KES 24,000 for 8 sessions (Amani · Maths)". */
function paymentLabel(pack: SessionPack, whose: string): string {
  const sessions = Number(pack.sessions_bought);
  return `${formatKes(pack.amount_kes)} for ${sessions} ${sessions === 1 ? "session" : "sessions"} (${whose})`;
}

interface EditPaymentDialogProps {
  pack: SessionPack | null;
  /** The child and subject the payment is for, e.g. "Amani · Maths". */
  whose: string;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

/**
 * Fix a typo in a payment's M-Pesa reference or date. The amount, sessions, rate and child stay as
 * recorded: tutor pay is priced from them when lessons are confirmed. The database refuses those
 * changes too and writes a line on the family timeline saying what was corrected.
 */
export function EditPaymentDialog({ pack, whose, onOpenChange, onSaved }: EditPaymentDialogProps) {
  // The page gives this dialog a key per payment, so these start from that payment on the first render.
  const [reference, setReference] = useState(pack?.reference ?? "");
  const [paidOn, setPaidOn] = useState(pack?.paid_on ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!pack) return;
    const nextReference = reference.trim() || null;
    const nextPaidOn = paidOn || null;
    if (nextReference === (pack.reference ?? null) && nextPaidOn === (pack.paid_on ?? null)) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    const { data, error } = await crmDb
      .from("session_packs")
      .update({ reference: nextReference, paid_on: nextPaidOn })
      .eq("id", pack.id)
      .select("id");
    setSaving(false);
    if (error || !data?.length) {
      toast.error(`Could not correct the payment: ${error?.message ?? "nothing was saved"}`);
      return;
    }
    toast.success("Payment corrected");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={pack !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Correct a payment</DialogTitle>
          <DialogDescription>
            {pack ? paymentLabel(pack, whose) : ""}. You can fix the date and the reference here. To change the
            amount or the sessions, remove the payment and record it again.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-pay-date">Date paid</Label>
            <Input
              id="edit-pay-date"
              type="date"
              max={nairobiDate()}
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-pay-ref">M-Pesa or bank reference</Label>
            <Input
              id="edit-pay-ref"
              placeholder="UJR0ABC123"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save correction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RemovePaymentDialogProps {
  pack: SessionPack | null;
  whose: string;
  onOpenChange: (open: boolean) => void;
  onRemoved: () => void;
}

/**
 * Take away a payment that was entered by mistake. The database keeps it when lessons have already used
 * it, and the family timeline keeps a line saying what was removed.
 */
export function RemovePaymentDialog({ pack, whose, onOpenChange, onRemoved }: RemovePaymentDialogProps) {
  const [removing, setRemoving] = useState(false);

  const remove = async () => {
    if (!pack) return;
    setRemoving(true);
    const { data, error } = await crmDb.from("session_packs").delete().eq("id", pack.id).select("id");
    setRemoving(false);
    if (error || !data?.length) {
      toast.error(`Could not remove the payment: ${error?.message ?? "nothing was removed"}`);
      return;
    }
    toast.success("Payment removed");
    onOpenChange(false);
    onRemoved();
  };

  return (
    <Dialog open={pack !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove this payment?</DialogTitle>
          <DialogDescription>
            {pack ? paymentLabel(pack, whose) : ""}
            {pack?.reference ? `, ref ${pack.reference}` : ""}. Use this for a payment entered by mistake. The
            family's timeline keeps a line saying it was removed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Keep it
          </Button>
          <Button variant="destructive" onClick={remove} disabled={removing}>
            {removing && <Loader2 className="h-4 w-4 animate-spin" />}
            Remove payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatSlot, seatsLeft } from "@/utils/holidayClasses";
import { DEFAULT_FEE_PER_SUBJECT } from "@/utils/decemberDesk";
import { enrolFamily, type EnrolResult } from "./decemberActions";
import type { DeskClass } from "./useDecemberDesk";

export interface EnrolTarget {
  familyId: string;
  parentName: string;
  phone: string;
  email: string;
  child: string;
  /** Ids of the running classes the child holds a seat in. */
  preselected: string[];
}

export interface EnrolledAs {
  parentName: string;
  childName: string;
  phone: string;
  classIds: string[];
}

interface DecemberEnrolDialogProps {
  target: EnrolTarget;
  runningClasses: DeskClass[];
  onClose: () => void;
  onEnrolled: (result: EnrolResult, as: EnrolledAs) => void;
}

/**
 * Enrol a reserved child in the classes that are running: the family's login, the child's record and the enrolment are made in
 * one step by enrol-december-family. Render it only while a target is chosen; it starts from the target when it mounts.
 */
export function DecemberEnrolDialog({ target, runningClasses, onClose, onEnrolled }: DecemberEnrolDialogProps) {
  const [parentName, setParentName] = useState(target.parentName);
  const [phone, setPhone] = useState(target.phone);
  const [email, setEmail] = useState(target.email);
  const [child, setChild] = useState(target.child);
  const [picked, setPicked] = useState<string[]>(target.preselected);
  const [fee, setFee] = useState(String(DEFAULT_FEE_PER_SUBJECT));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setParentName(target.parentName);
    setPhone(target.phone);
    setEmail(target.email);
    setChild(target.child);
    setPicked(target.preselected);
    setFee(String(DEFAULT_FEE_PER_SUBJECT));
  }, [target]);

  const feeNumber = Number(fee);
  const total = Number.isFinite(feeNumber) && feeNumber > 0 ? feeNumber * picked.length : 0;
  const ready = child.trim().length >= 2 && picked.length > 0 && Number.isFinite(feeNumber) && feeNumber > 0;

  const toggle = (id: string, on: boolean) => setPicked((current) => (on ? [...current, id] : current.filter((c) => c !== id)));

  const save = async () => {
    setSaving(true);
    const outcome = await enrolFamily({
      familyId: target.familyId,
      childName: child.trim(),
      classIds: picked,
      feePerSubject: feeNumber,
      parentName: parentName.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
    });
    setSaving(false);
    if ("error" in outcome) {
      toast.error(outcome.error);
      return;
    }
    toast.success(outcome.result.alreadyEnrolled ? "Already enrolled in these classes" : "Enrolled. The seats are held");
    onEnrolled(outcome.result, { parentName: parentName.trim(), childName: child.trim(), phone: phone.trim(), classIds: picked });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enrol {target.child || "this child"}</DialogTitle>
          <DialogDescription>
            Makes the family's login if it has none, the child's record and the enrolment. The seats are held until it is paid or released.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="enrol-parent">Parent</Label>
              <Input id="enrol-parent" value={parentName} onChange={(e) => setParentName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="enrol-phone">Phone</Label>
              <Input id="enrol-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="enrol-email">Email (optional)</Label>
            <Input id="enrol-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {!email.trim() && (
              <p className="text-xs text-amber-700">
                With no email the confirmation and the daily reminders will not reach this family. Send them the class links on WhatsApp.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="enrol-child">Child</Label>
            <Input id="enrol-child" value={child} onChange={(e) => setChild(e.target.value)} />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Classes that are running</legend>
            {runningClasses.length === 0 && <p className="text-xs text-muted-foreground">No class is running yet. Open one first.</p>}
            {runningClasses.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <Checkbox
                  id={`enrol-class-${c.id}`}
                  aria-label={`${c.grade_levels.join(" and ")} ${c.subject}`}
                  checked={picked.includes(c.id)}
                  onCheckedChange={(on) => toggle(c.id, on === true)}
                />
                <Label htmlFor={`enrol-class-${c.id}`} className="text-sm font-normal">
                  {c.grade_levels.join(" and ")} {c.subject} · {formatSlot(c.time_slot)}
                  <span className="ml-1 text-xs text-muted-foreground">({seatsLeft(c)} seats left)</span>
                </Label>
              </div>
            ))}
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="enrol-fee">Fee per subject (KES)</Label>
            <Input id="enrol-fee" type="number" inputMode="decimal" min="1" value={fee} onChange={(e) => setFee(e.target.value)} />
            <p className="text-xs text-muted-foreground">Total KES {total.toLocaleString("en-US")} for {picked.length} {picked.length === 1 ? "subject" : "subjects"}.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !ready}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enrol
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

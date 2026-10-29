import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Lead, LostReason } from "./crmTypes";
import { crmDb } from "./crmTypes";
import { LOST_REASONS, metaStageFor } from "./crmMeta";
import { sendCrmEvent, splitName } from "@/utils/metaCrm";

interface CloseLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  familyName: string | null;
  familyPhone: string | null;
  outcome: "won" | "lost";
  onClosed: () => void;
}

/** Close a lead as Won or Lost. A lost lead needs a reason. */
export function CloseLeadDialog({
  open,
  onOpenChange,
  lead,
  familyName,
  familyPhone,
  outcome,
  onClosed,
}: CloseLeadDialogProps) {
  const [reason, setReason] = useState<LostReason | "">(lead.lost_reason ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setReason(lead.lost_reason ?? "");
  }, [open, lead.lost_reason]);

  const save = async () => {
    if (outcome === "lost" && !reason) {
      toast.error("Pick a reason so the loss can be learnt from");
      return;
    }
    setSaving(true);
    const { error } = await crmDb
      .from("leads")
      .update({
        stage: outcome,
        lost_reason: outcome === "lost" ? (reason as LostReason) : null,
        next_step: null,
        next_step_at: null,
        needs_reply: false,
      })
      .eq("id", lead.id);
    setSaving(false);
    if (error) {
      toast.error(`Could not close the lead: ${error.message}`);
      return;
    }
    const meta = metaStageFor(outcome);
    if (meta) {
      const name = splitName(familyName);
      void sendCrmEvent(meta, {
        recordId: lead.id,
        phone: familyPhone,
        firstName: name.firstName,
        lastName: name.lastName,
      });
    }
    toast.success(outcome === "won" ? "Lead marked won" : "Lead marked lost");
    onOpenChange(false);
    onClosed();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {outcome === "won" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <XCircle className="h-5 w-5 text-rose-600" />
            )}
            Mark this lead {outcome === "won" ? "won" : "lost"}
          </DialogTitle>
          <DialogDescription>
            {outcome === "won"
              ? "The family is active. Lessons and payments come next in the shared record."
              : "The lead closes. The reason is kept so the pipeline can be learnt from."}
          </DialogDescription>
        </DialogHeader>

        {outcome === "lost" && (
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as LostReason)}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a reason" />
              </SelectTrigger>
              <SelectContent>
                {LOST_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={outcome === "won" ? "default" : "destructive"}
            onClick={save}
            disabled={saving}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {outcome === "won" ? "Mark won" : "Mark lost"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

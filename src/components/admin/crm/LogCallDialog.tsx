import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, PhoneCall } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Lead, TeamMember } from "./crmTypes";
import { crmDb } from "./crmTypes";
import { fromLocalInput, toLocalInput } from "./crmMeta";

interface LogCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  team: TeamMember[];
  onLogged: () => void;
}

const OUTCOMES = [
  { value: "reached", label: "Spoke to the family" },
  { value: "no_answer", label: "No answer" },
  { value: "wrong_number", label: "Wrong number" },
  { value: "callback", label: "Asked for a callback" },
];

const UNASSIGNED = "unassigned";

/** Log a call: the note lands on the timeline and the lead moves to Contacted. */
export function LogCallDialog({ open, onOpenChange, lead, team, onLogged }: LogCallDialogProps) {
  const [outcome, setOutcome] = useState("reached");
  const [note, setNote] = useState("");
  const [step, setStep] = useState("");
  const [when, setWhen] = useState("");
  const [who, setWho] = useState(UNASSIGNED);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setOutcome("reached");
      setNote("");
      setStep(lead.next_step ?? "");
      setWhen(toLocalInput(lead.next_step_at));
      setWho(lead.next_step_owner_id ?? UNASSIGNED);
    }
  }, [open, lead.id, lead.next_step, lead.next_step_at, lead.next_step_owner_id]);

  const save = async () => {
    const body = note.trim();
    if (!body && outcome === "reached") {
      toast.error("Write a line about the call");
      return;
    }
    setSaving(true);
    const { error } = await crmDb.from("lead_activities").insert({
      family_id: lead.family_id,
      lead_id: lead.id,
      kind: "call",
      body: body || `Call: ${OUTCOMES.find((o) => o.value === outcome)?.label}`,
      meta: { outcome },
    });
    if (error) {
      setSaving(false);
      toast.error(`Could not log the call: ${error.message}`);
      return;
    }
    if (step.trim() || when) {
      const { error: patchError } = await crmDb
        .from("leads")
        .update({
          next_step: step.trim() || null,
          next_step_at: fromLocalInput(when),
          next_step_owner_id: who === UNASSIGNED ? null : who,
        })
        .eq("id", lead.id);
      if (patchError) {
        setSaving(false);
        toast.error(`Call saved, but the next step failed: ${patchError.message}`);
        onLogged();
        return;
      }
    }
    setSaving(false);
    toast.success("Call logged");
    onOpenChange(false);
    onLogged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log a call</DialogTitle>
          <DialogDescription>
            The note goes on the family timeline. A reached call moves the lead to Contacted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Outcome</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTCOMES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="call-note">What was said</Label>
            <Textarea
              id="call-note"
              rows={3}
              placeholder="Wants maths for Grade 8, evenings. Sending a package."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="call-next">Next step</Label>
              <Input
                id="call-next"
                placeholder="Send the package on WhatsApp"
                value={step}
                onChange={(e) => setStep(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="call-when">When</Label>
              <Input
                id="call-when"
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Who</Label>
              <Select value={who} onValueChange={setWho}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Nobody yet</SelectItem>
                  {team.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
            Save call
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

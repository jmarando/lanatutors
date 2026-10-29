import { useEffect, useState } from "react";
import { CalendarClock, Loader2, Save } from "lucide-react";
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
import type { Lead, TeamMember } from "./crmTypes";
import { dueState, fromLocalInput, toLocalInput } from "./crmMeta";
import { cn } from "@/lib/utils";

interface NextStepEditorProps {
  lead: Lead;
  team: TeamMember[];
  saving: boolean;
  onSave: (patch: {
    next_step: string | null;
    next_step_at: string | null;
    next_step_owner_id: string | null;
  }) => void;
}

const UNASSIGNED = "unassigned";

/** The next step: what, when and who. A lead without one shows up on Today. */
export function NextStepEditor({ lead, team, saving, onSave }: NextStepEditorProps) {
  const [step, setStep] = useState(lead.next_step ?? "");
  const [when, setWhen] = useState(toLocalInput(lead.next_step_at));
  const [who, setWho] = useState(lead.next_step_owner_id ?? UNASSIGNED);

  useEffect(() => {
    setStep(lead.next_step ?? "");
    setWhen(toLocalInput(lead.next_step_at));
    setWho(lead.next_step_owner_id ?? UNASSIGNED);
  }, [lead.id, lead.next_step, lead.next_step_at, lead.next_step_owner_id]);

  const due = dueState(lead.next_step_at);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        Next step
        {due !== "none" && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
              due === "overdue" && "bg-destructive/10 text-destructive",
              due === "today" && "bg-amber-100 text-amber-800",
              due === "later" && "bg-muted text-muted-foreground",
            )}
          >
            {due}
          </span>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="next-step" className="text-xs">
            What happens next
          </Label>
          <Input
            id="next-step"
            placeholder="Call back about the Grade 8 maths package"
            value={step}
            onChange={(e) => setStep(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="next-step-at" className="text-xs">
            When
          </Label>
          <Input
            id="next-step-at"
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Who</Label>
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

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          A lead with no next step is flagged on Today.
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() =>
            onSave({
              next_step: step.trim() || null,
              next_step_at: step.trim() ? fromLocalInput(when) : null,
              next_step_owner_id: who === UNASSIGNED ? null : who,
            })
          }
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </div>
    </div>
  );
}

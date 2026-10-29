import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarCheck, ExternalLink, Loader2, Save } from "lucide-react";
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
import type { Lead, ListedTutor } from "./crmTypes";
import { crmDb } from "./crmTypes";
import { fromLocalInput, toLocalInput } from "./crmMeta";
import { sendCrmEvent, splitName } from "@/utils/metaCrm";
import type { Stage } from "./crmTypes";

interface AssessmentCardProps {
  lead: Lead;
  familyName: string | null;
  familyPhone: string | null;
  tutors: ListedTutor[];
  meetingLink: string | null;
  onSaved: () => void;
}

const NO_TUTOR = "none";

/** The assessment call: time, link, outcome, and what was quoted. Saving moves the lead to Call done. */
export function AssessmentCard({
  lead,
  familyName,
  familyPhone,
  tutors,
  meetingLink,
  onSaved,
}: AssessmentCardProps) {
  const [at, setAt] = useState(toLocalInput(lead.assessment_at));
  const [outcome, setOutcome] = useState(lead.assessment_outcome ?? "");
  const [tutor, setTutor] = useState(lead.recommended_tutor_id ?? NO_TUTOR);
  const [rate, setRate] = useState(lead.quoted_rate_kes != null ? String(lead.quoted_rate_kes) : "");
  const [pkg, setPkg] = useState(lead.quoted_package ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAt(toLocalInput(lead.assessment_at));
    setOutcome(lead.assessment_outcome ?? "");
    setTutor(lead.recommended_tutor_id ?? NO_TUTOR);
    setRate(lead.quoted_rate_kes != null ? String(lead.quoted_rate_kes) : "");
    setPkg(lead.quoted_package ?? "");
  }, [lead.id, lead.assessment_at, lead.assessment_outcome, lead.recommended_tutor_id, lead.quoted_rate_kes, lead.quoted_package]);

  const save = async () => {
    setSaving(true);
    const nextStage: Stage = lead.stage === "call_booked" ? "call_done" : lead.stage;
    const { error } = await crmDb
      .from("leads")
      .update({
        assessment_at: fromLocalInput(at),
        assessment_outcome: outcome.trim() || null,
        recommended_tutor_id: tutor === NO_TUTOR ? null : tutor,
        quoted_rate_kes: rate.trim() ? Number(rate) : null,
        quoted_package: pkg.trim() || null,
        stage: nextStage,
        next_step: nextStage === "call_done" ? lead.next_step ?? "Confirm the family's decision" : lead.next_step,
      })
      .eq("id", lead.id);
    setSaving(false);
    if (error) {
      toast.error(`Could not save the assessment: ${error.message}`);
      return;
    }
    if (nextStage !== lead.stage) {
      const name = splitName(familyName);
      void sendCrmEvent("scheduled", {
        recordId: lead.id,
        phone: familyPhone,
        firstName: name.firstName,
        lastName: name.lastName,
        value: rate.trim() ? Number(rate) : undefined,
      });
    }
    toast.success("Assessment saved");
    onSaved();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          Assessment call
        </div>
        {meetingLink && (
          <a
            href={meetingLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Meet link <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="assessment-at" className="text-xs">
            When
          </Label>
          <Input
            id="assessment-at"
            type="datetime-local"
            value={at}
            onChange={(e) => setAt(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Recommended tutor</Label>
          <Select value={tutor} onValueChange={setTutor}>
            <SelectTrigger>
              <SelectValue placeholder="No tutor yet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_TUTOR}>No tutor yet</SelectItem>
              {tutors.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="assessment-outcome" className="text-xs">
            Outcome and what was discussed
          </Label>
          <Textarea
            id="assessment-outcome"
            rows={2}
            placeholder="Good fit. Quoted KES 3,000 a session, twice a week."
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="quoted-rate" className="text-xs">
            Quoted rate (KES per session)
          </Label>
          <Input
            id="quoted-rate"
            inputMode="numeric"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="quoted-package" className="text-xs">
            Quoted package
          </Label>
          <Input
            id="quoted-package"
            placeholder="8 sessions"
            value={pkg}
            onChange={(e) => setPkg(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          Saving moves the lead to Call done.
        </p>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save outcome
        </Button>
      </div>
    </div>
  );
}

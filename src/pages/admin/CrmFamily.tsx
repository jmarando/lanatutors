import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertCircle,
  ChevronRight,
  Loader2,
  MessagesSquare,
  Phone,
  PhoneCall,
  Save,
  UserCheck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CrmShell } from "@/components/admin/crm/CrmShell";
import { NextStepEditor } from "@/components/admin/crm/NextStepEditor";
import { LogCallDialog } from "@/components/admin/crm/LogCallDialog";
import { AssessmentCard } from "@/components/admin/crm/AssessmentCard";
import { CloseLeadDialog } from "@/components/admin/crm/CloseLeadDialog";
import { FamilyTimeline } from "@/components/admin/crm/FamilyTimeline";
import { useFamily, useListedTutors, useTeam } from "@/components/admin/crm/useCrmData";
import type { Lead, LeadUpdate, Stage } from "@/components/admin/crm/crmTypes";
import { crmConsultations, crmDb } from "@/components/admin/crm/crmTypes";
import {
  FAMILY_STATUS_LABELS,
  STAGES,
  formatDue,
  formatPhone,
  metaStageFor,
  stageClass,
  stageLabel,
  telLink,
  waLink,
} from "@/components/admin/crm/crmMeta";
import { sendCrmEvent, splitName } from "@/utils/metaCrm";

const UNASSIGNED = "unassigned";

/** One family: the pipeline card, the assessment, the children and the timeline. */
export default function CrmFamily() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload } = useFamily(id);
  const { team } = useTeam();
  const tutors = useListedTutors();
  const [logging, setLogging] = useState(false);
  const [closing, setClosing] = useState<"won" | "lost" | null>(null);
  const [savingLead, setSavingLead] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [meetingLink, setMeetingLink] = useState<string | null>(null);

  const family = data.family;
  const activeLead: Lead | null = useMemo(() => {
    const open = data.leads.find(
      (l) => l.stage !== "won" && l.stage !== "lost",
    );
    return open ?? data.leads[0] ?? null;
  }, [data.leads]);

  const earlierLeads = data.leads.filter((l) => l.id !== activeLead?.id);

  useEffect(() => {
    if (!id) return;
    let active = true;
    void (async () => {
      const { data: booking } = await crmConsultations
        .from("consultation_bookings")
        .select("meeting_link")
        .eq("family_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active) setMeetingLink(booking?.meeting_link ?? null);
    })();
    return () => {
      active = false;
    };
  }, [id, data.leads.length]);

  const fireMeta = (stage: Stage) => {
    if (!activeLead) return;
    const meta = metaStageFor(stage);
    if (!meta) return;
    const name = splitName(family?.parent_name);
    void sendCrmEvent(meta, {
      recordId: activeLead.id,
      phone: family?.phone,
      firstName: name.firstName,
      lastName: name.lastName,
      value: activeLead.quoted_rate_kes ?? undefined,
    });
  };

  const patchLead = async (patch: LeadUpdate, successMessage?: string) => {
    if (!activeLead) return false;
    setSavingLead(true);
    const { error: err } = await crmDb.from("leads").update(patch).eq("id", activeLead.id);
    setSavingLead(false);
    if (err) {
      toast.error(err.message);
      return false;
    }
    if (successMessage) toast.success(successMessage);
    await reload();
    return true;
  };

  const changeStage = async (value: string) => {
    if (value === "won" || value === "lost") {
      setClosing(value);
      return;
    }
    const saved = await patchLead({ stage: value as Stage }, `Moved to ${stageLabel(value)}`);
    if (saved) fireMeta(value as Stage);
  };

  const title = family?.parent_name || formatPhone(family?.phone) || "Family";
  const phone = family?.phone;

  return (
    <CrmShell
      title={title}
      subtitle={[formatPhone(phone), family?.email].filter(Boolean).join(" · ")}
      active="family"
      backTo="/admin/leads"
      actions={
        <div className="flex items-center gap-1.5">
          {telLink(phone) && (
            <Button variant="outline" size="sm" asChild>
              <a href={telLink(phone) ?? undefined} aria-label="Call">
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Call</span>
              </a>
            </Button>
          )}
          {waLink(phone) && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={waLink(phone) ?? undefined}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
              >
                <MessagesSquare className="h-4 w-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            </Button>
          )}
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !family ? (
        <Card>
          <CardContent className="flex items-start gap-2 p-6 text-sm text-muted-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <span>{error ?? "This family does not exist, or you do not have access to it."}</span>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {activeLead ? (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      Lead
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          stageClass(activeLead.stage),
                        )}
                      >
                        {stageLabel(activeLead.stage)}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {FAMILY_STATUS_LABELS[family.status]}
                      </Badge>
                    </CardTitle>
                    <Button size="sm" onClick={() => setLogging(true)}>
                      <PhoneCall className="h-4 w-4" /> Log call
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Stage</Label>
                      <Select value={activeLead.stage} onValueChange={changeStage}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Owner</Label>
                      <Select
                        value={activeLead.owner_id ?? UNASSIGNED}
                        onValueChange={(value) =>
                          void patchLead(
                            { owner_id: value === UNASSIGNED ? null : value },
                            "Owner updated",
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                          {team.map((member) => (
                            <SelectItem key={member.user_id} value={member.user_id}>
                              {member.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <NextStepEditor
                    lead={activeLead}
                    team={team}
                    saving={savingLead}
                    onSave={(patch) => void patchLead(patch, "Next step saved")}
                  />

                  <ChildDetails
                    lead={activeLead}
                    saving={savingDetails}
                    onSave={async (fields) => {
                      setSavingDetails(true);
                      await patchLead(fields, "Child details saved");
                      setSavingDetails(false);
                    }}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  This family has no lead yet. Add one from the Leads page.
                </CardContent>
              </Card>
            )}

            {activeLead && (
              <Card>
                <CardContent className="pt-5">
                  <AssessmentCard
                    lead={activeLead}
                    familyName={family.parent_name}
                    familyPhone={family.phone}
                    tutors={tutors}
                    meetingLink={meetingLink}
                    onSaved={() => void reload()}
                  />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <FamilyTimeline
                  familyId={family.id}
                  leadId={activeLead?.id ?? null}
                  activities={data.activities}
                  conversation={data.conversation}
                  onAdded={() => void reload()}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Close this lead</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  disabled={!activeLead || activeLead.stage === "won"}
                  onClick={() => setClosing("won")}
                >
                  <UserCheck className="h-4 w-4 text-emerald-600" /> Mark won
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  disabled={!activeLead || activeLead.stage === "lost"}
                  onClick={() => setClosing("lost")}
                >
                  <XCircle className="h-4 w-4 text-rose-600" /> Mark lost
                </Button>
                {activeLead?.stage === "lost" && (
                  <p className="text-[11px] text-muted-foreground">
                    Lost because: {activeLead.lost_reason?.replace(/_/g, " ")}.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <p className="font-medium">{formatPhone(family.phone) || "No phone"}</p>
                {family.email && <p className="text-muted-foreground">{family.email}</p>}
                {family.area && <p className="text-muted-foreground">{family.area}</p>}
                <p className="text-xs text-muted-foreground">
                  First seen {formatDue(family.created_at)}
                </p>
              </CardContent>
            </Card>

            {earlierLeads.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Earlier leads</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {earlierLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between gap-2 rounded-md border p-2 text-xs"
                    >
                      <span className={cn("rounded-full px-2 py-0.5", stageClass(lead.stage))}>
                        {stageLabel(lead.stage)}
                      </span>
                      <span className="text-muted-foreground">{formatDue(lead.created_at)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">The rule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <p>Every open lead needs a next step, a date and a person.</p>
                <p>A "not now" family stays open with a far-off date.</p>
                <p className="flex items-center gap-1">
                  Won moves the family to active <ChevronRight className="h-3 w-3" />
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeLead && (
        <>
          <LogCallDialog
            open={logging}
            onOpenChange={setLogging}
            lead={activeLead}
            team={team}
            onLogged={() => void reload()}
          />
          <CloseLeadDialog
            open={closing !== null}
            onOpenChange={(open) => {
              if (!open) setClosing(null);
            }}
            lead={activeLead}
            familyName={family?.parent_name ?? null}
            familyPhone={family?.phone ?? null}
            outcome={closing ?? "won"}
            onClosed={() => void reload()}
          />
        </>
      )}
    </CrmShell>
  );
}

interface ChildDetailsProps {
  lead: Lead;
  saving: boolean;
  onSave: (fields: {
    student_name: string;
    grade_level: string;
    curriculum: string;
    subjects: string[];
  }) => void;
}

/** The child, grade, curriculum and subjects, editable in place. */
function ChildDetails({ lead, saving, onSave }: ChildDetailsProps) {
  const [student, setStudent] = useState(lead.student_name ?? "");
  const [grade, setGrade] = useState(lead.grade_level ?? "");
  const [curriculum, setCurriculum] = useState(lead.curriculum ?? "");
  const [subjects, setSubjects] = useState((lead.subjects ?? []).join(", "));

  useEffect(() => {
    setStudent(lead.student_name ?? "");
    setGrade(lead.grade_level ?? "");
    setCurriculum(lead.curriculum ?? "");
    setSubjects((lead.subjects ?? []).join(", "));
  }, [lead.id, lead.student_name, lead.grade_level, lead.curriculum, lead.subjects]);

  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground">The child</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          placeholder="Child's name"
          value={student}
          onChange={(e) => setStudent(e.target.value)}
          aria-label="Child's name"
        />
        <Input
          placeholder="Grade"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          aria-label="Grade"
        />
        <Input
          placeholder="Curriculum"
          value={curriculum}
          onChange={(e) => setCurriculum(e.target.value)}
          aria-label="Curriculum"
        />
        <Input
          placeholder="Subjects, comma separated"
          value={subjects}
          onChange={(e) => setSubjects(e.target.value)}
          aria-label="Subjects"
        />
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() =>
            onSave({
              student_name: student.trim(),
              grade_level: grade.trim(),
              curriculum: curriculum.trim(),
              subjects: subjects
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save details
        </Button>
      </div>
    </div>
  );
}

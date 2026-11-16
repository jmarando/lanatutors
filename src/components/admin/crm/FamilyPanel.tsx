import { useState, type ReactNode } from "react";
import { AlertCircle, Loader2, MessagesSquare, Phone, PhoneCall, UserCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { AssessmentCard } from "./AssessmentCard";
import { ChildDetails } from "./ChildDetails";
import { CloseLeadDialog } from "./CloseLeadDialog";
import { FamilyTimeline } from "./FamilyTimeline";
import { LogCallDialog } from "./LogCallDialog";
import { NextStepEditor } from "./NextStepEditor";
import { SessionsCard } from "./SessionsCard";
import { StudentProgress } from "./StudentProgress";
import { STAGES, channelLabel, formatDue, formatPhone, stageClass, stageLabel, telLink, waLink } from "./crmMeta";
import { useListedTutors, useTeam, useTutors } from "./useCrmData";
import { useFamilyActions } from "./useFamilyActions";

const UNASSIGNED = "unassigned";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface FamilyPanelProps {
  familyId: string;
  onClose: () => void;
  /** After any save, so the list behind the panel can refresh. */
  onChanged: () => void;
}

/**
 * One family in a panel that slides in from the right (full screen on a phone): Call and WhatsApp at the top, then Info,
 * Follow-up, Payments and History. It holds everything the family page held, through the same parts and the same logic
 * (useFamilyActions). Its contents are keyed by the family, so a second row never shows the first family's details.
 */
export function FamilyPanel({ familyId, onClose, onChanged }: FamilyPanelProps) {
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-[520px] [&>button]:text-white">
        <PanelBody key={familyId} familyId={familyId} onChanged={onChanged} />
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5 rounded-lg border p-3 text-sm">
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function PanelBody({ familyId, onChanged }: { familyId: string; onChanged: () => void }) {
  const valid = UUID.test(familyId);
  const f = useFamilyActions(valid ? familyId : undefined);
  const { team } = useTeam();
  const tutors = useListedTutors();
  const allTutors = useTutors();
  const [tab, setTab] = useState("info");

  const refresh = async () => {
    await f.reload();
    onChanged();
  };

  const notice = (title: string, body: ReactNode) => (
    <div className="space-y-3 p-6">
      <SheetTitle>{title}</SheetTitle>
      <SheetDescription asChild>
        <div className="text-sm text-muted-foreground">{body}</div>
      </SheetDescription>
    </div>
  );

  if (valid && f.loading && !f.family) {
    return (
      <div className="flex items-center gap-2 p-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <SheetTitle className="text-base font-normal text-muted-foreground">Loading the family…</SheetTitle>
        <SheetDescription className="sr-only">The family's details are loading.</SheetDescription>
      </div>
    );
  }
  if (valid && f.error) {
    return notice(
      "Could not load this family",
      <div className="space-y-3">
        <p className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {f.error}
        </p>
        <Button size="sm" variant="outline" onClick={() => void f.reload()}>
          Try again
        </Button>
      </div>,
    );
  }
  if (!f.family) return notice("This family was not found.", "It may have been removed, or the link is wrong.");

  const family = f.family;
  const lead = f.activeLead;
  const name = family.parent_name || formatPhone(family.phone) || "Family";
  const childLine = lead ? [lead.student_name, (lead.subjects ?? []).join(", "), lead.grade_level].filter(Boolean).join(" · ") : "";
  const ownerName = lead?.owner_id ? (team.find((m) => m.user_id === lead.owner_id)?.full_name ?? "Someone") : "Unassigned";
  const tel = telLink(family.phone);
  const wa = waLink(family.phone);
  const recommended = lead?.recommended_tutor_id ? tutors.find((t) => t.id === lead.recommended_tutor_id)?.name : null;

  return (
    <>
      <div className="bg-gradient-to-br from-slate-900 to-slate-700 px-5 pb-4 pt-5 text-white">
        <SheetTitle className="pr-8 text-lg font-semibold text-white">{name}</SheetTitle>
        <SheetDescription className="text-sm text-slate-300">{childLine || "No child details yet"}</SheetDescription>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            ["Stage", lead ? stageLabel(lead.stage) : "No lead"],
            ["Came in", lead ? channelLabel(lead.channel) : "—"],
            ["Owner", ownerName],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-white/10 px-2.5 py-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-300">{label}</p>
              <p className="truncate text-sm font-semibold">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {tel ? (
            <Button asChild className="bg-teal-500 text-white hover:bg-teal-600">
              <a href={tel}>
                <Phone className="h-4 w-4" /> Call
              </a>
            </Button>
          ) : (
            <Button disabled title="No phone number" className="bg-teal-500 text-white">
              <Phone className="h-4 w-4" /> Call
            </Button>
          )}
          {wa ? (
            <Button asChild variant="secondary" className="bg-white/15 text-white hover:bg-white/25">
              <a href={wa} target="_blank" rel="noreferrer">
                <MessagesSquare className="h-4 w-4" /> WhatsApp
              </a>
            </Button>
          ) : (
            <Button disabled variant="secondary" title="No phone number" className="bg-white/15 text-white">
              <MessagesSquare className="h-4 w-4" /> WhatsApp
            </Button>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="p-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="follow-up">Follow-up</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-3">
          <Section title="How they found us">
            <Row label="Channel">{lead ? channelLabel(lead.channel) : "—"}</Row>
            <Row label="First seen">{formatDue(family.created_at)}</Row>
            {lead?.mode && <Row label="Mode">{lead.mode}</Row>}
            {lead?.budget && <Row label="Budget">{lead.budget}</Row>}
            {lead?.urgency && <Row label="Urgency">{lead.urgency}</Row>}
          </Section>
          {lead && <ChildDetails lead={lead} saving={f.savingDetails} onSave={(fields) => void f.saveDetails(fields).then(onChanged)} />}
          <Section title="Contact">
            <Row label="Phone">{formatPhone(family.phone) || "No phone"}</Row>
            <Row label="Email">{family.email || "—"}</Row>
            <Row label="Area">{family.area || "—"}</Row>
          </Section>
          {lead && (
            <Section title="Assessment call">
              <Row label="When">{lead.assessment_at ? formatDue(lead.assessment_at) : "Not booked"}</Row>
              <Row label="Recommended tutor">{recommended ?? "None yet"}</Row>
            </Section>
          )}
          {f.earlierLeads.length > 0 && (
            <Section title="Earlier leads">
              {f.earlierLeads.map((earlier) => (
                <div key={earlier.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className={cn("rounded-full px-2 py-0.5", stageClass(earlier.stage))}>{stageLabel(earlier.stage)}</span>
                  <span className="text-muted-foreground">{formatDue(earlier.created_at)}</span>
                </div>
              ))}
            </Section>
          )}
        </TabsContent>

        <TabsContent value="follow-up" className="space-y-4">
          {lead ? (
            <>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => f.setLogging(true)}>
                  <PhoneCall className="h-4 w-4" /> Log call
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Stage</Label>
                  <Select value={lead.stage} onValueChange={(value) => void f.changeStage(value).then(onChanged)}>
                    <SelectTrigger aria-label="Stage">
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
                    value={lead.owner_id ?? UNASSIGNED}
                    onValueChange={(value) =>
                      void f.patchLead({ owner_id: value === UNASSIGNED ? null : value }, "Owner updated").then(onChanged)
                    }
                  >
                    <SelectTrigger aria-label="Owner">
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
                lead={lead}
                team={team}
                saving={f.savingLead}
                onSave={(patch) => void f.patchLead(patch, "Next step saved").then(onChanged)}
              />
              <div className="rounded-lg border p-3">
                <AssessmentCard
                  lead={lead}
                  familyName={family.parent_name}
                  familyPhone={family.phone}
                  tutors={tutors}
                  meetingLink={f.meetingLink}
                  onSaved={() => void refresh()}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="outline" disabled={lead.stage === "won"} onClick={() => f.setClosing("won")}>
                  <UserCheck className="h-4 w-4 text-emerald-600" /> Mark won
                </Button>
                <Button variant="outline" disabled={lead.stage === "lost"} onClick={() => f.setClosing("lost")}>
                  <XCircle className="h-4 w-4 text-rose-600" /> Mark lost
                </Button>
              </div>
              {lead.stage === "lost" && (
                <p className="text-xs text-muted-foreground">Lost because: {lead.lost_reason?.replace(/_/g, " ")}.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">This family has no lead.</p>
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <SessionsCard
            familyId={family.id}
            enrolments={f.data.enrolments}
            packs={f.data.packs}
            balances={f.data.balances}
            error={f.data.sessionsError}
            tutors={allTutors}
            onChanged={() => void refresh()}
            onRecorded={f.suggestWon}
          />
          {!f.data.sessionsError && <StudentProgress enrolments={f.data.enrolments} lessons={f.data.lessons} />}
        </TabsContent>

        <TabsContent value="history">
          <FamilyTimeline
            familyId={family.id}
            leadId={lead?.id ?? null}
            activities={f.data.activities}
            conversation={f.data.conversation}
            onAdded={() => void refresh()}
          />
        </TabsContent>
      </Tabs>

      {lead && (
        <>
          <LogCallDialog open={f.logging} onOpenChange={f.setLogging} lead={lead} team={team} onLogged={() => void refresh()} />
          <CloseLeadDialog
            open={f.closing !== null}
            onOpenChange={(open) => {
              if (!open) f.setClosing(null);
            }}
            lead={lead}
            familyName={family.parent_name ?? null}
            familyPhone={family.phone ?? null}
            outcome={f.closing ?? "won"}
            onClosed={() => void refresh()}
          />
        </>
      )}
    </>
  );
}

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  CalendarCheck,
  Info,
  Loader2,
  MessageCircle,
  Phone,
  Send,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ActivityKind, LeadActivity, WhatsAppConversation } from "./crmTypes";
import { crmDb } from "./crmTypes";
import { formatDue } from "./crmMeta";

interface FamilyTimelineProps {
  familyId: string;
  leadId: string | null;
  activities: LeadActivity[];
  conversation: WhatsAppConversation | null;
  onAdded: () => void;
}

interface Entry {
  id: string;
  at: string;
  kind: ActivityKind;
  body: string;
  who: string;
}

const KIND_META: Record<
  ActivityKind,
  { icon: typeof StickyNote; className: string; label: string }
> = {
  note: { icon: StickyNote, className: "bg-muted text-muted-foreground", label: "Note" },
  call: { icon: Phone, className: "bg-indigo-100 text-indigo-700", label: "Call" },
  whatsapp: {
    icon: MessageCircle,
    className: "bg-emerald-100 text-emerald-700",
    label: "WhatsApp",
  },
  email: { icon: Send, className: "bg-sky-100 text-sky-700", label: "Email" },
  stage_change: {
    icon: ArrowRight,
    className: "bg-violet-100 text-violet-700",
    label: "Stage",
  },
  assessment: {
    icon: CalendarCheck,
    className: "bg-amber-100 text-amber-700",
    label: "Assessment",
  },
  system: { icon: Info, className: "bg-muted text-muted-foreground", label: "System" },
};

/** Notes, calls and WhatsApp messages in one timeline, newest first. */
export function FamilyTimeline({
  familyId,
  leadId,
  activities,
  conversation,
  onAdded,
}: FamilyTimelineProps) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const entries = useMemo<Entry[]>(() => {
    const fromActivities: Entry[] = activities.map((a) => ({
      id: `a-${a.id}`,
      at: a.occurred_at,
      kind: a.kind,
      body: a.body ?? "",
      who: a.created_by ? "team" : "system",
    }));

    const fromMessages: Entry[] = (conversation?.messages ?? [])
      .filter((m) => m.content)
      .map((m, index) => ({
        id: `w-${index}`,
        at: m.ts ?? conversation?.last_message_at ?? "",
        kind: "whatsapp" as ActivityKind,
        body: m.content ?? "",
        who: m.sent_by === "human" ? "team" : m.role === "user" ? "parent" : "Lana",
      }));

    return [...fromActivities, ...fromMessages]
      .filter((e) => e.body || e.kind === "stage_change")
      .sort((a, b) => (b.at || "").localeCompare(a.at || ""))
      .slice(0, 120);
  }, [activities, conversation]);

  const addNote = async () => {
    const body = note.trim();
    if (!body) return;
    setSaving(true);
    const { error } = await crmDb.from("lead_activities").insert({
      family_id: familyId,
      lead_id: leadId,
      kind: "note",
      body,
    });
    setSaving(false);
    if (error) {
      toast.error(`Could not save the note: ${error.message}`);
      return;
    }
    setNote("");
    onAdded();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Add a note to the timeline"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void addNote();
            }
          }}
        />
        <Button onClick={addNote} disabled={saving || !note.trim()} size="icon" aria-label="Add note">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      <ol className="space-y-2">
        {entries.map((entry) => {
          const meta = KIND_META[entry.kind] ?? KIND_META.note;
          const Icon = meta.icon;
          return (
            <li key={entry.id} className="flex gap-2.5">
              <span
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  meta.className,
                )}
                aria-label={meta.label}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1 rounded-lg border bg-card px-3 py-2">
                <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                  {entry.body || meta.label}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {entry.who === "parent"
                    ? "Parent"
                    : entry.who === "Lana"
                      ? "Lana (AI)"
                      : entry.who === "team"
                        ? "Team"
                        : meta.label}
                  {entry.at ? ` · ${formatDue(entry.at)}` : ""}
                </p>
              </div>
            </li>
          );
        })}
        {entries.length === 0 && (
          <li className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nothing here yet. Log a call or add a note.
          </li>
        )}
      </ol>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Loader2, Plus, Search, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CrmShell } from "@/components/admin/crm/CrmShell";
import { LeadRow } from "@/components/admin/crm/LeadRow";
import { NewLeadDialog } from "@/components/admin/crm/NewLeadDialog";
import { useClosedLeads, useOpenLeads, useTeam, useTeamNames } from "@/components/admin/crm/useCrmData";
import type { LeadWithFamily, Stage } from "@/components/admin/crm/crmTypes";
import { CHANNELS, stageLabel } from "@/components/admin/crm/crmMeta";

type Tab = "all" | "closed" | Stage;

const OPEN_TABS: Stage[] = ["new", "contacted", "call_booked", "call_done"];

/** Leads: a board on desktop, a list on phones, with search and filters. */
export default function CrmLeads() {
  const { data: openLeads, loading, error, reload } = useOpenLeads();
  const closed = useClosedLeads(90);
  const { team } = useTeam();
  const names = useTeamNames();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState("all");
  const [owner, setOwner] = useState("all");
  const [adding, setAdding] = useState(false);

  const matches = (lead: LeadWithFamily) => {
    if (channel !== "all" && lead.channel !== channel) return false;
    if (owner === "none" && lead.owner_id) return false;
    if (owner !== "all" && owner !== "none" && lead.owner_id !== owner) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const haystack = [
      lead.families?.parent_name,
      lead.families?.phone,
      lead.student_name,
      lead.grade_level,
      lead.curriculum,
      ...(lead.subjects ?? []),
      lead.next_step,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  };

  const visible = useMemo(
    () => (tab === "closed" ? closed.data : openLeads).filter(matches),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, closed.data, openLeads, query, channel, owner],
  );

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: openLeads.length, closed: closed.data.length };
    for (const stage of OPEN_TABS) out[stage] = openLeads.filter((l) => l.stage === stage).length;
    return out;
  }, [openLeads, closed.data]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All open" },
    ...OPEN_TABS.map((stage) => ({ key: stage, label: stageLabel(stage) })),
    { key: "closed", label: "Closed" },
  ];

  const list = (
    <div className="space-y-2">
      {visible.map((lead) => (
        <LeadRow
          key={lead.id}
          lead={lead}
          ownerName={lead.owner_id ? names.get(lead.owner_id) : undefined}
        />
      ))}
      {visible.length === 0 && (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No leads match these filters.
        </p>
      )}
    </div>
  );

  return (
    <CrmShell
      title="Leads"
      subtitle={`${counts.all} open`}
      active="leads"
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void reload();
              void closed.reload();
            }}
            className="hidden sm:inline-flex"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setAdding(true)} className="hidden sm:inline-flex">
            <Plus className="h-4 w-4" /> Lead
          </Button>
        </>
      }
    >
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.key
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-[10px]",
                tab === t.key ? "bg-primary-foreground/20" : "bg-muted",
              )}
            >
              {counts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Name, phone, child, subject or next step"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger>
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Every channel</SelectItem>
            {CHANNELS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={owner} onValueChange={setOwner}>
          <SelectTrigger>
            <SelectValue placeholder="Owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Every owner</SelectItem>
            <SelectItem value="none">Unassigned</SelectItem>
            {team.map((member) => (
              <SelectItem key={member.user_id} value={member.user_id}>
                {member.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tab === "all" ? (
        <>
          <div className="hidden gap-3 lg:grid lg:grid-cols-4">
            {OPEN_TABS.map((stage) => {
              const column = visible.filter((l) => l.stage === stage);
              return (
                <div key={stage} className="min-w-0">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {stageLabel(stage)}
                    </h2>
                    <span className="text-xs text-muted-foreground">{column.length}</span>
                  </div>
                  <div className="space-y-2">
                    {column.map((lead) => (
                      <LeadRow key={lead.id} lead={lead} showStage={false} compact />
                    ))}
                    {column.length === 0 && (
                      <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                        Empty
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="lg:hidden">{list}</div>
        </>
      ) : (
        <>
          {tab === "closed" && !closed.loading && (
            <p className="mb-3 text-xs text-muted-foreground">
              Won and lost leads from the last 90 days.
            </p>
          )}
          {tab === "closed" && closed.loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Card>
              <CardContent className="p-3">{list}</CardContent>
            </Card>
          )}
        </>
      )}

      <Button
        onClick={() => setAdding(true)}
        className="fixed bottom-20 right-4 z-30 h-12 rounded-full px-5 shadow-lg sm:hidden"
      >
        <Plus className="h-5 w-5" /> Lead
      </Button>

      <NewLeadDialog open={adding} onOpenChange={setAdding} onCreated={() => void reload()} />
    </CrmShell>
  );
}

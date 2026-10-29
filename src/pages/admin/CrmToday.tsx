import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Plus, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CrmShell } from "@/components/admin/crm/CrmShell";
import { LeadRow } from "@/components/admin/crm/LeadRow";
import { NewLeadDialog } from "@/components/admin/crm/NewLeadDialog";
import { useOpenLeads, useTeamNames } from "@/components/admin/crm/useCrmData";
import type { LeadWithFamily } from "@/components/admin/crm/crmTypes";
import { dateKey, dueState, nairobiDate } from "@/components/admin/crm/crmMeta";

type Scope = "mine" | "everyone";

interface Bucket {
  key: string;
  title: string;
  hint: string;
  /** The leads shown here, after de-duplication. */
  leads: LeadWithFamily[];
  /** Everything that matched, including leads already shown in an earlier card. */
  total: number;
  empty: string;
}

/** Today: what needs doing now, mine first. */
export default function CrmToday() {
  const { data: leads, loading, error, reload } = useOpenLeads();
  const names = useTeamNames();
  const [scope, setScope] = useState<Scope>("everyone");
  const [adding, setAdding] = useState(false);
  const { user } = useAuth();
  const me = user?.id ?? null;

  const buckets = useMemo<Bucket[]>(() => {
    const today = nairobiDate();
    const seen = new Set<string>();
    const take = (rows: LeadWithFamily[], limit = 6) => {
      const out: LeadWithFamily[] = [];
      for (const lead of rows) {
        if (seen.has(lead.id)) continue;
        seen.add(lead.id);
        out.push(lead);
        if (out.length >= limit) break;
      }
      return out;
    };
    const bucketLeads = (rows: LeadWithFamily[]) => {
      const shown = take(rows);
      return { leads: shown, total: rows.length };
    };
    const matchesScope = (lead: LeadWithFamily) =>
      scope === "everyone" || !me || lead.owner_id === me || lead.next_step_owner_id === me;
    const scoped = leads.filter(matchesScope);

    const due = scoped
      .filter((l) => ["overdue", "today"].includes(dueState(l.next_step_at)))
      .sort((a, b) => {
        const aMine = me && (a.next_step_owner_id === me || a.owner_id === me) ? 0 : 1;
        const bMine = me && (b.next_step_owner_id === me || b.owner_id === me) ? 0 : 1;
        if (aMine !== bMine) return aMine - bMine;
        return (a.next_step_at ?? "").localeCompare(b.next_step_at ?? "");
      });

    const needsReply = scoped.filter((l) => l.needs_reply);

    const callsToday = scoped.filter(
      (l) => l.stage === "call_booked" && dateKey(l.assessment_at) === today,
    );

    const callsToLog = scoped
      .filter(
        (l) => l.stage === "call_booked" && l.assessment_at != null && dateKey(l.assessment_at)! < today,
      )
      .sort((a, b) => (a.assessment_at ?? "").localeCompare(b.assessment_at ?? ""));

    const fresh = scoped
      .filter((l) => l.stage === "new" && !l.needs_reply)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    const noNextStep = scoped.filter((l) => l.stage !== "new" && !l.next_step);

    // The reply queue comes first, so a waiting chat is never hidden behind a due date.
    const replyBucket = bucketLeads(needsReply);
    const dueBucket = bucketLeads(due);
    const callsBucket = bucketLeads(callsToday);
    const logBucket = bucketLeads(callsToLog);
    const newBucket = bucketLeads(fresh);
    const noStepBucket = bucketLeads(noNextStep);

    return [
      {
        key: "reply",
        title: "Needs a reply",
        hint: "The WhatsApp hand-off is waiting",
        ...replyBucket,
        empty: "No chat is waiting on the team.",
      },
      {
        key: "due",
        title: "Next steps due",
        hint: "Overdue or due today",
        ...dueBucket,
        empty: "Nothing overdue. Every lead has a date ahead of it.",
      },
      {
        key: "calls",
        title: "Assessment calls today",
        hint: "Free calls the coordinators hold",
        ...callsBucket,
        empty: "No assessment calls booked for today.",
      },
      {
        key: "log",
        title: "Calls to log",
        hint: "The call has passed, the outcome is not written",
        ...logBucket,
        empty: "Every past call has an outcome.",
      },
      {
        key: "new",
        title: "New, not contacted",
        hint: "Oldest first",
        ...newBucket,
        empty: "Every new lead has been picked up.",
      },
      {
        key: "no-step",
        title: "No next step",
        hint: "Open leads going nowhere",
        ...noStepBucket,
        empty: "Every open lead has a next step.",
      },
    ];
  }, [leads, me, scope]);

  const openCount = leads.length;

  return (
    <CrmShell
      title="Today"
      subtitle={`${openCount} open lead${openCount === 1 ? "" : "s"}`}
      active="today"
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void reload()}
            className="hidden sm:inline-flex"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setAdding(true)} className="hidden sm:inline-flex">
            <Plus className="h-4 w-4" /> Lead
          </Button>
        </>
      }
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="inline-flex rounded-lg border bg-background p-0.5">
          {(["mine", "everyone"] as Scope[]).map((value) => (
            <button
              key={value}
              onClick={() => setScope(value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                scope === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Could not load today's work: {error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {buckets.map((bucket) => (
            <Card key={bucket.key} className={bucket.leads.length === 0 ? "opacity-80" : ""}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm font-semibold">{bucket.title}</CardTitle>
                  <p className="text-[11px] text-muted-foreground">{bucket.hint}</p>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {bucket.total}
                </span>
              </CardHeader>
              <CardContent className="space-y-2">
                {bucket.leads.length === 0 ? (
                  <p className="py-2 text-xs text-muted-foreground">
                    {bucket.total > 0 ? "Listed in an earlier card above." : bucket.empty}
                  </p>
                ) : (
                  bucket.leads.map((lead) => (
                    <LeadRow
                      key={lead.id}
                      lead={lead}
                      ownerName={lead.owner_id ? names.get(lead.owner_id) : undefined}
                      showStage={bucket.key !== "new"}
                    />
                  ))
                )}
                {bucket.key !== "due" && bucket.leads.length >= 6 && (
                  <Link
                    to="/admin/leads"
                    className="block pt-1 text-xs font-medium text-primary hover:underline"
                  >
                    See all leads
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
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

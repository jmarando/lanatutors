import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, Loader2, Plus, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { CrmListRow } from "./CrmListRow";
import { FamilyPanel } from "./FamilyPanel";
import { NewLeadDialog } from "./NewLeadDialog";
import {
  bandCounts,
  matchesFilter,
  newestFirst,
  nextStepPill,
  searchLead,
  type ListContext,
  type ListFilter,
} from "./crmListRules";
import { nairobiDate } from "./crmMeta";
import type { LeadWithFamily } from "./crmTypes";
import { useClosedLeads, useOpenLeads, useTeamNames, useTopUps } from "./useCrmData";

// Closed leads with any activity in this window: enough for this month's and last month's wins (a win is activity).
const CLOSED_DAYS = 90;
const PAGE = 100;

const CHIPS: { key: ListFilter; label: string; hot?: boolean }[] = [
  { key: "open", label: "All open" },
  { key: "reply", label: "Needs a reply", hot: true },
  { key: "overdue", label: "Overdue", hot: true },
  { key: "booked", label: "Call booked" },
  { key: "topup", label: "Top-up due" },
  { key: "mine", label: "Mine" },
  { key: "closed", label: "Won and lost" },
];

/** The leads a filter looks through: open ones, closed ones, or (for top-ups, usually won families) both, one row a family. */
function leadsFor(filter: ListFilter, open: LeadWithFamily[], closed: LeadWithFamily[]): LeadWithFamily[] {
  if (filter === "closed" || filter === "wonMonth") return closed;
  if (filter !== "topup") return open;
  const seen = new Set<string>();
  return [...closed, ...open].filter((l) => (seen.has(l.family_id) ? false : (seen.add(l.family_id), true)));
}

/** The CRM: three counts, a few quick filters and one list of families, newest first; a row opens the family's panel. */
export default function CrmList() {
  const { familyId } = useParams<{ familyId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const open = useOpenLeads();
  const closed = useClosedLeads(CLOSED_DAYS);
  const topUps = useTopUps();
  const names = useTeamNames();
  const [filter, setFilter] = useState<ListFilter>("open");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [adding, setAdding] = useState(false);

  useEffect(() => setShown(PAGE), [filter, query]);

  const ctx: ListContext = useMemo(() => {
    const left = new Map<string, number>();
    for (const balance of topUps.data) {
      const before = left.get(balance.family_id);
      left.set(balance.family_id, before === undefined ? balance.sessions_left : Math.min(before, balance.sessions_left));
    }
    return { today: nairobiDate(), now: new Date().toISOString(), me: user?.id ?? null, topUps: left };
  }, [topUps.data, user?.id]);

  const band = useMemo(() => bandCounts(open.data, closed.data, ctx), [open.data, closed.data, ctx]);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        CHIPS.map((chip) => [chip.key, leadsFor(chip.key, open.data, closed.data).filter((l) => matchesFilter(l, chip.key, ctx)).length]),
      ) as Record<ListFilter, number>,
    [open.data, closed.data, ctx],
  );
  const rows = useMemo(
    () =>
      leadsFor(filter, open.data, closed.data)
        .filter((l) => matchesFilter(l, filter, ctx) && searchLead(l, query))
        .sort(newestFirst),
    [filter, query, open.data, closed.data, ctx],
  );

  const reloadAll = () => {
    void open.reload();
    void closed.reload();
    void topUps.reload();
  };
  const error = open.error ?? closed.error ?? topUps.error;
  const loading = (open.loading && open.data.length === 0) || (topUps.loading && topUps.data.length === 0);

  const tile = (key: ListFilter, label: string, value: number, note: string, down = false) => (
    <button
      type="button"
      onClick={() => setFilter(key)}
      aria-pressed={filter === key}
      className={cn(
        "rounded-xl bg-white/[0.07] px-4 py-3 text-left text-white transition hover:bg-white/[0.12]",
        filter === key && "ring-2 ring-white/60",
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-300">{label}</p>
      <p className="mt-0.5 text-2xl font-bold">{value}</p>
      <p className={cn("text-[11px]", down ? "text-rose-300" : "text-emerald-300")}>{note}</p>
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">CRM</h2>
          <p className="text-sm text-muted-foreground">Families who got in touch, newest first</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone, child, subject…"
              aria-label="Search families"
              className="w-64 pl-8"
            />
          </div>
          <Button variant="outline" size="icon" onClick={reloadAll} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add lead
          </Button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-2">
            <p>Could not load the CRM: {error}. Nothing is counted until it loads.</p>
            <Button size="sm" variant="outline" onClick={reloadAll}>
              Try again
            </Button>
          </div>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 p-3 sm:gap-3 sm:p-4" aria-label="Counts">
            {tile("new", "New", band.newCount, `${band.newThisWeek} in the last 7 days`)}
            {tile("progress", "In progress", band.inProgress, `${band.dueToday} due today`)}
            {tile("wonMonth", "Won this month", band.wonThisMonth, `${band.wonLastMonth} last month`, band.wonThisMonth < band.wonLastMonth)}
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Quick filters">
            {CHIPS.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilter(chip.key)}
                aria-pressed={filter === chip.key}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full border bg-background px-3 py-1.5 text-xs",
                  filter === chip.key && "border-foreground bg-foreground text-background",
                )}
              >
                {chip.label}{" "}
                <span className={cn("font-semibold", chip.hot && filter !== chip.key && counts[chip.key] > 0 && "text-primary")}>
                  {counts[chip.key]}
                </span>
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border bg-background">
            <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.7fr)_minmax(0,1.1fr)_minmax(0,0.8fr)_auto] gap-3 border-b px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:grid">
              <span>Family</span>
              <span>Stage</span>
              <span>Next step</span>
              <span>Came in</span>
              <span>Owner</span>
              <span className="w-[4.25rem] text-right">Reach out</span>
            </div>
            {rows.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No families match.</p>
            ) : (
              <ul aria-label="Families">
                {rows.slice(0, shown).map((lead) => (
                  <CrmListRow
                    key={lead.id}
                    lead={lead}
                    pill={nextStepPill(lead, ctx)}
                    ownerName={lead.owner_id ? (names.get(lead.owner_id) ?? null) : null}
                    onOpen={() => navigate(`/admin/crm/${lead.family_id}`)}
                  />
                ))}
              </ul>
            )}
          </div>
          {rows.length > shown && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setShown((n) => n + PAGE)}>
                Show {Math.min(PAGE, rows.length - shown)} more
              </Button>
            </div>
          )}
        </>
      )}

      {familyId && <FamilyPanel familyId={familyId} onClose={() => navigate("/admin/crm")} onChanged={reloadAll} />}
      <NewLeadDialog open={adding} onOpenChange={setAdding} onCreated={reloadAll} />
    </div>
  );
}

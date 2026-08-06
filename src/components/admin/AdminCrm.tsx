import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Search, RefreshCw, Download, Mail, Phone, TrendingUp, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Stage = "lead" | "contacted" | "qualified" | "customer" | "lost";

interface Activity {
  type: string;
  label: string;
  at: string;
  amount?: number | null;
}

interface Contact {
  key: string;
  name: string;
  email: string | null;
  phone: string | null;
  sources: string[];
  stage: Stage;
  studentNames: string[];
  subjects: string[];
  curriculum: string | null;
  gradeLevels: string[];
  hasAccount: boolean;
  totalPaid: number;
  bookingCount: number;
  firstSeen: string;
  lastActivity: string;
  activities: Activity[];
}

const STAGE_META: Record<Stage, { label: string; className: string }> = {
  lead: { label: "New lead", className: "bg-muted text-muted-foreground" },
  contacted: { label: "Contacted", className: "bg-amber-100 text-amber-800" },
  qualified: { label: "Qualified", className: "bg-blue-100 text-blue-800" },
  customer: { label: "Customer", className: "bg-emerald-100 text-emerald-800" },
  lost: { label: "Lost", className: "bg-rose-100 text-rose-800" },
};

const STAGE_RANK: Record<Stage, number> = { lost: 0, lead: 1, contacted: 2, qualified: 3, customer: 4 };

const norm = (v?: string | null) => (v ?? "").trim().toLowerCase();
const normPhone = (v?: string | null) => (v ?? "").replace(/[^0-9]/g, "").slice(-9);

export function AdminCrm() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Contact | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [
        consultations,
        inquiries,
        planRequests,
        expertRequests,
        profiles,
        students,
        bookings,
        packages,
      ] = await Promise.all([
        supabase
          .from("consultation_bookings")
          .select(
            "id, parent_name, student_name, email, phone_number, grade_level, subjects_interest, status, follow_up_status, converted_to_customer, created_at"
          ),
        supabase
          .from("tutor_inquiries")
          .select(
            "id, parent_name, parent_email, parent_phone, student_name, grade_level, curriculum, subjects_needed, status, created_at"
          ),
        supabase
          .from("general_learning_plan_requests")
          .select(
            "id, parent_name, parent_email, parent_phone, student_name, grade_level, curriculum, subjects, status, created_at"
          ),
        supabase
          .from("expert_consultation_requests")
          .select("id, parent_name, email, phone_number, grade_levels, subjects_of_interest, status, created_at"),
        supabase.from("profiles").select("id, full_name, phone_number, account_type, created_at"),
        supabase.from("students").select("id, parent_id, full_name, curriculum, grade_level, subjects_of_interest, created_at"),
        supabase.from("bookings").select("id, student_id, subject, status, amount, created_at"),
        supabase.from("package_purchases").select("id, student_id, total_amount, amount_paid, payment_status, created_at"),
      ]);

      const errors = [
        consultations.error,
        inquiries.error,
        planRequests.error,
        expertRequests.error,
        profiles.error,
        students.error,
        bookings.error,
        packages.error,
      ].filter(Boolean);
      if (errors.length) throw errors[0];

      const profileEmails = new Map<string, string>();
      // Resolve emails for account holders via RPC-free approach: use students.email fallback later.
      const byKey = new Map<string, Contact>();
      const keyIndex = new Map<string, string>(); // email/phone -> key

      const resolveKey = (email?: string | null, phone?: string | null, fallback?: string) => {
        const e = norm(email);
        const p = normPhone(phone);
        const existing = (e && keyIndex.get(`e:${e}`)) || (p && keyIndex.get(`p:${p}`)) || null;
        const key = existing || (e ? `e:${e}` : p ? `p:${p}` : `x:${fallback}`);
        if (e) keyIndex.set(`e:${e}`, key);
        if (p) keyIndex.set(`p:${p}`, key);
        return key;
      };

      const upsert = (
        opts: {
          email?: string | null;
          phone?: string | null;
          name?: string | null;
          fallback: string;
          source: string;
          stage: Stage;
          at: string;
          activity: Activity;
          student?: string | null;
          subjects?: string[] | null;
          curriculum?: string | null;
          grade?: string | null;
          hasAccount?: boolean;
          paid?: number;
          booking?: boolean;
        }
      ) => {
        const key = resolveKey(opts.email, opts.phone, opts.fallback);
        const current = byKey.get(key);
        const base: Contact =
          current ?? {
            key,
            name: opts.name?.trim() || "Unknown",
            email: opts.email?.trim() || null,
            phone: opts.phone?.trim() || null,
            sources: [],
            stage: opts.stage,
            studentNames: [],
            subjects: [],
            curriculum: null,
            gradeLevels: [],
            hasAccount: false,
            totalPaid: 0,
            bookingCount: 0,
            firstSeen: opts.at,
            lastActivity: opts.at,
            activities: [],
          };

        if (!current) byKey.set(key, base);
        if (opts.name && base.name === "Unknown") base.name = opts.name.trim();
        if (!base.email && opts.email) base.email = opts.email.trim();
        if (!base.phone && opts.phone) base.phone = opts.phone.trim();
        if (!base.sources.includes(opts.source)) base.sources.push(opts.source);
        if (STAGE_RANK[opts.stage] > STAGE_RANK[base.stage]) base.stage = opts.stage;
        if (opts.student && !base.studentNames.includes(opts.student)) base.studentNames.push(opts.student);
        (opts.subjects ?? []).forEach((s) => {
          if (s && !base.subjects.includes(s)) base.subjects.push(s);
        });
        if (opts.curriculum && !base.curriculum) base.curriculum = opts.curriculum;
        if (opts.grade && !base.gradeLevels.includes(opts.grade)) base.gradeLevels.push(opts.grade);
        if (opts.hasAccount) base.hasAccount = true;
        if (opts.paid) base.totalPaid += opts.paid;
        if (opts.booking) base.bookingCount += 1;
        base.activities.push(opts.activity);
        if (opts.at < base.firstSeen) base.firstSeen = opts.at;
        if (opts.at > base.lastActivity) base.lastActivity = opts.at;
      };

      // Consultations (assessment calls)
      (consultations.data ?? []).forEach((c: any) => {
        let stage: Stage = "lead";
        if (c.converted_to_customer) stage = "customer";
        else if (["interested", "qualified"].includes(c.follow_up_status ?? "")) stage = "qualified";
        else if (c.follow_up_status === "follow_up_sent" || c.status === "completed") stage = "contacted";
        else if (["not_interested", "lost"].includes(c.follow_up_status ?? "")) stage = "lost";

        upsert({
          email: c.email,
          phone: c.phone_number,
          name: c.parent_name,
          fallback: `consult-${c.id}`,
          source: "Assessment call",
          stage,
          at: c.created_at,
          student: c.student_name,
          subjects: c.subjects_interest,
          grade: c.grade_level,
          activity: {
            type: "consultation",
            label: `Assessment call booked (${c.status ?? "pending"})`,
            at: c.created_at,
          },
        });
      });

      // Tutor inquiries
      (inquiries.data ?? []).forEach((i: any) => {
        upsert({
          email: i.parent_email,
          phone: i.parent_phone,
          name: i.parent_name,
          fallback: `inq-${i.id}`,
          source: "Tutor inquiry",
          stage: i.status === "converted" ? "customer" : "qualified",
          at: i.created_at,
          student: i.student_name,
          subjects: i.subjects_needed,
          curriculum: i.curriculum,
          grade: i.grade_level,
          activity: { type: "inquiry", label: `Tutor inquiry (${i.status ?? "new"})`, at: i.created_at },
        });
      });

      // Learning plan requests
      (planRequests.data ?? []).forEach((r: any) => {
        upsert({
          email: r.parent_email,
          phone: r.parent_phone,
          name: r.parent_name,
          fallback: `plan-${r.id}`,
          source: "Learning plan request",
          stage: r.status === "converted" ? "customer" : "qualified",
          at: r.created_at,
          student: r.student_name,
          subjects: r.subjects,
          curriculum: r.curriculum,
          grade: r.grade_level,
          activity: { type: "plan", label: `Learning plan request (${r.status ?? "new"})`, at: r.created_at },
        });
      });

      // Expert consultation requests
      (expertRequests.data ?? []).forEach((r: any) => {
        upsert({
          email: r.email,
          phone: r.phone_number,
          name: r.parent_name,
          fallback: `expert-${r.id}`,
          source: "Expert consultation",
          stage: "qualified",
          at: r.created_at,
          subjects: r.subjects_of_interest,
          grade: (r.grade_levels ?? [])[0],
          activity: { type: "expert", label: `Expert consultation request (${r.status ?? "new"})`, at: r.created_at },
        });
      });

      // Account holders (parents) + their students, bookings, packages
      const profileById = new Map((profiles.data ?? []).map((p: any) => [p.id, p]));
      const studentToParent = new Map<string, string>();

      (students.data ?? []).forEach((s: any) => {
        const parent = profileById.get(s.parent_id);
        if (s.parent_id) studentToParent.set(s.id, s.parent_id);
        upsert({
          email: null,
          phone: parent?.phone_number ?? null,
          name: parent?.full_name ?? s.full_name,
          fallback: `parent-${s.parent_id ?? s.id}`,
          source: "Registered account",
          stage: "qualified",
          at: s.created_at,
          student: s.full_name,
          subjects: s.subjects_of_interest,
          curriculum: s.curriculum,
          grade: s.grade_level,
          hasAccount: true,
          activity: { type: "student", label: `Student profile added: ${s.full_name}`, at: s.created_at },
        });
      });

      const parentKeyFor = (userId?: string | null) => {
        if (!userId) return null;
        const parent = profileById.get(userId);
        const k = resolveKey(null, parent?.phone_number ?? null, `parent-${userId}`);
        return byKey.has(k) ? k : null;
      };

      (bookings.data ?? []).forEach((b: any) => {
        const parent = profileById.get(b.student_id);
        upsert({
          email: null,
          phone: parent?.phone_number ?? null,
          name: parent?.full_name ?? null,
          fallback: `parent-${b.student_id}`,
          source: "Session booking",
          stage: b.status === "cancelled" ? "qualified" : "customer",
          at: b.created_at,
          subjects: [b.subject],
          hasAccount: true,
          booking: true,
          paid: b.status === "confirmed" ? Number(b.amount ?? 0) : 0,
          activity: {
            type: "booking",
            label: `Session booked — ${b.subject} (${b.status})`,
            at: b.created_at,
            amount: b.amount,
          },
        });
      });

      (packages.data ?? []).forEach((p: any) => {
        const parent = profileById.get(p.student_id);
        upsert({
          email: null,
          phone: parent?.phone_number ?? null,
          name: parent?.full_name ?? null,
          fallback: `parent-${p.student_id}`,
          source: "Package purchase",
          stage: p.payment_status === "completed" ? "customer" : "qualified",
          at: p.created_at,
          hasAccount: true,
          paid: Number(p.amount_paid ?? 0),
          activity: {
            type: "package",
            label: `Package purchase (${p.payment_status ?? "pending"})`,
            at: p.created_at,
            amount: p.amount_paid,
          },
        });
      });

      void profileEmails;
      void parentKeyFor;
      void studentToParent;

      const list = Array.from(byKey.values())
        .map((c) => ({ ...c, activities: c.activities.sort((a, b) => (a.at < b.at ? 1 : -1)) }))
        .sort((a, b) => (a.lastActivity < b.lastActivity ? 1 : -1));

      setContacts(list);
    } catch (e: any) {
      console.error("CRM load failed", e);
      toast.error(e?.message ?? "Failed to load CRM data");
    } finally {
      setLoading(false);
    }
  };

  const sources = useMemo(
    () => Array.from(new Set(contacts.flatMap((c) => c.sources))).sort(),
    [contacts]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((c) => {
      if (stageFilter !== "all" && c.stage !== stageFilter) return false;
      if (sourceFilter !== "all" && !c.sources.includes(sourceFilter)) return false;
      if (!q) return true;
      return [c.name, c.email, c.phone, ...c.studentNames, ...c.subjects]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [contacts, query, stageFilter, sourceFilter]);

  const stats = useMemo(() => {
    const customers = contacts.filter((c) => c.stage === "customer").length;
    const openLeads = contacts.filter((c) => ["lead", "contacted", "qualified"].includes(c.stage)).length;
    const revenue = contacts.reduce((sum, c) => sum + c.totalPaid, 0);
    return { total: contacts.length, customers, openLeads, revenue };
  }, [contacts]);

  const exportCsv = () => {
    const rows = [
      ["Name", "Email", "Phone", "Stage", "Sources", "Students", "Subjects", "Bookings", "Total paid (KES)", "First seen", "Last activity"],
      ...filtered.map((c) => [
        c.name,
        c.email ?? "",
        c.phone ?? "",
        STAGE_META[c.stage].label,
        c.sources.join(" | "),
        c.studentNames.join(" | "),
        c.subjects.join(" | "),
        String(c.bookingCount),
        String(Math.round(c.totalPaid)),
        format(new Date(c.firstSeen), "yyyy-MM-dd"),
        format(new Date(c.lastActivity), "yyyy-MM-dd"),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lana-crm-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total contacts", value: stats.total, icon: Users },
          { label: "Customers", value: stats.customers, icon: UserCheck },
          { label: "Open leads", value: stats.openLeads, icon: TrendingUp },
          { label: "Revenue tracked", value: `KES ${Math.round(stats.revenue).toLocaleString()}`, icon: TrendingUp },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-semibold">{s.value}</p>
              </div>
              <s.icon className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Customers &amp; leads</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, phone, subject"
                className="w-56 pl-8"
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                {(Object.keys(STAGE_META) as Stage[]).map((s) => (
                  <SelectItem key={s} value={s}>{STAGE_META[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Paid (KES)</TableHead>
                  <TableHead>Last activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Loading contacts…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No contacts match these filters.</TableCell></TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.key} className="cursor-pointer" onClick={() => setSelected(c)}>
                      <TableCell>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.email ?? "no email"}{c.phone ? ` · ${c.phone}` : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={STAGE_META[c.stage].className}>{STAGE_META[c.stage].label}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm">
                        {c.studentNames.join(", ") || "—"}
                      </TableCell>
                      <TableCell className="max-w-[180px] text-xs text-muted-foreground">
                        {c.sources.join(", ")}
                      </TableCell>
                      <TableCell className="text-right">{c.bookingCount}</TableCell>
                      <TableCell className="text-right">{Math.round(c.totalPaid).toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{format(new Date(c.lastActivity), "dd MMM yyyy")}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={STAGE_META[selected.stage].className}>{STAGE_META[selected.stage].label}</Badge>
                {selected.hasAccount && <Badge variant="outline">Has account</Badge>}
                {selected.curriculum && <Badge variant="outline">{selected.curriculum}</Badge>}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {selected.email ? (
                    <a className="text-primary underline" href={`mailto:${selected.email}`}>{selected.email}</a>
                  ) : (
                    <span className="text-muted-foreground">No email</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {selected.phone ? (
                    <a className="text-primary underline" href={`https://wa.me/${normPhone(selected.phone) ? selected.phone.replace(/[^0-9]/g, "") : ""}`} target="_blank" rel="noreferrer">
                      {selected.phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">No phone</span>
                  )}
                </div>
                <div><span className="text-muted-foreground">Students: </span>{selected.studentNames.join(", ") || "—"}</div>
                <div><span className="text-muted-foreground">Grades: </span>{selected.gradeLevels.join(", ") || "—"}</div>
                <div className="sm:col-span-2"><span className="text-muted-foreground">Subjects: </span>{selected.subjects.join(", ") || "—"}</div>
                <div><span className="text-muted-foreground">Sessions booked: </span>{selected.bookingCount}</div>
                <div><span className="text-muted-foreground">Total paid: </span>KES {Math.round(selected.totalPaid).toLocaleString()}</div>
                <div><span className="text-muted-foreground">First seen: </span>{format(new Date(selected.firstSeen), "dd MMM yyyy")}</div>
                <div><span className="text-muted-foreground">Last activity: </span>{format(new Date(selected.lastActivity), "dd MMM yyyy")}</div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Activity timeline</p>
                <div className="space-y-2">
                  {selected.activities.map((a, i) => (
                    <div key={i} className="flex items-start justify-between rounded-md border p-3 text-sm">
                      <span>{a.label}</span>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {format(new Date(a.at), "dd MMM yyyy")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Phone } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { crmDb } from "./crmTypes";
import type { Channel, Family } from "./crmTypes";
import { CHANNELS, formatPhone, normalizePhone } from "./crmMeta";

interface NewLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const EMPTY = {
  phone: "",
  parentName: "",
  channel: "phone" as Channel,
  studentName: "",
  gradeLevel: "",
  curriculum: "",
  subjects: "",
  note: "",
};

/** The 30-second "+ Lead" form. A known phone opens the family instead. */
export function NewLeadDialog({ open, onOpenChange, onCreated }: NewLeadDialogProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [existing, setExisting] = useState<Family | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setExisting(null);
    }
  }, [open]);

  const phone = normalizePhone(form.phone);

  useEffect(() => {
    let active = true;
    if (!phone || phone.length < 9) {
      setExisting(null);
      return;
    }
    setChecking(true);
    const timer = window.setTimeout(async () => {
      const { data } = await crmDb.from("families").select("*").eq("phone", phone).maybeSingle();
      if (!active) return;
      setExisting((data ?? null) as unknown as Family | null);
      setChecking(false);
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [phone]);

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!phone && !form.parentName.trim()) {
      toast.error("Add a phone number or a parent's name");
      return;
    }
    if (existing) {
      navigate(`/admin/families/${existing.id}`);
      onOpenChange(false);
      return;
    }
    setSaving(true);
    const { data, error } = await crmDb.rpc("crm_create_lead", {
      p_phone: form.phone,
      p_parent_name: form.parentName.trim(),
      p_channel: form.channel,
      p_student_name: form.studentName.trim() || null,
      p_grade_level: form.gradeLevel.trim() || null,
      p_curriculum: form.curriculum.trim() || null,
      p_subjects: form.subjects
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      p_note: form.note.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(`Could not add the lead: ${error.message}`);
      return;
    }
    toast.success("Lead added");
    onOpenChange(false);
    onCreated?.();
    if (data) navigate(`/admin/families/${data}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a lead</DialogTitle>
          <DialogDescription>
            Phone first. If the number is already known, the family opens instead.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="lead-phone">Phone number</Label>
            <Input
              id="lead-phone"
              inputMode="tel"
              autoFocus
              placeholder="0712 345 678"
              value={form.phone}
              onChange={(e) => set("phone")(e.target.value)}
            />
            {checking && <p className="text-xs text-muted-foreground">Checking the number…</p>}
            {!checking && existing && (
              <p className="text-xs text-emerald-700">
                Known family: {existing.parent_name ?? formatPhone(existing.phone)}. Saving opens it.
              </p>
            )}
            {!checking && !existing && phone && (
              <p className="text-xs text-muted-foreground">Saved as {formatPhone(phone)}</p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lead-parent">Parent name</Label>
              <Input
                id="lead-parent"
                placeholder="Alice Wanjiru"
                value={form.parentName}
                onChange={(e) => set("parentName")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select value={form.channel} onValueChange={set("channel")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lead-child">Child's name</Label>
              <Input
                id="lead-child"
                placeholder="Brian"
                value={form.studentName}
                onChange={(e) => set("studentName")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-grade">Grade</Label>
              <Input
                id="lead-grade"
                placeholder="Grade 8"
                value={form.gradeLevel}
                onChange={(e) => set("gradeLevel")(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lead-curriculum">Curriculum</Label>
              <Input
                id="lead-curriculum"
                placeholder="CBC, IGCSE…"
                value={form.curriculum}
                onChange={(e) => set("curriculum")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-subjects">Subjects</Label>
              <Input
                id="lead-subjects"
                placeholder="Maths, Physics"
                value={form.subjects}
                onChange={(e) => set("subjects")(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-note">Note</Label>
            <Textarea
              id="lead-note"
              rows={2}
              placeholder="What did they ask for?"
              value={form.note}
              onChange={(e) => set("note")(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
            {existing ? "Open family" : "Add lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

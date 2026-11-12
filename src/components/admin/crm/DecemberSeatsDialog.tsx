import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CODE_INFO, DECEMBER_CODES, buildSeatNote, readLists, type DecemberCode } from "@/utils/decemberDesk";
import { crmDb } from "./crmTypes";
import type { LeadActivity } from "./crmTypes";

interface DecemberSeatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: string;
  leadId: string | null;
  activities: LeadActivity[];
  onAdded: () => void;
}

const GRADES = ["Form 3", "Grade 8"] as const;

/**
 * Add December seats: writes the DEC26 note in the exact format (see src/utils/decemberDesk.ts), so a mistyped class code
 * cannot lose a seat. "Take a seat back" writes the CANCEL note.
 */
export function DecemberSeatsDialog({ open, onOpenChange, familyId, leadId, activities, onAdded }: DecemberSeatsDialogProps) {
  const [mode, setMode] = useState<"reserve" | "cancel">("reserve");
  const [child, setChild] = useState("");
  const [picked, setPicked] = useState<DecemberCode[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMode("reserve");
      setChild("");
      setPicked([]);
    }
  }, [open]);

  // What this family already holds, read from its own timeline notes.
  const held = useMemo(
    () =>
      readLists(
        activities
          .filter((a) => a.kind === "note")
          .map((a) => ({ id: a.id, family_id: a.family_id, body: a.body, occurred_at: a.occurred_at, created_at: a.created_at })),
      ).held,
    [activities],
  );
  const children = useMemo(() => [...new Set(held.map((h) => h.child).filter(Boolean))], [held]);
  const holds = useMemo(
    () => new Set(held.filter((h) => h.child.trim().toLowerCase() === child.trim().toLowerCase()).map((h) => h.code)),
    [held, child],
  );

  const choose = (nextMode: "reserve" | "cancel") => {
    setMode(nextMode);
    setPicked([]);
  };
  const toggle = (code: DecemberCode, on: boolean) =>
    setPicked((current) => (on ? [...current, code] : current.filter((c) => c !== code)));

  const note = buildSeatNote({ codes: picked, child, cancel: mode === "cancel" });

  const save = async () => {
    if (!note) return;
    setSaving(true);
    const { error } = await crmDb.from("lead_activities").insert({
      family_id: familyId,
      lead_id: leadId,
      kind: "note",
      body: note,
    });
    setSaving(false);
    if (error) {
      toast.error(`Could not save the seats: ${error.message}`);
      return;
    }
    toast.success(mode === "cancel" ? "Seat taken back" : "Seats noted");
    onOpenChange(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>December seats</DialogTitle>
          <DialogDescription>Adds a note to this family's timeline that the December desk counts.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={mode === "reserve" ? "default" : "outline"} onClick={() => choose("reserve")}>
              Reserve seats
            </Button>
            <Button type="button" size="sm" variant={mode === "cancel" ? "default" : "outline"} onClick={() => choose("cancel")}>
              Take a seat back
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="seats-child">Child's name</Label>
            <Input
              id="seats-child"
              autoComplete="off"
              list="seats-children"
              value={child}
              onChange={(e) => setChild(e.target.value)}
            />
            <datalist id="seats-children">
              {children.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          {GRADES.map((grade) => (
            <fieldset key={grade} className="space-y-2">
              <legend className="text-sm font-medium">{grade}</legend>
              {DECEMBER_CODES.filter((code) => CODE_INFO[code].grade === grade).map((code) => {
                const label = `${CODE_INFO[code].grade} ${CODE_INFO[code].subject}`;
                const already = holds.has(code);
                // Reserving a seat the child already holds, or taking back one it does not hold, is not offered.
                const disabled = mode === "reserve" ? already : !already;
                return (
                  <div key={code} className="flex items-center gap-2">
                    <Checkbox
                      id={`seat-${code}`}
                      aria-label={label}
                      disabled={disabled}
                      checked={picked.includes(code)}
                      onCheckedChange={(on) => toggle(code, on === true)}
                    />
                    <Label htmlFor={`seat-${code}`} className="text-sm font-normal">
                      {CODE_INFO[code].subject}
                      {mode === "reserve" && already ? " (already reserved)" : ""}
                    </Label>
                  </div>
                );
              })}
            </fieldset>
          ))}

          {note && <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Note: {note}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !note}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {mode === "cancel" ? "Take the seat back" : "Save seats"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

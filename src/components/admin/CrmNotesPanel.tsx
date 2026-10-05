import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const TYPES = [
  { value: "general", label: "Note" },
  { value: "call", label: "Phone call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "follow_up", label: "Follow-up" },
];

interface Note {
  id: string;
  note: string;
  note_type: string;
  follow_up_date: string | null;
  created_by_name: string | null;
  created_at: string;
}

export function CrmNotesPanel({ contactKey, contactName }: { contactKey: string; contactName: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [type, setType] = useState("general");
  const [followUp, setFollowUp] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("crm_notes")
      .select("id, note, note_type, follow_up_date, created_by_name, created_at")
      .eq("contact_key", contactKey)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setNotes((data as Note[]) ?? []);
  };

  useEffect(() => {
    load();
  }, [contactKey]);

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("crm_notes").insert({
      contact_key: contactKey,
      contact_name: contactName,
      note: text.trim(),
      note_type: type,
      follow_up_date: followUp || null,
      created_by: user?.id,
      created_by_name: user?.user_metadata?.full_name ?? user?.email ?? null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setText("");
    setFollowUp("");
    toast.success("Note saved");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("crm_notes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Team notes</p>
      <div className="space-y-2 rounded-md border p-3">
        <Textarea rows={3} placeholder="e.g. Called mum, wants IGCSE Chemistry tutor, call back Friday" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" className="w-44" value={followUp} onChange={(e) => setFollowUp(e.target.value)} aria-label="Follow-up date" />
          <Button size="sm" className="ml-auto" onClick={save} disabled={saving || !text.trim()}>
            {saving ? "Saving..." : "Save note"}
          </Button>
        </div>
      </div>
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      ) : (
        notes.map((n) => (
          <div key={n.id} className="rounded-md border p-3 text-sm">
            <div className="mb-1 flex items-center gap-2">
              <Badge variant="outline">{TYPES.find((t) => t.value === n.note_type)?.label ?? n.note_type}</Badge>
              {n.follow_up_date && (
                <Badge variant="secondary" className="gap-1">
                  <CalendarClock className="h-3 w-3" /> Follow up {format(new Date(n.follow_up_date), "dd MMM")}
                </Badge>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                {n.created_by_name ? `${n.created_by_name} · ` : ""}{format(new Date(n.created_at), "dd MMM yyyy, HH:mm")}
              </span>
              <button onClick={() => remove(n.id)} aria-label="Delete note" className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <p className="whitespace-pre-wrap">{n.note}</p>
          </div>
        ))
      )}
    </div>
  );
}

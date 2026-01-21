import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Plus, 
  TrendingUp, 
  AlertTriangle, 
  Trophy, 
  FileText,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface StudentNote {
  id: string;
  student_id: string;
  note: string;
  note_type: string;
  created_at: string;
  created_by: string | null;
}

interface StudentNotesPanelProps {
  studentId: string;
  studentName: string;
}

const NOTE_TYPES = [
  { value: "progress", label: "Progress Update", icon: TrendingUp, color: "bg-green-500" },
  { value: "concern", label: "Concern", icon: AlertTriangle, color: "bg-yellow-500" },
  { value: "achievement", label: "Achievement", icon: Trophy, color: "bg-blue-500" },
  { value: "general", label: "General Note", icon: FileText, color: "bg-gray-500" },
];

export function StudentNotesPanel({ studentId, studentName }: StudentNotesPanelProps) {
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState("progress");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [studentId]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from("student_notes")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error("Please enter a note");
      return;
    }

    setSubmitting(true);
    try {
      // Get the parent_id from the student
      const { data: student } = await supabase
        .from("students")
        .select("parent_id")
        .eq("id", studentId)
        .single();

      if (!student) throw new Error("Student not found");

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("student_notes")
        .insert({
          student_id: studentId,
          parent_id: student.parent_id,
          note: newNote.trim(),
          note_type: noteType,
          created_by: user?.id,
        });

      if (error) throw error;

      toast.success("Note added successfully");
      setNewNote("");
      setShowAddForm(false);
      fetchNotes();
    } catch (error: any) {
      console.error("Error adding note:", error);
      toast.error("Failed to add note");
    } finally {
      setSubmitting(false);
    }
  };

  const getNoteTypeConfig = (type: string) => {
    return NOTE_TYPES.find(t => t.value === type) || NOTE_TYPES[3];
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading notes...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-sm">Notes for {studentName}</h4>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Note
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Select value={noteType} onValueChange={setNoteType}>
              <SelectTrigger>
                <SelectValue placeholder="Note type" />
              </SelectTrigger>
              <SelectContent>
                {NOTE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Enter your note about the student's progress, concerns, or achievements..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save Note"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No notes yet. Add the first note to track this student's progress.
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => {
            const config = getNoteTypeConfig(note.note_type);
            const IconComponent = config.icon;
            return (
              <Card key={note.id}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-full ${config.color} text-white`}>
                      <IconComponent className="h-3 w-3" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm">{note.note}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

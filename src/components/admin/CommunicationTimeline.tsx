import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Mail, 
  MessageCircle, 
  Phone, 
  FileText, 
  Plus,
  Send
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface CommunicationLog {
  id: string;
  channel: string;
  direction: string;
  subject: string | null;
  content: string | null;
  status: string;
  created_at: string;
}

interface CommunicationTimelineProps {
  parentId: string | null;
  studentId?: string | null;
  tutorId?: string | null;
}

export function CommunicationTimeline({ parentId, studentId, tutorId }: CommunicationTimelineProps) {
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (parentId || studentId || tutorId) {
      fetchLogs();
    }
  }, [parentId, studentId, tutorId]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("communication_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (parentId) {
        query = query.eq("parent_id", parentId);
      } else if (studentId) {
        query = query.eq("student_id", studentId);
      } else if (tutorId) {
        query = query.eq("tutor_id", tutorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error("Error fetching communication logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const addNote = async () => {
    if (!noteContent.trim()) return;
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("communication_logs").insert({
        parent_id: parentId,
        student_id: studentId,
        tutor_id: tutorId,
        channel: "note",
        direction: "outbound",
        content: noteContent,
        status: "sent",
        sent_by: user?.id,
      });

      if (error) throw error;

      toast.success("Note added");
      setNoteContent("");
      setShowAddNote(false);
      fetchLogs();
    } catch (error: any) {
      console.error("Error adding note:", error);
      toast.error("Failed to add note");
    } finally {
      setSaving(false);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email": return <Mail className="h-4 w-4" />;
      case "whatsapp": return <MessageCircle className="h-4 w-4 text-green-600" />;
      case "phone_call": return <Phone className="h-4 w-4 text-blue-600" />;
      case "sms": return <MessageCircle className="h-4 w-4 text-purple-600" />;
      case "note": return <FileText className="h-4 w-4 text-orange-600" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case "email": return "Email";
      case "whatsapp": return "WhatsApp";
      case "phone_call": return "Phone Call";
      case "sms": return "SMS";
      case "note": return "Note";
      default: return channel;
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Note Button */}
      {!showAddNote ? (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowAddNote(true)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Textarea
              placeholder="Add a note about this contact..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setShowAddNote(false);
                  setNoteContent("");
                }}
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={addNote}
                disabled={saving || !noteContent.trim()}
              >
                <Send className="h-4 w-4 mr-2" />
                Save Note
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
      ) : logs.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No communication history yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Communications will be logged here automatically
          </p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="relative pl-10">
                <div className="absolute left-2 top-1 p-1.5 bg-background border rounded-full">
                  {getChannelIcon(log.channel)}
                </div>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getChannelLabel(log.channel)}
                        </Badge>
                        {log.direction === "inbound" && (
                          <Badge variant="secondary" className="text-xs">
                            Inbound
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "MMM d, h:mm a")}
                      </span>
                    </div>
                    {log.subject && (
                      <p className="font-medium text-sm">{log.subject}</p>
                    )}
                    {log.content && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {log.content.length > 200 
                          ? log.content.substring(0, 200) + "..." 
                          : log.content}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

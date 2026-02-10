import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Send } from "lucide-react";

interface Props {
  schoolId: string;
  authorId: string;
  onCreated: () => void;
}

const AnnouncementComposer: React.FC<Props> = ({ schoolId, authorId, onCreated }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setLoading(true);
    const { error } = await (supabase as any).from("school_announcements").insert({
      school_id: schoolId,
      title,
      content,
      category,
      author_id: authorId,
      published: true,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Published!", description: "Announcement sent to all parents." });
      setTitle(""); setContent(""); setCategory("general");
      onCreated();
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">New Announcement</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="Announcement title" value={title} onChange={e => setTitle(e.target.value)} required />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="general">📢 General</SelectItem>
              <SelectItem value="academic">📚 Academic</SelectItem>
              <SelectItem value="sports">⚽ Sports</SelectItem>
              <SelectItem value="events">🎉 Events</SelectItem>
            </SelectContent>
          </Select>
          <Textarea placeholder="Write your announcement..." value={content} onChange={e => setContent(e.target.value)} rows={4} required />
          <Button type="submit" disabled={loading} className="gap-2" style={{ backgroundColor: "var(--school-primary)" }}>
            <Send className="h-4 w-4" /> {loading ? "Publishing..." : "Publish Announcement"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AnnouncementComposer;

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
  classes?: string[];
  onCreated: () => void;
}

const AnnouncementComposer: React.FC<Props> = ({ schoolId, authorId, classes = [], onCreated }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [targetClass, setTargetClass] = useState("all");
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
      target_class: targetClass === "all" ? null : targetClass,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Published!", description: targetClass === "all" ? "Announcement sent to all parents." : `Announcement sent to ${targetClass} parents.` });
      setTitle(""); setContent(""); setCategory("general"); setTargetClass("all");
      onCreated();
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">New Announcement</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="Announcement title" value={title} onChange={e => setTitle(e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">📢 General</SelectItem>
                <SelectItem value="academic">📚 Academic</SelectItem>
                <SelectItem value="sports">⚽ Sports</SelectItem>
                <SelectItem value="events">🎉 Events</SelectItem>
              </SelectContent>
            </Select>
            <Select value={targetClass} onValueChange={setTargetClass}>
              <SelectTrigger><SelectValue placeholder="Audience" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🏫 All School</SelectItem>
                {classes.map(cls => (
                  <SelectItem key={cls} value={cls}>🎓 {cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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

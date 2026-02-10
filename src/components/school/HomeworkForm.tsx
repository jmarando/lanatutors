import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { BookOpen } from "lucide-react";

interface Props {
  schoolId: string;
  teacherId: string;
  onCreated: () => void;
}

const subjects = ["Mathematics", "English", "Science", "Social Studies", "Kiswahili", "Creative Arts", "Physical Education", "ICT"];
const classes = ["Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8"];

const HomeworkForm: React.FC<Props> = ({ schoolId, teacherId, onCreated }) => {
  const [form, setForm] = useState({ class_name: "", subject: "", title: "", description: "", due_date: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await (supabase as any).from("school_homework").insert({
      school_id: schoolId,
      teacher_id: teacherId,
      ...form,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Homework posted!", description: `${form.title} assigned to ${form.class_name}` });
      setForm({ class_name: "", subject: "", title: "", description: "", due_date: "" });
      onCreated();
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BookOpen className="h-5 w-5" /> Post Homework</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select value={form.class_name} onValueChange={v => setForm(f => ({ ...f, class_name: v }))}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>{classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.subject} onValueChange={v => setForm(f => ({ ...f, subject: v }))}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>{subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Input placeholder="Homework title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <Textarea placeholder="Description and instructions..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} required />
          <Button type="submit" disabled={loading} style={{ backgroundColor: "var(--school-primary)" }}>
            {loading ? "Posting..." : "Post Homework"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default HomeworkForm;

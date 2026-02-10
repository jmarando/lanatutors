import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { SchoolStudent } from "@/hooks/useSchool";
import { Save } from "lucide-react";

interface Props {
  schoolId: string;
  teacherId: string;
  students: SchoolStudent[];
}

const subjects = ["Mathematics", "English", "Science", "Social Studies", "Kiswahili", "Creative Arts"];
const terms = ["Term 1", "Term 2", "Term 3"];

function autoGrade(score: number, maxScore: number): string {
  const pct = (score / maxScore) * 100;
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "E";
}

const ResultsEntry: React.FC<Props> = ({ schoolId, teacherId, students }) => {
  const [subject, setSubject] = useState("");
  const [term, setTerm] = useState("");
  const [className, setClassName] = useState("");
  const [year] = useState(new Date().getFullYear());
  const [scores, setScores] = useState<Record<string, { score: string; comments: string }>>({});
  const [loading, setLoading] = useState(false);

  const filteredStudents = students.filter(s => !className || s.class_name === className);

  const handleSave = async () => {
    if (!subject || !term) { toast({ title: "Select subject and term", variant: "destructive" }); return; }
    setLoading(true);
    const rows = Object.entries(scores)
      .filter(([, v]) => v.score)
      .map(([studentId, v]) => ({
        school_student_id: studentId,
        school_id: schoolId,
        subject,
        term,
        year,
        score: parseFloat(v.score),
        max_score: 100,
        grade: autoGrade(parseFloat(v.score), 100),
        teacher_comments: v.comments || null,
        teacher_id: teacherId,
      }));

    if (!rows.length) { setLoading(false); toast({ title: "Enter at least one score", variant: "destructive" }); return; }

    const { error } = await (supabase as any).from("school_results").insert(rows);
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Results saved!", description: `${rows.length} results recorded for ${subject}` });
      setScores({});
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Enter Student Results</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Select value={className} onValueChange={setClassName}>
            <SelectTrigger><SelectValue placeholder="Filter by class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Grade 4">Grade 4</SelectItem>
              <SelectItem value="Grade 5">Grade 5</SelectItem>
              <SelectItem value="Grade 6">Grade 6</SelectItem>
            </SelectContent>
          </Select>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
            <SelectContent>{subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger><SelectValue placeholder="Term" /></SelectTrigger>
            <SelectContent>{terms.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {filteredStudents.length > 0 && subject && term ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="w-24">Score /100</TableHead>
                  <TableHead className="w-16">Grade</TableHead>
                  <TableHead>Comments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map(s => {
                  const entry = scores[s.id] || { score: "", comments: "" };
                  const grade = entry.score ? autoGrade(parseFloat(entry.score), 100) : "-";
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.student_name}</TableCell>
                      <TableCell>{s.class_name}</TableCell>
                      <TableCell>
                        <Input type="number" min={0} max={100} placeholder="0" value={entry.score}
                          onChange={e => setScores(prev => ({ ...prev, [s.id]: { ...entry, score: e.target.value } }))} />
                      </TableCell>
                      <TableCell className="font-bold text-center">{grade}</TableCell>
                      <TableCell>
                        <Input placeholder="Optional comment" value={entry.comments}
                          onChange={e => setScores(prev => ({ ...prev, [s.id]: { ...entry, comments: e.target.value } }))} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Button onClick={handleSave} disabled={loading} className="gap-2" style={{ backgroundColor: "var(--school-primary)" }}>
              <Save className="h-4 w-4" /> {loading ? "Saving..." : "Save Results"}
            </Button>
          </>
        ) : (
          <p className="text-center py-8 text-muted-foreground">Select a class, subject, and term to enter results</p>
        )}
      </CardContent>
    </Card>
  );
};

export default ResultsEntry;

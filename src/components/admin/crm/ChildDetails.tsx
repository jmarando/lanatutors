import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Lead } from "./crmTypes";

export type ChildFields = {
  student_name: string;
  grade_level: string;
  curriculum: string;
  subjects: string[];
};

interface ChildDetailsProps {
  lead: Lead;
  saving: boolean;
  onSave: (fields: ChildFields) => void;
}

/** The child, grade, curriculum and subjects, editable in place. */
export function ChildDetails({ lead, saving, onSave }: ChildDetailsProps) {
  const [student, setStudent] = useState(lead.student_name ?? "");
  const [grade, setGrade] = useState(lead.grade_level ?? "");
  const [curriculum, setCurriculum] = useState(lead.curriculum ?? "");
  const [subjects, setSubjects] = useState((lead.subjects ?? []).join(", "));

  useEffect(() => {
    setStudent(lead.student_name ?? "");
    setGrade(lead.grade_level ?? "");
    setCurriculum(lead.curriculum ?? "");
    setSubjects((lead.subjects ?? []).join(", "));
  }, [lead.id, lead.student_name, lead.grade_level, lead.curriculum, lead.subjects]);

  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground">The child</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          placeholder="Child's name"
          value={student}
          onChange={(e) => setStudent(e.target.value)}
          aria-label="Child's name"
        />
        <Input
          placeholder="Grade"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          aria-label="Grade"
        />
        <Input
          placeholder="Curriculum"
          value={curriculum}
          onChange={(e) => setCurriculum(e.target.value)}
          aria-label="Curriculum"
        />
        <Input
          placeholder="Subjects, comma separated"
          value={subjects}
          onChange={(e) => setSubjects(e.target.value)}
          aria-label="Subjects"
        />
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() =>
            onSave({
              student_name: student.trim(),
              grade_level: grade.trim(),
              curriculum: curriculum.trim(),
              subjects: subjects
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save details
        </Button>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, User } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface StudentSelectorProps {
  currentStudent: {
    id: string;
    name: string;
    curriculum: string;
    gradeLevel: string;
  } | null;
  allStudents: Array<{
    id: string;
    name: string;
    curriculum: string;
    gradeLevel: string;
  }>;
  onSelectStudent: (studentId: string) => void;
  onAddStudent: (student: { name: string; curriculum: string; gradeLevel: string }) => void;
}

const allCurricula = ["CBC", "8-4-4", "IGCSE", "A-Level", "IB"];
const gradesByCurriculum: Record<string, string[]> = {
  "CBC": ["Grade 8", "Grade 9"],
  "8-4-4": ["Form 3", "Form 4"],
  "IGCSE": ["Year 10", "Year 11"],
  "A-Level": ["Year 12", "Year 13"],
  "IB": ["Year 12", "Year 13"]
};

export const StudentSelector = ({ 
  currentStudent, 
  allStudents, 
  onSelectStudent, 
  onAddStudent 
}: StudentSelectorProps) => {
  const [isAdding, setIsAdding] = useState(allStudents.length === 0);
  const [newName, setNewName] = useState("");
  const [newCurriculum, setNewCurriculum] = useState("");
  const [newGrade, setNewGrade] = useState("");

  const handleAddStudent = () => {
    if (newName && newCurriculum && newGrade) {
      onAddStudent({
        name: newName,
        curriculum: newCurriculum,
        gradeLevel: newGrade
      });
      setNewName("");
      setNewCurriculum("");
      setNewGrade("");
      setIsAdding(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Select Student
          </CardTitle>
          {!isAdding && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Student
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Existing students */}
        {allStudents.length > 0 && !isAdding && (
          <div className="flex flex-wrap gap-2 mb-4">
            {allStudents.map((student) => (
              <Badge
                key={student.id}
                variant={currentStudent?.id === student.id ? "default" : "outline"}
                className="cursor-pointer px-4 py-2 text-sm"
                onClick={() => onSelectStudent(student.id)}
              >
                <User className="h-3 w-3 mr-2" />
                {student.name} ({student.curriculum} {student.gradeLevel})
              </Badge>
            ))}
          </div>
        )}

        {/* Add new student form */}
        {isAdding && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="student-name">Student Name</Label>
              <Input
                id="student-name"
                placeholder="e.g., Sarah"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="curriculum">Curriculum</Label>
                <Select value={newCurriculum} onValueChange={(val) => {
                  setNewCurriculum(val);
                  setNewGrade("");
                }}>
                  <SelectTrigger id="curriculum">
                    <SelectValue placeholder="Select curriculum" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCurricula.map(curr => (
                      <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="grade">Grade Level</Label>
                <Select value={newGrade} onValueChange={setNewGrade} disabled={!newCurriculum}>
                  <SelectTrigger id="grade">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {newCurriculum && gradesByCurriculum[newCurriculum]?.map(grade => (
                      <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddStudent}
                disabled={!newName || !newCurriculum || !newGrade}
                className="flex-1"
              >
                Add Student
              </Button>
              {allStudents.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setIsAdding(false)}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

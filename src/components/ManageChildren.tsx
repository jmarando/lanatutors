import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, User, GraduationCap, Edit2, Trash2 } from "lucide-react";
import { useStudents, Student } from "@/hooks/useStudents";
import { useToast } from "@/hooks/use-toast";
import { getCurriculums, getLevelsForCurriculum } from "@/utils/curriculumData";

interface ManageChildrenProps {
  onStudentSelect?: (student: Student) => void;
  selectedStudentId?: string;
  compact?: boolean;
}

export function ManageChildren({ onStudentSelect, selectedStudentId, compact = false }: ManageChildrenProps) {
  const { students, loading, addStudent, deleteStudent } = useStudents();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    full_name: "",
    age: "",
    curriculum: "",
    grade_level: "",
    email: "",
  });

  const curriculums = getCurriculums();
  const availableLevels = newStudent.curriculum ? getLevelsForCurriculum(newStudent.curriculum) : [];

  const handleAddStudent = async () => {
    if (!newStudent.full_name.trim() || !newStudent.curriculum || !newStudent.grade_level) {
      toast({
        title: "Missing Information",
        description: "Please fill in the student's name, curriculum, and grade level.",
        variant: "destructive",
      });
      return;
    }

    try {
      const student = await addStudent({
        full_name: newStudent.full_name.trim(),
        age: newStudent.age ? parseInt(newStudent.age) : undefined,
        curriculum: newStudent.curriculum,
        grade_level: newStudent.grade_level,
        email: newStudent.email.trim() || undefined,
      });

      toast({
        title: "Child Added",
        description: `${student.full_name} has been added to your account.`,
      });

      setNewStudent({ full_name: "", age: "", curriculum: "", grade_level: "", email: "" });
      setIsAddDialogOpen(false);

      if (onStudentSelect) {
        onStudentSelect(student);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add child. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    if (!confirm(`Are you sure you want to remove ${student.full_name}?`)) return;

    try {
      await deleteStudent(student.id);
      toast({
        title: "Child Removed",
        description: `${student.full_name} has been removed from your account.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove child.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  // Compact mode - just show student selector badges
  if (compact) {
    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium">Select Student</Label>
        <div className="flex flex-wrap gap-2">
          {students.map((student) => (
            <Badge
              key={student.id}
              variant={selectedStudentId === student.id ? "default" : "outline"}
              className="cursor-pointer px-3 py-1.5 text-sm"
              onClick={() => onStudentSelect?.(student)}
            >
              <User className="h-3 w-3 mr-1.5" />
              {student.full_name}
              <span className="ml-1 text-xs opacity-70">
                ({student.curriculum} {student.grade_level})
              </span>
            </Badge>
          ))}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Badge variant="outline" className="cursor-pointer px-3 py-1.5 text-sm border-dashed">
                <Plus className="h-3 w-3 mr-1.5" />
                Add Child
              </Badge>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a Child</DialogTitle>
                <DialogDescription>
                  Enter your child's details to book sessions for them.
                </DialogDescription>
              </DialogHeader>
              <AddStudentForm
                newStudent={newStudent}
                setNewStudent={setNewStudent}
                curriculums={curriculums}
                availableLevels={availableLevels}
                onSubmit={handleAddStudent}
              />
            </DialogContent>
          </Dialog>
        </div>
        {students.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Add your first child to start booking sessions for them.
          </p>
        )}
      </div>
    );
  }

  // Full card mode - for dashboard
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              My Children
            </CardTitle>
            <CardDescription>Manage student profiles for your children</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Child
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a Child</DialogTitle>
                <DialogDescription>
                  Enter your child's details to book sessions for them.
                </DialogDescription>
              </DialogHeader>
              <AddStudentForm
                newStudent={newStudent}
                setNewStudent={setNewStudent}
                curriculums={curriculums}
                availableLevels={availableLevels}
                onSubmit={handleAddStudent}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {students.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="mb-2">No children added yet</p>
            <p className="text-sm">Add your children to book tutoring sessions for them.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {students.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{student.full_name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{student.curriculum}</span>
                      <span>•</span>
                      <span>{student.grade_level}</span>
                      {student.age && (
                        <>
                          <span>•</span>
                          <span>Age {student.age}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDeleteStudent(student)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Extracted form component for reuse
function AddStudentForm({
  newStudent,
  setNewStudent,
  curriculums,
  availableLevels,
  onSubmit,
}: {
  newStudent: { full_name: string; age: string; curriculum: string; grade_level: string; email: string };
  setNewStudent: (val: any) => void;
  curriculums: string[];
  availableLevels: { value: string; label: string }[];
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor="child-name">Child's Full Name *</Label>
        <Input
          id="child-name"
          placeholder="e.g., Sarah Kamau"
          value={newStudent.full_name}
          onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="child-age">Age</Label>
          <Input
            id="child-age"
            type="number"
            min="5"
            max="25"
            placeholder="e.g., 14"
            value={newStudent.age}
            onChange={(e) => setNewStudent({ ...newStudent, age: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="child-email">Child's Email (optional)</Label>
          <Input
            id="child-email"
            type="email"
            placeholder="For session reminders"
            value={newStudent.email}
            onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="child-curriculum">Curriculum *</Label>
        <Select
          value={newStudent.curriculum}
          onValueChange={(val) => setNewStudent({ ...newStudent, curriculum: val, grade_level: "" })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select curriculum" />
          </SelectTrigger>
          <SelectContent>
            {curriculums.map((curr) => (
              <SelectItem key={curr} value={curr}>{curr}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {newStudent.curriculum && (
        <div className="space-y-2">
          <Label htmlFor="child-level">Grade Level *</Label>
          <Select
            value={newStudent.grade_level}
            onValueChange={(val) => setNewStudent({ ...newStudent, grade_level: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select grade level" />
            </SelectTrigger>
            <SelectContent>
              {availableLevels.map((level) => (
                <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button className="w-full" onClick={onSubmit}>
        Add Child
      </Button>
    </div>
  );
}

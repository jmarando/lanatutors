import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { User, Plus, UserCircle } from "lucide-react";
import { useStudents, Student } from "@/hooks/useStudents";
import { useToast } from "@/hooks/use-toast";
import { getCurriculums, getLevelsForCurriculum } from "@/utils/curriculumData";
import { supabase } from "@/integrations/supabase/client";

interface StudentPickerProps {
  onStudentSelect: (student: Student | null, bookingForSelf: boolean) => void;
  selectedStudentId?: string;
  bookingForSelf?: boolean;
  defaultCurriculum?: string;
  defaultLevel?: string;
}

export function StudentPicker({
  onStudentSelect,
  selectedStudentId,
  bookingForSelf: initialBookingForSelf = false,
  defaultCurriculum,
  defaultLevel,
}: StudentPickerProps) {
  const { students, loading, addStudent } = useStudents();
  const { toast } = useToast();
  const [accountType, setAccountType] = useState<string | null>(null);
  const [bookingFor, setBookingFor] = useState<'self' | 'child'>(initialBookingForSelf ? 'self' : 'child');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStudent, setNewStudent] = useState({
    full_name: "",
    curriculum: defaultCurriculum || "",
    grade_level: defaultLevel || "",
  });

  const curriculums = getCurriculums();
  const availableLevels = newStudent.curriculum ? getLevelsForCurriculum(newStudent.curriculum) : [];

  // Check account type on mount
  useEffect(() => {
    const checkAccountType = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("account_type")
          .eq("id", user.id)
          .single();
        
        setAccountType(profile?.account_type || 'student');
        
        // If it's a student account, automatically set to booking for self
        if (profile?.account_type === 'student') {
          setBookingFor('self');
          onStudentSelect(null, true);
        }
      }
    };
    checkAccountType();
  }, []);

  // Auto-select first student if parent and has children
  useEffect(() => {
    if (accountType === 'parent' && students.length > 0 && !selectedStudentId && bookingFor === 'child') {
      onStudentSelect(students[0], false);
    }
  }, [accountType, students, selectedStudentId, bookingFor]);

  const handleBookingForChange = (value: 'self' | 'child') => {
    setBookingFor(value);
    if (value === 'self') {
      onStudentSelect(null, true);
    } else if (students.length > 0) {
      onStudentSelect(students[0], false);
    }
  };

  const handleAddStudent = async () => {
    if (!newStudent.full_name.trim() || !newStudent.curriculum || !newStudent.grade_level) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const student = await addStudent({
        full_name: newStudent.full_name.trim(),
        curriculum: newStudent.curriculum,
        grade_level: newStudent.grade_level,
      });

      toast({ title: "Child Added", description: `${student.full_name} has been added.` });
      setNewStudent({ full_name: "", curriculum: defaultCurriculum || "", grade_level: defaultLevel || "" });
      setShowAddForm(false);
      onStudentSelect(student, false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add child.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  // If account type is student (booking for self), don't show picker
  if (accountType === 'student') {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <UserCircle className="h-5 w-5 text-primary" />
          <Label className="font-semibold">Who is this booking for?</Label>
        </div>

        <RadioGroup
          value={bookingFor}
          onValueChange={(val) => handleBookingForChange(val as 'self' | 'child')}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="self" id="booking-self" />
            <Label htmlFor="booking-self" className="cursor-pointer">Myself</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="child" id="booking-child" />
            <Label htmlFor="booking-child" className="cursor-pointer">My Child</Label>
          </div>
        </RadioGroup>

        {bookingFor === 'child' && (
          <div className="space-y-3 pt-2">
            {students.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {students.map((student) => (
                  <Badge
                    key={student.id}
                    variant={selectedStudentId === student.id ? "default" : "outline"}
                    className="cursor-pointer px-3 py-1.5 text-sm"
                    onClick={() => onStudentSelect(student, false)}
                  >
                    <User className="h-3 w-3 mr-1.5" />
                    {student.full_name}
                    <span className="ml-1 text-xs opacity-70">
                      ({student.curriculum} {student.grade_level})
                    </span>
                  </Badge>
                ))}
              </div>
            )}

            {!showAddForm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(true)}
                className="border-dashed"
              >
                <Plus className="h-4 w-4 mr-2" />
                {students.length === 0 ? "Add Your First Child" : "Add Another Child"}
              </Button>
            ) : (
              <div className="space-y-3 p-3 border rounded-lg bg-background">
                <div className="space-y-2">
                  <Label>Child's Name *</Label>
                  <Input
                    placeholder="e.g., Sarah"
                    value={newStudent.full_name}
                    onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Curriculum *</Label>
                    <Select
                      value={newStudent.curriculum}
                      onValueChange={(val) => setNewStudent({ ...newStudent, curriculum: val, grade_level: "" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {curriculums.map((curr) => (
                          <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Grade *</Label>
                    <Select
                      value={newStudent.grade_level}
                      onValueChange={(val) => setNewStudent({ ...newStudent, grade_level: val })}
                      disabled={!newStudent.curriculum}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddStudent}>Add Child</Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {students.length === 0 && !showAddForm && (
              <p className="text-xs text-muted-foreground">
                Add your child's details to book sessions for them.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

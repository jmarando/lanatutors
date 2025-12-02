import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Clock, Users, Video, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface IntensiveClass {
  id: string;
  subject: string;
  curriculum: string;
  grade_levels: string[];
  time_slot: string;
  current_enrollment: number;
  max_students: number;
  meeting_link: string | null;
  focus_topics: string | null;
}

interface IntensiveProgram {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface EnrolledStudent {
  id: string;
  student_id: string;
  student_name: string;
  payment_status: string;
}

interface TutorBootcampTabProps {
  tutorProfileId: string;
}

export const TutorBootcampTab = ({ tutorProfileId }: TutorBootcampTabProps) => {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<IntensiveClass[]>([]);
  const [program, setProgram] = useState<IntensiveProgram | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<Record<string, EnrolledStudent[]>>({});
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (tutorProfileId) {
      fetchAssignments();
    }
  }, [tutorProfileId]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      // Fetch active program
      const { data: programData } = await supabase
        .from("intensive_programs")
        .select("*")
        .eq("is_active", true)
        .single();

      if (programData) {
        setProgram(programData);
      }

      // Fetch classes assigned to this tutor
      const { data: classesData, error: classesError } = await supabase
        .from("intensive_classes")
        .select("*")
        .eq("tutor_id", tutorProfileId)
        .eq("status", "active")
        .order("time_slot");

      if (classesError) throw classesError;

      setClasses(classesData || []);

      // Fetch enrolled students for each class
      if (classesData && classesData.length > 0) {
        const classIds = classesData.map(c => c.id);
        
        // Get all enrollments that include any of these classes
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from("intensive_enrollments")
          .select("*");

        if (enrollmentsError) throw enrollmentsError;

        // Get student names
        const studentIds = [...new Set(enrollments?.map(e => e.student_id) || [])];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", studentIds);

        // Map students to classes
        const studentsByClass: Record<string, EnrolledStudent[]> = {};
        
        classIds.forEach(classId => {
          studentsByClass[classId] = [];
          
          enrollments?.forEach(enrollment => {
            if (enrollment.enrolled_class_ids.includes(classId)) {
              const profile = profiles?.find(p => p.id === enrollment.student_id);
              studentsByClass[classId].push({
                id: enrollment.id,
                student_id: enrollment.student_id,
                student_name: profile?.full_name || "Unknown Student",
                payment_status: enrollment.payment_status,
              });
            }
          });
        });

        setEnrolledStudents(studentsByClass);
      }
    } catch (error) {
      console.error("Error fetching bootcamp assignments:", error);
      toast.error("Failed to load bootcamp assignments");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (classId: string) => {
    setExpandedClasses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(classId)) {
        newSet.delete(classId);
      } else {
        newSet.add(classId);
      }
      return newSet;
    });
  };

  const getEnrollmentColor = (current: number, max: number): string => {
    const percent = (current / max) * 100;
    if (percent >= 100) return "text-red-600";
    if (percent >= 80) return "text-yellow-600";
    return "text-green-600";
  };

  // Group classes by time slot
  const groupedByTimeSlot = classes.reduce((acc, cls) => {
    if (!acc[cls.time_slot]) {
      acc[cls.time_slot] = [];
    }
    acc[cls.time_slot].push(cls);
    return acc;
  }, {} as Record<string, IntensiveClass[]>);

  const sortedTimeSlots = Object.keys(groupedByTimeSlot).sort();

  // Calculate stats
  const totalStudents = Object.values(enrolledStudents).reduce(
    (sum, students) => sum + students.length, 0
  );
  const totalSessions = classes.length * 10; // 10 sessions per class

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Bootcamp Assignments</h3>
          <p className="text-muted-foreground">
            You haven't been assigned to any December Holiday Bootcamp classes yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Program Info */}
      {program && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">{program.name}</h3>
                <p className="text-muted-foreground">
                  {format(parseISO(program.start_date), "MMMM d")} - {format(parseISO(program.end_date), "MMMM d, yyyy")}
                </p>
              </div>
              {program.is_active && (
                <Badge className="bg-green-500 text-white px-4 py-2">
                  <span className="animate-pulse mr-2">●</span> Active
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{classes.length}</div>
                <p className="text-sm text-muted-foreground">Classes Assigned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{totalStudents}</div>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{totalSessions}</div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{totalSessions * 75 / 60}h</div>
                <p className="text-sm text-muted-foreground">Teaching Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Classes by Time Slot */}
      <Card>
        <CardHeader>
          <CardTitle>Your Assigned Classes</CardTitle>
          <CardDescription>
            Click on a class to view enrolled students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {sortedTimeSlots.map((timeSlot) => (
              <div key={timeSlot} className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground bg-muted p-2 rounded">
                  <Clock className="h-4 w-4" />
                  {timeSlot} EAT
                </div>
                <div className="space-y-3">
                  {groupedByTimeSlot[timeSlot].map((cls) => {
                    const students = enrolledStudents[cls.id] || [];
                    const isExpanded = expandedClasses.has(cls.id);

                    return (
                      <Collapsible
                        key={cls.id}
                        open={isExpanded}
                        onOpenChange={() => toggleExpanded(cls.id)}
                      >
                        <Card className="border-l-4 border-l-primary">
                          <CardContent className="p-4">
                            <CollapsibleTrigger className="w-full">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1 text-left">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-lg">{cls.subject}</h4>
                                    <Badge variant="secondary">{cls.curriculum}</Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {cls.grade_levels.join(", ")}
                                  </p>
                                  {cls.focus_topics && (
                                    <p className="text-xs text-muted-foreground">
                                      Focus: {cls.focus_topics}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <div className={`font-bold ${getEnrollmentColor(cls.current_enrollment, cls.max_students)}`}>
                                      {cls.current_enrollment}/{cls.max_students}
                                    </div>
                                    <p className="text-xs text-muted-foreground">students</p>
                                  </div>
                                  {cls.meeting_link && (
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(cls.meeting_link!, "_blank");
                                      }}
                                    >
                                      <Video className="h-4 w-4 mr-2" />
                                      Start Class
                                    </Button>
                                  )}
                                  {isExpanded ? (
                                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <div className="mt-4 pt-4 border-t">
                                <h5 className="font-medium mb-3">Enrolled Students ({students.length})</h5>
                                {students.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No students enrolled yet</p>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {students.map((student) => (
                                      <div
                                        key={student.id}
                                        className="flex items-center justify-between p-2 bg-muted/50 rounded"
                                      >
                                        <span className="text-sm font-medium">{student.student_name}</span>
                                        <Badge
                                          variant={student.payment_status === "completed" ? "default" : "secondary"}
                                          className={student.payment_status === "completed" ? "bg-green-500" : "bg-yellow-500"}
                                        >
                                          {student.payment_status === "completed" ? "Paid" : "Pending"}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </CollapsibleContent>
                          </CardContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

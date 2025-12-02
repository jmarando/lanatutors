import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Clock, Users, Video, BookOpen, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format, isWithinInterval, parseISO } from "date-fns";

interface IntensiveEnrollment {
  id: string;
  program_id: string;
  enrolled_class_ids: string[];
  total_subjects: number;
  total_amount: number;
  payment_status: string;
  created_at: string;
}

interface IntensiveClass {
  id: string;
  subject: string;
  curriculum: string;
  grade_levels: string[];
  time_slot: string;
  meeting_link: string | null;
  tutor_id: string | null;
  tutor_name?: string;
}

interface IntensiveProgram {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export const StudentBootcampTab = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<IntensiveEnrollment[]>([]);
  const [classes, setClasses] = useState<IntensiveClass[]>([]);
  const [program, setProgram] = useState<IntensiveProgram | null>(null);
  const [joiningClass, setJoiningClass] = useState<string | null>(null);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Fetch active program
      const { data: programData } = await supabase
        .from("intensive_programs")
        .select("*")
        .eq("is_active", true)
        .single();

      if (programData) {
        setProgram(programData);
      }

      // Fetch student's enrollments
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from("intensive_enrollments")
        .select("*")
        .eq("student_id", user.id);

      if (enrollmentError) throw enrollmentError;

      if (enrollmentData && enrollmentData.length > 0) {
        setEnrollments(enrollmentData);

        // Get all enrolled class IDs
        const allClassIds = enrollmentData.flatMap(e => e.enrolled_class_ids);

        // Fetch class details
        const { data: classData, error: classError } = await supabase
          .from("intensive_classes")
          .select("*")
          .in("id", allClassIds);

        if (classError) throw classError;

        // Fetch tutor names for classes with assigned tutors
        const tutorIds = classData?.filter(c => c.tutor_id).map(c => c.tutor_id) || [];
        
        if (tutorIds.length > 0) {
          const { data: tutorProfiles } = await supabase
            .from("tutor_profiles")
            .select("id, user_id")
            .in("id", tutorIds);

          const userIds = tutorProfiles?.map(t => t.user_id) || [];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds);

          // Enrich classes with tutor names
          const enrichedClasses = classData?.map(cls => {
            const tutorProfile = tutorProfiles?.find(t => t.id === cls.tutor_id);
            const profile = profiles?.find(p => p.id === tutorProfile?.user_id);
            return {
              ...cls,
              tutor_name: profile?.full_name || "TBA",
            };
          }) || [];

          setClasses(enrichedClasses);
        } else {
          setClasses(classData || []);
        }
      }
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      toast.error("Failed to load bootcamp enrollments");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async (classId: string, meetingLink: string | null) => {
    if (!meetingLink) {
      toast.error("Meeting link not available yet");
      return;
    }

    setJoiningClass(classId);
    try {
      // Validate access before joining
      const { data, error } = await supabase.functions.invoke("validate-intensive-class-access", {
        body: { classId },
      });

      if (error) throw error;

      if (data.hasAccess) {
        window.open(meetingLink, "_blank");
      } else {
        toast.error(data.message || "You don't have access to this class");
      }
    } catch (error) {
      console.error("Error validating access:", error);
      // Still allow joining if validation fails (graceful degradation)
      window.open(meetingLink, "_blank");
    } finally {
      setJoiningClass(null);
    }
  };

  const isProgramActive = () => {
    if (!program) return false;
    const now = new Date();
    const start = parseISO(program.start_date);
    const end = parseISO(program.end_date);
    return isWithinInterval(now, { start, end });
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Paid</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Payment Pending</Badge>;
      default:
        return <Badge variant="destructive">{status}</Badge>;
    }
  };

  // Group classes by time slot for daily schedule view
  const groupedByTimeSlot = classes.reduce((acc, cls) => {
    if (!acc[cls.time_slot]) {
      acc[cls.time_slot] = [];
    }
    acc[cls.time_slot].push(cls);
    return acc;
  }, {} as Record<string, IntensiveClass[]>);

  // Sort time slots
  const sortedTimeSlots = Object.keys(groupedByTimeSlot).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">December Holiday Bootcamp</h2>
          <Button onClick={() => navigate("/december-intensive")}>
            Enroll Now
          </Button>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Not Enrolled Yet</h3>
            <p className="text-muted-foreground mb-4">
              Join our December Holiday Bootcamp for intensive revision sessions.
            </p>
            <Button onClick={() => navigate("/december-intensive")}>
              View Bootcamp Details
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">December Holiday Bootcamp</h2>
          {program && (
            <p className="text-muted-foreground">
              {format(parseISO(program.start_date), "MMM d")} - {format(parseISO(program.end_date), "MMM d, yyyy")}
            </p>
          )}
        </div>
        {isProgramActive() && (
          <Badge className="bg-green-500 text-white px-4 py-2">
            <span className="animate-pulse mr-2">●</span> Program Active
          </Badge>
        )}
      </div>

      {/* Enrollment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{classes.length}</div>
                <p className="text-sm text-muted-foreground">Subjects Enrolled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{classes.length * 10}</div>
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
                <div className="text-2xl font-bold">{classes.length * 10 * 75 / 60}h</div>
                <p className="text-sm text-muted-foreground">Total Learning Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Status Alert */}
      {enrollments.some(e => e.payment_status !== "completed") && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">Payment Pending</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Please complete your payment to ensure uninterrupted access to classes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Your Daily Schedule</CardTitle>
          <CardDescription>
            Classes run Monday to Friday, December 8-19
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedTimeSlots.map((timeSlot) => (
              <div key={timeSlot} className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {timeSlot} EAT
                </div>
                <div className="grid gap-3">
                  {groupedByTimeSlot[timeSlot].map((cls) => {
                    const enrollment = enrollments.find(e => e.enrolled_class_ids.includes(cls.id));
                    const isPaid = enrollment?.payment_status === "completed";

                    return (
                      <Card key={cls.id} className="bg-muted/30">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{cls.subject}</h4>
                                <Badge variant="secondary" className="text-xs">
                                  {cls.curriculum}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {cls.grade_levels.join(", ")}
                              </p>
                              {cls.tutor_name && (
                                <p className="text-sm">
                                  <span className="text-muted-foreground">Tutor:</span>{" "}
                                  <span className="font-medium">{cls.tutor_name}</span>
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {enrollment && getPaymentBadge(enrollment.payment_status)}
                              {cls.meeting_link && isProgramActive() ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleJoinClass(cls.id, cls.meeting_link)}
                                  disabled={joiningClass === cls.id}
                                >
                                  {joiningClass === cls.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                    <Video className="h-4 w-4 mr-2" />
                                  )}
                                  Join Class
                                </Button>
                              ) : !cls.meeting_link ? (
                                <span className="text-xs text-muted-foreground">
                                  Link coming soon
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Program not active
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Enrolled Classes List */}
      <Card>
        <CardHeader>
          <CardTitle>Enrolled Subjects</CardTitle>
          <CardDescription>
            Each subject includes 10 sessions (75 minutes each)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => {
              const enrollment = enrollments.find(e => e.enrolled_class_ids.includes(cls.id));
              
              return (
                <Card key={cls.id} className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{cls.subject}</h4>
                        {enrollment && getPaymentBadge(enrollment.payment_status)}
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">{cls.curriculum}</Badge>
                        <Badge variant="outline">{cls.grade_levels[0]}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>{cls.time_slot} EAT</span>
                        </div>
                        {cls.tutor_name && (
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            <span>{cls.tutor_name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>10 sessions</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

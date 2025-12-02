import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle, Users, Filter } from "lucide-react";

interface IntensiveClass {
  id: string;
  subject: string;
  curriculum: string;
  grade_levels: string[];
  time_slot: string;
  current_enrollment: number;
  max_students: number;
  tutor_id: string | null;
  meeting_link: string | null;
  tutor_name?: string;
}

interface Tutor {
  id: string;
  user_id: string;
  full_name: string;
  subjects: string[];
  curriculum: string[];
  teaching_levels: string[];
  assignment_count: number;
}

type CurriculumFilter = "all" | "CBC" | "8-4-4" | "IGCSE" | "A-Level" | "IB";
type EnrollmentFilter = "all" | "empty" | "filling" | "almost-full" | "full";

export const AdminIntensivePrograms = () => {
  const [classes, setClasses] = useState<IntensiveClass[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningTutor, setAssigningTutor] = useState<string | null>(null);
  const [curriculumFilter, setCurriculumFilter] = useState<CurriculumFilter>("all");
  const [enrollmentFilter, setEnrollmentFilter] = useState<EnrollmentFilter>("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch classes
      const { data: classesData, error: classesError } = await supabase
        .from("intensive_classes")
        .select("*")
        .eq("status", "active")
        .order("time_slot");

      if (classesError) throw classesError;

      // Fetch tutors with qualifications
      const { data: tutorsData, error: tutorsError } = await supabase
        .from("tutor_profiles")
        .select("id, user_id, subjects, curriculum, teaching_levels")
        .eq("verified", true);

      if (tutorsError) throw tutorsError;

      // Fetch tutor names from profiles
      const tutorIds = tutorsData?.map((t) => t.user_id) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", tutorIds);

      // Count current assignments per tutor
      const assignmentCounts: Record<string, number> = {};
      classesData?.forEach((cls) => {
        if (cls.tutor_id) {
          assignmentCounts[cls.tutor_id] = (assignmentCounts[cls.tutor_id] || 0) + 1;
        }
      });

      const enrichedTutors: Tutor[] = tutorsData?.map((tutor) => {
        const profile = profilesData?.find((p) => p.id === tutor.user_id);
        return {
          id: tutor.id,
          user_id: tutor.user_id,
          full_name: profile?.full_name || "Unknown",
          subjects: tutor.subjects || [],
          curriculum: tutor.curriculum || [],
          teaching_levels: tutor.teaching_levels || [],
          assignment_count: assignmentCounts[tutor.id] || 0,
        };
      }) || [];

      // Enrich classes with tutor names
      const enrichedClasses = classesData?.map((cls) => {
        const tutor = enrichedTutors.find((t) => t.id === cls.tutor_id);
        return {
          ...cls,
          tutor_name: tutor?.full_name,
        };
      }) || [];

      setClasses(enrichedClasses);
      setTutors(enrichedTutors);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Calculate tutor match score for a class
  const getTutorMatchScore = (tutor: Tutor, cls: IntensiveClass): { score: number; matches: string[] } => {
    const matches: string[] = [];
    let score = 0;

    // Check subject match (most important)
    const subjectMatch = tutor.subjects.some(
      (s) => s.toLowerCase() === cls.subject.toLowerCase() ||
             s.toLowerCase().includes(cls.subject.toLowerCase()) ||
             cls.subject.toLowerCase().includes(s.toLowerCase())
    );
    if (subjectMatch) {
      score += 50;
      matches.push("Subject");
    }

    // Check curriculum match
    const curriculumMatch = tutor.curriculum.some(
      (c) => c.toLowerCase() === cls.curriculum.toLowerCase() ||
             c.toLowerCase().includes(cls.curriculum.toLowerCase())
    );
    if (curriculumMatch) {
      score += 30;
      matches.push("Curriculum");
    }

    // Check teaching level match
    const levelMatch = tutor.teaching_levels.some((level) =>
      cls.grade_levels.some(
        (gl) => level.toLowerCase().includes(gl.toLowerCase()) ||
                gl.toLowerCase().includes(level.toLowerCase())
      )
    );
    if (levelMatch) {
      score += 20;
      matches.push("Level");
    }

    return { score, matches };
  };

  // Get sorted tutors for a specific class
  const getSortedTutorsForClass = (cls: IntensiveClass): (Tutor & { matchScore: number; matchDetails: string[] })[] => {
    return tutors
      .map((tutor) => {
        const { score, matches } = getTutorMatchScore(tutor, cls);
        return { ...tutor, matchScore: score, matchDetails: matches };
      })
      .sort((a, b) => {
        // Sort by match score first, then by assignment count (prefer less busy tutors)
        if (b.matchScore !== a.matchScore) {
          return b.matchScore - a.matchScore;
        }
        return a.assignment_count - b.assignment_count;
      });
  };

  const handleAssignTutor = async (classId: string, tutorId: string) => {
    setAssigningTutor(classId);
    try {
      const { error } = await supabase
        .from("intensive_classes")
        .update({ tutor_id: tutorId })
        .eq("id", classId);

      if (error) throw error;

      toast.success("Tutor assigned successfully");
      fetchData();
    } catch (error) {
      console.error("Error assigning tutor:", error);
      toast.error("Failed to assign tutor");
    } finally {
      setAssigningTutor(null);
    }
  };

  const handleGenerateMeetLink = async (classId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-google-meet-link", {
        body: { title: `December Intensive - Class ${classId.substring(0, 8)}` },
      });

      if (error) throw error;

      const { error: updateError } = await supabase
        .from("intensive_classes")
        .update({ meeting_link: data.meetLink })
        .eq("id", classId);

      if (updateError) throw updateError;

      toast.success("Meeting link generated");
      fetchData();
    } catch (error) {
      console.error("Error generating meeting link:", error);
      toast.error("Failed to generate meeting link");
    }
  };

  // Filter classes based on selected filters
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      // Curriculum filter
      if (curriculumFilter !== "all" && cls.curriculum !== curriculumFilter) {
        return false;
      }

      // Enrollment filter
      const enrollmentPercent = (cls.current_enrollment / cls.max_students) * 100;
      switch (enrollmentFilter) {
        case "empty":
          if (cls.current_enrollment > 0) return false;
          break;
        case "filling":
          if (enrollmentPercent === 0 || enrollmentPercent >= 80) return false;
          break;
        case "almost-full":
          if (enrollmentPercent < 80 || enrollmentPercent >= 100) return false;
          break;
        case "full":
          if (cls.current_enrollment < cls.max_students) return false;
          break;
      }

      return true;
    });
  }, [classes, curriculumFilter, enrollmentFilter]);

  // Group filtered classes by time slot
  const groupedByTime = useMemo(() => {
    return filteredClasses.reduce((acc, cls) => {
      if (!acc[cls.time_slot]) {
        acc[cls.time_slot] = [];
      }
      acc[cls.time_slot].push(cls);
      return acc;
    }, {} as Record<string, IntensiveClass[]>);
  }, [filteredClasses]);

  // Enrollment stats
  const enrollmentStats = useMemo(() => {
    const total = classes.length;
    const totalCapacity = classes.reduce((sum, c) => sum + c.max_students, 0);
    const totalEnrolled = classes.reduce((sum, c) => sum + c.current_enrollment, 0);
    const withTutor = classes.filter((c) => c.tutor_id).length;
    const almostFull = classes.filter((c) => c.current_enrollment / c.max_students >= 0.8).length;

    return { total, totalCapacity, totalEnrolled, withTutor, almostFull };
  }, [classes]);

  const getEnrollmentColor = (current: number, max: number): string => {
    const percent = (current / max) * 100;
    if (percent >= 100) return "bg-destructive";
    if (percent >= 80) return "bg-yellow-500";
    if (percent >= 50) return "bg-blue-500";
    return "bg-green-500";
  };

  const getEnrollmentBadge = (current: number, max: number) => {
    const percent = (current / max) * 100;
    if (percent >= 100) return <Badge variant="destructive">Full</Badge>;
    if (percent >= 80) return <Badge className="bg-yellow-500">Almost Full</Badge>;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{enrollmentStats.total}</div>
            <p className="text-xs text-muted-foreground">Total Classes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{enrollmentStats.totalEnrolled}</div>
            <p className="text-xs text-muted-foreground">Total Students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{enrollmentStats.withTutor}</div>
            <p className="text-xs text-muted-foreground">With Tutor Assigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{enrollmentStats.almostFull}</div>
            <p className="text-xs text-muted-foreground">Almost Full (80%+)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {Math.round((enrollmentStats.totalEnrolled / enrollmentStats.totalCapacity) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">Overall Capacity</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>December Holiday Bootcamp Management</CardTitle>
          <CardDescription>Assign tutors with smart qualification matching and monitor enrollment</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select value={curriculumFilter} onValueChange={(v) => setCurriculumFilter(v as CurriculumFilter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Curriculum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Curricula</SelectItem>
                <SelectItem value="CBC">CBC</SelectItem>
                <SelectItem value="8-4-4">8-4-4</SelectItem>
                <SelectItem value="IGCSE">IGCSE</SelectItem>
                <SelectItem value="A-Level">A-Level</SelectItem>
                <SelectItem value="IB">IB</SelectItem>
              </SelectContent>
            </Select>
            <Select value={enrollmentFilter} onValueChange={(v) => setEnrollmentFilter(v as EnrollmentFilter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Enrollment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="empty">Empty (0)</SelectItem>
                <SelectItem value="filling">Filling (1-79%)</SelectItem>
                <SelectItem value="almost-full">Almost Full (80%+)</SelectItem>
                <SelectItem value="full">Full (100%)</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground ml-auto">
              Showing {filteredClasses.length} of {classes.length} classes
            </div>
          </div>

          {Object.entries(groupedByTime).map(([timeSlot, timeClasses]) => (
            <div key={timeSlot} className="mb-8">
              <h3 className="text-lg font-semibold mb-4 bg-muted p-3 rounded flex items-center justify-between">
                <span>{timeSlot} EAT</span>
                <Badge variant="outline">{timeClasses.length} classes</Badge>
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Curriculum</TableHead>
                    <TableHead>Grade Levels</TableHead>
                    <TableHead>Enrollment</TableHead>
                    <TableHead className="w-[300px]">Assigned Tutor</TableHead>
                    <TableHead>Meeting Link</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeClasses.map((cls) => {
                    const sortedTutors = getSortedTutorsForClass(cls);
                    const enrollmentPercent = (cls.current_enrollment / cls.max_students) * 100;

                    return (
                      <TableRow key={cls.id}>
                        <TableCell className="font-medium">{cls.subject}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{cls.curriculum}</Badge>
                        </TableCell>
                        <TableCell>{cls.grade_levels.join(", ")}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{cls.current_enrollment} / {cls.max_students}</span>
                              {getEnrollmentBadge(cls.current_enrollment, cls.max_students)}
                            </div>
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${getEnrollmentColor(cls.current_enrollment, cls.max_students)}`}
                                style={{ width: `${Math.min(enrollmentPercent, 100)}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={cls.tutor_id || ""}
                            onValueChange={(value) => handleAssignTutor(cls.id, value)}
                            disabled={assigningTutor === cls.id}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select tutor">
                                {cls.tutor_name || "Select tutor"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {sortedTutors.map((tutor) => (
                                <SelectItem key={tutor.id} value={tutor.id}>
                                  <div className="flex items-center gap-2 w-full">
                                    {tutor.matchScore >= 80 && (
                                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                    )}
                                    {tutor.matchScore >= 50 && tutor.matchScore < 80 && (
                                      <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                    )}
                                    <span className="flex-1">{tutor.full_name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      ({tutor.assignment_count} assigned)
                                    </span>
                                    {tutor.matchDetails.length > 0 && (
                                      <span className="text-xs text-green-600">
                                        ✓ {tutor.matchDetails.join(", ")}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {cls.meeting_link ? (
                            <a
                              href={cls.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm"
                            >
                              View Link
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not generated</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {!cls.meeting_link && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGenerateMeetLink(cls.id)}
                            >
                              Generate Link
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ))}

          {filteredClasses.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No classes match the selected filters
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle, Users, Filter, Download, Save } from "lucide-react";
import { Json } from "@/integrations/supabase/types";
import { Textarea } from "@/components/ui/textarea";

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
  focus_topics?: string | null;
  description?: string | null;
  session_topics?: Json | null;
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

// Track local edits for inline editing
interface ClassEdits {
  description: string;
  focus_topics: string;
  week1: string;
  week2: string;
}

type CurriculumFilter = "all" | "CBC" | "8-4-4" | "IGCSE" | "A-Level" | "IB";
type EnrollmentFilter = "all" | "empty" | "filling" | "almost-full" | "full";
type GradeFilter = string;

export const AdminIntensivePrograms = () => {
  const [classes, setClasses] = useState<IntensiveClass[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningTutor, setAssigningTutor] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);
  const [generatingAllLinks, setGeneratingAllLinks] = useState(false);
  const [curriculumFilter, setCurriculumFilter] = useState<CurriculumFilter>("all");
  const [enrollmentFilter, setEnrollmentFilter] = useState<EnrollmentFilter>("all");
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("all");
  const [classEdits, setClassEdits] = useState<Record<string, ClassEdits>>({});
  const [savingClass, setSavingClass] = useState<string | null>(null);

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
      
      // Initialize edits state for all classes
      const initialEdits: Record<string, ClassEdits> = {};
      enrichedClasses.forEach((cls) => {
        const { focusTopics, week1, week2 } = parseClassTopics(cls);
        initialEdits[cls.id] = { description: (cls as any).description || '', focus_topics: focusTopics, week1, week2 };
      });
      setClassEdits(initialEdits);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Parse class topics from focus_topics and session_topics
  const parseClassTopics = (cls: IntensiveClass): { focusTopics: string; week1: string; week2: string } => {
    let focusTopics = cls.focus_topics || '';
    let week1 = '';
    let week2 = '';
    
    // Try to extract from focus_topics if it contains Week 1/Week 2 format
    if (focusTopics.includes('Week 1:') || focusTopics.includes('Week 2:')) {
      const week1Match = focusTopics.match(/Week 1:([^|]+)/);
      const week2Match = focusTopics.match(/Week 2:([^|]+)/);
      week1 = week1Match ? week1Match[1].trim() : '';
      week2 = week2Match ? week2Match[1].trim() : '';
      // Remove week info from focus_topics for display
      focusTopics = focusTopics.replace(/Week 1:[^|]+\|?/g, '').replace(/Week 2:[^|]+/g, '').trim();
    }
    
    // Also check session_topics for detailed day-by-day breakdown
    if (cls.session_topics && typeof cls.session_topics === 'object' && !Array.isArray(cls.session_topics)) {
      const topicsObj = cls.session_topics as Record<string, string>;
      const w1Topics: string[] = [];
      const w2Topics: string[] = [];
      for (let i = 1; i <= 5; i++) {
        if (topicsObj[`day${i}`]) w1Topics.push(topicsObj[`day${i}`]);
      }
      for (let i = 6; i <= 10; i++) {
        if (topicsObj[`day${i}`]) w2Topics.push(topicsObj[`day${i}`]);
      }
      if (w1Topics.length > 0 && !week1) week1 = w1Topics.join(', ');
      if (w2Topics.length > 0 && !week2) week2 = w2Topics.join(', ');
    }
    
    return { focusTopics, week1, week2 };
  };

  // Handle edit field changes
  const handleEditChange = useCallback((classId: string, field: keyof ClassEdits, value: string) => {
    setClassEdits(prev => ({
      ...prev,
      [classId]: {
        ...prev[classId],
        [field]: value
      }
    }));
  }, []);

  // Save class topics to database
  const handleSaveTopics = async (classId: string) => {
    const edits = classEdits[classId];
    if (!edits) return;
    
    setSavingClass(classId);
    try {
      // Combine focus_topics with week summaries
      const combinedFocusTopics = edits.focus_topics + 
        (edits.week1 ? ` | Week 1: ${edits.week1}` : '') + 
        (edits.week2 ? ` | Week 2: ${edits.week2}` : '');
      
      const { error } = await supabase
        .from('intensive_classes')
        .update({ 
          focus_topics: combinedFocusTopics.trim(),
          description: edits.description || null
        } as any)
        .eq('id', classId);
      
      if (error) throw error;
      
      toast.success('Class saved successfully');
      fetchData(); // Refresh to get updated data
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save');
    } finally {
      setSavingClass(null);
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

      // Get the class details and tutor info for email notification
      const cls = classes.find((c) => c.id === classId);
      const tutor = tutors.find((t) => t.id === tutorId);
      
      if (cls && tutor) {
        // Fetch tutor email from tutor_profiles
        const { data: tutorProfile } = await supabase
          .from("tutor_profiles")
          .select("email")
          .eq("id", tutorId)
          .single();

        // Fetch program details
        const { data: classWithProgram } = await supabase
          .from("intensive_classes")
          .select("program_id, meeting_link, intensive_programs(name, start_date, end_date)")
          .eq("id", classId)
          .single();

        const program = classWithProgram?.intensive_programs as { name: string; start_date: string; end_date: string } | null;

        // Email notification disabled per user request
        // if (tutorProfile?.email && program) {
        //   try {
        //     await supabase.functions.invoke("send-intensive-tutor-assignment", { ... });
        //   } catch (emailError) { ... }
        // }
      }

      toast.success("Tutor assigned successfully");
      fetchData();
    } catch (error) {
      console.error("Error assigning tutor:", error);
      toast.error("Failed to assign tutor");
    } finally {
      setAssigningTutor(null);
    }
  };

  const handleGenerateMeetLink = async (classId: string, cls: IntensiveClass) => {
    setGeneratingLink(classId);
    try {
      // Create meeting link with proper class details
      const startDateTime = new Date("2025-12-08T08:00:00+03:00").toISOString();
      const endDateTime = new Date("2025-12-08T09:15:00+03:00").toISOString();
      
      const { data, error } = await supabase.functions.invoke("generate-google-meet-link", {
        body: { 
          summary: `December Bootcamp: ${cls.subject} - ${cls.curriculum} ${cls.grade_levels.join(", ")}`,
          description: `December Holiday Bootcamp class for ${cls.curriculum} ${cls.grade_levels.join(", ")} students. Time slot: ${cls.time_slot}`,
          startDateTime,
          endDateTime,
        },
      });

      if (error) throw error;

      const meetLink = data?.meetingLink || data?.meetLink;
      if (!meetLink) {
        throw new Error("No meeting link returned");
      }

      const { error: updateError } = await supabase
        .from("intensive_classes")
        .update({ meeting_link: meetLink })
        .eq("id", classId);

      if (updateError) throw updateError;

      toast.success("Meeting link generated from info@lanatutors.africa");
      fetchData();
    } catch (error) {
      console.error("Error generating meeting link:", error);
      toast.error("Failed to generate meeting link");
    } finally {
      setGeneratingLink(null);
    }
  };

  const handleGenerateAllLinks = async () => {
    const classesWithoutLinks = classes.filter((cls) => !cls.meeting_link);
    if (classesWithoutLinks.length === 0) {
      toast.info("All classes already have meeting links");
      return;
    }

    setGeneratingAllLinks(true);
    let successCount = 0;
    let failCount = 0;

    for (const cls of classesWithoutLinks) {
      try {
        const startDateTime = new Date("2025-12-08T08:00:00+03:00").toISOString();
        const endDateTime = new Date("2025-12-08T09:15:00+03:00").toISOString();
        
        const { data, error } = await supabase.functions.invoke("generate-google-meet-link", {
          body: { 
            summary: `December Bootcamp: ${cls.subject} - ${cls.curriculum} ${cls.grade_levels.join(", ")}`,
            description: `December Holiday Bootcamp class for ${cls.curriculum} ${cls.grade_levels.join(", ")} students. Time slot: ${cls.time_slot}`,
            startDateTime,
            endDateTime,
          },
        });

        if (error) throw error;

        const meetLink = data?.meetingLink || data?.meetLink;
        if (meetLink) {
          await supabase
            .from("intensive_classes")
            .update({ meeting_link: meetLink })
            .eq("id", cls.id);
          successCount++;
        }
      } catch (error) {
        console.error(`Failed to generate link for ${cls.subject}:`, error);
        failCount++;
      }
    }

    setGeneratingAllLinks(false);
    fetchData();
    
    if (failCount === 0) {
      toast.success(`Generated ${successCount} meeting links successfully`);
    } else {
      toast.warning(`Generated ${successCount} links, ${failCount} failed`);
    }
  };

  // Export classes to CSV
  const handleExportCSV = () => {
    const getSessionTopics = (topics: Json | null | undefined): { week1: string; week2: string } => {
      if (!topics || typeof topics !== 'object' || Array.isArray(topics)) {
        return { week1: '', week2: '' };
      }
      const topicsObj = topics as Record<string, string>;
      const week1Topics: string[] = [];
      const week2Topics: string[] = [];
      
      for (let i = 1; i <= 5; i++) {
        if (topicsObj[`day${i}`]) week1Topics.push(`Day ${i}: ${topicsObj[`day${i}`]}`);
      }
      for (let i = 6; i <= 10; i++) {
        if (topicsObj[`day${i}`]) week2Topics.push(`Day ${i}: ${topicsObj[`day${i}`]}`);
      }
      
      return {
        week1: week1Topics.join(' | '),
        week2: week2Topics.join(' | ')
      };
    };

    const headers = [
      'Subject',
      'Curriculum',
      'Grade Levels',
      'Time Slot',
      'Assigned Tutor',
      'Enrollment',
      'Focus Topics / Description',
      'Week 1 Topics',
      'Week 2 Topics',
      'Meeting Link'
    ];

    const rows = classes.map(cls => {
      const { week1, week2 } = getSessionTopics(cls.session_topics);
      return [
        cls.subject,
        cls.curriculum,
        cls.grade_levels.join(', '),
        cls.time_slot,
        cls.tutor_name || 'Not assigned',
        `${cls.current_enrollment}/${cls.max_students}`,
        cls.focus_topics || '',
        week1,
        week2,
        cls.meeting_link || ''
      ];
    });

    // Escape CSV fields
    const escapeCSV = (field: string) => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    // Copy to clipboard
    navigator.clipboard.writeText(csvContent).then(() => {
      toast.success('CSV copied to clipboard! Paste into Excel or Google Sheets.');
    }).catch(() => {
      // Fallback: download as file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'december-bootcamp-classes.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded!');
    });
  };

  // Get unique grade levels for filter
  const uniqueGrades = useMemo(() => {
    const grades = new Set<string>();
    classes.forEach((cls) => {
      cls.grade_levels.forEach((g) => grades.add(g));
    });
    return Array.from(grades).sort();
  }, [classes]);

  // Filter classes based on selected filters
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      // Curriculum filter
      if (curriculumFilter !== "all" && cls.curriculum !== curriculumFilter) {
        return false;
      }

      // Grade filter
      if (gradeFilter !== "all" && !cls.grade_levels.includes(gradeFilter)) {
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
  }, [classes, curriculumFilter, gradeFilter, enrollmentFilter]);

  // Group filtered classes by curriculum, then sort by grade and subject
  const sortedFilteredClasses = useMemo(() => {
    // Define curriculum order
    const curriculumOrder: Record<string, number> = { 'CBC': 1, '8-4-4': 2, 'IGCSE': 3, 'A-Level': 4, 'IB': 5 };
    // Define grade order within curricula
    const gradeOrder: Record<string, number> = {
      'Grade 8': 1, 'Grade 9': 2,
      'Form 3': 1, 'Form 4': 2,
      'Year 10': 1, 'Year 11': 2, 'Year 12': 1, 'Year 13': 2
    };
    
    return [...filteredClasses].sort((a, b) => {
      // Sort by curriculum first
      const currDiff = (curriculumOrder[a.curriculum] || 99) - (curriculumOrder[b.curriculum] || 99);
      if (currDiff !== 0) return currDiff;
      
      // Then by grade level
      const aGrade = a.grade_levels[0] || '';
      const bGrade = b.grade_levels[0] || '';
      const gradeDiff = (gradeOrder[aGrade] || 99) - (gradeOrder[bGrade] || 99);
      if (gradeDiff !== 0) return gradeDiff;
      
      // Then by subject alphabetically
      return a.subject.localeCompare(b.subject);
    });
  }, [filteredClasses]);

  // Group sorted classes by curriculum
  const groupedByCurriculum = useMemo(() => {
    return sortedFilteredClasses.reduce((acc, cls) => {
      const key = cls.curriculum;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(cls);
      return acc;
    }, {} as Record<string, IntensiveClass[]>);
  }, [sortedFilteredClasses]);

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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>December Holiday Bootcamp Management</CardTitle>
            <CardDescription>Assign tutors with smart qualification matching and monitor enrollment</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleExportCSV}
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button 
              onClick={handleGenerateAllLinks} 
              disabled={generatingAllLinks}
              variant="outline"
            >
              {generatingAllLinks ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                `Generate All Links (${classes.filter(c => !c.meeting_link).length})`
              )}
            </Button>
          </div>
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
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {uniqueGrades.map((grade) => (
                  <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground ml-auto">
              Showing {filteredClasses.length} of {classes.length} classes
            </div>
          </div>

          {Object.entries(groupedByCurriculum).map(([curriculum, curriculumClasses]) => (
            <div key={curriculum} className="mb-8">
              <h3 className="text-lg font-semibold mb-4 bg-muted p-3 rounded flex items-center justify-between">
                <span>{curriculum}</span>
                <Badge variant="outline">{curriculumClasses.length} classes</Badge>
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Subject</TableHead>
                      <TableHead className="w-[100px]">Grade</TableHead>
                      <TableHead className="w-[100px]">Time</TableHead>
                      <TableHead className="w-[80px]">Enrolled</TableHead>
                      <TableHead className="w-[200px]">Assigned Tutor</TableHead>
                      <TableHead className="min-w-[200px]">Description</TableHead>
                      <TableHead className="min-w-[200px]">Week 1 Summary</TableHead>
                      <TableHead className="min-w-[200px]">Week 2 Summary</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {curriculumClasses.map((cls) => {
                      const sortedTutors = getSortedTutorsForClass(cls);
                      const edits = classEdits[cls.id] || { description: '', focus_topics: '', week1: '', week2: '' };

                      return (
                        <TableRow key={cls.id}>
                          <TableCell className="font-medium">{cls.subject}</TableCell>
                          <TableCell>{cls.grade_levels.join(", ")}</TableCell>
                          <TableCell className="text-xs">{cls.time_slot}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span className="text-sm">{cls.current_enrollment}/{cls.max_students}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={cls.tutor_id || ""}
                              onValueChange={(value) => handleAssignTutor(cls.id, value)}
                              disabled={assigningTutor === cls.id}
                            >
                              <SelectTrigger className="w-full h-8 text-xs">
                                <SelectValue placeholder="Select tutor">
                                  {cls.tutor_name || "Select tutor"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="max-h-[400px] w-[400px]">
                                {sortedTutors.map((tutor) => {
                                  const hasSubject = tutor.subjects.some(
                                    (s: string) => s.toLowerCase().includes(cls.subject.toLowerCase()) ||
                                             cls.subject.toLowerCase().includes(s.toLowerCase())
                                  );
                                  const hasCurriculum = tutor.curriculum.some(
                                    (c: string) => c.toLowerCase().includes(cls.curriculum.toLowerCase())
                                  );
                                  
                                  return (
                                    <SelectItem key={tutor.id} value={tutor.id} className="py-2">
                                      <div className="flex flex-col gap-1 w-full">
                                        <div className="flex items-center gap-2">
                                          {tutor.matchScore >= 80 ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                          ) : tutor.matchScore >= 50 ? (
                                            <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                          ) : (
                                            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                                          )}
                                          <span className="font-medium">{tutor.full_name}</span>
                                          <span className="text-xs text-muted-foreground ml-auto">
                                            ({tutor.assignment_count} classes)
                                          </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1 ml-6">
                                          {hasSubject && (
                                            <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-green-600">
                                              ✓ {cls.subject}
                                            </Badge>
                                          )}
                                          {hasCurriculum && (
                                            <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-blue-600">
                                              ✓ {cls.curriculum}
                                            </Badge>
                                          )}
                                          {!hasSubject && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                                              No {cls.subject}
                                            </Badge>
                                          )}
                                          {!hasCurriculum && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                                              No {cls.curriculum}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Textarea
                              value={edits.description}
                              onChange={(e) => handleEditChange(cls.id, 'description', e.target.value)}
                              placeholder="Class description..."
                              className="min-h-[60px] text-xs resize-none"
                            />
                          </TableCell>
                          <TableCell>
                            <Textarea
                              value={edits.week1}
                              onChange={(e) => handleEditChange(cls.id, 'week1', e.target.value)}
                              placeholder="Week 1 topics..."
                              className="min-h-[60px] text-xs resize-none"
                            />
                          </TableCell>
                          <TableCell>
                            <Textarea
                              value={edits.week2}
                              onChange={(e) => handleEditChange(cls.id, 'week2', e.target.value)}
                              placeholder="Week 2 topics..."
                              className="min-h-[60px] text-xs resize-none"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSaveTopics(cls.id)}
                                disabled={savingClass === cls.id}
                                className="h-7 text-xs"
                              >
                                {savingClass === cls.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <Save className="h-3 w-3 mr-1" />
                                    Save
                                  </>
                                )}
                              </Button>
                              {cls.meeting_link ? (
                                <a
                                  href={cls.meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline text-xs"
                                >
                                  Meet Link
                                </a>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleGenerateMeetLink(cls.id, cls)}
                                  disabled={generatingLink === cls.id}
                                  className="h-7 text-xs"
                                >
                                  {generatingLink === cls.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    "Gen Link"
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
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

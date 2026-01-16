import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Send, FileText, Sparkles, CreditCard, Users, Check, ChevronsUpDown, Copy, ExternalLink, CheckCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { getCurriculums, getLevelsForCurriculum, getSubjectsForCurriculumLevel } from "@/utils/curriculumData";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SessionSchedule {
  day: string;
  time: string;
}

interface Subject {
  name: string;
  sessions: number;
  rate: number;
  sessionsPerWeek: number;
  weeks: number;
  tutorId: string;
}

interface StudentEntry {
  id: string;
  name: string;
  curriculum: string;
  gradeLevel: string;
  subjects: Subject[];
}

interface Tutor {
  id: string;
  user_id: string;
  full_name: string;
  subjects: string[];
  hourly_rate: number;
}

interface CreatedPlanInfo {
  id: string;
  shareToken: string;
  urlSlug: string;
  title: string;
  studentName: string;
}

export const AdminCreateLearningPlan = () => {
  const [loading, setLoading] = useState(false);
  const [generatingPaymentLink, setGeneratingPaymentLink] = useState(false);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [tutorsLoading, setTutorsLoading] = useState(true);
  const [openTutorPopover, setOpenTutorPopover] = useState<string | null>(null);

  // Success dialog state
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [createdPlans, setCreatedPlans] = useState<CreatedPlanInfo[]>([]);
  const [linkCopied, setLinkCopied] = useState<string | null>(null);

  // Parent Info
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  
  // Multiple Students
  const [students, setStudents] = useState<StudentEntry[]>([
    { id: crypto.randomUUID(), name: "", curriculum: "", gradeLevel: "", subjects: [] }
  ]);
  const [activeStudentId, setActiveStudentId] = useState(students[0].id);

  // Plan Details (shared across students)
  const [discount, setDiscount] = useState(0);
  const [validityDays, setValidityDays] = useState(90);
  const [notes, setNotes] = useState("");
  const [sessionSchedule, setSessionSchedule] = useState<SessionSchedule[]>([]);
  const [startDate, setStartDate] = useState("");
  
  // Payment option
  const [paymentOption, setPaymentOption] = useState<"full" | "deposit">("full");
  
  // Class type
  const [classType, setClassType] = useState<"online" | "physical">("online");

  const curriculums = getCurriculums();
  
  // Get active student
  const activeStudent = students.find(s => s.id === activeStudentId) || students[0];
  const activeStudentIndex = students.findIndex(s => s.id === activeStudentId);
  const availableLevels = activeStudent?.curriculum ? getLevelsForCurriculum(activeStudent.curriculum) : [];
  const availableSubjects = activeStudent?.curriculum && activeStudent?.gradeLevel 
    ? getSubjectsForCurriculumLevel(activeStudent.curriculum, activeStudent.gradeLevel) 
    : [];

  useEffect(() => {
    fetchTutors();
  }, []);

  const fetchTutors = async () => {
    setTutorsLoading(true);
    try {
      const { data: tutorProfiles, error: tutorError } = await supabase
        .from("tutor_profiles")
        .select("id, user_id, subjects, hourly_rate")
        .eq("verified", true)
        .order("created_at", { ascending: false });

      if (tutorError) {
        console.error("Error fetching tutors:", tutorError);
        return;
      }

      if (!tutorProfiles || tutorProfiles.length === 0) {
        setTutors([]);
        return;
      }

      const userIds = tutorProfiles.map(t => t.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      
      setTutors(tutorProfiles.map((t) => ({
        id: t.id,
        user_id: t.user_id,
        full_name: profileMap.get(t.user_id) || "Unknown Tutor",
        subjects: t.subjects || [],
        hourly_rate: t.hourly_rate || 1500,
      })));
    } catch (error) {
      console.error("Error fetching tutors:", error);
    } finally {
      setTutorsLoading(false);
    }
  };

  // Get unique tutors assigned to a student's subjects
  const getAssignedTutorsForStudent = (student: StudentEntry) => {
    const tutorIds = [...new Set(student.subjects.filter(s => s.tutorId).map(s => s.tutorId))];
    return tutors.filter(t => tutorIds.includes(t.id));
  };

  // Get all unique tutors across all students
  const getAllAssignedTutors = () => {
    const allTutorIds = new Set<string>();
    students.forEach(student => {
      student.subjects.forEach(subject => {
        if (subject.tutorId) allTutorIds.add(subject.tutorId);
      });
    });
    return tutors.filter(t => allTutorIds.has(t.id));
  };

  const generateEmailBody = () => {
    const allTutors = getAllAssignedTutors();
    if (allTutors.length === 0 || students.every(s => !s.name)) {
      toast.error("Please add subjects with tutors and enter student names first");
      return;
    }
    
    const studentNames = students.filter(s => s.name).map(s => s.name);
    const studentListText = studentNames.length === 1 
      ? studentNames[0] 
      : studentNames.slice(0, -1).join(", ") + " and " + studentNames[studentNames.length - 1];
    
    const tutorNames = allTutors.map(t => t.full_name).join(" and ");

    const generatedBody = `Dear ${parentName || "Parent"},

Thank you for your interest in our tutoring services. We are pleased to present personalized learning plan${students.length > 1 ? 's' : ''} for ${studentListText}.

${tutorNames} will be your dedicated tutor${allTutors.length > 1 ? 's' : ''} for these sessions. With their expertise and personalized approach, we are confident that your child${students.length > 1 ? 'ren' : ''} will make excellent progress.

We look forward to supporting your family's academic journey.

Warm regards,
Lana Tutors Team`;

    setNotes(generatedBody);
    toast.success("Message generated!");
  };

  // Student management
  const addStudent = () => {
    const newStudent: StudentEntry = {
      id: crypto.randomUUID(),
      name: "",
      curriculum: "",
      gradeLevel: "",
      subjects: []
    };
    setStudents([...students, newStudent]);
    setActiveStudentId(newStudent.id);
  };

  const removeStudent = (studentId: string) => {
    if (students.length <= 1) {
      toast.error("At least one student is required");
      return;
    }
    const newStudents = students.filter(s => s.id !== studentId);
    setStudents(newStudents);
    if (activeStudentId === studentId) {
      setActiveStudentId(newStudents[0].id);
    }
  };

  const updateStudent = (studentId: string, field: keyof StudentEntry, value: any) => {
    setStudents(students.map(s => {
      if (s.id !== studentId) return s;
      if (field === "curriculum") {
        return { ...s, [field]: value, gradeLevel: "", subjects: [] };
      }
      if (field === "gradeLevel") {
        return { ...s, [field]: value };
      }
      return { ...s, [field]: value };
    }));
  };

  // Subject management for active student
  const addSubject = () => {
    const newSubject: Subject = { name: "", sessions: 8, rate: 1500, sessionsPerWeek: 2, weeks: 4, tutorId: "" };
    setStudents(students.map(s => 
      s.id === activeStudentId 
        ? { ...s, subjects: [...s.subjects, newSubject] }
        : s
    ));
  };

  const removeSubject = (subjectIndex: number) => {
    setStudents(students.map(s => 
      s.id === activeStudentId 
        ? { ...s, subjects: s.subjects.filter((_, i) => i !== subjectIndex) }
        : s
    ));
  };

  const updateSubject = (subjectIndex: number, field: keyof Subject, value: any) => {
    setStudents(students.map(s => {
      if (s.id !== activeStudentId) return s;
      
      const updatedSubjects = [...s.subjects];
      updatedSubjects[subjectIndex] = { ...updatedSubjects[subjectIndex], [field]: value };

      // If tutor changed, update the rate to that tutor's rate
      if (field === "tutorId") {
        const tutor = tutors.find(t => t.id === value);
        if (tutor) {
          updatedSubjects[subjectIndex].rate = tutor.hourly_rate || 1500;
        }
      }

      if (field === "sessionsPerWeek" || field === "weeks") {
        const sessionsPerWeek = field === "sessionsPerWeek" ? value : updatedSubjects[subjectIndex].sessionsPerWeek;
        const weeks = field === "weeks" ? value : updatedSubjects[subjectIndex].weeks;
        updatedSubjects[subjectIndex].sessions = sessionsPerWeek * weeks;
      }

      return { ...s, subjects: updatedSubjects };
    }));
  };

  // Calculate totals for a single student
  const calculateStudentTotals = (student: StudentEntry) => {
    const totalSessions = student.subjects.reduce((sum, s) => sum + Number(s.sessions), 0);
    const subtotal = student.subjects.reduce((sum, s) => sum + (Number(s.sessions) * Number(s.rate)), 0);
    const discountAmount = subtotal * (Number(discount) / 100);
    const totalPrice = subtotal - discountAmount;
    const depositAmount = Math.ceil(totalPrice * 0.3);
    return { totalSessions, subtotal, discountAmount, totalPrice, depositAmount };
  };

  // Calculate grand totals across all students
  const calculateGrandTotals = () => {
    let grandTotalSessions = 0;
    let grandSubtotal = 0;
    
    students.forEach(student => {
      const { totalSessions, subtotal } = calculateStudentTotals(student);
      grandTotalSessions += totalSessions;
      grandSubtotal += subtotal;
    });
    
    const discountAmount = grandSubtotal * (Number(discount) / 100);
    const totalPrice = grandSubtotal - discountAmount;
    const depositAmount = Math.ceil(totalPrice * 0.3);
    
    return { totalSessions: grandTotalSessions, subtotal: grandSubtotal, discountAmount, totalPrice, depositAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all students have subjects
    const studentsWithSubjects = students.filter(s => s.subjects.length > 0 && s.name);
    if (studentsWithSubjects.length === 0) {
      toast.error("Please add at least one student with subjects");
      return;
    }

    if (!parentName || !parentEmail) {
      toast.error("Please fill in parent details");
      return;
    }

    // Check all students have valid subjects
    for (const student of studentsWithSubjects) {
      if (student.subjects.some(s => !s.name || !s.tutorId || s.sessions < 1 || s.rate < 1)) {
        toast.error(`Please fill in all subject details for ${student.name}`);
        return;
      }
    }

    setLoading(true);
    const createdPlansList: CreatedPlanInfo[] = [];

    try {
      // Create a learning plan for each student
      for (const student of studentsWithSubjects) {
        const studentTotals = calculateStudentTotals(student);
        const assignedTutors = getAssignedTutorsForStudent(student);
        const primaryTutorId = assignedTutors[0]?.id;

        if (!primaryTutorId) continue;

        const title = `Learning Plan for ${student.name}`;

        // Generate a URL-friendly slug from student name
        const generateSlug = (name: string) => {
          const baseSlug = name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
          const suffix = Math.random().toString(36).substring(2, 8);
          return `${baseSlug}-${suffix}`;
        };

        const urlSlug = generateSlug(student.name);

        // Create learning plan
        const { data: plan, error: planError } = await supabase
          .from("learning_plans")
          .insert({
            tutor_id: primaryTutorId,
            title,
            url_slug: urlSlug,
            subjects: student.subjects.map(s => {
              const tutor = tutors.find(t => t.id === s.tutorId);
              return {
                name: s.name,
                sessions: s.sessions,
                rate: s.rate,
                total: s.sessions * s.rate,
                tutorId: s.tutorId,
                tutorName: tutor?.full_name || "Unknown",
              };
            }),
            total_sessions: studentTotals.totalSessions,
            total_price: studentTotals.totalPrice,
            discount_applied: discount,
            validity_days: validityDays,
            notes: `Curriculum: ${student.curriculum} | Grade: ${student.gradeLevel} | Class Type: ${classType === 'physical' ? 'Physical (In-Person)' : 'Online'} | Payment Option: ${paymentOption} | Tutors: ${assignedTutors.map(t => t.full_name).join(", ")}\n\n${notes}`,
            status: "proposed",
          })
          .select()
          .single();

        if (planError) throw planError;

        // Generate payment links
        setGeneratingPaymentLink(true);
        let fullPaymentLink = "";
        let depositPaymentLink = "";
        
        try {
          const [fullPaymentResult, depositPaymentResult] = await Promise.all([
            supabase.functions.invoke("generate-learning-plan-payment-link", {
              body: {
                planId: plan.id,
                amount: studentTotals.totalPrice,
                parentEmail,
                parentPhone,
                studentName: student.name,
                description: `Full Payment - ${title}`,
                isDeposit: false,
              },
            }),
            supabase.functions.invoke("generate-learning-plan-payment-link", {
              body: {
                planId: plan.id,
                amount: studentTotals.depositAmount,
                parentEmail,
                parentPhone,
                studentName: student.name,
                description: `30% Deposit - ${title}`,
                isDeposit: true,
              },
            }),
          ]);

          if (fullPaymentResult.data?.paymentLink) {
            fullPaymentLink = fullPaymentResult.data.paymentLink;
          }
          if (depositPaymentResult.data?.paymentLink) {
            depositPaymentLink = depositPaymentResult.data.paymentLink;
          }
        } catch (err) {
          console.error("Error generating payment links:", err);
        }

        // Send email to parent
        const tutorNames = assignedTutors.map(t => t.full_name).join(", ");
        await supabase.functions.invoke("send-learning-plan-email", {
          body: {
            planId: plan.id,
            parentEmail,
            parentName,
            studentName: student.name,
            planTitle: title,
            totalSessions: studentTotals.totalSessions,
            totalPrice: studentTotals.totalPrice,
            validityDays,
            personalMessage: notes,
            subjects: student.subjects.map(s => {
              const tutor = tutors.find(t => t.id === s.tutorId);
              return {
                name: s.name,
                sessions: s.sessions,
                rate: s.rate,
                tutorName: tutor?.full_name,
              };
            }),
            depositAmount: studentTotals.depositAmount,
            fullPaymentLink,
            depositPaymentLink,
            tutorName: tutorNames,
            sessionSchedule: sessionSchedule.filter(s => s.day && s.time),
            startDate,
            shareToken: plan.share_token,
          },
        });

        createdPlansList.push({
          id: plan.id,
          shareToken: plan.share_token,
          urlSlug: plan.url_slug,
          title,
          studentName: student.name,
        });
      }

      setGeneratingPaymentLink(false);
      setCreatedPlans(createdPlansList);
      setSuccessDialogOpen(true);

      // Reset form
      setParentName("");
      setParentEmail("");
      setParentPhone("");
      setStudents([{ id: crypto.randomUUID(), name: "", curriculum: "", gradeLevel: "", subjects: [] }]);
      setActiveStudentId(students[0].id);
      setDiscount(0);
      setNotes("");
      setPaymentOption("full");
      setSessionSchedule([]);
      setStartDate("");
      
      toast.success(`${createdPlansList.length} learning plan${createdPlansList.length > 1 ? 's' : ''} created and sent!`);
    } catch (error: any) {
      console.error("Error creating learning plans:", error);
      toast.error(error.message || "Failed to create learning plans");
    } finally {
      setLoading(false);
      setGeneratingPaymentLink(false);
    }
  };

  const copyShareLink = async (plan: CreatedPlanInfo) => {
    const shareUrl = `https://lanatutors.africa/learning-plan/${plan.urlSlug}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(plan.id);
      toast.success("Share link copied!");
      setTimeout(() => setLinkCopied(null), 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setLinkCopied(plan.id);
      toast.success("Link copied!");
      setTimeout(() => setLinkCopied(null), 2000);
    }
  };

  const grandTotals = calculateGrandTotals();
  const allAssignedTutors = getAllAssignedTutors();
  const totalStudentsWithSubjects = students.filter(s => s.subjects.length > 0 && s.name).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Create Learning Plan</h2>
          <p className="text-muted-foreground">Send customized learning plans to parents - supports multiple children</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Parent Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. Parent Details</CardTitle>
            <CardDescription>Enter the parent's contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="parentName">Parent Name *</Label>
                <Input
                  id="parentName"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="Enter parent's full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="parentEmail">Parent Email *</Label>
                <Input
                  id="parentEmail"
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="parent@email.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="parentPhone">Parent Phone</Label>
                <Input
                  id="parentPhone"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="+254..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Students */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  2. Students & Subjects
                </CardTitle>
                <CardDescription>Add students and their subjects. Each student will receive a separate learning plan.</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={addStudent}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Another Child
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Student Tabs */}
            <Tabs value={activeStudentId} onValueChange={setActiveStudentId}>
              <TabsList className="flex flex-wrap h-auto gap-1">
                {students.map((student, index) => (
                  <TabsTrigger 
                    key={student.id} 
                    value={student.id}
                    className="flex items-center gap-2"
                  >
                    {student.name || `Child ${index + 1}`}
                    {student.subjects.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                        {student.subjects.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {students.map((student) => (
                <TabsContent key={student.id} value={student.id} className="space-y-4 mt-4">
                  {/* Student Info */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <Label>Student Name *</Label>
                      <Input
                        value={student.name}
                        onChange={(e) => updateStudent(student.id, "name", e.target.value)}
                        placeholder="Child's name"
                      />
                    </div>
                    <div>
                      <Label>Curriculum</Label>
                      <Select 
                        value={student.curriculum} 
                        onValueChange={(v) => updateStudent(student.id, "curriculum", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select curriculum" />
                        </SelectTrigger>
                        <SelectContent>
                          {curriculums.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Grade Level</Label>
                      <Select 
                        value={student.gradeLevel} 
                        onValueChange={(v) => updateStudent(student.id, "gradeLevel", v)} 
                        disabled={!student.curriculum}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {(student.curriculum ? getLevelsForCurriculum(student.curriculum) : []).map((l) => (
                            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      {students.length > 1 && (
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="sm"
                          onClick={() => removeStudent(student.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Subjects for this student */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base">Subjects for {student.name || "this child"}</Label>
                      <Button type="button" variant="default" size="sm" onClick={addSubject}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Subject
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {student.subjects.map((subject, subjectIndex) => {
                        const selectedTutor = tutors.find(t => t.id === subject.tutorId);
                        const tutorSubjects = selectedTutor?.subjects || [];
                        const currentAvailableSubjects = student.curriculum && student.gradeLevel 
                          ? getSubjectsForCurriculumLevel(student.curriculum, student.gradeLevel) 
                          : [];
                        
                        return (
                          <Card key={subjectIndex} className={`border-l-4 ${subject.tutorId ? 'border-l-primary bg-primary/5' : 'border-l-muted-foreground/30'}`}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                                  {subjectIndex + 1}
                                </span>
                                <span className="text-sm font-medium">
                                  {subject.name && subject.tutorId 
                                    ? `${subject.name} with ${selectedTutor?.full_name}`
                                    : 'New Subject'}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
                                {/* Tutor Selection */}
                                <div className="lg:col-span-2">
                                  <Label className="text-xs font-semibold text-primary">Tutor *</Label>
                                  {tutorsLoading ? (
                                    <div className="h-10 flex items-center">
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    </div>
                                  ) : (
                                    <Popover 
                                      open={openTutorPopover === `${student.id}-${subjectIndex}`} 
                                      onOpenChange={(open) => setOpenTutorPopover(open ? `${student.id}-${subjectIndex}` : null)}
                                    >
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          role="combobox"
                                          className={cn("w-full justify-between font-normal", !subject.tutorId && "border-primary")}
                                        >
                                          {selectedTutor ? (
                                            <span className="truncate">{selectedTutor.full_name}</span>
                                          ) : (
                                            <span className="text-muted-foreground">Search tutors...</span>
                                          )}
                                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[300px] p-0" align="start">
                                        <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                                          <CommandInput placeholder="Search by name or subject..." />
                                          <CommandList className="max-h-[300px]">
                                            <CommandEmpty>No tutor found.</CommandEmpty>
                                            <CommandGroup>
                                              {tutors.map((tutor) => (
                                                <CommandItem
                                                  key={tutor.id}
                                                  value={`${tutor.full_name} ${tutor.subjects.join(" ")}`}
                                                  onSelect={() => {
                                                    updateSubject(subjectIndex, "tutorId", tutor.id);
                                                    setOpenTutorPopover(null);
                                                  }}
                                                >
                                                  <Check className={cn("mr-2 h-4 w-4", subject.tutorId === tutor.id ? "opacity-100" : "opacity-0")} />
                                                  <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{tutor.full_name}</p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                      {tutor.subjects.slice(0, 3).join(", ")}{tutor.subjects.length > 3 ? '...' : ''} • KES {tutor.hourly_rate?.toLocaleString()}/hr
                                                    </p>
                                                  </div>
                                                </CommandItem>
                                              ))}
                                            </CommandGroup>
                                          </CommandList>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                </div>

                                {/* Subject Selection */}
                                <div className="lg:col-span-2">
                                  <Label className="text-xs font-semibold text-primary">Subject *</Label>
                                  <Select
                                    value={subject.name}
                                    onValueChange={(v) => updateSubject(subjectIndex, "name", v)}
                                    disabled={!subject.tutorId}
                                  >
                                    <SelectTrigger className={subject.tutorId && !subject.name ? 'border-primary' : ''}>
                                      <SelectValue placeholder={subject.tutorId ? "Select subject" : "Select tutor first"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {tutorSubjects.length > 0 && (
                                        <>
                                          <SelectItem value="_header_tutor" disabled className="font-semibold text-xs opacity-70">
                                            {selectedTutor?.full_name}'s subjects:
                                          </SelectItem>
                                          {tutorSubjects.map((s) => (
                                            <SelectItem key={`tutor-${s}`} value={s}>{s}</SelectItem>
                                          ))}
                                        </>
                                      )}
                                      {currentAvailableSubjects.length > 0 && (
                                        <>
                                          <SelectItem value="_header_curriculum" disabled className="font-semibold text-xs opacity-70 mt-2">
                                            Curriculum subjects:
                                          </SelectItem>
                                          {currentAvailableSubjects.filter(s => !tutorSubjects.includes(s)).map((s) => (
                                            <SelectItem key={`curr-${s}`} value={s}>{s}</SelectItem>
                                          ))}
                                        </>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label className="text-xs">Sessions/Week</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="7"
                                    value={subject.sessionsPerWeek}
                                    onChange={(e) => updateSubject(subjectIndex, "sessionsPerWeek", parseInt(e.target.value) || 2)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Weeks</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={subject.weeks}
                                    onChange={(e) => updateSubject(subjectIndex, "weeks", parseInt(e.target.value) || 4)}
                                  />
                                </div>
                                <div className="flex items-end gap-2">
                                  <div className="flex-1">
                                    <Label className="text-xs">Rate/Session</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={subject.rate}
                                      onChange={(e) => updateSubject(subjectIndex, "rate", parseInt(e.target.value) || 1500)}
                                    />
                                  </div>
                                  <Button type="button" variant="ghost" size="icon" onClick={() => removeSubject(subjectIndex)}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                {subject.sessionsPerWeek} × {subject.weeks} weeks = <strong>{subject.sessions} sessions</strong> | 
                                Subtotal: <strong>KES {(subject.sessions * subject.rate).toLocaleString()}</strong>
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })}
                      
                      {student.subjects.length === 0 && (
                        <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center">
                          <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                          <p className="text-sm text-muted-foreground mb-3">No subjects added for {student.name || "this child"}</p>
                          <Button type="button" variant="outline" onClick={addSubject}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Subject
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Student subtotal */}
                    {student.subjects.length > 0 && (
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <div className="flex justify-between text-sm">
                          <span>{student.name}'s Total:</span>
                          <span className="font-semibold">
                            {calculateStudentTotals(student).totalSessions} sessions • KES {calculateStudentTotals(student).totalPrice.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {/* All Assigned Tutors Summary */}
            {allAssignedTutors.length > 0 && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm font-medium mb-1">All Assigned Tutors ({allAssignedTutors.length})</p>
                <div className="flex flex-wrap gap-2">
                  {allAssignedTutors.map(tutor => (
                    <span key={tutor.id} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {tutor.full_name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">3. Session Schedule (Optional)</CardTitle>
            <CardDescription>Propose specific days and times for sessions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between mb-3">
              <Label>Proposed Session Schedule</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSessionSchedule([...sessionSchedule, { day: "", time: "" }])}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Time Slot
              </Button>
            </div>
            <div className="space-y-2">
              {sessionSchedule.map((schedule, index) => (
                <div key={index} className="flex gap-3 items-center">
                  <Select
                    value={schedule.day}
                    onValueChange={(v) => {
                      const updated = [...sessionSchedule];
                      updated[index].day = v;
                      setSessionSchedule(updated);
                    }}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="time"
                    value={schedule.time}
                    onChange={(e) => {
                      const updated = [...sessionSchedule];
                      updated[index].time = e.target.value;
                      setSessionSchedule(updated);
                    }}
                    className="w-32"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSessionSchedule(sessionSchedule.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <Label htmlFor="startDate">Proposed Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-48 mt-1"
              />
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <Label htmlFor="discount">Discount (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => setDiscount(parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="validity">Validity (Days)</Label>
                <Input
                  id="validity"
                  type="number"
                  min="1"
                  value={validityDays}
                  onChange={(e) => setValidityDays(parseInt(e.target.value) || 90)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 4: Payment Option */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              4. Payment Option
            </CardTitle>
            <CardDescription>Choose how the parent will pay</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={paymentOption} onValueChange={(v) => setPaymentOption(v as "full" | "deposit")} className="space-y-3">
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="flex-1 cursor-pointer">
                  <p className="font-medium">Full Payment</p>
                  <p className="text-sm text-muted-foreground">Pay the full amount upfront</p>
                </Label>
                <span className="font-semibold text-primary">KES {grandTotals.totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="deposit" id="deposit" />
                <Label htmlFor="deposit" className="flex-1 cursor-pointer">
                  <p className="font-medium">30% Deposit</p>
                  <p className="text-sm text-muted-foreground">Pay 30% now, balance before sessions complete</p>
                </Label>
                <span className="font-semibold text-primary">KES {grandTotals.depositAmount.toLocaleString()}</span>
              </div>
            </RadioGroup>
            
            {/* Class Type */}
            <div className="pt-4 border-t mt-4">
              <Label className="text-base mb-3 block">Session Type</Label>
              <RadioGroup value={classType} onValueChange={(v) => setClassType(v as "online" | "physical")} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="online" id="online" />
                  <Label htmlFor="online" className="cursor-pointer">Online Sessions</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="physical" id="physical" />
                  <Label htmlFor="physical" className="cursor-pointer">Physical (In-Person)</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Step 5: Personal Message */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              5. Personal Message to Parent
            </CardTitle>
            <CardDescription>Add a personalized message that will be included in the email</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateEmailBody}
                disabled={allAssignedTutors.length === 0 || students.every(s => !s.name)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Message
              </Button>
            </div>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write a personal introduction..."
              rows={10}
            />
          </CardContent>
        </Card>

        {/* Grand Summary */}
        {totalStudentsWithSubjects > 0 && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Students with Plans:</span>
                <span className="font-semibold">{totalStudentsWithSubjects}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Sessions (all students):</span>
                <span className="font-semibold">{grandTotals.totalSessions}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tutors Assigned:</span>
                <span className="font-semibold">{allAssignedTutors.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>KES {grandTotals.subtotal.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount ({discount}%):</span>
                  <span>- KES {grandTotals.discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Grand Total:</span>
                <span>KES {grandTotals.totalPrice.toLocaleString()}</span>
              </div>
              {paymentOption === "deposit" && (
                <div className="flex justify-between text-sm text-blue-600 bg-blue-50 p-2 rounded">
                  <span>Amount Due Now (30%):</span>
                  <span className="font-semibold">KES {grandTotals.depositAmount.toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <Button type="submit" disabled={loading || generatingPaymentLink} className="w-full" size="lg">
          {loading || generatingPaymentLink ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {generatingPaymentLink ? "Generating Payment Links..." : "Creating Plans..."}
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Create & Send {totalStudentsWithSubjects > 1 ? `${totalStudentsWithSubjects} Learning Plans` : 'Learning Plan'} to Parent
            </>
          )}
        </Button>
      </form>

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              Learning Plan{createdPlans.length > 1 ? 's' : ''} Sent Successfully!
            </DialogTitle>
            <DialogDescription>
              {createdPlans.length} plan{createdPlans.length > 1 ? 's have' : ' has'} been created and emailed to the parent.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {createdPlans.map((plan) => (
              <div key={plan.id} className="p-4 bg-muted rounded-lg space-y-3">
                <p className="text-sm font-medium">{plan.title}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-background rounded text-xs break-all border">
                    https://lanatutors.africa/learning-plan/{plan.urlSlug}
                  </code>
                  <Button variant="secondary" size="sm" onClick={() => copyShareLink(plan)}>
                    {linkCopied === plan.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => window.open(`/learning-plan/${plan.urlSlug}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </div>
            ))}
          </div>

          <Button
            className="w-full mt-4"
            onClick={() => {
              setSuccessDialogOpen(false);
              setCreatedPlans([]);
            }}
          >
            Create Another
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

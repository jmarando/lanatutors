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
import { Loader2, Plus, Trash2, Send, FileText, Sparkles, CreditCard, Users, Check, ChevronsUpDown, Copy, ExternalLink, CheckCircle } from "lucide-react";
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
  tutorId: string; // Each subject can have its own tutor
}

interface Tutor {
  id: string;
  user_id: string;
  full_name: string;
  subjects: string[];
  hourly_rate: number;
}

export const AdminCreateLearningPlan = () => {
  const [loading, setLoading] = useState(false);
  const [generatingPaymentLink, setGeneratingPaymentLink] = useState(false);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [tutorsLoading, setTutorsLoading] = useState(true);
  const [openTutorPopover, setOpenTutorPopover] = useState<number | null>(null);

  // Success dialog state
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [createdPlan, setCreatedPlan] = useState<{ id: string; shareToken: string; title: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Parent/Student Info
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [studentName, setStudentName] = useState("");
  const [curriculum, setCurriculum] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");

  // Plan Details
  const [title, setTitle] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
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
  const availableLevels = curriculum ? getLevelsForCurriculum(curriculum) : [];
  const availableSubjects = curriculum && gradeLevel ? getSubjectsForCurriculumLevel(curriculum, gradeLevel) : [];

  useEffect(() => {
    fetchTutors();
  }, []);

  useEffect(() => {
    if (studentName) {
      setTitle(`Learning Plan for ${studentName}`);
    }
  }, [studentName]);

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

  // Get unique tutors assigned to subjects
  const getAssignedTutors = () => {
    const tutorIds = [...new Set(subjects.filter(s => s.tutorId).map(s => s.tutorId))];
    return tutors.filter(t => tutorIds.includes(t.id));
  };

  const generateEmailBody = () => {
    const assignedTutors = getAssignedTutors();
    if (assignedTutors.length === 0 || !studentName) {
      toast.error("Please add subjects with tutors and enter student name first");
      return;
    }
    
    // Simplified message - the email template already includes subject details, pricing, and payment options
    // This is just for any additional personalized notes
    const curriculumInfo = curriculum ? ` following the ${curriculum} curriculum` : "";
    const gradeInfo = gradeLevel ? ` in ${gradeLevel}` : "";
    
    const tutorNames = assignedTutors.map(t => t.full_name).join(" and ");
    const tutorIntro = assignedTutors.length === 1 
      ? `${tutorNames} will be ${studentName}'s dedicated tutor.`
      : `${tutorNames} will be ${studentName}'s dedicated tutors for their respective subjects.`;

    const generatedBody = `Dear ${parentName || "Parent"},

Thank you for your interest in our tutoring services. We are pleased to present a personalized learning plan for ${studentName}${gradeInfo}${curriculumInfo}.

${tutorIntro} With their expertise and personalized approach, we are confident that ${studentName} will make excellent progress.

We look forward to supporting ${studentName}'s academic journey.

Warm regards,
Lana Tutors Team`;

    setNotes(generatedBody);
    toast.success("Message generated!");
  };


  const addSubject = () => {
    setSubjects([...subjects, { name: "", sessions: 8, rate: 1500, sessionsPerWeek: 2, weeks: 4, tutorId: "" }]);
  };

  const removeSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const updateSubject = (index: number, field: keyof Subject, value: any) => {
    const updated = [...subjects];
    updated[index] = { ...updated[index], [field]: value };

    // If tutor changed, update the rate to that tutor's rate
    if (field === "tutorId") {
      const tutor = tutors.find(t => t.id === value);
      if (tutor) {
        updated[index].rate = tutor.hourly_rate || 1500;
      }
    }

    if (field === "sessionsPerWeek" || field === "weeks") {
      const sessionsPerWeek = field === "sessionsPerWeek" ? value : updated[index].sessionsPerWeek;
      const weeks = field === "weeks" ? value : updated[index].weeks;
      updated[index].sessions = sessionsPerWeek * weeks;
    }

    setSubjects(updated);
  };

  const calculateTotals = () => {
    const totalSessions = subjects.reduce((sum, s) => sum + Number(s.sessions), 0);
    const subtotal = subjects.reduce((sum, s) => sum + (Number(s.sessions) * Number(s.rate)), 0);
    const discountAmount = subtotal * (Number(discount) / 100);
    const totalPrice = subtotal - discountAmount;
    const depositAmount = Math.ceil(totalPrice * 0.3);
    return { totalSessions, subtotal, discountAmount, totalPrice, depositAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const assignedTutors = getAssignedTutors();
    if (assignedTutors.length === 0) {
      toast.error("Please add at least one subject with a tutor assigned");
      return;
    }

    if (!parentName || !parentEmail || !studentName) {
      toast.error("Please fill in parent and student details");
      return;
    }

    if (subjects.length === 0) {
      toast.error("Please add at least one subject");
      return;
    }

    if (subjects.some(s => !s.name || !s.tutorId || s.sessions < 1 || s.rate < 1)) {
      toast.error("Please fill in all subject details including tutor assignment");
      return;
    }

    setLoading(true);
    try {
      const { totalSessions, totalPrice, depositAmount } = calculateTotals();
      const amountDue = paymentOption === "deposit" ? depositAmount : totalPrice;

      // Use the first tutor as the primary for the learning plan record
      const primaryTutorId = assignedTutors[0].id;

      // Create learning plan
      const { data: plan, error: planError } = await supabase
        .from("learning_plans")
        .insert({
          tutor_id: primaryTutorId,
          title,
          subjects: subjects.map(s => {
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
          total_sessions: totalSessions,
          total_price: totalPrice,
          discount_applied: discount,
          validity_days: validityDays,
          notes: `Curriculum: ${curriculum} | Grade: ${gradeLevel} | Class Type: ${classType === 'physical' ? 'Physical (In-Person)' : 'Online'} | Payment Option: ${paymentOption} | Tutors: ${assignedTutors.map(t => t.full_name).join(", ")}\n\n${notes}`,
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
              amount: totalPrice,
              parentEmail,
              parentPhone,
              studentName,
              description: `Full Payment - ${title}`,
              isDeposit: false,
            },
          }),
          supabase.functions.invoke("generate-learning-plan-payment-link", {
            body: {
              planId: plan.id,
              amount: depositAmount,
              parentEmail,
              parentPhone,
              studentName,
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
      setGeneratingPaymentLink(false);

      // Send email to parent with share token
      const tutorNames = assignedTutors.map(t => t.full_name).join(", ");
      const { error: emailError } = await supabase.functions.invoke("send-learning-plan-email", {
        body: {
          planId: plan.id,
          parentEmail,
          parentName,
          studentName,
          planTitle: title,
          totalSessions,
          totalPrice,
          validityDays,
          personalMessage: notes,
          subjects: subjects.map(s => {
            const tutor = tutors.find(t => t.id === s.tutorId);
            return {
              name: s.name,
              sessions: s.sessions,
              rate: s.rate,
              tutorName: tutor?.full_name,
            };
          }),
          depositAmount,
          fullPaymentLink,
          depositPaymentLink,
          tutorName: tutorNames,
          sessionSchedule: sessionSchedule.filter(s => s.day && s.time),
          startDate,
          shareToken: plan.share_token, // Include share token for shareable link
        },
      });

      if (emailError) {
        console.error("Email error:", emailError);
        toast.error("Learning plan created but email failed to send");
      }

      // Show success dialog with share link
      setCreatedPlan({
        id: plan.id,
        shareToken: plan.share_token,
        title: title,
      });
      setSuccessDialogOpen(true);

      // Reset form
      setParentName("");
      setParentEmail("");
      setParentPhone("");
      setStudentName("");
      setCurriculum("");
      setGradeLevel("");
      setTitle("");
      setSubjects([]);
      setDiscount(0);
      setNotes("");
      setPaymentOption("full");
      setSessionSchedule([]);
      setStartDate("");
    } catch (error: any) {
      console.error("Error creating learning plan:", error);
      toast.error(error.message || "Failed to create learning plan");
    } finally {
      setLoading(false);
      setGeneratingPaymentLink(false);
    }
  };

  const copyShareLink = async () => {
    if (!createdPlan?.shareToken) return;
    
    const shareUrl = `https://lanatutors.africa/learning-plan/${createdPlan.id}?token=${createdPlan.shareToken}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      toast.success("Share link copied to clipboard!");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setLinkCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const totals = calculateTotals();
  const assignedTutors = getAssignedTutors();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Create Learning Plan</h2>
          <p className="text-muted-foreground">Send a customized learning plan proposal to parents with multiple tutors & subjects</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Parent/Student Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. Parent & Student Details</CardTitle>
            <CardDescription>Enter the parent and student information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div>
                <Label htmlFor="studentName">Student Name *</Label>
                <Input
                  id="studentName"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter student's name"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="curriculum">Curriculum</Label>
                <Select value={curriculum} onValueChange={(v) => { setCurriculum(v); setGradeLevel(""); }}>
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
                <Label htmlFor="gradeLevel">Grade Level</Label>
                <Select value={gradeLevel} onValueChange={setGradeLevel} disabled={!curriculum}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLevels.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Subjects with Tutor Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              2. Subjects & Tutor Assignments
            </CardTitle>
            <CardDescription>
              Build the learning plan by adding subjects. For each subject, select a tutor who will teach it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Plan Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Learning Plan for [Student Name]"
                required
              />
            </div>

            {/* How it works hint */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-sm font-medium text-primary mb-2">How it works:</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Click <strong>"Add Subject"</strong> to add a subject to the plan</li>
                <li>Search and select a <strong>tutor</strong> who will teach that subject</li>
                <li>Choose the <strong>subject</strong> from the tutor's specializations or curriculum</li>
                <li>Set the <strong>sessions per week</strong> and <strong>duration</strong></li>
                <li>Repeat for each subject the student needs</li>
              </ol>
            </div>

            {/* Subjects List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-base">Subjects & Sessions</Label>
                  <p className="text-xs text-muted-foreground">Each row = 1 subject with its assigned tutor</p>
                </div>
                <Button type="button" variant="default" size="sm" onClick={addSubject}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Subject
                </Button>
              </div>
              <div className="space-y-3">
                {subjects.map((subject, index) => {
                  const selectedTutor = tutors.find(t => t.id === subject.tutorId);
                  const tutorSubjects = selectedTutor?.subjects || [];
                  
                  return (
                    <Card key={index} className={`border-l-4 ${subject.tutorId ? 'border-l-primary bg-primary/5' : 'border-l-muted-foreground/30'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium">
                            {subject.name && subject.tutorId 
                              ? `${subject.name} with ${selectedTutor?.full_name}`
                              : 'New Subject Assignment'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
                          {/* Step A: Tutor Selection */}
                          <div className="lg:col-span-2">
                            <Label className="text-xs font-semibold text-primary">Step 1: Select Tutor *</Label>
                            {tutorsLoading ? (
                              <div className="h-10 flex items-center">
                                <Loader2 className="w-4 h-4 animate-spin" />
                              </div>
                            ) : (
                              <Popover 
                                open={openTutorPopover === index} 
                                onOpenChange={(open) => setOpenTutorPopover(open ? index : null)}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openTutorPopover === index}
                                    className={cn(
                                      "w-full justify-between font-normal",
                                      !subject.tutorId && "border-primary"
                                    )}
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
                                  <Command>
                                    <CommandInput placeholder="Search by name or subject..." />
                                    <CommandList>
                                      <CommandEmpty>No tutor found.</CommandEmpty>
                                      <CommandGroup>
                                        {tutors.map((tutor) => (
                                          <CommandItem
                                            key={tutor.id}
                                            value={`${tutor.full_name} ${tutor.subjects.join(" ")}`}
                                            onSelect={() => {
                                              updateSubject(index, "tutorId", tutor.id);
                                              setOpenTutorPopover(null);
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                subject.tutorId === tutor.id ? "opacity-100" : "opacity-0"
                                              )}
                                            />
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

                          {/* Step B: Subject Selection */}
                          <div className="lg:col-span-2">
                            <Label className="text-xs font-semibold text-primary">Step 2: Select Subject *</Label>
                            <Select
                              value={subject.name}
                              onValueChange={(v) => updateSubject(index, "name", v)}
                              disabled={!subject.tutorId}
                            >
                              <SelectTrigger className={subject.tutorId && !subject.name ? 'border-primary' : ''}>
                                <SelectValue placeholder={subject.tutorId ? "Now pick a subject" : "Select tutor first"} />
                              </SelectTrigger>
                              <SelectContent>
                                {/* Show tutor's subjects first if assigned */}
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
                                {/* Then curriculum subjects */}
                                {availableSubjects.length > 0 && (
                                  <>
                                    <SelectItem value="_header_curriculum" disabled className="font-semibold text-xs opacity-70 mt-2">
                                      Curriculum subjects:
                                    </SelectItem>
                                    {availableSubjects.filter(s => !tutorSubjects.includes(s)).map((s) => (
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
                              onChange={(e) => updateSubject(index, "sessionsPerWeek", parseInt(e.target.value) || 2)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Weeks</Label>
                            <Input
                              type="number"
                              min="1"
                              value={subject.weeks}
                              onChange={(e) => updateSubject(index, "weeks", parseInt(e.target.value) || 4)}
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <Label className="text-xs">Rate/Session</Label>
                              <Input
                                type="number"
                                min="1"
                                value={subject.rate}
                                onChange={(e) => updateSubject(index, "rate", parseInt(e.target.value) || 1500)}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSubject(index)}
                            >
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
                {subjects.length === 0 && (
                  <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center">
                    <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">
                      No subjects added yet. Each subject can have its own dedicated tutor.
                    </p>
                    <Button type="button" variant="outline" onClick={addSubject}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Subject
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Assigned Tutors Summary */}
            {assignedTutors.length > 0 && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm font-medium mb-1">Assigned Tutors ({assignedTutors.length})</p>
                <div className="flex flex-wrap gap-2">
                  {assignedTutors.map(tutor => (
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
            <CardDescription>Choose how the parent will pay for this plan</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={paymentOption} onValueChange={(v) => setPaymentOption(v as "full" | "deposit")} className="space-y-3">
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="flex-1 cursor-pointer">
                  <p className="font-medium">Full Payment</p>
                  <p className="text-sm text-muted-foreground">Pay the full amount upfront</p>
                </Label>
                <span className="font-semibold text-primary">KES {totals.totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="deposit" id="deposit" />
                <Label htmlFor="deposit" className="flex-1 cursor-pointer">
                  <p className="font-medium">30% Deposit</p>
                  <p className="text-sm text-muted-foreground">Pay 30% now to get started, balance before sessions complete</p>
                </Label>
                <span className="font-semibold text-primary">KES {totals.depositAmount.toLocaleString()}</span>
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
                disabled={assignedTutors.length === 0 || !studentName}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Message
              </Button>
            </div>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write a personal introduction... Click 'Generate Message' after filling in all details above."
              rows={12}
            />
            <p className="text-xs text-muted-foreground">
              Tip: Fill in subjects with tutors, schedule and payment option first, then click "Generate Message" to auto-populate.
            </p>
          </CardContent>
        </Card>

        {/* Summary */}
        {subjects.length > 0 && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Sessions:</span>
                <span className="font-semibold">{totals.totalSessions}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tutors Assigned:</span>
                <span className="font-semibold">{assignedTutors.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>KES {totals.subtotal.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount ({discount}%):</span>
                  <span>- KES {totals.discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total Price:</span>
                <span>KES {totals.totalPrice.toLocaleString()}</span>
              </div>
              {paymentOption === "deposit" && (
                <div className="flex justify-between text-sm text-blue-600 bg-blue-50 p-2 rounded">
                  <span>Amount Due Now (30%):</span>
                  <span className="font-semibold">KES {totals.depositAmount.toLocaleString()}</span>
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
              {generatingPaymentLink ? "Generating Payment Link..." : "Creating..."}
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Create & Send Learning Plan to Parent
            </>
          )}
        </Button>
      </form>

      {/* Success Dialog with Share Link */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              Learning Plan Sent Successfully!
            </DialogTitle>
            <DialogDescription>
              The learning plan has been created and emailed to the parent.
            </DialogDescription>
          </DialogHeader>
          
          {createdPlan && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">{createdPlan.title}</p>
                <p className="text-xs text-muted-foreground">Plan ID: {createdPlan.id}</p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Share Link</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Copy this link to share with the parent via WhatsApp or other channels:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-background rounded text-xs break-all border">
                    https://lanatutors.africa/learning-plan/{createdPlan.id}?token={createdPlan.shareToken}
                  </code>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={copyShareLink}
                  >
                    {linkCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(`/learning-plan/${createdPlan.id}?token=${createdPlan.shareToken}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Preview Plan
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setSuccessDialogOpen(false);
                    setCreatedPlan(null);
                  }}
                >
                  Create Another
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

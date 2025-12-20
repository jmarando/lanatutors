import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Plus, Trash2, Send, FileText, Search, Sparkles, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { getCurriculums, getLevelsForCurriculum, getSubjectsForCurriculumLevel } from "@/utils/curriculumData";

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
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Remove auto-generate - user clicks button manually

  const fetchTutors = async () => {
    setTutorsLoading(true);
    try {
      // First get tutor profiles
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

      // Get user IDs and fetch profiles
      const userIds = tutorProfiles.map(t => t.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      // Map profiles to tutors
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

  const generateEmailBody = () => {
    if (!selectedTutor || !studentName) {
      toast.error("Please select a tutor and enter student name first");
      return;
    }
    
    const subjectList = subjects
      .filter(s => s.name)
      .map(s => `${s.name} (${s.sessions} sessions)`)
      .join(", ");
    
    const curriculumInfo = curriculum ? ` following the ${curriculum} curriculum` : "";
    const gradeInfo = gradeLevel ? ` in ${gradeLevel}` : "";
    
    // Format schedule
    const scheduleText = sessionSchedule.filter(s => s.day && s.time).length > 0
      ? `\n\nProposed Schedule:\n${sessionSchedule.filter(s => s.day && s.time).map(s => {
          const [hours, minutes] = s.time.split(":");
          const hour = parseInt(hours);
          const ampm = hour >= 12 ? "PM" : "AM";
          const hour12 = hour % 12 || 12;
          return `• ${s.day} at ${hour12}:${minutes} ${ampm}`;
        }).join("\n")}${startDate ? `\n\nStarting: ${new Date(startDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}` : ''}`
      : "";
    
    // Payment info
    const { totalPrice, depositAmount } = calculateTotals();
    const paymentText = `

Payment Options:
• Full Payment: KES ${totalPrice.toLocaleString()}
• 30% Deposit to Start: KES ${depositAmount.toLocaleString()} (Balance: KES ${(totalPrice - depositAmount).toLocaleString()})

You can pay via M-Pesa, Card, or Bank Transfer:
• NCBA Paybill: 880100
• Account Number: 1006114657`;
    
    const generatedBody = `Dear ${parentName || "Parent"},

Thank you for your interest in our tutoring services. We are pleased to present a personalized learning plan for ${studentName}${gradeInfo}${curriculumInfo}.

${subjectList ? `Based on our assessment, we recommend focusing on: ${subjectList}.` : ""}

${selectedTutor.full_name} will be ${studentName}'s dedicated tutor. With their expertise and personalized approach, we are confident that ${studentName} will make excellent progress.${scheduleText}${paymentText}

We look forward to supporting ${studentName}'s academic journey.

Warm regards,
Lana Tutors Team`;

    setNotes(generatedBody);
    toast.success("Message generated!");
  };

  const filteredTutors = tutors.filter(t =>
    t.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subjects.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addSubject = () => {
    const rate = selectedTutor?.hourly_rate || 1500;
    setSubjects([...subjects, { name: "", sessions: 8, rate, sessionsPerWeek: 2, weeks: 4 }]);
  };

  const removeSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const updateSubject = (index: number, field: keyof Subject, value: any) => {
    const updated = [...subjects];
    updated[index] = { ...updated[index], [field]: value };

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

    if (!selectedTutor) {
      toast.error("Please select a tutor");
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

    if (subjects.some(s => !s.name || s.sessions < 1 || s.rate < 1)) {
      toast.error("Please fill in all subject details");
      return;
    }

    setLoading(true);
    try {
      const { totalSessions, totalPrice, depositAmount } = calculateTotals();
      const amountDue = paymentOption === "deposit" ? depositAmount : totalPrice;

      // Create learning plan
      const { data: plan, error: planError } = await supabase
        .from("learning_plans")
        .insert({
          tutor_id: selectedTutor.id,
          title,
          subjects: subjects.map(s => ({
            name: s.name,
            sessions: s.sessions,
            rate: s.rate,
            total: s.sessions * s.rate,
          })),
          total_sessions: totalSessions,
          total_price: totalPrice,
          discount_applied: discount,
          validity_days: validityDays,
          notes: `Curriculum: ${curriculum} | Grade: ${gradeLevel} | Payment Option: ${paymentOption}\n\n${notes}`,
          status: "proposed",
        })
        .select()
        .single();

      if (planError) throw planError;

      // Generate payment links - one for full payment, one for deposit
      setGeneratingPaymentLink(true);
      let fullPaymentLink = "";
      let depositPaymentLink = "";
      
      try {
        // Generate both payment links in parallel
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
        
        if (fullPaymentResult.error) {
          console.error("Full payment link error:", fullPaymentResult.error);
        }
        if (depositPaymentResult.error) {
          console.error("Deposit payment link error:", depositPaymentResult.error);
        }
      } catch (err) {
        console.error("Error generating payment links:", err);
      }
      setGeneratingPaymentLink(false);

      // Send email to parent
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
          subjects: subjects.map(s => ({
            name: s.name,
            sessions: s.sessions,
            rate: s.rate,
          })),
          depositAmount,
          fullPaymentLink,
          depositPaymentLink,
          tutorName: selectedTutor.full_name,
          sessionSchedule: sessionSchedule.filter(s => s.day && s.time),
          startDate,
        },
      });

      if (emailError) {
        console.error("Email error:", emailError);
        toast.error("Learning plan created but email failed to send");
      } else {
        toast.success("Learning plan created and sent to parent!");
      }

      // Reset form
      setSelectedTutor(null);
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

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Create Learning Plan</h2>
          <p className="text-muted-foreground">Send a customized learning plan proposal to parents</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select Tutor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. Select Tutor</CardTitle>
            <CardDescription>Choose which tutor will deliver this learning plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tutors by name or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {tutorsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading tutors...</span>
              </div>
            ) : filteredTutors.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                {tutors.length === 0 ? "No verified tutors found" : "No tutors match your search"}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                {filteredTutors.map((tutor) => (
                  <Card
                    key={tutor.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTutor?.id === tutor.id ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => {
                      setSelectedTutor(tutor);
                      setSubjects(subjects.map(s => ({ ...s, rate: tutor.hourly_rate || 1500 })));
                    }}
                  >
                    <CardContent className="p-3">
                      <p className="font-medium">{tutor.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {tutor.subjects.slice(0, 3).join(", ")}
                        {tutor.subjects.length > 3 && "..."}
                      </p>
                      <p className="text-xs text-primary mt-1">KES {tutor.hourly_rate?.toLocaleString()}/hr</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {selectedTutor && (
              <p className="text-sm text-green-600">✓ Selected: {selectedTutor.full_name}</p>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Parent/Student Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">2. Parent & Student Details</CardTitle>
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

        {/* Step 3: Plan Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">3. Learning Plan Details</CardTitle>
            <CardDescription>Configure the subjects, sessions, and pricing</CardDescription>
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

            {/* Subjects */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Subjects & Sessions</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSubject}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Subject
                </Button>
              </div>
              <div className="space-y-3">
                {subjects.map((subject, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                        <div className="md:col-span-2">
                          <Label className="text-xs">Subject</Label>
                          <Select
                            value={subject.name}
                            onValueChange={(v) => updateSubject(index, "name", v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableSubjects.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                              {selectedTutor?.subjects.map((s) => (
                                !availableSubjects.includes(s) && (
                                  <SelectItem key={s} value={s}>{s}</SelectItem>
                                )
                              ))}
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
                        <div>
                          <Label className="text-xs">Rate/Session</Label>
                          <Input
                            type="number"
                            min="1"
                            value={subject.rate}
                            onChange={(e) => updateSubject(index, "rate", parseInt(e.target.value) || 1500)}
                          />
                        </div>
                        <div className="flex items-end">
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
                        {subject.sessionsPerWeek} × {subject.weeks} weeks = {subject.sessions} sessions | 
                        Subtotal: <strong>KES {(subject.sessions * subject.rate).toLocaleString()}</strong>
                      </p>
                    </CardContent>
                  </Card>
                ))}
                {subjects.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No subjects added yet. Click "Add Subject" to get started.
                  </p>
                )}
              </div>
            </div>

            {/* Session Schedule */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Proposed Session Schedule (Optional)</Label>
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
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
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
                disabled={!selectedTutor || !studentName}
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
              Tip: Fill in tutor, student, subjects, schedule and payment option first, then click "Generate Message" to auto-populate.
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
    </div>
  );
};

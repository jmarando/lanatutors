import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Send, FileText, Search } from "lucide-react";
import { toast } from "sonner";
import { getCurriculums, getLevelsForCurriculum, getSubjectsForCurriculumLevel } from "@/utils/curriculumData";

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
  const [tutors, setTutors] = useState<Tutor[]>([]);
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
    const { data, error } = await supabase
      .from("tutor_profiles")
      .select(`
        id,
        user_id,
        subjects,
        hourly_rate,
        profiles!tutor_profiles_user_id_fkey(full_name)
      `)
      .eq("verified", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTutors(data.map((t: any) => ({
        id: t.id,
        user_id: t.user_id,
        full_name: t.profiles?.full_name || "Unknown",
        subjects: t.subjects || [],
        hourly_rate: t.hourly_rate || 1500,
      })));
    }
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
    return { totalSessions, subtotal, discountAmount, totalPrice };
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
      const { totalSessions, totalPrice } = calculateTotals();

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
          notes: `Curriculum: ${curriculum} | Grade: ${gradeLevel}\n\n${notes}`,
          status: "proposed",
        })
        .select()
        .single();

      if (planError) throw planError;

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
    } catch (error: any) {
      console.error("Error creating learning plan:", error);
      toast.error(error.message || "Failed to create learning plan");
    } finally {
      setLoading(false);
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
              {filteredTutors.map((tutor) => (
                <Card
                  key={tutor.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedTutor?.id === tutor.id ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => {
                    setSelectedTutor(tutor);
                    // Update rates for existing subjects
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

            <div>
              <Label htmlFor="notes">Personal Message to Parent</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write a personal introduction..."
                rows={3}
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
                              {/* Also show tutor's subjects */}
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
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
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

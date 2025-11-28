import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Mail, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurriculums, getLevelsForCurriculum, getSubjectsForCurriculumLevel } from "@/utils/curriculumData";

interface LearningPlanRequestProps {
  tutorId: string;
  tutorName: string;
  tutorEmail: string;
  tutorSubjects: string[];
  onClose: () => void;
  onSubmitSuccess: () => void;
}

export const LearningPlanRequest = ({
  tutorId,
  tutorName,
  tutorEmail,
  tutorSubjects,
  onClose,
  onSubmitSuccess,
}: LearningPlanRequestProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [formData, setFormData] = useState({
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    studentName: "",
    gradeLevel: "",
    curriculum: "",
    lastExamPerformance: "",
    currentChallenges: "",
    preferredSessions: 0,
    desiredDurationWeeks: 0,
    availableTimePerWeek: "",
  });
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  
  // Get available curricula, levels, and subjects based on selections
  const curricula = getCurriculums();
  const availableLevels = formData.curriculum 
    ? getLevelsForCurriculum(formData.curriculum) 
    : [];
  const availableSubjects = formData.curriculum && formData.gradeLevel
    ? getSubjectsForCurriculumLevel(formData.curriculum, formData.gradeLevel)
    : tutorSubjects; // Fallback to tutor subjects if no curriculum/level selected

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    setLoadingProfile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setFormData(prev => ({
            ...prev,
            parentName: profile.full_name || "",
            parentEmail: user.email || "",
            parentPhone: profile.phone_number || "",
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoadingProfile(false);
    }
  };

  // When curriculum changes, reset grade level and subjects
  const handleCurriculumChange = (value: string) => {
    setFormData({ ...formData, curriculum: value, gradeLevel: "" });
    setSelectedSubjects([]);
  };

  // When grade level changes, reset subjects
  const handleGradeLevelChange = (value: string) => {
    setFormData({ ...formData, gradeLevel: value });
    setSelectedSubjects([]);
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedSubjects.length === 0) {
      toast.error("Please select at least one subject");
      return;
    }

    if (!formData.parentName || !formData.parentEmail || !formData.studentName || !formData.gradeLevel || !formData.curriculum) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      // Get current user if authenticated
      const { data: { user } } = await supabase.auth.getUser();

      // Create inquiry
      const { data: inquiry, error: inquiryError } = await supabase
        .from("tutor_inquiries")
        .insert({
          tutor_id: tutorId,
          parent_id: user?.id || null,
          parent_name: formData.parentName,
          parent_email: formData.parentEmail,
          parent_phone: formData.parentPhone || null,
          student_name: formData.studentName,
          grade_level: formData.gradeLevel,
          curriculum: formData.curriculum || null,
          subjects_needed: selectedSubjects,
          current_challenges: formData.currentChallenges || null,
          preferred_sessions: formData.preferredSessions || 0,
          desired_duration_weeks: formData.desiredDurationWeeks || null,
          available_time_per_week: formData.availableTimePerWeek || null,
          preferred_contact: 'email',
          status: 'pending',
        })
        .select()
        .single();

      if (inquiryError) throw inquiryError;

      // Send email notification to tutor
      const { error: emailError } = await supabase.functions.invoke("send-learning-plan-inquiry", {
        body: {
          tutorEmail,
          tutorName,
          parentName: formData.parentName,
          parentEmail: formData.parentEmail,
          parentPhone: formData.parentPhone,
          studentName: formData.studentName,
          gradeLevel: formData.gradeLevel,
          curriculum: formData.curriculum,
          subjects: selectedSubjects,
          lastExamPerformance: formData.lastExamPerformance,
          challenges: formData.currentChallenges,
          preferredSessions: formData.preferredSessions,
          desiredDurationWeeks: formData.desiredDurationWeeks,
          availableTimePerWeek: formData.availableTimePerWeek,
          inquiryId: inquiry.id,
        },
      });

      if (emailError) {
        console.error("Email error:", emailError);
        // Don't fail the inquiry if email fails
        toast("Inquiry submitted! However, we couldn't send the email notification. We'll follow up soon.");
      } else {
        toast.success("Learning plan request sent! " + tutorName + " will contact you via email within 24 hours.");
      }

      onSubmitSuccess();
    } catch (error: any) {
      console.error("Submission error:", error);
      toast.error(error.message || "Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">How This Works</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
                  <span>{tutorName} will review your child's needs and create a personalized learning plan</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
                  <span>You'll receive the custom plan via email within 24 hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
                  <span>Review the plan, subjects, and pricing - then accept and pay when ready</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Parent Information - Pre-filled from profile */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            Parent/Guardian Information
            <Badge variant="secondary" className="text-xs">Auto-filled from your profile</Badge>
          </h4>
          
          <div>
            <Label htmlFor="parentName">Your Name *</Label>
            <Input
              id="parentName"
              value={formData.parentName}
              disabled
              className="bg-muted cursor-not-allowed"
            />
          </div>

          <div>
            <Label htmlFor="parentEmail">Your Email *</Label>
            <Input
              id="parentEmail"
              type="email"
              value={formData.parentEmail}
              disabled
              className="bg-muted cursor-not-allowed"
            />
          </div>

          <div>
            <Label htmlFor="parentPhone">Phone Number</Label>
            <Input
              id="parentPhone"
              type="tel"
              value={formData.parentPhone}
              disabled
              placeholder="Not provided"
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Update your phone number in your profile settings if needed
            </p>
          </div>
        </div>

        {/* Student Information */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Student Information</h4>
          
          <div>
            <Label htmlFor="studentName">Student's Name *</Label>
            <Input
              id="studentName"
              value={formData.studentName}
              onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
              placeholder="e.g., Mary Wanjiku"
              required
            />
          </div>

          <div>
            <Label htmlFor="curriculum">Curriculum *</Label>
            <Select
              value={formData.curriculum}
              onValueChange={handleCurriculumChange}
              required
            >
              <SelectTrigger id="curriculum">
                <SelectValue placeholder="Select curriculum" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {curricula.map((curr) => (
                  <SelectItem key={curr} value={curr}>
                    {curr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="gradeLevel">Grade Level *</Label>
            <Select
              value={formData.gradeLevel}
              onValueChange={handleGradeLevelChange}
              required
              disabled={!formData.curriculum}
            >
              <SelectTrigger id="gradeLevel">
                <SelectValue placeholder={formData.curriculum ? "Select grade" : "Select curriculum first"} />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {availableLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Last Exam Performance */}
        <div>
          <Label htmlFor="lastExamPerformance">Last Exam Performance (Optional)</Label>
          <Textarea
            id="lastExamPerformance"
            value={formData.lastExamPerformance}
            onChange={(e) => setFormData({ ...formData, lastExamPerformance: e.target.value })}
            placeholder="e.g., Math: 65%, English: 78%, Science: 70%"
            rows={2}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Share your child's recent exam results to help create a more targeted plan
          </p>
        </div>

        {/* Subjects Selection */}
        <div className="space-y-2">
          <Label>Subjects Needed *</Label>
          {!formData.curriculum || !formData.gradeLevel ? (
            <div className="p-4 border rounded-md bg-muted/50 text-center text-sm text-muted-foreground">
              Please select curriculum and grade level first to see available subjects
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                {availableSubjects.map((subject) => (
                  <Badge
                    key={subject}
                    variant={selectedSubjects.includes(subject) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/20"
                    onClick={() => toggleSubject(subject)}
                  >
                    {subject}
                    {selectedSubjects.includes(subject) && (
                      <X className="w-3 h-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
              {selectedSubjects.length === 0 && (
                <p className="text-xs text-muted-foreground">Click to select subjects</p>
              )}
            </>
          )}
        </div>

        {/* Additional Details */}
        <div>
          <Label htmlFor="currentChallenges">Current Challenges & Goals (Optional)</Label>
          <Textarea
            id="currentChallenges"
            value={formData.currentChallenges}
            onChange={(e) => setFormData({ ...formData, currentChallenges: e.target.value })}
            placeholder="e.g., Struggling with algebra, needs help preparing for exams..."
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="preferredSessions">
            Preferred Number of Sessions (Optional)
          </Label>
          <Input
            id="preferredSessions"
            type="number"
            min="0"
            value={formData.preferredSessions || ""}
            onChange={(e) => setFormData({ ...formData, preferredSessions: parseInt(e.target.value) || 0 })}
            placeholder="Leave blank for tutor to recommend"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Not sure? Leave blank and {tutorName} will recommend based on your needs
          </p>
        </div>

        {/* Duration and Time Availability */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Learning Schedule</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="desiredDurationWeeks">
                Duration (weeks) *
              </Label>
              <Select
                value={formData.desiredDurationWeeks?.toString() || ""}
                onValueChange={(value) => setFormData({ ...formData, desiredDurationWeeks: parseInt(value) })}
                required
              >
                <SelectTrigger id="desiredDurationWeeks">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="2">2 weeks</SelectItem>
                  <SelectItem value="4">4 weeks (1 month)</SelectItem>
                  <SelectItem value="6">6 weeks</SelectItem>
                  <SelectItem value="8">8 weeks (2 months)</SelectItem>
                  <SelectItem value="12">12 weeks (3 months)</SelectItem>
                  <SelectItem value="16">16 weeks (4 months)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                How long you want tutoring to last
              </p>
            </div>

            <div>
              <Label htmlFor="availableTimePerWeek">
                Available Time Per Week
              </Label>
              <Select
                value={formData.availableTimePerWeek}
                onValueChange={(value) => setFormData({ ...formData, availableTimePerWeek: value })}
              >
                <SelectTrigger id="availableTimePerWeek">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="1-2 hours">1-2 hours/week</SelectItem>
                  <SelectItem value="3-4 hours">3-4 hours/week</SelectItem>
                  <SelectItem value="5-6 hours">5-6 hours/week</SelectItem>
                  <SelectItem value="7-8 hours">7-8 hours/week</SelectItem>
                  <SelectItem value="9-10 hours">9-10 hours/week</SelectItem>
                  <SelectItem value="10+ hours">10+ hours/week</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                How much time student has at home for tutoring
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={loading}
          >
            {loading ? (
              "Sending..."
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Request Learning Plan
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

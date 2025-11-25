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
    currentChallenges: "",
    preferredSessions: 0,
  });
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

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

  const gradeLevels = [
    "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
    "Grade 7", "Grade 8", "Grade 9", "Form 1", "Form 2", "Form 3", "Form 4",
    "AS Level", "A2 Level"
  ];

  const curricula = ["CBC", "8-4-4", "IGCSE", "British", "American"];

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

    if (!formData.parentName || !formData.parentEmail || !formData.studentName || !formData.gradeLevel) {
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
          challenges: formData.currentChallenges,
          preferredSessions: formData.preferredSessions,
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="gradeLevel">Grade Level *</Label>
              <Select
                value={formData.gradeLevel}
                onValueChange={(value) => setFormData({ ...formData, gradeLevel: value })}
                required
              >
                <SelectTrigger id="gradeLevel">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {gradeLevels.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="curriculum">Curriculum (Optional)</Label>
              <Select
                value={formData.curriculum}
                onValueChange={(value) => setFormData({ ...formData, curriculum: value })}
              >
                <SelectTrigger id="curriculum">
                  <SelectValue placeholder="Select curriculum" />
                </SelectTrigger>
                <SelectContent>
                  {curricula.map((curr) => (
                    <SelectItem key={curr} value={curr}>
                      {curr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Subjects Selection */}
        <div className="space-y-2">
          <Label>Subjects Needed *</Label>
          <div className="flex flex-wrap gap-2">
            {tutorSubjects.map((subject) => (
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

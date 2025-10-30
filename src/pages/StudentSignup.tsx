import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { validateAndNormalizePhone } from "@/utils/phoneValidation";

const CBC_SUBJECTS = [
  "Mathematics", "English", "Kiswahili", "Science", "Social Studies",
  "Religious Education", "Creative Arts", "Physical Education"
];

const CBC_SECONDARY_SUBJECTS = [
  "Mathematics", "English", "Kiswahili", "Physics", "Chemistry",
  "Biology", "History", "Geography", "Computer Science", "Business Studies",
  "Agriculture", "Home Science"
];

const IGCSE_SUBJECTS = [
  "Mathematics", "English Language", "English Literature", "Physics", "Chemistry",
  "Biology", "Combined Science", "History", "Geography", "Computer Science",
  "Business Studies", "Economics", "French", "Spanish", "Art & Design"
];

const CBC_GRADES = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9", "Form 1", "Form 2", "Form 3", "Form 4"
];

const IGCSE_GRADES = [
  "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6",
  "Year 7", "Year 8", "Year 9", "IGCSE Year 10", "IGCSE Year 11",
  "A-Level Year 12", "A-Level Year 13"
];

const LEARNING_STYLES = [
  "Visual (diagrams, videos)",
  "Auditory (listening, discussion)",
  "Reading/Writing (notes, books)",
  "Kinesthetic (hands-on, practice)"
];

const StudentSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phoneNumber: "",
    age: "",
    curriculum: "",
    gradeLevel: "",
    learningGoals: "",
    learningStyle: ""
  });

  const getSubjects = () => {
    if (!formData.curriculum) return [];
    if (formData.curriculum === "IGCSE") return IGCSE_SUBJECTS;
    
    // For CBC, show different subjects based on grade level
    const grade = formData.gradeLevel;
    if (grade && (grade.includes("Form") || grade === "Grade 7" || grade === "Grade 8" || grade === "Grade 9")) {
      return CBC_SECONDARY_SUBJECTS;
    }
    return CBC_SUBJECTS;
  };

  const getGrades = () => {
    if (formData.curriculum === "IGCSE") return IGCSE_GRADES;
    return CBC_GRADES;
  };

  const handleSubjectToggle = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/student/dashboard`,
        }
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Google sign-up failed",
        description: error.message,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedSubjects.length === 0) {
      toast({
        title: "Select at least one subject",
        description: "Please select subjects you need help with",
        variant: "destructive"
      });
      return;
    }

    // Validate and normalize phone number
    const phoneValidation = validateAndNormalizePhone(formData.phoneNumber);
    if (!phoneValidation.isValid) {
      toast({
        title: "Invalid phone number",
        description: phoneValidation.error,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.fullName
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No user data returned");

      // Create profile with normalized phone number
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          full_name: formData.fullName,
          phone_number: phoneValidation.normalized,
          age: parseInt(formData.age),
          curriculum: formData.curriculum,
          grade_level: formData.gradeLevel,
          subjects_struggling: selectedSubjects,
          learning_goals: formData.learningGoals,
          preferred_learning_style: formData.learningStyle
        });

      if (profileError) throw profileError;

      // Assign student role using secure database function
      const { error: roleError } = await supabase.rpc("assign_user_role", {
        _user_id: authData.user.id,
        _role: "student"
      });

      if (roleError) throw roleError;

      toast({
        title: "Welcome to Lana!",
        description: "Your account has been created successfully"
      });

      navigate("/student/dashboard");
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <Award className="w-10 h-10 text-primary" />
          <span className="text-3xl font-bold">Lana</span>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Start Your Learning Journey</CardTitle>
            <CardDescription>
              Tell us about yourself so we can connect you with the perfect tutor
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Google Sign-up */}
            <div className="mb-6">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                size="lg"
                onClick={handleGoogleSignup}
                disabled={isLoading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
              
              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-sm text-muted-foreground">
                  OR
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">Age *</Label>
                    <Input
                      id="age"
                      type="number"
                      min="5"
                      max="100"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="+254712345678 or 0712345678"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Accepts: +254, 254, or 0 prefix</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="curriculum">Curriculum *</Label>
                  <Select
                    value={formData.curriculum}
                    onValueChange={(value) => {
                      setFormData({ ...formData, curriculum: value, gradeLevel: "" });
                      setSelectedSubjects([]);
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select curriculum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CBC">CBC (Kenyan Curriculum)</SelectItem>
                      <SelectItem value="IGCSE">IGCSE (International)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.curriculum && (
                  <div className="space-y-2">
                    <Label htmlFor="gradeLevel">Grade/Year *</Label>
                    <Select
                      value={formData.gradeLevel}
                      onValueChange={(value) => setFormData({ ...formData, gradeLevel: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade/year" />
                      </SelectTrigger>
                      <SelectContent>
                        {getGrades().map(grade => (
                          <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Subjects */}
              {formData.curriculum && formData.gradeLevel && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">What subjects do you need help with? *</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {getSubjects().map((subject) => (
                      <div key={subject} className="flex items-center space-x-2">
                        <Checkbox
                          id={subject}
                          checked={selectedSubjects.includes(subject)}
                          onCheckedChange={() => handleSubjectToggle(subject)}
                        />
                        <Label htmlFor={subject} className="cursor-pointer">
                          {subject}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Learning Style */}
              <div className="space-y-2">
                <Label htmlFor="learningStyle">How do you learn best?</Label>
                <Select
                  value={formData.learningStyle}
                  onValueChange={(value) => setFormData({ ...formData, learningStyle: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select learning style" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEARNING_STYLES.map(style => (
                      <SelectItem key={style} value={style}>{style}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Goals */}
              <div className="space-y-2">
                <Label htmlFor="learningGoals">What are your learning goals?</Label>
                <Textarea
                  id="learningGoals"
                  placeholder="E.g., Improve my math grade, prepare for KCSE exams, understand difficult topics..."
                  value={formData.learningGoals}
                  onChange={(e) => setFormData({ ...formData, learningGoals: e.target.value })}
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? "Creating your account..." : "Create Account & Find Tutors"}
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentSignup;

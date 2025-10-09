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

const SUBJECTS = [
  "Mathematics", "English", "Kiswahili", "Physics", "Chemistry", 
  "Biology", "History", "Geography", "Computer Science", "Business Studies"
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
    gradeLevel: "",
    learningGoals: "",
    learningStyle: ""
  });

  const handleSubjectToggle = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
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

      // Create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          full_name: formData.fullName,
          phone_number: formData.phoneNumber,
          age: parseInt(formData.age),
          grade_level: formData.gradeLevel,
          subjects_struggling: selectedSubjects,
          learning_goals: formData.learningGoals,
          preferred_learning_style: formData.learningStyle
        });

      if (profileError) throw profileError;

      // Assign student role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "student"
        });

      if (roleError) throw roleError;

      toast({
        title: "Welcome to ElimuConnect!",
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
    <div className="min-h-screen bg-gradient-to-br from-secondary to-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <Award className="w-10 h-10 text-primary" />
          <span className="text-3xl font-bold">ElimuConnect</span>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Start Your Learning Journey</CardTitle>
            <CardDescription>
              Tell us about yourself so we can connect you with the perfect tutor
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                      placeholder="0712345678"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="gradeLevel">Grade/Class *</Label>
                    <Select
                      value={formData.gradeLevel}
                      onValueChange={(value) => setFormData({ ...formData, gradeLevel: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", 
                          "Grade 7", "Grade 8", "Form 1", "Form 2", "Form 3", "Form 4", "University"].map(grade => (
                          <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Subjects */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">What subjects do you need help with? *</h3>
                <div className="grid grid-cols-2 gap-3">
                  {SUBJECTS.map((subject) => (
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

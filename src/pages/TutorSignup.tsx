import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CBC_SUBJECTS = [
  "Mathematics", "English", "Kiswahili", "Science", "Social Studies",
  "Religious Education", "Creative Arts", "Physical Education",
  "Physics", "Chemistry", "Biology", "History", "Geography",
  "Computer Science", "Business Studies", "Agriculture", "Home Science"
];

const IGCSE_SUBJECTS = [
  "Mathematics", "English Language", "English Literature", "Physics", "Chemistry",
  "Biology", "Combined Science", "History", "Geography", "Computer Science",
  "Business Studies", "Economics", "French", "Spanish", "Art & Design"
];

const TutorSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedCurricula, setSelectedCurricula] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phoneNumber: "",
    hourlyRate: "",
    experienceYears: "",
    bio: "",
    qualifications: "",
    availability: ""
  });

  const handleSubjectToggle = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const handleCurriculumToggle = (curriculum: string) => {
    setSelectedCurricula(prev =>
      prev.includes(curriculum)
        ? prev.filter(c => c !== curriculum)
        : [...prev, curriculum]
    );
  };

  const getAvailableSubjects = () => {
    const subjects = new Set<string>();
    selectedCurricula.forEach(curriculum => {
      if (curriculum === "CBC") {
        CBC_SUBJECTS.forEach(s => subjects.add(s));
      } else if (curriculum === "IGCSE") {
        IGCSE_SUBJECTS.forEach(s => subjects.add(s));
      }
    });
    return Array.from(subjects).sort();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedSubjects.length === 0) {
      toast({
        title: "Select at least one subject",
        description: "Please select subjects you can teach",
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
          phone_number: formData.phoneNumber
        });

      if (profileError) throw profileError;

      // Create tutor profile
      const qualificationsArray = formData.qualifications
        .split(",")
        .map(q => q.trim())
        .filter(q => q);

      const { error: tutorProfileError } = await supabase
        .from("tutor_profiles")
        .insert({
          user_id: authData.user.id,
          subjects: selectedSubjects,
          curriculum: selectedCurricula,
          hourly_rate: parseFloat(formData.hourlyRate),
          experience_years: parseInt(formData.experienceYears),
          bio: formData.bio,
          qualifications: qualificationsArray,
          availability: formData.availability,
          verified: false
        });

      if (tutorProfileError) throw tutorProfileError;

      // Assign tutor role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "tutor"
        });

      if (roleError) throw roleError;

      toast({
        title: "Application submitted!",
        description: "Your profile is under review. We'll notify you once approved."
      });

      navigate("/tutor/dashboard");
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
            <CardTitle className="text-2xl">Become a Tutor</CardTitle>
            <CardDescription>
              Join our community of expert tutors and help students succeed
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
                    <Label htmlFor="phoneNumber">Phone Number *</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="0712345678"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
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
                </div>
              </div>

              {/* Teaching Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Teaching Details</h3>
                
                <div className="space-y-2">
                  <Label>Which Curricula Can You Teach? *</Label>
                  <div className="flex gap-6 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="CBC"
                        checked={selectedCurricula.includes("CBC")}
                        onCheckedChange={() => handleCurriculumToggle("CBC")}
                      />
                      <Label htmlFor="CBC" className="cursor-pointer font-normal">
                        CBC (Kenyan Curriculum)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="IGCSE"
                        checked={selectedCurricula.includes("IGCSE")}
                        onCheckedChange={() => handleCurriculumToggle("IGCSE")}
                      />
                      <Label htmlFor="IGCSE" className="cursor-pointer font-normal">
                        IGCSE (International)
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="experienceYears">Years of Experience *</Label>
                    <Input
                      id="experienceYears"
                      type="number"
                      min="0"
                      value={formData.experienceYears}
                      onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Hourly Rate (KES) *</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      min="0"
                      placeholder="500"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {selectedCurricula.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="subjects">Subjects You Can Teach *</Label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {getAvailableSubjects().map((subject) => (
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

                <div className="space-y-2">
                  <Label htmlFor="bio">About You *</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell students about your teaching style and experience..."
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qualifications">Qualifications (comma-separated) *</Label>
                  <Input
                    id="qualifications"
                    placeholder="e.g., B.Ed Mathematics, KCSE A-, Certified Trainer"
                    value={formData.qualifications}
                    onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="availability">Availability</Label>
                  <Input
                    id="availability"
                    placeholder="e.g., Weekdays 4-8pm, Weekends all day"
                    value={formData.availability}
                    onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? "Submitting application..." : "Submit Application"}
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

export default TutorSignup;

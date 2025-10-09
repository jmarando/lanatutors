import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Award, Upload } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedCurricula, setSelectedCurricula] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phoneNumber: "",
    hourlyRate: "",
    experienceYears: "",
    bio: "",
    qualifications: "",
    availability: "",
    currentInstitution: "",
    institutionYears: "",
    graduationYear: "",
    teachingLocation: "",
    specializations: "",
    tutoringExperience: "",
    referee1Name: "",
    referee1Phone: "",
    referee1Relation: "",
    referee2Name: "",
    referee2Phone: "",
    referee2Relation: "",
    referee3Name: "",
    referee3Phone: "",
    referee3Relation: "",
  });

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedTeachingModes, setSelectedTeachingModes] = useState<string[]>([]);
  const [teachingPositions, setTeachingPositions] = useState<Array<{institution: string, years: string, role: string}>>([
    { institution: "", years: "", role: "" }
  ]);


  const SERVICES = [
    'Extra Tuition', 'Exam Preparation', 'Homework Help', 
    'Problem-Solving Sessions', 'Revision Classes',
    'Essay Writing Support', 'Reading Comprehension'
  ];

  const TEACHING_MODES = ['Online Sessions', 'In-Person', 'Home Visits'];

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

  const handleServiceToggle = (service: string) => {
    setSelectedServices(prev =>
      prev.includes(service)
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  const handleTeachingModeToggle = (mode: string) => {
    setSelectedTeachingModes(prev =>
      prev.includes(mode)
        ? prev.filter(m => m !== mode)
        : [...prev, mode]
    );
  };

  const addTeachingPosition = () => {
    setTeachingPositions([...teachingPositions, { institution: "", years: "", role: "" }]);
  };

  const removeTeachingPosition = (index: number) => {
    setTeachingPositions(teachingPositions.filter((_, i) => i !== index));
  };

  const updateTeachingPosition = (index: number, field: string, value: string) => {
    const updated = [...teachingPositions];
    updated[index] = { ...updated[index], [field]: value };
    setTeachingPositions(updated);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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

      // Upload avatar if selected
      let avatarUrl = "";
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${authData.user.id}/avatar.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        
        avatarUrl = publicUrl;
      }

      // Create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          full_name: formData.fullName,
          phone_number: formData.phoneNumber,
          avatar_url: avatarUrl || null,
        });

      if (profileError) throw profileError;

      // Prepare referees data
      const referees = [
        {
          name: formData.referee1Name,
          phone: formData.referee1Phone,
          relation: formData.referee1Relation
        },
        {
          name: formData.referee2Name,
          phone: formData.referee2Phone,
          relation: formData.referee2Relation
        },
        {
          name: formData.referee3Name,
          phone: formData.referee3Phone,
          relation: formData.referee3Relation
        }
      ];

      // Create tutor profile
      const qualificationsArray = formData.qualifications
        .split(",")
        .map(q => q.trim())
        .filter(q => q);

      // Prepare teaching experience
      const teachingExperience = teachingPositions
        .filter(pos => pos.institution && pos.years && pos.role)
        .map(pos => ({
          institution: pos.institution,
          years: parseInt(pos.years),
          role: pos.role
        }));

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
          current_institution: formData.currentInstitution,
          institution_years: parseInt(formData.institutionYears) || null,
          graduation_year: formData.graduationYear ? parseInt(formData.graduationYear) : null,
          teaching_location: formData.teachingLocation || null,
          teaching_mode: selectedTeachingModes.length > 0 ? selectedTeachingModes : null,
          services_offered: selectedServices.length > 0 ? selectedServices : null,
          specializations: formData.specializations || null,
          teaching_experience: teachingExperience.length > 0 ? teachingExperience : null,
          tutoring_experience: formData.tutoringExperience || null,
          referees: referees,
          verified: false
        });

      if (tutorProfileError) throw tutorProfileError;

      // Assign tutor role using secure database function
      const { error: roleError } = await supabase.rpc("assign_user_role", {
        _user_id: authData.user.id,
        _role: "tutor"
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
                <div>
                  <h3 className="font-semibold text-lg">Basic Information</h3>
                  <p className="text-sm text-muted-foreground">This information will be visible on your public profile</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Profile Picture</Label>
                  <div className="flex items-center gap-4">
                    {avatarPreview && (
                      <img 
                        src={avatarPreview} 
                        alt="Avatar preview" 
                        className="w-20 h-20 rounded-full object-cover border-2"
                      />
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {avatarPreview ? "Change Picture" : "Upload Picture"}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>
                </div>

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
                <div>
                  <h3 className="font-semibold text-lg">Teaching Details</h3>
                  <p className="text-sm text-muted-foreground">This information will be visible on your public profile</p>
                </div>
                
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
                    <Label htmlFor="experienceYears">Total Years of Experience *</Label>
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

                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <h4 className="font-medium">Current Employment</h4>
                    <p className="text-xs text-muted-foreground">For verification purposes only - not shown publicly</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentInstitution">Current Institution *</Label>
                      <Input
                        id="currentInstitution"
                        placeholder="Where you currently teach"
                        value={formData.currentInstitution}
                        onChange={(e) => setFormData({ ...formData, currentInstitution: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="institutionYears">Years at Institution *</Label>
                      <Input
                        id="institutionYears"
                        type="number"
                        min="0"
                        value={formData.institutionYears}
                        onChange={(e) => setFormData({ ...formData, institutionYears: e.target.value })}
                        required
                      />
                    </div>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="graduationYear">Graduation Year</Label>
                    <Input
                      id="graduationYear"
                      type="number"
                      min="1980"
                      max={new Date().getFullYear()}
                      placeholder="2015"
                      value={formData.graduationYear}
                      onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teachingLocation">Teaching Location *</Label>
                    <Input
                      id="teachingLocation"
                      placeholder="e.g., Nairobi, Westlands"
                      value={formData.teachingLocation}
                      onChange={(e) => setFormData({ ...formData, teachingLocation: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Services Offered *</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {SERVICES.map((service) => (
                      <div key={service} className="flex items-center space-x-2">
                        <Checkbox
                          id={`service-${service}`}
                          checked={selectedServices.includes(service)}
                          onCheckedChange={() => handleServiceToggle(service)}
                        />
                        <Label htmlFor={`service-${service}`} className="cursor-pointer font-normal">
                          {service}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Teaching Mode *</Label>
                  <div className="flex gap-4 mt-2">
                    {TEACHING_MODES.map((mode) => (
                      <div key={mode} className="flex items-center space-x-2">
                        <Checkbox
                          id={`mode-${mode}`}
                          checked={selectedTeachingModes.includes(mode)}
                          onCheckedChange={() => handleTeachingModeToggle(mode)}
                        />
                        <Label htmlFor={`mode-${mode}`} className="cursor-pointer font-normal">
                          {mode}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specializations">Specializations & Topics</Label>
                  <Textarea
                    id="specializations"
                    placeholder="Describe specific topics or areas you specialize in..."
                    value={formData.specializations}
                    onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tutoringExperience">Private Tutoring Experience</Label>
                  <Textarea
                    id="tutoringExperience"
                    placeholder="Describe your experience with private tutoring..."
                    value={formData.tutoringExperience}
                    onChange={(e) => setFormData({ ...formData, tutoringExperience: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Teaching Experience Timeline</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addTeachingPosition}>
                      Add Position
                    </Button>
                  </div>
                  {teachingPositions.map((position, index) => (
                    <div key={index} className="grid grid-cols-3 gap-3 p-3 border rounded-lg">
                      <Input
                        placeholder="Institution"
                        value={position.institution}
                        onChange={(e) => updateTeachingPosition(index, 'institution', e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Years"
                        min="0"
                        value={position.years}
                        onChange={(e) => updateTeachingPosition(index, 'years', e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Input
                          placeholder="Role"
                          value={position.role}
                          onChange={(e) => updateTeachingPosition(index, 'role', e.target.value)}
                          className="flex-1"
                        />
                        {teachingPositions.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTeachingPosition(index)}
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
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

              {/* Referees Section */}
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <h3 className="font-semibold text-lg">Parent Referees</h3>
                  <p className="text-sm text-muted-foreground">For verification purposes only - not shown publicly. We may contact these parents to verify your teaching experience.</p>
                </div>
                
                <div className="space-y-3">
                  <Label className="font-medium">Referee 1 *</Label>
                  <Input
                    placeholder="Parent's Full Name"
                    value={formData.referee1Name}
                    onChange={(e) => setFormData({ ...formData, referee1Name: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Phone Number"
                    value={formData.referee1Phone}
                    onChange={(e) => setFormData({ ...formData, referee1Phone: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Child's name or relation"
                    value={formData.referee1Relation}
                    onChange={(e) => setFormData({ ...formData, referee1Relation: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label className="font-medium">Referee 2 *</Label>
                  <Input
                    placeholder="Parent's Full Name"
                    value={formData.referee2Name}
                    onChange={(e) => setFormData({ ...formData, referee2Name: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Phone Number"
                    value={formData.referee2Phone}
                    onChange={(e) => setFormData({ ...formData, referee2Phone: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Child's name or relation"
                    value={formData.referee2Relation}
                    onChange={(e) => setFormData({ ...formData, referee2Relation: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label className="font-medium">Referee 3 *</Label>
                  <Input
                    placeholder="Parent's Full Name"
                    value={formData.referee3Name}
                    onChange={(e) => setFormData({ ...formData, referee3Name: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Phone Number"
                    value={formData.referee3Phone}
                    onChange={(e) => setFormData({ ...formData, referee3Phone: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Child's name or relation"
                    value={formData.referee3Relation}
                    onChange={(e) => setFormData({ ...formData, referee3Relation: e.target.value })}
                    required
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

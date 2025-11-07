import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Upload, ArrowLeft, ArrowRight, CheckCircle, MapPin, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { SEO } from "@/components/SEO";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCurriculums, getLevelsForCurriculum, getSubjectsForCurriculumLevel } from "@/utils/curriculumData";
import { NAIROBI_LOCATIONS } from "@/utils/locationData";
import { validateAndNormalizePhone } from "@/utils/phoneValidation";
const TEACHING_MODES = ["Online", "In-Person"];

const TutorProfileSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    // Personal info
    fullName: "",
    email: "",
    phoneNumber: "",
    gender: "",
    // Privacy settings
    showFullName: true,
    showCurrentInstitution: true,
    showPhoto: true,
    // Bio & basic info
    bio: "",
    curriculum: [] as string[],
    customCurriculum: "",
    subjectsWithContext: [] as Array<{
      curriculum: string;
      level: string;
      subject: string;
    }>,
    teachingMode: [] as string[],
    hourlyRate: "",
    experienceYears: "",
    currentInstitution: "",
    qualifications: "",
    teachingLocations: [] as string[],
    package5Discount: "10",
    package10Discount: "15",
    doubleSessionDiscount: "5",
    // Education history
    educationHistory: [] as Array<{
      institution: string;
      degree: string;
      field: string;
      graduationYear: string;
    }>,
    // Teaching experience history
    teachingHistory: [] as Array<{
      institution: string;
      role: string;
      years: string;
    }>
  });

  // State for hierarchical curriculum/level/subject selection
  const [curriculumLevels, setCurriculumLevels] = useState<{
    [key: string]: string[];
  }>({});
  const [selectedCurriculumForSubjects, setSelectedCurriculumForSubjects] = useState("");
  const [selectedLevelForSubjects, setSelectedLevelForSubjects] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    fullName?: string;
    phoneNumber?: string;
  }>({});
  const curriculums = getCurriculums();
  const availableLevelsForSubjects = selectedCurriculumForSubjects ? getLevelsForCurriculum(selectedCurriculumForSubjects) : [];
  const availableSubjects = selectedCurriculumForSubjects && selectedLevelForSubjects ? getSubjectsForCurriculumLevel(selectedCurriculumForSubjects, selectedLevelForSubjects) : [];

  // Get all available subjects from selected curriculum-level combinations
  const allAvailableSubjects = Object.entries(curriculumLevels).flatMap(([curriculum, levels]) => levels.flatMap(level => getSubjectsForCurriculumLevel(curriculum, level).map(subject => ({
    curriculum,
    level,
    subject
  }))));

  // Derive subjects array from subjectsWithContext for display
  const derivedSubjects = Array.from(new Set(formData.subjectsWithContext.map(s => s.subject)));
  useEffect(() => {
    checkAuth();
  }, []);
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      setIsAuthenticated(false);
      return;
    }
    
    setIsAuthenticated(true);
    setUserId(session.user.id);

    // Get user's info from auth metadata or profile
    const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || "";
    const email = session.user.email || "";

    // Try to get from profiles table if not in metadata
    const {
      data: profile
    } = await supabase.from("profiles").select("full_name, phone_number").eq("id", session.user.id).single();

    // Pre-fill form data with existing info
    setFormData(prev => ({
      ...prev,
      fullName: fullName || profile?.full_name || "",
      email: email,
      phoneNumber: profile?.phone_number || ""
    }));
    setUserName(fullName || profile?.full_name || "");
    
    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsAuthenticated(true);
        checkAuth();
      } else {
        setIsAuthenticated(false);
        setUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  };
  const handleCurriculumToggle = (curriculum: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        curriculum: [...formData.curriculum, curriculum]
      });
    } else {
      // Don't allow unchecking "Other" if there's a custom curriculum entered
      if (curriculum === "Other" && formData.customCurriculum) {
        toast({
          title: "Clear custom curriculum first",
          description: "Please remove your custom curriculum text before unchecking 'Other'",
          variant: "destructive"
        });
        return;
      }
      setFormData({
        ...formData,
        curriculum: formData.curriculum.filter(c => c !== curriculum)
      });
      // Remove associated levels and subjects
      const newLevels = {
        ...curriculumLevels
      };
      delete newLevels[curriculum];
      setCurriculumLevels(newLevels);
      // Remove subjects from this curriculum
      setFormData(prev => ({
        ...prev,
        subjectsWithContext: prev.subjectsWithContext.filter(s => s.curriculum !== curriculum)
      }));
    }
  };
  const handleLevelToggle = (curriculum: string, level: string, checked: boolean) => {
    const currentLevels = curriculumLevels[curriculum] || [];
    if (checked) {
      setCurriculumLevels({
        ...curriculumLevels,
        [curriculum]: [...currentLevels, level]
      });
    } else {
      setCurriculumLevels({
        ...curriculumLevels,
        [curriculum]: currentLevels.filter(l => l !== level)
      });
      // Remove subjects from this curriculum-level combination
      setFormData(prev => ({
        ...prev,
        subjectsWithContext: prev.subjectsWithContext.filter(s => !(s.curriculum === curriculum && s.level === level))
      }));
    }
  };
  const addSubjectWithContext = (curriculum: string, level: string, subject: string) => {
    // Check if this exact combination already exists
    const exists = formData.subjectsWithContext.some(s => s.curriculum === curriculum && s.level === level && s.subject === subject);
    if (!exists) {
      setFormData({
        ...formData,
        subjectsWithContext: [...formData.subjectsWithContext, {
          curriculum,
          level,
          subject
        }]
      });
    }
  };
  const removeSubjectWithContext = (curriculum: string, level: string, subject: string) => {
    setFormData({
      ...formData,
      subjectsWithContext: formData.subjectsWithContext.filter(s => !(s.curriculum === curriculum && s.level === level && s.subject === subject))
    });
  };
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a photo smaller than 5MB",
          variant: "destructive"
        });
        return;
      }
      setPhotoFile(file);
    }
  };
  const validateStep1 = () => {
    const errors: {
      fullName?: string;
      phoneNumber?: string;
    } = {};

    // Validate full name
    if (formData.fullName.trim().length < 2) {
      errors.fullName = "Name must be at least 2 characters long";
    } else if (!/^[a-zA-Z\s'-]+$/.test(formData.fullName)) {
      errors.fullName = "Name should only contain letters, spaces, hyphens, and apostrophes";
    }

    // Validate phone number
    const phoneValidation = validateAndNormalizePhone(formData.phoneNumber);
    if (!phoneValidation.isValid) {
      errors.phoneNumber = phoneValidation.error || "Invalid phone number";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const handleContinueFromStep1 = () => {
    if (validateStep1()) {
      setStep(2);
    } else {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before continuing",
        variant: "destructive"
      });
    }
  };
  
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/tutor-profile-setup`,
          }
        });

        if (error) throw error;

        if (data.user) {
          // Create profile
          await supabase.from("profiles").insert({
            id: data.user.id,
            full_name: "",
          });

          // Assign tutor role
          await supabase.rpc('assign_user_role', {
            _user_id: data.user.id,
            _role: 'tutor'
          });

          toast({
            title: "Account created!",
            description: "Please complete your profile below."
          });
          
          setIsAuthenticated(true);
          checkAuth();
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });

        if (error) throw error;

        toast({
          title: "Signed in successfully!",
          description: "Complete your tutor profile below."
        });
        
        setIsAuthenticated(true);
        checkAuth();
      }
    } catch (error: any) {
      toast({
        title: authMode === "signup" ? "Signup failed" : "Sign in failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast({
        title: "Authentication error",
        description: "Please log in again",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      // Upload photo if provided
      let photoUrl = null;
      if (photoFile && formData.showPhoto) {
        const photoExt = photoFile.name.split('.').pop();
        const photoPath = `${userId}/profile-photo.${photoExt}`;
        const {
          error: photoError
        } = await supabase.storage.from('avatars').upload(photoPath, photoFile, {
          upsert: true
        });
        if (photoError) throw photoError;
        const {
          data: urlData
        } = supabase.storage.from('avatars').getPublicUrl(photoPath);
        photoUrl = urlData.publicUrl;
      }

      // Normalize phone number before saving
      const phoneValidation = validateAndNormalizePhone(formData.phoneNumber);

      // Create profile first
      const {
        error: profileError
      } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: formData.fullName,
        phone_number: phoneValidation.normalized,
        avatar_url: formData.showPhoto ? photoUrl : null,
        updated_at: new Date().toISOString()
      });
      if (profileError) throw profileError;

      // Build teaching levels from curriculum levels
      const teachingLevels = Object.entries(curriculumLevels).flatMap(([curriculum, levels]) => levels.map(level => `${curriculum} - ${level}`));

      // Build final curriculum array including custom curriculum
      const finalCurriculum = formData.curriculum.includes("Other") && formData.customCurriculum ? [...formData.curriculum.filter(c => c !== "Other"), formData.customCurriculum] : formData.curriculum;

      // Create tutor profile
      const {
        error: tutorError
      } = await supabase.from("tutor_profiles").insert({
        user_id: userId,
        bio: formData.bio,
        subjects: derivedSubjects,
        curriculum: finalCurriculum,
        teaching_mode: formData.teachingMode,
        teaching_levels: teachingLevels,
        hourly_rate: parseFloat(formData.hourlyRate),
        experience_years: parseInt(formData.experienceYears),
        current_institution: formData.currentInstitution,
        display_institution: formData.showCurrentInstitution,
        qualifications: formData.qualifications.split('\n').filter(q => q.trim()),
        teaching_location: formData.teachingLocations.join(', '),
        teaching_experience: formData.teachingHistory,
        graduation_year: formData.educationHistory[0]?.graduationYear ? parseInt(formData.educationHistory[0].graduationYear) : null,
        gender: formData.gender || null,
        verified: false // Requires admin approval
      });
      if (tutorError) throw tutorError;

      // Get the tutor profile ID
      const {
        data: tutorProfile
      } = await supabase.from("tutor_profiles").select("id").eq("user_id", userId).single();

      // Create package offers with auto-calculated prices based on selected discounts
      if (tutorProfile) {
        const packages = [];
        const hourlyRate = parseFloat(formData.hourlyRate);

        // 5-session bundle with custom discount
        const discount5 = parseFloat(formData.package5Discount) / 100;
        const price5 = Math.round(hourlyRate * 5 * (1 - discount5));
        packages.push({
          tutor_id: tutorProfile.id,
          name: "5-Session Bundle",
          description: "Perfect for consistent weekly learning",
          session_count: 5,
          total_price: price5,
          discount_percentage: parseFloat(formData.package5Discount),
          validity_days: 90,
          is_active: true,
          package_type: 'single_subject',
          max_students: 1
        });

        // 10-session bundle with custom discount
        const discount10 = parseFloat(formData.package10Discount) / 100;
        const price10 = Math.round(hourlyRate * 10 * (1 - discount10));
        packages.push({
          tutor_id: tutorProfile.id,
          name: "10-Session Bundle",
          description: "Best value for comprehensive mastery",
          session_count: 10,
          total_price: price10,
          discount_percentage: parseFloat(formData.package10Discount),
          validity_days: 90,
          is_active: true,
          package_type: 'single_subject',
          max_students: 1,
          is_featured: true
        });

        // Double session bundle (2 hours) with custom discount
        const discountDouble = parseFloat(formData.doubleSessionDiscount) / 100;
        const priceDouble = Math.round(hourlyRate * 2 * (1 - discountDouble));
        packages.push({
          tutor_id: tutorProfile.id,
          name: "Double Session",
          description: "2-hour intensive session",
          session_count: 1,
          total_price: priceDouble,
          discount_percentage: parseFloat(formData.doubleSessionDiscount),
          validity_days: 30,
          is_active: true,
          package_type: 'single_subject',
          max_students: 1
        });
        const {
          error: packageError
        } = await supabase.from("package_offers").insert(packages);
        if (packageError) console.error("Package creation error:", packageError);
      }

      // Assign tutor role
      const {
        error: roleError
      } = await supabase.rpc('assign_user_role', {
        _user_id: userId,
        _role: 'tutor'
      });
      if (roleError) console.error("Role assignment error:", roleError);
      toast({
        title: "Profile submitted!",
        description: "Your profile is under review. We'll notify you once it's approved."
      });
      navigate("/tutor-dashboard");
    } catch (error: any) {
      console.error("Profile submission error:", error);
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const progress = step / 4 * 100;
  
  // Show authentication form if not logged in
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[image:var(--gradient-page)] flex items-center justify-center p-6">
        <SEO title="Tutor Profile Setup - Lana" description="Sign up to set up your tutor profile on Lana" />
        
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Award className="w-10 h-10 text-primary" />
              <span className="text-3xl font-bold">Lana</span>
            </div>
            <CardTitle className="text-2xl">Welcome to Lana Tutors</CardTitle>
            <CardDescription>
              Sign in or create an account to set up your tutor profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                <TabsTrigger value="signin">Sign In</TabsTrigger>
              </TabsList>
              
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="auth-email">Email</Label>
                  <Input
                    id="auth-email"
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="auth-password">Password</Label>
                  <Input
                    id="auth-password"
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  {authMode === "signup" && (
                    <p className="text-xs text-muted-foreground">
                      Minimum 6 characters
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Loading..." : authMode === "signup" ? "Create Account" : "Sign In"}
                </Button>
              </form>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return <div className="min-h-screen bg-[image:var(--gradient-page)] flex items-center justify-center p-6">
      <SEO title="Complete Your Tutor Profile - Lana" description="Set up your tutor profile to start teaching on Lana" keywords="tutor profile setup, online teaching, Lana" />
      
      <div className="w-full max-w-7xl">

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <Card>
            <CardHeader>
              <div className="mb-4">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground mt-2">Step {step} of 4</p>
              </div>
              <CardTitle className="text-2xl">Complete Your Tutor Profile</CardTitle>
              <CardDescription>
                Set up your professional profile to start teaching on Lana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
              {step === 1 && <div className="space-y-6">
                  <h3 className="font-semibold text-lg">Personal Information</h3>
                  <p className="text-sm text-muted-foreground">
                    Let's start with your basic information. We may have some details already, but please verify or update them.
                  </p>
                  
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input id="fullName" value={formData.fullName} onChange={e => {
                      setFormData({
                        ...formData,
                        fullName: e.target.value
                      });
                      if (validationErrors.fullName) {
                        setValidationErrors({
                          ...validationErrors,
                          fullName: undefined
                        });
                      }
                    }} placeholder="John Doe" required className={validationErrors.fullName ? "border-destructive" : ""} />
                      {validationErrors.fullName && <p className="text-sm text-destructive">{validationErrors.fullName}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input id="email" type="email" value={formData.email} onChange={e => setFormData({
                      ...formData,
                      email: e.target.value
                    })} placeholder="john@example.com" required disabled />
                      <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number *</Label>
                      <Input id="phoneNumber" type="tel" value={formData.phoneNumber} onChange={e => {
                      setFormData({
                        ...formData,
                        phoneNumber: e.target.value
                      });
                      if (validationErrors.phoneNumber) {
                        setValidationErrors({
                          ...validationErrors,
                          phoneNumber: undefined
                        });
                      }
                    }} placeholder="+254 700 000 000" required className={validationErrors.phoneNumber ? "border-destructive" : ""} />
                      {validationErrors.phoneNumber && <p className="text-sm text-destructive">{validationErrors.phoneNumber}</p>}
                      <p className="text-xs text-muted-foreground">Format: +254XXXXXXXXX, 254XXXXXXXXX, or 0XXXXXXXXX</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender (Optional)</Label>
                      <Select value={formData.gender} onValueChange={value => setFormData({
                      ...formData,
                      gender: value
                    })}>
                        <SelectTrigger id="gender">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Some parents may have preferences</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-semibold">Privacy Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Control what information is visible on your public profile
                    </p>

                    <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                      <div className="flex items-start space-x-3">
                        <Checkbox id="showFullName" checked={formData.showFullName} onCheckedChange={checked => setFormData({
                        ...formData,
                        showFullName: checked as boolean
                      })} />
                        <div className="space-y-1">
                          <Label htmlFor="showFullName" className="cursor-pointer font-medium">
                            Show full name
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {formData.showFullName ? "Students will see your full name" : "Students will only see your first name"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Checkbox id="showCurrentInstitution" checked={formData.showCurrentInstitution} onCheckedChange={checked => setFormData({
                        ...formData,
                        showCurrentInstitution: checked as boolean
                      })} />
                        <div className="space-y-1">
                          <Label htmlFor="showCurrentInstitution" className="cursor-pointer font-medium">
                            Show current institution/school
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Display where you currently teach
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Checkbox id="showPhoto" checked={formData.showPhoto} onCheckedChange={checked => setFormData({
                        ...formData,
                        showPhoto: checked as boolean
                      })} />
                        <div className="space-y-1">
                          <Label htmlFor="showPhoto" className="cursor-pointer font-medium">
                            Display profile photo
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {formData.showPhoto ? "Recommended: Students can see your photo" : "Only initials will be shown"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-semibold">Profile Photo</h4>
                    <div className="flex items-start gap-4">
                      <Avatar className="w-20 h-20">
                        {photoFile ? <AvatarImage src={URL.createObjectURL(photoFile)} /> : <AvatarFallback className="text-xl">
                            {formData.fullName.split(' ').map(n => n[0]).join('').slice(0, 2) || "T"}
                          </AvatarFallback>}
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <Label>Upload Photo {formData.showPhoto && "*"}</Label>
                        <Button type="button" variant="outline" onClick={() => photoInputRef.current?.click()} disabled={!formData.showPhoto}>
                          <Upload className="mr-2 h-4 w-4" />
                          {photoFile ? "Change Photo" : "Upload Photo"}
                        </Button>
                        <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                        <p className="text-xs text-muted-foreground">
                          {formData.showPhoto ? "Profiles with photos perform better! Upload a professional photo (max 5MB)" : "Photo display is disabled in privacy settings"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>}

              {step === 2 && <div className="space-y-6">
                  <h3 className="font-semibold text-lg">Professional Background</h3>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bio">Professional Bio * (200-500 characters)</Label>
                      <Textarea id="bio" placeholder="Share your teaching background, methodology, and what makes you effective. Focus on your qualifications, experience, and teaching approach rather than personality traits." value={formData.bio} onChange={e => setFormData({
                      ...formData,
                      bio: e.target.value
                    })} rows={4} required maxLength={500} />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Example: "BSc Mathematics graduate with 5+ years teaching IGCSE and IB. Specialize in making calculus accessible through real-world applications."</span>
                        <span>{formData.bio.length}/500</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="experienceYears">Total Years of Teaching Experience *</Label>
                        <Input id="experienceYears" type="number" min="2" value={formData.experienceYears} onChange={e => setFormData({
                        ...formData,
                        experienceYears: e.target.value
                      })} required />
                        <p className="text-xs text-muted-foreground">Minimum 2 years required</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currentInstitution">Current Institution (Optional)</Label>
                        <Input id="currentInstitution" value={formData.currentInstitution} onChange={e => setFormData({
                        ...formData,
                        currentInstitution: e.target.value
                      })} placeholder="e.g., Alliance High School" />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-semibold">Education History</h4>
                    <p className="text-sm text-muted-foreground">Add your educational qualifications</p>
                    
                    {formData.educationHistory.map((edu, index) => <Card key={index} className="p-4">
                        <div className="grid gap-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Institution *</Label>
                              <Input value={edu.institution} onChange={e => {
                            const newHistory = [...formData.educationHistory];
                            newHistory[index].institution = e.target.value;
                            setFormData({
                              ...formData,
                              educationHistory: newHistory
                            });
                          }} placeholder="e.g., University of Nairobi" />
                            </div>
                            <div className="space-y-2">
                              <Label>Qualification/Degree *</Label>
                              <Input value={edu.degree} onChange={e => {
                            const newHistory = [...formData.educationHistory];
                            newHistory[index].degree = e.target.value;
                            setFormData({
                              ...formData,
                              educationHistory: newHistory
                            });
                          }} placeholder="e.g., Bachelor's, Master's, Diploma" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Subject Specialization *</Label>
                              <Input value={edu.field} onChange={e => {
                            const newHistory = [...formData.educationHistory];
                            newHistory[index].field = e.target.value;
                            setFormData({
                              ...formData,
                              educationHistory: newHistory
                            });
                          }} placeholder="e.g., Mathematics, English" />
                            </div>
                            <div className="space-y-2">
                              <Label>Graduation Year *</Label>
                              <Input type="number" value={edu.graduationYear} onChange={e => {
                            const newHistory = [...formData.educationHistory];
                            newHistory[index].graduationYear = e.target.value;
                            setFormData({
                              ...formData,
                              educationHistory: newHistory
                            });
                          }} placeholder="e.g., 2020" min="1950" max={new Date().getFullYear() + 10} />
                            </div>
                          </div>
                          {formData.educationHistory.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => {
                        const newHistory = formData.educationHistory.filter((_, i) => i !== index);
                        setFormData({
                          ...formData,
                          educationHistory: newHistory
                        });
                      }} className="text-destructive hover:text-destructive">
                              Remove
                            </Button>}
                        </div>
                      </Card>)}
                    
                    <Button type="button" variant="outline" onClick={() => {
                    setFormData({
                      ...formData,
                      educationHistory: [...formData.educationHistory, {
                        institution: "",
                        degree: "",
                        field: "",
                        graduationYear: ""
                      }]
                    });
                  }}>
                      + Add {formData.educationHistory.length > 0 ? "Another Degree" : "Education"}
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-semibold">Teaching Experience History</h4>
                    <p className="text-sm text-muted-foreground">Add your teaching positions</p>
                    
                    {formData.teachingHistory.map((exp, index) => <Card key={index} className="p-4">
                        <div className="grid gap-3">
                          <div className="space-y-2">
                            <Label>Institution *</Label>
                            <Input value={exp.institution} onChange={e => {
                          const newHistory = [...formData.teachingHistory];
                          newHistory[index].institution = e.target.value;
                          setFormData({
                            ...formData,
                            teachingHistory: newHistory
                          });
                        }} placeholder="e.g., Starehe Boys' Centre" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Role/Position *</Label>
                              <Input value={exp.role} onChange={e => {
                            const newHistory = [...formData.teachingHistory];
                            newHistory[index].role = e.target.value;
                            setFormData({
                              ...formData,
                              teachingHistory: newHistory
                            });
                          }} placeholder="e.g., Mathematics Teacher" />
                            </div>
                            <div className="space-y-2">
                              <Label>Years *</Label>
                              <Input type="number" value={exp.years} onChange={e => {
                            const newHistory = [...formData.teachingHistory];
                            newHistory[index].years = e.target.value;
                            setFormData({
                              ...formData,
                              teachingHistory: newHistory
                            });
                          }} placeholder="e.g., 3" min="0" />
                            </div>
                          </div>
                          {formData.teachingHistory.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => {
                        const newHistory = formData.teachingHistory.filter((_, i) => i !== index);
                        setFormData({
                          ...formData,
                          teachingHistory: newHistory
                        });
                      }} className="text-destructive hover:text-destructive">
                              Remove
                            </Button>}
                        </div>
                      </Card>)}
                    
                    <Button type="button" variant="outline" onClick={() => {
                    setFormData({
                      ...formData,
                      teachingHistory: [...formData.teachingHistory, {
                        institution: "",
                        role: "",
                        years: ""
                      }]
                    });
                  }}>
                      + Add {formData.teachingHistory.length > 0 ? "Another Position" : "Teaching Experience"}
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="qualifications">Professional certification/ Qualifications *</Label>
                    <Textarea id="qualifications" placeholder="TSC Certification
Cambridge IGCSE Teaching Certificate
IB Educator Certificate
TEFL/TESOL Certification" value={formData.qualifications} onChange={e => setFormData({
                    ...formData,
                    qualifications: e.target.value
                  })} rows={4} required />
                    <p className="text-xs text-muted-foreground">List teaching certifications and professional qualifications (degrees are captured above)</p>
                  </div>
                </div>}

              {step === 3 && <div className="space-y-6">
                  <h3 className="font-semibold text-lg">Subjects & Curriculum</h3>
                  <p className="text-sm text-muted-foreground">
                    First select curricula and levels you teach, then choose your subjects
                  </p>
                   
                  <div className="space-y-6">
                    {/* Step 1: Select Curricula */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">1. Select Curricula *</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {curriculums.map(curr => <div key={curr} className="flex items-center space-x-2">
                            <Checkbox id={`curriculum-${curr}`} checked={formData.curriculum.includes(curr)} onCheckedChange={checked => handleCurriculumToggle(curr, checked as boolean)} />
                            <Label htmlFor={`curriculum-${curr}`} className="cursor-pointer">{curr}</Label>
                          </div>)}
                        <div className="flex items-center space-x-2">
                          <Checkbox id="curriculum-Other" checked={formData.curriculum.includes("Other")} onCheckedChange={checked => handleCurriculumToggle("Other", checked as boolean)} />
                          <Label htmlFor="curriculum-Other" className="cursor-pointer">Other</Label>
                        </div>
                      </div>
                      
                      {formData.curriculum.includes("Other") && <div className="mt-3">
                          <Input placeholder="Enter curriculum name (e.g., ACE, French Baccalaureate)" value={formData.customCurriculum} onChange={e => setFormData({
                        ...formData,
                        customCurriculum: e.target.value
                      })} className="max-w-md" />
                        </div>}
                    </div>

                    {/* Step 2: Select Levels for each Curriculum */}
                    {formData.curriculum.length > 0 && <div className="space-y-3">
                        <Label className="text-base font-medium">2. Select Levels/Years for Each Curriculum *</Label>
                        <div className="space-y-3">
                          {formData.curriculum.map(curriculum => {
                        const levels = getLevelsForCurriculum(curriculum);
                        return <div key={curriculum} className="border rounded-lg p-4 space-y-3 bg-muted/20">
                                <p className="font-semibold text-sm">{curriculum}</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {levels.map(level => <div key={level.value} className="flex items-center space-x-2">
                                      <Checkbox id={`level-${curriculum}-${level.value}`} checked={curriculumLevels[curriculum]?.includes(level.value) || false} onCheckedChange={checked => handleLevelToggle(curriculum, level.value, checked as boolean)} />
                                      <Label htmlFor={`level-${curriculum}-${level.value}`} className="cursor-pointer text-sm">
                                        {level.label}
                                      </Label>
                                    </div>)}
                                </div>
                              </div>;
                      })}
                        </div>
                      </div>}

                    {/* Step 3: Select Subjects */}
                    {Object.keys(curriculumLevels).length > 0 && allAvailableSubjects.length > 0 && <div className="space-y-3">
                        <Label className="text-base font-medium">3. Select Subjects You Teach *</Label>
                        <p className="text-sm text-muted-foreground">
                          Choose subjects from your selected curriculum-level combinations
                        </p>
                        
                        <div className="border rounded-lg p-4 space-y-4 bg-muted/20 max-h-[400px] overflow-y-auto">
                          {Object.entries(curriculumLevels).map(([curriculum, levels]) => levels.map(level => {
                        const subjects = getSubjectsForCurriculumLevel(curriculum, level);
                        return <div key={`${curriculum}-${level}`} className="space-y-2">
                                  <p className="text-xs font-semibold text-muted-foreground sticky top-0 bg-muted/20 py-1">
                                    {curriculum} - {level}
                                  </p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {subjects.map(subject => {
                              const isSelected = formData.subjectsWithContext.some(s => s.curriculum === curriculum && s.level === level && s.subject === subject);
                              return <Button key={subject} type="button" variant={isSelected ? "default" : "outline"} size="sm" onClick={() => {
                                if (isSelected) {
                                  removeSubjectWithContext(curriculum, level, subject);
                                } else {
                                  addSubjectWithContext(curriculum, level, subject);
                                }
                              }} className="justify-start text-xs h-8">
                                          {subject}
                                        </Button>;
                            })}
                                  </div>
                                </div>;
                      }))}
                        </div>

                        {/* Selected Subjects Summary */}
                        <div className="space-y-2">
                          <Label>Selected Subjects ({formData.subjectsWithContext.length})</Label>
                          {formData.subjectsWithContext.length === 0 ? <div className="border rounded-lg p-4 bg-background">
                              <p className="text-sm text-muted-foreground text-center">
                                No subjects selected yet. Choose subjects above.
                              </p>
                            </div> : <div className="border rounded-lg p-4 space-y-3 bg-background">
                              {Object.entries(formData.subjectsWithContext.reduce((acc, s) => {
                          const key = `${s.curriculum} - ${s.level}`;
                          if (!acc[key]) acc[key] = [];
                          acc[key].push(s.subject);
                          return acc;
                        }, {} as {
                          [key: string]: string[];
                        })).map(([key, subjects]) => <div key={key} className="space-y-2">
                                  <p className="text-xs font-semibold text-muted-foreground">{key}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {subjects.map(subject => {
                              const [curriculum, level] = key.split(' - ');
                              return <Badge key={`${key}-${subject}`} variant="secondary" className="gap-2">
                                          {subject}
                                          <button type="button" onClick={() => removeSubjectWithContext(curriculum, level, subject)} className="hover:text-destructive">
                                            ×
                                          </button>
                                        </Badge>;
                            })}
                                  </div>
                                </div>)}
                            </div>}
                        </div>
                      </div>}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Teaching Mode *</Label>
                    <div className="space-y-2">
                      {TEACHING_MODES.map(mode => <div key={mode} className="flex items-center space-x-2">
                          <Checkbox id={mode} checked={formData.teachingMode.includes(mode)} onCheckedChange={checked => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            teachingMode: [...formData.teachingMode, mode]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            teachingMode: formData.teachingMode.filter(m => m !== mode)
                          });
                        }
                      }} />
                          <Label htmlFor={mode} className="cursor-pointer">{mode}</Label>
                        </div>)}
                    </div>
                  </div>


                  <div className="space-y-2">
                    <Label>Teaching Locations (required for in-person)</Label>
                    <p className="text-sm text-muted-foreground mb-2">Select all areas where you can teach</p>
                    <div className={`border rounded-lg p-4 bg-background max-h-[300px] overflow-y-auto space-y-2 ${!formData.teachingMode.includes("In-Person") ? "opacity-50" : ""}`}>
                      {NAIROBI_LOCATIONS.map(location => <div key={location} className="flex items-center space-x-2">
                          <Checkbox id={`location-${location}`} checked={formData.teachingLocations.includes(location)} disabled={!formData.teachingMode.includes("In-Person")} onCheckedChange={checked => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            teachingLocations: [...formData.teachingLocations, location]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            teachingLocations: formData.teachingLocations.filter(l => l !== location)
                          });
                        }
                      }} />
                          <Label htmlFor={`location-${location}`} className={`cursor-pointer text-sm ${!formData.teachingMode.includes("In-Person") ? "text-muted-foreground" : ""}`}>
                            {location}
                          </Label>
                        </div>)}
                    </div>
                    {!formData.teachingMode.includes("In-Person") && <p className="text-sm text-muted-foreground mt-2">
                        Enable "In-Person" teaching mode to select locations
                      </p>}
                    {formData.teachingLocations.length > 0 && <p className="text-sm text-muted-foreground mt-2">
                        Selected: {formData.teachingLocations.length} location{formData.teachingLocations.length > 1 ? 's' : ''}
                      </p>}
                  </div>
                </div>}

              {step === 4 && <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Rates & Additional Info</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Online Hourly Rate (KES) *</Label>
                    <Input id="hourlyRate" type="number" min="2000" max="6000" step="100" placeholder="3000" value={formData.hourlyRate} onChange={e => setFormData({
                    ...formData,
                    hourlyRate: e.target.value
                  })} required />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Range: KES 2,000 - 6,000. You'll earn 70% of this amount.
                      </p>
                      {formData.hourlyRate && <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                          <p className="text-xs font-medium">
                            In-person rate: KES {(parseFloat(formData.hourlyRate) * 1.5).toLocaleString()}/hr
                          </p>
                          <span className="text-xs text-muted-foreground">(50% higher)</span>
                        </div>}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-base font-semibold">Package Bundles (Optional)</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Choose discount percentages for your package bundles. We'll calculate the prices automatically.
                      </p>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/20">
                        <Label className="font-medium">5-Session Bundle</Label>
                        <div className="space-y-2">
                          <div>
                            <Label htmlFor="package5Discount" className="text-xs">Discount Percentage</Label>
                            <Select value={formData.package5Discount} onValueChange={value => setFormData({
                            ...formData,
                            package5Discount: value
                          })}>
                              <SelectTrigger id="package5Discount">
                                <SelectValue placeholder="Select discount" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5">5%</SelectItem>
                                <SelectItem value="10">10%</SelectItem>
                                <SelectItem value="15">15%</SelectItem>
                                <SelectItem value="20">20%</SelectItem>
                              </SelectContent>
                            </Select>
                            {formData.hourlyRate && formData.package5Discount && <p className="text-xs text-green-600 mt-1">
                                Total Price: KES {Math.round(parseFloat(formData.hourlyRate) * 5 * (1 - parseFloat(formData.package5Discount) / 100)).toLocaleString()}
                              </p>}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 p-4 border rounded-lg bg-muted/20">
                        <Label className="font-medium">10-Session Bundle</Label>
                        <div className="space-y-2">
                          <div>
                            <Label htmlFor="package10Discount" className="text-xs">Discount Percentage</Label>
                            <Select value={formData.package10Discount} onValueChange={value => setFormData({
                            ...formData,
                            package10Discount: value
                          })}>
                              <SelectTrigger id="package10Discount">
                                <SelectValue placeholder="Select discount" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="10">10%</SelectItem>
                                <SelectItem value="15">15%</SelectItem>
                                <SelectItem value="20">20%</SelectItem>
                                <SelectItem value="25">25%</SelectItem>
                              </SelectContent>
                            </Select>
                            {formData.hourlyRate && formData.package10Discount && <p className="text-xs text-green-600 mt-1">
                                Total Price: KES {Math.round(parseFloat(formData.hourlyRate) * 10 * (1 - parseFloat(formData.package10Discount) / 100)).toLocaleString()}
                              </p>}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground italic">
                      💡 Tip: Offering bundles increases student commitment and provides you with more predictable income!
                    </p>
                  </div>

                  <div className="space-y-3 pt-4">
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Package Bundles (Auto-generated)</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        We'll automatically create discounted packages based on your hourly rate to encourage bulk bookings.
                      </p>
                      
                      {formData.hourlyRate && <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center p-2 bg-background rounded">
                            <span>5-Session Bundle ({formData.package5Discount}% off)</span>
                            <span className="font-medium">KES {Math.round(parseFloat(formData.hourlyRate) * 5 * (1 - parseFloat(formData.package5Discount) / 100)).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-background rounded">
                            <span>10-Session Bundle ({formData.package10Discount}% off)</span>
                            <span className="font-medium">KES {Math.round(parseFloat(formData.hourlyRate) * 10 * (1 - parseFloat(formData.package10Discount) / 100)).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-background rounded">
                            <span>Double Session - 2hrs (5% off){formData.doubleSessionDiscount}% off)</span>
                            <span className="font-medium">KES {Math.round(parseFloat(formData.hourlyRate) * 2 * (1 - parseFloat(formData.doubleSessionDiscount) / 100)).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-muted-foreground italic mt-3">
                            💡 These packages apply to {formData.teachingMode.length === 2 ? "both online and in-person" : formData.teachingMode[0]?.toLowerCase() || "online"} sessions
                          </p>
                        </div>}
                    </div>
                  </div>
                </div>}


              <div className="flex justify-between gap-4 pt-4">
                {step > 1 && <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>}
                {step < 4 ? <Button type="button" onClick={() => {
                  if (step === 1) {
                    handleContinueFromStep1();
                  } else {
                    setStep(step + 1);
                  }
                }} className="ml-auto">
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button> : <Button type="submit" disabled={isLoading} className="ml-auto">
                    {isLoading ? "Submitting..." : "Submit Profile"}
                  </Button>}
              </div>
            </form>
              </CardContent>
            </Card>

            {/* Preview Section - Tutor Card */}
            <div className="space-y-4">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="text-lg">Search Card Preview</CardTitle>
                  <CardDescription>How you'll appear in "Find a Tutor" results</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Tutor Search Card Preview */}
                  <Card className="border-2 hover:border-primary/50 transition-all cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex gap-4 mb-4">
                        <Avatar className="w-16 h-16 shrink-0">
                          {formData.showPhoto && photoFile ? <AvatarImage src={URL.createObjectURL(photoFile)} /> : <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                              {formData.fullName.split(' ').map(n => n[0]).join('').slice(0, 2) || "T"}
                            </AvatarFallback>}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg mb-1 truncate">
                            {formData.showFullName ? formData.fullName || "Your Name" : formData.fullName.split(' ')[0] || "Your Name"}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                            {derivedSubjects.length > 0 ? derivedSubjects.join(", ") : "Your Subjects"}
                          </p>
                          {formData.showCurrentInstitution && formData.currentInstitution && <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{formData.currentInstitution}</span>
                            </div>}
                        </div>
                      </div>

                      {formData.bio && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {formData.bio}
                        </p>}

                      {formData.curriculum.length > 0 && <div className="flex flex-wrap gap-1 mb-4">
                          {formData.curriculum.slice(0, 3).map(curr => <Badge key={curr} variant="secondary" className="text-xs">
                              {curr}
                            </Badge>)}
                          {formData.curriculum.length > 3 && <Badge variant="secondary" className="text-xs">
                              +{formData.curriculum.length - 3}
                            </Badge>}
                        </div>}

                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                          <span className="font-semibold text-sm">New</span>
                        </div>
                        <div className="text-right">
                          {formData.hourlyRate && <>
                              <div className="font-bold text-lg">
                                KES {Number(formData.hourlyRate).toLocaleString()}
                                <span className="text-sm font-normal text-muted-foreground">/hr</span>
                              </div>
                              <span className="text-xs text-muted-foreground">online</span>
                            </>}
                          {!formData.hourlyRate && <span className="text-sm text-muted-foreground">Set rate in Step 4</span>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Separator className="my-4" />

                  {/* Profile Summary */}
                  <div className="space-y-2 text-xs bg-muted/30 p-3 rounded-lg">
                    <p className="font-semibold">Profile Summary:</p>
                    <ul className="space-y-1 ml-4">
                      <li>• {formData.experienceYears || "X"} years experience</li>
                      <li>• Teaching: {formData.teachingMode.join(" & ") || "Not set"}</li>
                      {formData.curriculum.length > 0 && <li>• Curricula: {formData.curriculum.join(", ")}</li>}
                      {formData.customCurriculum && <li>• Custom: {formData.customCurriculum}</li>}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>;
};
export default TutorProfileSetup;
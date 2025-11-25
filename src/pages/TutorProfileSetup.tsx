import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Upload, ArrowLeft, ArrowRight, CheckCircle, MapPin, Star, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCurriculums, getLevelsForCurriculum, getSubjectsForCurriculumLevel } from "@/utils/curriculumData";
import { NAIROBI_LOCATIONS } from "@/utils/locationData";
import { validateAndNormalizePhone } from "@/utils/phoneValidation";
import { getSuggestedRateRange, getRateGuidanceForSelections, formatRateRange } from "@/utils/rateGuidance";
import { z } from "zod";

const emailSchema = z.string().email({ message: "Please enter a valid email address" });
const TEACHING_MODES = ["Online", "In-Person"];

// Robust numeric parser: strips commas/spaces and returns 0 for invalid
const toNumber = (v: unknown): number => {
  if (typeof v === 'number') return v;
  if (v == null) return 0;
  const cleaned = String(v).replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

const TutorProfileSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, initialized } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingTutorId, setExistingTutorId] = useState<string | null>(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showAuthConfirmPassword, setShowAuthConfirmPassword] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoutTimerRef = useRef<number | null>(null);
  const hadSessionRef = useRef(false);
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
    // Per curriculum-level rates (key format: "curriculum-level")
    curriculumLevelRates: {} as { [key: string]: string },
    // Legacy field for backwards compatibility
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

  // Calculate average rate for package calculations
  const getAverageRate = () => {
    const rates = Object.values(formData.curriculumLevelRates).map(r => parseFloat(r)).filter(r => !isNaN(r) && r > 0);
    if (rates.length === 0) return 0;
    return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
  };

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
  const [touched, setTouched] = useState<{ fullName?: boolean; email?: boolean; phoneNumber?: boolean }>({});
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
    // Set up listener first with logout grace period
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Active session
        if (logoutTimerRef.current) {
          clearTimeout(logoutTimerRef.current);
          logoutTimerRef.current = null;
        }
        hadSessionRef.current = true;
        setIsAuthenticated(true);
        setUserId(session.user?.id ?? null);
        setIsAuthChecked(true);
      } else {
        // No session. If we've had a session before, enter grace period to avoid flicker
        if (hadSessionRef.current) {
          // Always reset (debounce) the logout timer to extend grace while reconnecting
          if (logoutTimerRef.current) {
            clearTimeout(logoutTimerRef.current);
          }
          logoutTimerRef.current = window.setTimeout(() => {
            setIsAuthenticated(false);
            setUserId(null);
            logoutTimerRef.current = null;
          }, 30000); // 30s grace period to ride out token refresh hiccups
        } else {
          // First load and no session
          setIsAuthenticated(false);
          setUserId(null);
          setIsAuthChecked(true);
        }
      }
    });

    // Then fetch existing session once
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        hadSessionRef.current = true;
        setIsAuthenticated(true);
        setUserId(session.user?.id ?? null);
      } else {
        setIsAuthenticated(false);
        setUserId(null);
      }
      setIsAuthChecked(true);
    });

    return () => {
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
      subscription.unsubscribe();
    };
  }, []);

  // Prefill profile details once authenticated, without overwriting touched fields
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || "";
      const email = user?.email || "";

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone_number")
        .eq("id", userId)
        .single();

      if (cancelled) return;

      setFormData(prev => ({
        ...prev,
        fullName: touched.fullName ? prev.fullName : (prev.fullName?.trim()?.length ? prev.fullName : (fullName || profile?.full_name || "")),
        email: touched.email ? prev.email : (prev.email?.trim()?.length ? prev.email : email),
        phoneNumber: touched.phoneNumber ? prev.phoneNumber : (prev.phoneNumber?.trim()?.length ? prev.phoneNumber : (profile?.phone_number || ""))
      }));
      setUserName(fullName || profile?.full_name || "");
    })();

    return () => { cancelled = true; };
  }, [userId, touched.fullName, touched.email, touched.phoneNumber]);

  // Load existing tutor profile data for editing
  useEffect(() => {
    if (!userId) {
      setIsCheckingProfile(false);
      return;
    }
    
    const loadExistingProfile = async () => {
      setIsCheckingProfile(true);
      const { data: existingTutor } = await supabase
        .from("tutor_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (existingTutor) {
        setIsEditMode(true);
        setExistingTutorId(existingTutor.id);
        
        // Load pricing tiers
        const { data: pricingTiers } = await supabase
          .from("tutor_pricing_tiers")
          .select("*")
          .eq("tutor_id", existingTutor.id);
        
        // Load tier assignments to reconstruct subjectsWithContext and curriculumLevels
        const { data: tierAssignments } = await supabase
          .from("curriculum_level_tier_assignments")
          .select("curriculum, level, tier_id")
          .eq("tutor_id", existingTutor.id);
        
        // Reconstruct curriculumLevels
        const reconstructedCurriculumLevels: { [key: string]: string[] } = {};
        const reconstructedSubjectsWithContext: Array<{
          curriculum: string;
          level: string;
          subject: string;
        }> = [];
        const reconstructedCurriculumLevelRates: { [key: string]: string } = {};
        
        if (tierAssignments && pricingTiers) {
          tierAssignments.forEach(assignment => {
            // Build curriculum levels map
            if (!reconstructedCurriculumLevels[assignment.curriculum]) {
              reconstructedCurriculumLevels[assignment.curriculum] = [];
            }
            if (!reconstructedCurriculumLevels[assignment.curriculum].includes(assignment.level)) {
              reconstructedCurriculumLevels[assignment.curriculum].push(assignment.level);
            }
            
            // Build curriculum-level rates from tier data
            const key = `${assignment.curriculum}-${assignment.level}`;
            const tierForThisCombo = pricingTiers.find(t => t.id === assignment.tier_id);
            if (tierForThisCombo) {
              reconstructedCurriculumLevelRates[key] = Math.round(Number(tierForThisCombo.online_hourly_rate)).toString();
            }
          });
        }
        
        // Reconstruct subjects from the subjects array in tutor_profiles
        if (existingTutor.subjects && Array.isArray(existingTutor.subjects)) {
          existingTutor.subjects.forEach((subject: string) => {
            // For each subject, find which curriculum-level combinations it belongs to
            Object.entries(reconstructedCurriculumLevels).forEach(([curriculum, levels]) => {
              levels.forEach(level => {
                reconstructedSubjectsWithContext.push({
                  curriculum,
                  level,
                  subject
                });
              });
            });
          });
        }
        
        setCurriculumLevels(reconstructedCurriculumLevels);
        
        // Populate form with existing data
        setFormData(prev => ({
          ...prev,
          bio: existingTutor.bio || "",
          curriculum: existingTutor.curriculum || [],
          teachingMode: existingTutor.teaching_mode || [],
          curriculumLevelRates: reconstructedCurriculumLevelRates,
          hourlyRate: existingTutor.hourly_rate ? Math.round(Number(existingTutor.hourly_rate)).toString() : "",
          experienceYears: existingTutor.experience_years?.toString() || "",
          currentInstitution: existingTutor.current_institution || "",
          showCurrentInstitution: existingTutor.display_institution ?? true,
          qualifications: Array.isArray(existingTutor.qualifications) 
            ? existingTutor.qualifications.join('\n') 
            : "",
          teachingLocations: existingTutor.teaching_location?.split(', ') || [],
          gender: existingTutor.gender || "",
          subjectsWithContext: reconstructedSubjectsWithContext,
          educationHistory: Array.isArray(existingTutor.education) && existingTutor.education.length > 0
            ? existingTutor.education.map((exp: any) => ({
                institution: exp.institution || "",
                degree: exp.degree || "",
                field: exp.field || "",
                graduationYear: exp.graduationYear || ""
              }))
            : [],
          teachingHistory: Array.isArray(existingTutor.teaching_experience) && existingTutor.teaching_experience.length > 0
            ? existingTutor.teaching_experience.map((exp: any) => ({
                institution: exp.institution || "",
                role: exp.role || "",
                years: exp.years || ""
              }))
            : [],
        }));

        // Set package discounts if they exist
        const { data: packages } = await supabase
          .from("package_offers")
          .select("*")
          .eq("tutor_id", existingTutor.id);
        
        if (packages) {
          const pkg5 = packages.find(p => p.session_count === 5);
          const pkg10 = packages.find(p => p.session_count === 10);
          const pkgDouble = packages.find(p => p.session_count === 1);
          
          setFormData(prev => ({
            ...prev,
            package5Discount: pkg5?.discount_percentage?.toString() || "10",
            package10Discount: pkg10?.discount_percentage?.toString() || "15",
            doubleSessionDiscount: pkgDouble?.discount_percentage?.toString() || "5",
          }));
        }
      }
      
      setIsCheckingProfile(false);
    };
    
    loadExistingProfile();
  }, [userId]);
  
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
        // Validate password match
        if (authPassword !== authConfirmPassword) {
          toast({
            title: "Password mismatch",
            description: "Passwords do not match",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

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
          
          // Auth state will update via onAuthStateChange
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });

        if (error) throw error;

        // Check if this is first login (user created less than 5 minutes ago with temp password)
        if (data.user) {
          const createdAt = new Date(data.user.created_at);
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          
          // If account was just created, prompt for password change
          if (createdAt > fiveMinutesAgo) {
            setShowChangePassword(true);
            toast({
              title: "Password Change Required",
              description: "Please set a new password for your account.",
            });
            return;
          }
        }

        toast({
          title: "Signed in successfully!",
          description: "Complete your tutor profile below."
        });
        
        // Auth state will update via onAuthStateChange
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (newPassword !== confirmNewPassword) {
        toast({
          title: "Password mismatch",
          description: "Passwords do not match",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      if (newPassword.length < 8) {
        toast({
          title: "Password too short",
          description: "Password must be at least 8 characters",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Password changed successfully!",
        description: "You can now complete your profile."
      });

      setShowChangePassword(false);
      setNewPassword("");
      setConfirmNewPassword("");
      
    } catch (error: any) {
      toast({
        title: "Password change failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/tutor-profile-setup`,
        }
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Google sign-in failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Reset email sent",
        description: "Check your email for password reset instructions"
      });
      setShowResetPassword(false);
      setResetEmail("");
    } catch (error: any) {
      toast({
        title: "Reset failed",
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

    // Validate email format before submission
    const emailValidation = emailSchema.safeParse(formData.email);
    if (!emailValidation.success) {
      toast({
        title: "Invalid email",
        description: emailValidation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }

    // Validate required fields
    if (!formData.fullName.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter your full name",
        variant: "destructive"
      });
      return;
    }

    if (!formData.phoneNumber.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter your phone number",
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

      // Create profile first - this ensures name and phone are saved
      const {
        error: profileError
      } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: formData.fullName.trim(),
        phone_number: phoneValidation.normalized,
        avatar_url: formData.showPhoto ? photoUrl : null,
        updated_at: new Date().toISOString()
      });
      if (profileError) throw profileError;

      // Build teaching levels from curriculum levels
      const teachingLevels = Object.entries(curriculumLevels).flatMap(([curriculum, levels]) => levels.map(level => `${curriculum} - ${level}`));

      // Build final curriculum array including custom curriculum
      const finalCurriculum = formData.curriculum.includes("Other") && formData.customCurriculum ? [...formData.curriculum.filter(c => c !== "Other"), formData.customCurriculum] : formData.curriculum;

      // Check if tutor profile already exists
      const { data: existingProfile } = await supabase
        .from("tutor_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      let tutorProfileId;
      let isNewProfile = !existingProfile;

      if (existingProfile) {
        // Update existing profile
        const { error: tutorError } = await supabase
          .from("tutor_profiles")
          .update({
            bio: formData.bio,
            subjects: derivedSubjects,
            curriculum: finalCurriculum,
            teaching_mode: formData.teachingMode,
            teaching_levels: teachingLevels,
            hourly_rate: Math.round(getAverageRate()), // Use average of all rates
            experience_years: parseInt(formData.experienceYears),
            current_institution: formData.currentInstitution,
            display_institution: formData.showCurrentInstitution,
            qualifications: formData.qualifications.split('\n').filter(q => q.trim()),
          teaching_location: formData.teachingLocations.join(', '),
          teaching_experience: formData.teachingHistory,
          education: formData.educationHistory,
          graduation_year: formData.educationHistory[0]?.graduationYear ? parseInt(formData.educationHistory[0].graduationYear) : null,
            gender: formData.gender || null,
            email: formData.email  // Add email to tutor profile
          })
          .eq("user_id", userId);
        
        if (tutorError) throw tutorError;
        tutorProfileId = existingProfile.id;

        // Delete existing pricing tiers and assignments for update
        await supabase.from("curriculum_level_tier_assignments").delete().eq("tutor_id", tutorProfileId);
        await supabase.from("tutor_pricing_tiers").delete().eq("tutor_id", tutorProfileId);
      } else {
        // Create new tutor profile
        const {
          data: newTutorProfile,
          error: tutorError
        } = await supabase.from("tutor_profiles").insert({
          user_id: userId,
          bio: formData.bio,
          subjects: derivedSubjects,
          curriculum: finalCurriculum,
          teaching_mode: formData.teachingMode,
          teaching_levels: teachingLevels,
          hourly_rate: Math.round(getAverageRate()), // Use average of all rates
          experience_years: parseInt(formData.experienceYears),
          current_institution: formData.currentInstitution,
          display_institution: formData.showCurrentInstitution,
          qualifications: formData.qualifications.split('\n').filter(q => q.trim()),
          teaching_location: formData.teachingLocations.join(', '),
          teaching_experience: formData.teachingHistory,
          education: formData.educationHistory,
          graduation_year: formData.educationHistory[0]?.graduationYear ? parseInt(formData.educationHistory[0].graduationYear) : null,
          gender: formData.gender || null,
          email: formData.email,  // Add email to tutor profile
          verified: false // Requires admin approval
        }).select('id').single();
        if (tutorError) throw tutorError;

        tutorProfileId = newTutorProfile.id;

        // Generate and update slug for new profile
        const { data: slugData } = await supabase.rpc('generate_tutor_slug', {
          full_name: formData.fullName,
          tutor_id: tutorProfileId
        });
        
        if (slugData) {
          await supabase.from('tutor_profiles')
            .update({ profile_slug: slugData })
            .eq('id', tutorProfileId);
        }
      }

      // Create pricing tiers - one per curriculum-level combination
      const tierInserts = Object.entries(curriculumLevels).flatMap(([curriculum, levels]) =>
        levels.map(level => {
          const key = `${curriculum}-${level}`;
          const rate = toNumber(formData.curriculumLevelRates[key]);
          
          return {
            tutor_id: tutorProfileId,
            tier_name: key, // Store curriculum-level as tier name
            online_hourly_rate: rate
          };
        })
      );

      const { data: tiers, error: tiersError } = await supabase
        .from("tutor_pricing_tiers")
        .insert(tierInserts)
        .select();
      
      if (tiersError) throw tiersError;

      // Create tier assignments linking each curriculum-level to its tier
      const assignments = Object.entries(curriculumLevels).flatMap(([curriculum, levels]) =>
        levels.map(level => {
          const key = `${curriculum}-${level}`;
          const tier = tiers.find(t => t.tier_name === key);
          
          return {
            tutor_id: tutorProfileId,
            curriculum,
            level,
            tier_id: tier?.id
          };
        })
      );

      if (assignments.length > 0) {
        const { error: assignmentsError } = await supabase
          .from("curriculum_level_tier_assignments")
          .insert(assignments);
        
        if (assignmentsError) throw assignmentsError;
      }

      // Get the tutor profile ID (use from above)
      const tutorProfile = { id: tutorProfileId };

      // Create package offers with auto-calculated prices based on selected discounts
      if (tutorProfile) {
        const packages = [];
        const baseRate = Math.round(getAverageRate()); // Use average rate for packages
        const MIN_PRICE_PER_SESSION = 500; // KES 500 minimum per session

        // 5-session bundle with custom discount
        const discount5 = toNumber(formData.package5Discount) / 100;
        const price5 = Math.round(baseRate * 5 * (1 - discount5));
        const pricePerSession5 = price5 / 5;
        
        if (pricePerSession5 < MIN_PRICE_PER_SESSION) {
          toast({
            title: "Invalid Package Pricing",
            description: `5-Session Bundle price is too low (KES ${pricePerSession5.toFixed(2)} per session). Minimum is KES ${MIN_PRICE_PER_SESSION} per session.`,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        packages.push({
          tutor_id: tutorProfile.id,
          name: "5-Session Bundle",
          description: "Perfect for consistent weekly learning",
          session_count: 5,
          total_price: price5,
          discount_percentage: toNumber(formData.package5Discount),
          validity_days: 90,
          is_active: true,
          package_type: 'single_subject',
          max_students: 1
        });

        // 10-session bundle with custom discount
        const discount10 = toNumber(formData.package10Discount) / 100;
        const price10 = Math.round(baseRate * 10 * (1 - discount10));
        const pricePerSession10 = price10 / 10;
        
        if (pricePerSession10 < MIN_PRICE_PER_SESSION) {
          toast({
            title: "Invalid Package Pricing",
            description: `10-Session Bundle price is too low (KES ${pricePerSession10.toFixed(2)} per session). Minimum is KES ${MIN_PRICE_PER_SESSION} per session.`,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        packages.push({
          tutor_id: tutorProfile.id,
          name: "10-Session Bundle",
          description: "Best value for comprehensive mastery",
          session_count: 10,
          total_price: price10,
          discount_percentage: toNumber(formData.package10Discount),
          validity_days: 90,
          is_active: true,
          package_type: 'single_subject',
          max_students: 1,
          is_featured: true
        });

        // Double session bundle (2 hours) with custom discount
        const discountDouble = toNumber(formData.doubleSessionDiscount) / 100;
        const priceDouble = Math.round(baseRate * 2 * (1 - discountDouble));
        const pricePerSessionDouble = priceDouble / 1; // 1 session of 2 hours
        
        if (pricePerSessionDouble < MIN_PRICE_PER_SESSION) {
          toast({
            title: "Invalid Package Pricing",
            description: `Double Session price is too low (KES ${pricePerSessionDouble.toFixed(2)} per session). Minimum is KES ${MIN_PRICE_PER_SESSION} per session.`,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        packages.push({
          tutor_id: tutorProfile.id,
          name: "Double Session",
          description: "2-hour intensive session",
          session_count: 1,
          total_price: priceDouble,
          discount_percentage: toNumber(formData.doubleSessionDiscount),
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
      
      // Only send email and redirect for new submissions
      if (isNewProfile) {
        // Send confirmation email
        try {
          const { data: slugData } = await supabase.rpc('generate_tutor_slug', {
            full_name: formData.fullName,
            tutor_id: tutorProfileId
          });

          await supabase.functions.invoke('send-tutor-submission-confirmation', {
            body: {
              tutorName: formData.fullName,
              email: formData.email,
              profileSlug: slugData || tutorProfileId
            }
          });
        } catch (emailError) {
          console.error("Email sending error:", emailError);
          // Don't block submission if email fails
        }

        toast({
          title: "Profile submitted!",
          description: "Check your email for confirmation and next steps."
        });
        navigate("/tutor-profile-submitted");
      } else {
        // For updates, also go to submitted page
        toast({
          title: "Profile updated!",
          description: "Your changes have been saved successfully."
        });
        navigate("/tutor-profile-submitted");
      }
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
  
  // Auth gating
  if (!isAuthChecked) {
    return (
      <div className="min-h-screen bg-[image:var(--gradient-page)] flex items-center justify-center p-6">
        <SEO title="Tutor Profile Setup - Loading" description="Checking your session" />
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Loading</CardTitle>
            <CardDescription>Checking your session…</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  // Show authentication form if not logged in (but keep setup if we previously had a session)
  if (!isAuthenticated && !hadSessionRef.current) {
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
                  <div className="relative">
                    <Input
                      id="auth-password"
                      type={showAuthPassword ? "text" : "password"}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowAuthPassword(!showAuthPassword)}
                    >
                      {showAuthPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {authMode === "signup" && (
                    <p className="text-xs text-muted-foreground">
                      Minimum 6 characters
                    </p>
                  )}
                </div>

                {authMode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="auth-confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="auth-confirm-password"
                        type={showAuthConfirmPassword ? "text" : "password"}
                        value={authConfirmPassword}
                        onChange={(e) => setAuthConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowAuthConfirmPassword(!showAuthConfirmPassword)}
                      >
                        {showAuthConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Loading..." : authMode === "signup" ? "Create Account" : "Sign In"}
                </Button>

                {authMode === "signin" && (
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm"
                      onClick={() => setShowResetPassword(true)}
                    >
                      Forgot password?
                    </Button>
                  </div>
                )}
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>
            </Tabs>

            <Dialog open={showResetPassword} onOpenChange={setShowResetPassword}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset Password</DialogTitle>
                  <DialogDescription>
                    Enter your email address and we'll send you a password reset link
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Your Password</DialogTitle>
                  <DialogDescription>
                    For security, please set a new password for your account
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={8}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Minimum 8 characters
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-new-password"
                        type={showConfirmNewPassword ? "text" : "password"}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={8}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      >
                        {showConfirmNewPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Changing Password..." : "Change Password"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
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
              {isCheckingProfile ? (
                <div className="space-y-2">
                  <div className="h-8 bg-muted animate-pulse rounded" />
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                </div>
              ) : (
                <>
                  <CardTitle className="text-2xl">
                    {isEditMode ? "Edit Your Tutor Profile" : "Complete Your Tutor Profile"}
                  </CardTitle>
                  <CardDescription>
                    {isEditMode 
                      ? "Update your professional profile and teaching information" 
                      : "Set up your professional profile to start teaching on Lana"}
                  </CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                // ALWAYS prevent default form submission
                e.preventDefault();
                // Form submission is only handled via explicit button clicks
              }} className="space-y-6">
              {step === 1 && <div className="space-y-6">
                  <h3 className="font-semibold text-lg">About You</h3>
                  <p className="text-sm text-muted-foreground">
                    Tell us about your background and education
                  </p>
                  
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input 
                        id="fullName" 
                        type="text"
                        value={formData.fullName} 
                        onChange={e => {
                          setFormData({
                            ...formData,
                            fullName: e.target.value
                          });
                          setTouched(prev => ({ ...prev, fullName: true }));
                          if (validationErrors.fullName) {
                            setValidationErrors({
                              ...validationErrors,
                              fullName: undefined
                            });
                          }
                        }} 
                        placeholder="John Doe" 
                        required 
                        className={validationErrors.fullName ? "border-destructive" : ""} 
                      />
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
                        setTouched(prev => ({ ...prev, phoneNumber: true }));
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
                      <Label htmlFor="gender">Gender</Label>
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
                    <h4 className="font-semibold">Teaching Experience History</h4>
                    <p className="text-sm text-muted-foreground">Add your teaching positions</p>
                    
                    {formData.teachingHistory.map((exp, index) => <Card key={index} className="p-4">
                        <div className="grid gap-3">
                          <div className="space-y-2">
                            <Label>Institution/School *</Label>
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
                              <Label>Degree *</Label>
                              <Input value={edu.degree} onChange={e => {
                            const newHistory = [...formData.educationHistory];
                            newHistory[index].degree = e.target.value;
                            setFormData({
                              ...formData,
                              educationHistory: newHistory
                            });
                          }} placeholder="e.g., Bachelor of Education (Science)" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Field of Study *</Label>
                              <Input value={edu.field} onChange={e => {
                            const newHistory = [...formData.educationHistory];
                            newHistory[index].field = e.target.value;
                            setFormData({
                              ...formData,
                              educationHistory: newHistory
                            });
                          }} placeholder="e.g., Mathematics" />
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
                          }} placeholder="e.g., 2018" min="1950" max={new Date().getFullYear()} />
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
                        degree: "",
                        institution: "",
                        graduationYear: "",
                        field: ""
                      }]
                    });
                  }}>
                      + Add Education
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

              {step === 2 && <div className="space-y-6">
                  <h3 className="font-semibold text-lg">What You Teach</h3>
                  <p className="text-sm text-muted-foreground">
                    Select your curriculum, levels, and subjects
                  </p>

                  {/* Curriculum Selection */}
                  <div className="space-y-3">
                    <Label className="font-medium">Select Curriculum *</Label>
                    <div className="border rounded-lg p-3 bg-background space-y-2">
                      {curriculums.map(curriculum => <div key={curriculum} className="flex items-center space-x-2">
                          <Checkbox id={curriculum} checked={formData.curriculum.includes(curriculum)} onCheckedChange={checked => handleCurriculumToggle(curriculum, checked as boolean)} />
                          <Label htmlFor={curriculum} className="cursor-pointer font-normal">{curriculum}</Label>
                        </div>)}
                    </div>
                    {formData.curriculum.includes("Other") && <div className="space-y-2 pl-6">
                        <Label htmlFor="customCurriculum">Specify Custom Curriculum</Label>
                        <Input id="customCurriculum" value={formData.customCurriculum} onChange={e => setFormData({
                        ...formData,
                        customCurriculum: e.target.value
                      })} placeholder="e.g., American Curriculum" />
                      </div>}
                  </div>

                  {/* Level Selection for each curriculum */}
                  {formData.curriculum.filter(c => c !== "Other").map(curriculum => {
                  const levels = getLevelsForCurriculum(curriculum);
                  return <div key={curriculum} className="space-y-3 p-3 border rounded-lg bg-muted/10">
                        <Label className="font-medium">{curriculum} - Select Levels *</Label>
                        <div className="space-y-2 pl-2">
                          {levels.map(level => {
                            const levelStr = typeof level === 'string' ? level : level.value || level.label;
                            return <div key={levelStr} className="flex items-center space-x-2">
                              <Checkbox id={`${curriculum}-${levelStr}`} checked={(curriculumLevels[curriculum] || []).includes(levelStr)} onCheckedChange={checked => handleLevelToggle(curriculum, levelStr, checked as boolean)} />
                              <Label htmlFor={`${curriculum}-${levelStr}`} className="cursor-pointer font-normal text-sm">{levelStr}</Label>
                            </div>;
                          })}
                        </div>
                      </div>;
                })}

                  {/* Subject Selection - Simplified */}
                  {Object.keys(curriculumLevels).length > 0 && <div className="space-y-3 border rounded-lg p-4 bg-primary/5">
                    <Label className="font-medium">Select Subjects *</Label>
                    <p className="text-sm text-muted-foreground">Choose subjects for each curriculum-level combination</p>
                    
                    {allAvailableSubjects.length > 0 && <div className="space-y-3">
                      {Object.entries(
                        allAvailableSubjects.reduce((acc, item) => {
                          const key = `${item.curriculum}-${item.level}`;
                          if (!acc[key]) {
                            acc[key] = {
                              curriculum: item.curriculum,
                              level: item.level,
                              subjects: []
                            };
                          }
                          if (!acc[key].subjects.includes(item.subject)) {
                            acc[key].subjects.push(item.subject);
                          }
                          return acc;
                        }, {} as Record<string, { curriculum: string; level: string; subjects: string[] }>)
                      ).map(([key, { curriculum, level, subjects }]) => (
                        <div key={key} className="border rounded-lg p-3 bg-background space-y-2">
                          <div className="font-medium text-sm">{curriculum} - {level}</div>
                          <div className="grid grid-cols-2 gap-2 pl-2">
                            {subjects.map(subject => {
                              const isAdded = formData.subjectsWithContext.some(
                                s => s.curriculum === curriculum && s.level === level && s.subject === subject
                              );
                              return <div key={subject} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`${key}-${subject}`} 
                                  checked={isAdded} 
                                  onCheckedChange={checked => {
                                    if (checked) {
                                      addSubjectWithContext(curriculum, level, subject);
                                    } else {
                                      removeSubjectWithContext(curriculum, level, subject);
                                    }
                                  }} 
                                />
                                <Label htmlFor={`${key}-${subject}`} className="cursor-pointer text-sm">{subject}</Label>
                              </div>;
                            })}
                          </div>
                        </div>
                      ))}
                    </div>}
                  </div>}

                  {/* Selected Subjects Summary */}
                  {formData.subjectsWithContext.length > 0 && <div className="space-y-2 p-4 border-2 rounded-lg bg-primary/10 border-primary/20">
                      <Label className="font-semibold">✓ Selected Subjects ({formData.subjectsWithContext.length})</Label>
                      <div className="flex flex-wrap gap-2">
                        {formData.subjectsWithContext.map((s, idx) => <Badge key={idx} variant="secondary" className="text-xs">
                            {s.subject} ({s.curriculum} - {s.level})
                            <button type="button" onClick={() => removeSubjectWithContext(s.curriculum, s.level, s.subject)} className="ml-1.5 hover:text-destructive font-bold">
                              ×
                            </button>
                          </Badge>)}
                      </div>
                    </div>}

                </div>}

              {step === 3 && <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-lg">Your Pricing</h3>
                    <p className="text-sm text-muted-foreground">
                      Set your rates and package discounts
                    </p>
                  </div>

                  {/* Pricing Explainer */}
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
                      <span className="text-lg">💡</span> How to Set Your Rates
                    </h4>
                    <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                      <p>
                        You'll set a separate hourly rate for each curriculum-level combination you teach (e.g., CBC Upper Primary, IGCSE, A-Levels).
                      </p>
                      <p>
                        We provide recommended rate ranges based on market standards for each level. You're free to set your own rates, but staying within these ranges helps maintain competitive pricing.
                      </p>
                      <p className="font-medium pt-2 border-t border-blue-200 dark:border-blue-800">
                        💰 Platform earnings: You take home 70% of each session rate. In-person rates are typically 1.5x online rates.
                      </p>
                    </div>
                  </div>

                  {/* Rate Guidance Info */}
                  {Object.keys(curriculumLevels).length > 0 && (
                    <div className="border rounded-lg p-4 space-y-3 bg-blue-50 dark:bg-blue-950/20">
                      <div className="flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400 text-lg">💡</span>
                        <div className="space-y-2 flex-1">
                          <p className="font-medium text-sm text-blue-900 dark:text-blue-100">
                            Rate Guidance for Your Selected Subjects
                          </p>
                          <div className="space-y-2 text-xs">
                            {Object.entries(curriculumLevels).map(([curriculum, levels]) =>
                              levels.map(level => {
                                const guidanceMap = getRateGuidanceForSelections(
                                  { [curriculum]: [level] },
                                  TEACHING_MODES
                                );
                                const key = `${curriculum}-${level}`;
                                const guidance = guidanceMap.get(key);
                                
                                if (!guidance || (!guidance.online && !guidance.inPerson)) return null;
                                
                                return (
                                  <div key={key} className="border-l-2 border-blue-300 dark:border-blue-700 pl-3 py-1">
                                    <p className="font-medium text-blue-900 dark:text-blue-100">
                                      {curriculum} - {level}
                                    </p>
                                    {guidance.online && (
                                      <p className="text-blue-700 dark:text-blue-300">
                                        Online: {formatRateRange(guidance.online)}
                                      </p>
                                    )}
                                    {guidance.inPerson && (
                                      <p className="text-blue-700 dark:text-blue-300">
                                        In-person: {formatRateRange(guidance.inPerson)}
                                      </p>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                          <p className="text-xs text-blue-700 dark:text-blue-300 italic mt-2">
                            These are recommended ranges based on your curriculum and level selections. You can set your own rates, but staying within these ranges helps maintain competitive pricing.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}


                  {/* Per Curriculum-Level Rate Inputs */}
                  {Object.keys(curriculumLevels).length > 0 ? (
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4 space-y-3 bg-blue-50 dark:bg-blue-950/20">
                        <div className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400 text-lg">💡</span>
                          <div className="space-y-1 flex-1">
                            <p className="font-medium text-sm text-blue-900 dark:text-blue-100">
                              Set Your Hourly Rate for Each Level
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              Set rates based on the recommended ranges below. Rates shown are for online sessions. In-person sessions are typically 1.5x higher.
                            </p>
                          </div>
                        </div>
                      </div>

                      {Object.entries(curriculumLevels).map(([curriculum, levels]) =>
                        levels.map(level => {
                          const key = `${curriculum}-${level}`;
                          const guidanceMap = getRateGuidanceForSelections(
                            { [curriculum]: [level] },
                            TEACHING_MODES
                          );
                          const guidance = guidanceMap.get(key);
                          const currentRate = parseFloat(formData.curriculumLevelRates[key] || '');
                          
                          // Determine if rate is out of range
                          let isOutOfRange = false;
                          let suggestedMin = 0;
                          let suggestedMax = 0;
                          
                          if (guidance) {
                            const ranges = [guidance.online, guidance.inPerson].filter(Boolean);
                            if (ranges.length > 0) {
                              suggestedMin = Math.min(...ranges.map(r => r!.min));
                              suggestedMax = Math.max(...ranges.map(r => r!.max));
                              isOutOfRange = currentRate > 0 && (currentRate < suggestedMin || currentRate > suggestedMax);
                            }
                          }

                          return (
                            <div key={key} className="border rounded-lg p-4 space-y-3 bg-background">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <Label className="font-medium text-base">{curriculum} - {level}</Label>
                                    <p className="text-xs text-muted-foreground mt-0.5">Online hourly rate</p>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {guidance?.online && guidance?.inPerson 
                                      ? 'Online & In-person' 
                                      : guidance?.online 
                                        ? 'Online Only' 
                                        : 'In-person Only'}
                                  </Badge>
                                </div>
                                
                                {/* Recommended Range Display */}
                                {guidance && (guidance.online || guidance.inPerson) && (
                                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded p-3 space-y-1">
                                    <p className="text-xs font-medium text-green-900 dark:text-green-100">
                                      💰 Recommended Rate Range
                                    </p>
                                    {guidance.online && (
                                      <p className="text-sm text-green-700 dark:text-green-300">
                                        <strong>Online:</strong> {formatRateRange(guidance.online)} per hour
                                      </p>
                                    )}
                                    {guidance.inPerson && (
                                      <p className="text-sm text-green-700 dark:text-green-300">
                                        <strong>In-person:</strong> {formatRateRange(guidance.inPerson)} per hour
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                {/* Rate Input */}
                                <div className="space-y-2">
                                  <Label htmlFor={`rate-${key}`}>Your Online Rate (KES) *</Label>
                                  <Input
                                    id={`rate-${key}`}
                                    type="number"
                                    min="500"
                                    max="10000"
                                    step="100"
                                    placeholder="e.g., 1500"
                                    value={formData.curriculumLevelRates[key] || ''}
                                    onChange={e => {
                                      const cleaned = e.target.value.replace(/[^0-9.]/g, "");
                                      setFormData(prev => ({
                                        ...prev,
                                        curriculumLevelRates: {
                                          ...prev.curriculumLevelRates,
                                          [key]: cleaned
                                        }
                                      }));
                                    }}
                                    required
                                    className={isOutOfRange ? 'border-amber-500' : ''}
                                  />
                                  
                                  {suggestedMin > 0 && suggestedMax > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                      Suggested: KES {suggestedMin.toLocaleString()} – {suggestedMax.toLocaleString()}
                                    </p>
                                  )}
                                  
                                  {isOutOfRange && (
                                    <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded">
                                      <span className="text-amber-600 dark:text-amber-400 text-sm">⚠️</span>
                                      <p className="text-xs text-amber-700 dark:text-amber-300">
                                        Your rate is outside the recommended range. This may affect student bookings. Consider adjusting to stay competitive.
                                      </p>
                                    </div>
                                  )}
                                  
                                  {currentRate > 0 && (
                                    <div className="space-y-1 pt-1">
                                      <p className="text-xs text-muted-foreground">
                                        💵 In-person rate: KES {Math.round(currentRate * 1.5).toLocaleString()}/hr
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        💰 You earn (70%): KES {Math.round(currentRate * 0.7).toLocaleString()}/hr
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    <Alert>
                      <AlertDescription>
                        Please select your curriculum, levels, and teaching mode in the previous step to set your rates.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Separator />

                  {/* Package Bundles */}
                  <div className="space-y-4 border rounded-lg p-4 bg-accent/5">
                    <div>
                      <Label className="text-base font-semibold">Package Discounts (Optional)</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Offer bundle discounts to encourage bulk bookings
                      </p>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2 p-3 border rounded-lg bg-background">
                        <Label className="font-medium text-sm">5-Session Bundle</Label>
                        <Select value={formData.package5Discount} onValueChange={value => setFormData({
                        ...formData,
                        package5Discount: value
                      })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select discount" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5% off</SelectItem>
                            <SelectItem value="10">10% off</SelectItem>
                            <SelectItem value="15">15% off</SelectItem>
                            <SelectItem value="20">20% off</SelectItem>
                          </SelectContent>
                        </Select>
                        {getAverageRate() > 0 && formData.package5Discount && <p className="text-xs text-green-600 font-medium">
                            Rate: KES {Math.round(getAverageRate() * 5 * (1 - parseFloat(formData.package5Discount) / 100)).toLocaleString()}
                          </p>}
                      </div>

                      <div className="space-y-2 p-3 border rounded-lg bg-background">
                        <Label className="font-medium text-sm">10-Session Bundle</Label>
                        <Select value={formData.package10Discount} onValueChange={value => setFormData({
                        ...formData,
                        package10Discount: value
                      })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select discount" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10% off</SelectItem>
                            <SelectItem value="15">15% off</SelectItem>
                            <SelectItem value="20">20% off</SelectItem>
                            <SelectItem value="25">25% off</SelectItem>
                          </SelectContent>
                        </Select>
                        {getAverageRate() > 0 && formData.package10Discount && <p className="text-xs text-green-600 font-medium">
                            Rate: KES {Math.round(getAverageRate() * 10 * (1 - parseFloat(formData.package10Discount) / 100)).toLocaleString()}
                          </p>}
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground italic">
                      💡 Bundles increase student commitment and provide predictable income
                    </p>
                  </div>

                </div>}

              {step === 4 && <div className="space-y-6">
                  <h3 className="font-semibold text-lg">Preferences & Privacy</h3>
                  <p className="text-sm text-muted-foreground">
                    Tell us how you prefer to teach and control your profile visibility
                  </p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Teaching Mode *</Label>
                      <div className="flex gap-3">
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
                              teachingMode: formData.teachingMode.filter(m => m !== mode),
                              teachingLocations: mode === "In-Person" ? [] : formData.teachingLocations
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
                  </div>

                  <Separator />
                  
                  <div className="space-y-4">
                    <h4 className="font-semibold">Profile Visibility</h4>
                    <p className="text-sm text-muted-foreground">Choose what students will see on your profile</p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <Label htmlFor="showFullName">Show Full Name</Label>
                          <p className="text-xs text-muted-foreground">Display your complete name to students</p>
                        </div>
                        <Checkbox 
                          id="showFullName"
                          checked={formData.showFullName}
                          onCheckedChange={(checked) => setFormData({ ...formData, showFullName: checked as boolean })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <Label htmlFor="showCurrentInstitution">Show Current Institution</Label>
                          <p className="text-xs text-muted-foreground">Display where you currently teach/study</p>
                        </div>
                        <Checkbox 
                          id="showCurrentInstitution"
                          checked={formData.showCurrentInstitution}
                          onCheckedChange={(checked) => setFormData({ ...formData, showCurrentInstitution: checked as boolean })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <Label htmlFor="showPhoto">Show Profile Photo</Label>
                          <p className="text-xs text-muted-foreground">Display your photo in search results</p>
                        </div>
                        <Checkbox 
                          id="showPhoto"
                          checked={formData.showPhoto}
                          onCheckedChange={(checked) => setFormData({ ...formData, showPhoto: checked as boolean })}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-semibold">Profile Photo</h4>
                    <div className="flex items-center gap-4">
                      <Avatar className="w-20 h-20 ring-2 ring-primary/20">
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



              {/* Validation Summary for Step 4 */}
              {step === 4 && Object.keys(formData.curriculumLevelRates).length === 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <svg className="w-5 h-5 text-amber-600 dark:text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">Complete Required Fields</h4>
                      <p className="text-sm text-amber-800 dark:text-amber-300 mb-2">Please complete the following to submit your profile:</p>
                      <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-300">
                        <li className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-amber-600 dark:bg-amber-500 rounded-full"></span>
                          <span><strong>Rates:</strong> Go to Step 3 (Pricing) to set your hourly rates for each curriculum-level combination</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

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
                  </Button> : (
                    <div className="ml-auto flex flex-col items-end gap-2">
                      {Object.keys(formData.curriculumLevelRates).length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Complete all required fields to enable submission
                        </p>
                      )}
                      <Button
                        type="button" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSubmit(e as any);
                        }} 
                        disabled={isLoading || Object.keys(formData.curriculumLevelRates).length === 0}
                      >
                        {isLoading ? "Submitting..." : "Submit Profile"}
                      </Button>
                    </div>
                  )}
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
                        <Avatar className="w-16 h-16 shrink-0 ring-2 ring-primary/20 shadow-lg">
                          {formData.showPhoto && photoFile ? (
                            <AvatarImage src={URL.createObjectURL(photoFile)} />
                          ) : null}
                          <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                            {formData.fullName.split(' ').map(n => n[0]).join('').slice(0, 2) || "T"}
                          </AvatarFallback>
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
                          {getAverageRate() > 0 ? <>
                              <div className="font-bold text-lg">
                                KES {Math.round(getAverageRate()).toLocaleString()}
                                <span className="text-sm font-normal text-muted-foreground">/hr</span>
                              </div>
                              <span className="text-xs text-muted-foreground">starting from</span>
                            </> : <span className="text-sm text-muted-foreground">Set rates in Step 3</span>}
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
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, Upload, X, Plus, Trash2, AlertCircle } from "lucide-react";
import { getCurriculums, getLevelsForCurriculum, getSubjectsForCurriculumLevel } from "@/utils/curriculumData";
import { NAIROBI_LOCATIONS } from "@/utils/locationData";
import { getRateGuidance } from "@/utils/rateGuidance";

const toNumber = (v: unknown): number => {
  if (typeof v === 'number') return v;
  if (v == null) return 0;
  const cleaned = String(v).replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

const TutorProfileEdit = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tutorId, setTutorId] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [curriculumLevels, setCurriculumLevels] = useState<{
    [key: string]: string[];
  }>({});

  const [formData, setFormData] = useState({
    bio: "",
    experienceYears: "",
    currentInstitution: "",
    displayInstitution: true,
    qualifications: "",
    curriculumLevelRates: {} as { [key: string]: string },
    curriculum: [] as string[],
    subjectsWithContext: [] as Array<{
      curriculum: string;
      level: string;
      subject: string;
    }>,
    teachingMode: [] as string[],
    teachingLocations: [] as string[],
    gender: "",
    whyStudentsLove: "",
    avatarUrl: "",
    educationHistory: [] as Array<{
      institution: string;
      degree: string;
      field: string;
      graduationYear: string;
    }>,
    teachingHistory: [] as Array<{
      institution: string;
      role: string;
      years: string;
    }>
  });

  const curriculums = getCurriculums();
  const derivedSubjects = Array.from(new Set(formData.subjectsWithContext.map(s => s.subject)));

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUserId(session.user.id);

      // Load tutor profile
      const { data: tutorProfile } = await supabase
        .from("tutor_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!tutorProfile) {
        toast.error("No tutor profile found");
        navigate("/tutor/dashboard");
        return;
      }

      setTutorId(tutorProfile.id);

      // Load pricing tiers
      const { data: pricingTiers } = await supabase
        .from("tutor_pricing_tiers")
        .select("*")
        .eq("tutor_id", tutorProfile.id);

      // Load tier assignments
      const { data: tierAssignments } = await supabase
        .from("curriculum_level_tier_assignments")
        .select("curriculum, level, tier_id")
        .eq("tutor_id", tutorProfile.id);

      // Reconstruct data structures
      const reconstructedCurriculumLevels: { [key: string]: string[] } = {};
      const reconstructedSubjectsWithContext: Array<{
        curriculum: string;
        level: string;
        subject: string;
      }> = [];
      const reconstructedCurriculumLevelRates: { [key: string]: string } = {};

      if (tierAssignments && pricingTiers) {
        tierAssignments.forEach(assignment => {
          if (!reconstructedCurriculumLevels[assignment.curriculum]) {
            reconstructedCurriculumLevels[assignment.curriculum] = [];
          }
          if (!reconstructedCurriculumLevels[assignment.curriculum].includes(assignment.level)) {
            reconstructedCurriculumLevels[assignment.curriculum].push(assignment.level);
          }

          const key = `${assignment.curriculum}-${assignment.level}`;
          const tierForThisCombo = pricingTiers.find(t => t.id === assignment.tier_id);
          if (tierForThisCombo) {
            reconstructedCurriculumLevelRates[key] = Math.round(Number(tierForThisCombo.online_hourly_rate)).toString();
          }
        });
      }

      // Reconstruct subjects
      if (tutorProfile.subjects && Array.isArray(tutorProfile.subjects)) {
        tutorProfile.subjects.forEach((subject: string) => {
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

      // Load user profile for avatar
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", session.user.id)
        .single();

      setFormData({
        bio: tutorProfile.bio || "",
        experienceYears: tutorProfile.experience_years?.toString() || "",
        currentInstitution: tutorProfile.current_institution || "",
        displayInstitution: tutorProfile.display_institution ?? true,
        qualifications: Array.isArray(tutorProfile.qualifications)
          ? tutorProfile.qualifications.join('\n')
          : "",
        curriculumLevelRates: reconstructedCurriculumLevelRates,
        curriculum: tutorProfile.curriculum || [],
        subjectsWithContext: reconstructedSubjectsWithContext,
        teachingMode: tutorProfile.teaching_mode || [],
        teachingLocations: tutorProfile.teaching_location?.split(', ') || [],
        gender: tutorProfile.gender || "",
        whyStudentsLove: Array.isArray(tutorProfile.why_students_love)
          ? tutorProfile.why_students_love.join('\n')
          : "",
        avatarUrl: userProfile?.avatar_url || "",
        educationHistory: Array.isArray(tutorProfile.education) && tutorProfile.education.length > 0
          ? tutorProfile.education.map((exp: any) => ({
              institution: exp.institution || "",
              degree: exp.degree || "",
              field: exp.field || "",
              graduationYear: exp.graduationYear || ""
            }))
          : [],
        teachingHistory: Array.isArray(tutorProfile.teaching_experience) && tutorProfile.teaching_experience.length > 0
          ? tutorProfile.teaching_experience.map((exp: any) => ({
              institution: exp.institution || "",
              role: exp.role || "",
              years: exp.years || ""
            }))
          : [],
      });

      if (userProfile?.avatar_url) {
        setPhotoPreview(userProfile.avatar_url);
      }

      setLoading(false);
    };

    loadProfile();
  }, [navigate]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCurriculumToggle = (curriculum: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        curriculum: [...prev.curriculum, curriculum]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        curriculum: prev.curriculum.filter(c => c !== curriculum)
      }));
      const newLevels = { ...curriculumLevels };
      delete newLevels[curriculum];
      setCurriculumLevels(newLevels);
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
      setFormData(prev => ({
        ...prev,
        subjectsWithContext: prev.subjectsWithContext.filter(
          s => !(s.curriculum === curriculum && s.level === level)
        )
      }));
    }
  };

  const handleSubjectToggle = (subject: string, checked: boolean) => {
    // This function is no longer needed as subjects are handled inline
  };

  const handleToggleTeachingMode = (mode: string) => {
    setFormData(prev => ({
      ...prev,
      teachingMode: prev.teachingMode.includes(mode)
        ? prev.teachingMode.filter(m => m !== mode)
        : [...prev.teachingMode, mode]
    }));
  };

  const handleToggleLocation = (location: string) => {
    setFormData(prev => ({
      ...prev,
      teachingLocations: prev.teachingLocations.includes(location)
        ? prev.teachingLocations.filter(l => l !== location)
        : [...prev.teachingLocations, location]
    }));
  };

  const addEducationEntry = () => {
    setFormData(prev => ({
      ...prev,
      educationHistory: [
        ...prev.educationHistory,
        { institution: "", degree: "", field: "", graduationYear: "" }
      ]
    }));
  };

  const removeEducationEntry = (index: number) => {
    setFormData(prev => ({
      ...prev,
      educationHistory: prev.educationHistory.filter((_, i) => i !== index)
    }));
  };

  const updateEducationEntry = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      educationHistory: prev.educationHistory.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      )
    }));
  };

  const addTeachingEntry = () => {
    setFormData(prev => ({
      ...prev,
      teachingHistory: [
        ...prev.teachingHistory,
        { institution: "", role: "", years: "" }
      ]
    }));
  };

  const removeTeachingEntry = (index: number) => {
    setFormData(prev => ({
      ...prev,
      teachingHistory: prev.teachingHistory.filter((_, i) => i !== index)
    }));
  };

  const updateTeachingEntry = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      teachingHistory: prev.teachingHistory.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      )
    }));
  };

  const handleSave = async () => {
    if (!tutorId || !userId) {
      console.error("Missing tutorId or userId", { tutorId, userId });
      toast.error("Session error. Please refresh and try again.");
      return;
    }

    // Validation
    if (!formData.bio?.trim()) {
      toast.error("Please provide a bio");
      return;
    }
    if (formData.curriculum.length === 0) {
      toast.error("Please select at least one curriculum");
      return;
    }
    if (Object.keys(curriculumLevels).length === 0) {
      toast.error("Please select at least one level for your curricula");
      return;
    }
    if (derivedSubjects.length === 0) {
      toast.error("Please select at least one subject");
      return;
    }
    if (formData.teachingMode.length === 0) {
      toast.error("Please select at least one teaching mode");
      return;
    }
    if (Object.keys(formData.curriculumLevelRates).length === 0) {
      toast.error("Please set rates for your curriculum-level combinations");
      return;
    }

    setSaving(true);
    try {
      let avatarUrl = formData.avatarUrl;

      // Upload new photo if selected
      if (photoFile) {
        try {
          console.log("Starting photo upload...", { userId, fileName: photoFile.name });
          const fileExt = photoFile.name.split('.').pop();
          const fileName = `${userId}-${Date.now()}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, photoFile, { upsert: true });

          if (uploadError) {
            console.error("Photo upload error:", uploadError);
            throw new Error(`Failed to upload photo: ${uploadError.message}`);
          }

          console.log("Photo uploaded successfully:", uploadData);

          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

          avatarUrl = publicUrl;
          console.log("Got public URL:", publicUrl);

          const { error: profileUpdateError } = await supabase
            .from("profiles")
            .update({ avatar_url: avatarUrl })
            .eq("id", userId);

          if (profileUpdateError) {
            console.error("Profile avatar update error:", profileUpdateError);
            throw new Error(`Failed to update profile photo in database: ${profileUpdateError.message}`);
          }

          console.log("Profile avatar updated successfully");
          setFormData(prev => ({ ...prev, avatarUrl }));
          setPhotoPreview(avatarUrl);
        } catch (photoError: any) {
          console.error("Photo upload failed:", photoError);
          toast.error(`Photo upload failed: ${photoError.message}. Continuing with other updates...`);
          // Continue with profile update even if photo fails
        }
      }

      // Update tutor profile
      console.log("Updating tutor profile...", { tutorId });
      const { error: profileError } = await supabase
        .from("tutor_profiles")
        .update({
          bio: formData.bio,
          experience_years: toNumber(formData.experienceYears),
          current_institution: formData.currentInstitution,
          display_institution: formData.displayInstitution,
          qualifications: formData.qualifications
            .split('\n')
            .map(q => q.trim())
            .filter(q => q.length > 0),
          curriculum: formData.curriculum,
          subjects: derivedSubjects,
          teaching_mode: formData.teachingMode,
          teaching_location: formData.teachingLocations.join(', '),
          gender: formData.gender,
          education: formData.educationHistory.filter(e => e.institution && e.degree),
          teaching_experience: formData.teachingHistory.filter(t => t.institution && t.role),
          updated_at: new Date().toISOString(),
        })
        .eq("id", tutorId);

      if (profileError) {
        console.error("Tutor profile update error:", profileError);
        throw new Error(`Failed to update profile: ${profileError.message}`);
      }
      console.log("Tutor profile updated successfully");

      // Delete existing pricing tiers and tier assignments
      console.log("Deleting existing tier assignments...");
      const { error: deleteAssignmentsError } = await supabase
        .from("curriculum_level_tier_assignments")
        .delete()
        .eq("tutor_id", tutorId);
      
      if (deleteAssignmentsError) {
        console.error("Failed to delete tier assignments:", deleteAssignmentsError);
        throw new Error(`Failed to delete tier assignments: ${deleteAssignmentsError.message}`);
      }

      console.log("Deleting existing pricing tiers...");
      const { error: deleteTiersError } = await supabase
        .from("tutor_pricing_tiers")
        .delete()
        .eq("tutor_id", tutorId);
      
      if (deleteTiersError) {
        console.error("Failed to delete pricing tiers:", deleteTiersError);
        throw new Error(`Failed to delete pricing tiers: ${deleteTiersError.message}`);
      }

      // Create new pricing tiers and assignments
      const tierMap = new Map<string, string>();

      console.log("Creating new pricing tiers...");
      for (const [key, rateStr] of Object.entries(formData.curriculumLevelRates)) {
        const rate = toNumber(rateStr);
        if (rate <= 0) {
          console.warn(`Skipping rate for ${key} (rate is ${rate})`);
          continue;
        }

        const tierName = `${key}-tier`;
        console.log(`Creating tier: ${tierName} with rate ${rate}`);
        const { data: newTier, error: tierError } = await supabase
          .from("tutor_pricing_tiers")
          .insert({
            tutor_id: tutorId,
            tier_name: tierName,
            online_hourly_rate: rate,
          })
          .select("id")
          .single();

        if (tierError) {
          console.error(`Failed to create tier ${tierName}:`, tierError);
          throw new Error(`Failed to create pricing tier: ${tierError.message}`);
        }
        console.log(`Created tier ${tierName} with id:`, newTier.id);
        tierMap.set(key, newTier.id);
      }

      // Create tier assignments
      console.log("Creating tier assignments...");
      for (const [curriculum, levels] of Object.entries(curriculumLevels)) {
        for (const level of levels) {
          const key = `${curriculum}-${level}`;
          const tierId = tierMap.get(key);
          if (!tierId) {
            console.warn(`No tier ID found for ${key}, skipping assignment`);
            continue;
          }

          console.log(`Creating assignment for ${curriculum}-${level} with tier ${tierId}`);
          const { error: assignmentError } = await supabase
            .from("curriculum_level_tier_assignments")
            .insert({
              tutor_id: tutorId,
              curriculum,
              level,
              tier_id: tierId,
            });

          if (assignmentError) {
            console.error(`Failed to create assignment for ${key}:`, assignmentError);
            throw new Error(`Failed to create tier assignment: ${assignmentError.message}`);
          }
        }
      }

      // Calculate average rate for base hourly_rate field
      console.log("Calculating average rate...");
      const rates = Object.values(formData.curriculumLevelRates)
        .map(r => toNumber(r))
        .filter(r => r > 0);
      const avgRate = rates.length > 0
        ? rates.reduce((sum, r) => sum + r, 0) / rates.length
        : 0;

      console.log("Updating base hourly rate:", avgRate);
      const { error: rateUpdateError } = await supabase
        .from("tutor_profiles")
        .update({ hourly_rate: avgRate })
        .eq("id", tutorId);

      if (rateUpdateError) {
        console.error("Failed to update hourly rate:", rateUpdateError);
        throw new Error(`Failed to update hourly rate: ${rateUpdateError.message}`);
      }

      console.log("Profile update complete!");
      toast.success("Profile updated successfully!");
      navigate("/tutor/dashboard");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast.error(error.message || "Failed to update profile. Please check the console for details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Your Profile</h1>
        <p className="text-muted-foreground mt-2">
          Update your professional information and rates
        </p>
      </div>

      <Tabs defaultValue="about" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="curriculum">Curriculum & Rates</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="photo">Photo</TabsTrigger>
        </TabsList>

        <TabsContent value="about">
          <Card>
            <CardHeader>
              <CardTitle>Professional Bio</CardTitle>
              <CardDescription>
                Tell students about your teaching approach and experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bio">Bio *</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={6}
                  placeholder="Describe your teaching style, experience, and what makes you a great tutor..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="institution">Current Institution</Label>
                  <Input
                    id="institution"
                    value={formData.currentInstitution}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentInstitution: e.target.value }))}
                    placeholder="e.g., University of Nairobi"
                  />
                </div>

                <div>
                  <Label htmlFor="experience">Years of Experience *</Label>
                  <Input
                    id="experience"
                    type="number"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData(prev => ({ ...prev, experienceYears: e.target.value }))}
                    placeholder="e.g., 5"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="displayInstitution"
                  checked={formData.displayInstitution}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, displayInstitution: checked }))}
                />
                <Label htmlFor="displayInstitution">Display current institution on profile</Label>
              </div>

              <div>
                <Label htmlFor="gender">Gender</Label>
                <Input
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                  placeholder="e.g., Male, Female, Other"
                />
              </div>

              <div>
                <Label>Qualifications & Certifications</Label>
                <p className="text-sm text-muted-foreground mb-2">One per line</p>
                <Textarea
                  value={formData.qualifications}
                  onChange={(e) => setFormData(prev => ({ ...prev, qualifications: e.target.value }))}
                  rows={6}
                  placeholder="Bachelor of Education, Kenyatta University&#10;IGCSE Teacher Training Certificate&#10;TSC Registered Teacher"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="curriculum">
          <Card>
            <CardHeader>
              <CardTitle>Curriculum, Levels, Subjects & Rates</CardTitle>
              <CardDescription>
                Select your curricula and configure levels, subjects, and rates for each
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Rate Guidelines (for Online Sessions):</strong><br />
                  • CBC, 8-4-4, British Year 1-10: KES 1,000 - 2,000/hr<br />
                  • IGCSE Year 11, A-Levels: KES 1,500 - 3,000/hr<br />
                  <br />
                  <em>Note: In-person rates are automatically 50% more than your online rates.</em>
                </AlertDescription>
              </Alert>

              <div>
                <Label className="mb-3 block">Select Curricula *</Label>
                <div className="grid grid-cols-2 gap-3">
                  {curriculums.map(curriculum => (
                    <div key={curriculum} className="flex items-center space-x-2">
                      <Checkbox
                        id={`curriculum-${curriculum}`}
                        checked={formData.curriculum.includes(curriculum)}
                        onCheckedChange={(checked) => handleCurriculumToggle(curriculum, checked as boolean)}
                      />
                      <Label htmlFor={`curriculum-${curriculum}`} className="font-normal cursor-pointer">
                        {curriculum}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {formData.curriculum.map(curriculum => (
                <div key={curriculum} className="border-2 rounded-lg p-6 space-y-6 bg-muted/30">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">{curriculum}</h3>
                    
                    <div>
                      <Label className="mb-3 block">Select Levels *</Label>
                      <div className="grid grid-cols-3 gap-2 mb-6">
                        {getLevelsForCurriculum(curriculum).map(levelObj => (
                          <div key={levelObj.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`level-${curriculum}-${levelObj.value}`}
                              checked={curriculumLevels[curriculum]?.includes(levelObj.value) || false}
                              onCheckedChange={(checked) => handleLevelToggle(curriculum, levelObj.value, checked as boolean)}
                            />
                            <Label htmlFor={`level-${curriculum}-${levelObj.value}`} className="font-normal cursor-pointer text-sm">
                              {levelObj.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {curriculumLevels[curriculum]?.map(level => {
                      const key = `${curriculum}-${level}`;
                      const subjects = getSubjectsForCurriculumLevel(curriculum, level);
                      const guidance = getRateGuidance(curriculum, level, 'Online');
                      const rangeText = guidance 
                        ? `KES ${guidance.min.toLocaleString()} - ${guidance.max.toLocaleString()}`
                        : "No specific guidance";

                      return (
                        <div key={key} className="border rounded-lg p-4 bg-background space-y-4">
                          <h4 className="font-semibold text-base">{level}</h4>
                          
                          <div>
                            <Label className="mb-2 block text-sm">Subjects *</Label>
                            <div className="grid grid-cols-3 gap-2">
                              {subjects.map(subject => {
                                const isSelected = formData.subjectsWithContext.some(
                                  s => s.curriculum === curriculum &&
                                       s.level === level &&
                                       s.subject === subject
                                );
                                return (
                                  <div key={subject} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`subject-${curriculum}-${level}-${subject}`}
                                      checked={isSelected}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setFormData(prev => ({
                                            ...prev,
                                            subjectsWithContext: [
                                              ...prev.subjectsWithContext,
                                              { curriculum, level, subject }
                                            ]
                                          }));
                                        } else {
                                          setFormData(prev => ({
                                            ...prev,
                                            subjectsWithContext: prev.subjectsWithContext.filter(
                                              s => !(s.curriculum === curriculum && s.level === level && s.subject === subject)
                                            )
                                          }));
                                        }
                                      }}
                                    />
                                    <Label htmlFor={`subject-${curriculum}-${level}-${subject}`} className="font-normal cursor-pointer text-sm">
                                      {subject}
                                    </Label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <Label htmlFor={`rate-${key}`} className="text-sm">
                              Online Hourly Rate (KES) *
                            </Label>
                            <Input
                              id={`rate-${key}`}
                              type="text"
                              value={formData.curriculumLevelRates[key] || ""}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^\d]/g, '');
                                setFormData(prev => ({
                                  ...prev,
                                  curriculumLevelRates: {
                                    ...prev.curriculumLevelRates,
                                    [key]: value
                                  }
                                }));
                              }}
                              placeholder={`e.g., ${guidance ? guidance.min : 1500}`}
                              className={`mt-1 ${
                                (() => {
                                  const currentRate = parseFloat(formData.curriculumLevelRates[key] || '0');
                                  if (guidance && currentRate > 0 && (currentRate < guidance.min || currentRate > guidance.max)) {
                                    return 'border-amber-500';
                                  }
                                  return '';
                                })()
                              }`}
                            />
                            {formData.curriculumLevelRates[key] && (
                              <>
                                <p className="text-sm text-muted-foreground mt-1">
                                  <strong>Online:</strong> KES {Math.round(Number(formData.curriculumLevelRates[key])).toLocaleString()} per hour
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  <strong>In-Person:</strong> KES {Math.round(Number(formData.curriculumLevelRates[key]) * 1.5).toLocaleString()} per hour
                                </p>
                              </>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Recommended online rate: {rangeText}
                            </p>
                            {(() => {
                              const currentRate = parseFloat(formData.curriculumLevelRates[key] || '0');
                              const isOutOfRange = guidance && currentRate > 0 && (currentRate < guidance.min || currentRate > guidance.max);
                              if (isOutOfRange) {
                                return (
                                  <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded mt-2">
                                    <span className="text-amber-600 dark:text-amber-400 text-sm">⚠️</span>
                                    <p className="text-xs text-amber-700 dark:text-amber-300">
                                      Your rate is outside the recommended range. This may affect student bookings. Consider adjusting to stay competitive.
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {derivedSubjects.length > 0 && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm font-semibold mb-3">All Selected Subjects:</p>
                  <div className="flex flex-wrap gap-2">
                    {derivedSubjects.map(subject => (
                      <span key={subject} className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/30 rounded-md text-sm font-medium">
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="education">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Education History</CardTitle>
                <CardDescription>
                  List your academic qualifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.educationHistory.map((edu, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Education #{index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEducationEntry(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Institution</Label>
                        <Input
                          value={edu.institution}
                          onChange={(e) => updateEducationEntry(index, 'institution', e.target.value)}
                          placeholder="e.g., University of Nairobi"
                        />
                      </div>
                      <div>
                        <Label>Degree</Label>
                        <Input
                          value={edu.degree}
                          onChange={(e) => updateEducationEntry(index, 'degree', e.target.value)}
                          placeholder="e.g., Bachelor of Education"
                        />
                      </div>
                      <div>
                        <Label>Field of Study</Label>
                        <Input
                          value={edu.field}
                          onChange={(e) => updateEducationEntry(index, 'field', e.target.value)}
                          placeholder="e.g., Mathematics"
                        />
                      </div>
                      <div>
                        <Label>Graduation Year</Label>
                        <Input
                          value={edu.graduationYear}
                          onChange={(e) => updateEducationEntry(index, 'graduationYear', e.target.value)}
                          placeholder="e.g., 2020"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button onClick={addEducationEntry} variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Education
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Teaching Experience</CardTitle>
                <CardDescription>
                  List your teaching and tutoring experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.teachingHistory.map((exp, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Experience #{index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTeachingEntry(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Institution</Label>
                        <Input
                          value={exp.institution}
                          onChange={(e) => updateTeachingEntry(index, 'institution', e.target.value)}
                          placeholder="e.g., ABC High School"
                        />
                      </div>
                      <div>
                        <Label>Role</Label>
                        <Input
                          value={exp.role}
                          onChange={(e) => updateTeachingEntry(index, 'role', e.target.value)}
                          placeholder="e.g., Mathematics Teacher"
                        />
                      </div>
                      <div>
                        <Label>Years</Label>
                        <Input
                          value={exp.years}
                          onChange={(e) => updateTeachingEntry(index, 'years', e.target.value)}
                          placeholder="e.g., 3"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button onClick={addTeachingEntry} variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Experience
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Teaching Preferences</CardTitle>
              <CardDescription>
                Configure your teaching modes and location preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="mb-3 block">Teaching Modes *</Label>
                <div className="space-y-2">
                  {["Online", "In-Person"].map(mode => (
                    <div key={mode} className="flex items-center space-x-2">
                      <Checkbox
                        id={`mode-${mode}`}
                        checked={formData.teachingMode.includes(mode)}
                        onCheckedChange={() => handleToggleTeachingMode(mode)}
                      />
                      <Label htmlFor={`mode-${mode}`} className="font-normal cursor-pointer">
                        {mode}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {formData.teachingMode.includes("In-Person") && (
                <div>
                  <Label className="mb-3 block">Physical Teaching Locations</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {NAIROBI_LOCATIONS.map(location => (
                      <div key={location} className="flex items-center space-x-2">
                        <Checkbox
                          id={`location-${location}`}
                          checked={formData.teachingLocations.includes(location)}
                          onCheckedChange={() => handleToggleLocation(location)}
                        />
                        <Label htmlFor={`location-${location}`} className="font-normal cursor-pointer text-sm">
                          {location}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photo">
          <Card>
            <CardHeader>
              <CardTitle>Profile Photo</CardTitle>
              <CardDescription>
                {photoPreview 
                  ? "Your current profile photo. Would you like to change it?"
                  : "Upload a professional photo of yourself"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {photoPreview ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <img
                      src={photoPreview}
                      alt="Your profile photo"
                      className="w-48 h-48 object-cover rounded-full border-4 border-primary/20"
                    />
                  </div>
                  <div className="flex justify-center">
                    <Button onClick={() => document.getElementById('photo-upload')?.click()} variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Change Photo
                    </Button>
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    Profiles with photos perform better! Upload a professional photo (max 5MB)
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="w-48 h-48 rounded-full bg-muted flex items-center justify-center">
                      <Upload className="h-12 w-12 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <Button onClick={() => document.getElementById('photo-upload')?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photo
                    </Button>
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    Profiles with photos perform better! Upload a professional photo (max 5MB)
                  </p>
                </div>
              )}
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={() => navigate("/tutor-dashboard")}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default TutorProfileEdit;

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
  const [selectedCurriculumForSubjects, setSelectedCurriculumForSubjects] = useState("");
  const [selectedLevelForSubjects, setSelectedLevelForSubjects] = useState("");

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
  const availableLevelsForSubjects = selectedCurriculumForSubjects 
    ? getLevelsForCurriculum(selectedCurriculumForSubjects).map(l => l.value)
    : [];
  const availableSubjects = selectedCurriculumForSubjects && selectedLevelForSubjects 
    ? getSubjectsForCurriculumLevel(selectedCurriculumForSubjects, selectedLevelForSubjects) 
    : [];

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
        navigate("/tutor-dashboard");
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
    if (!selectedCurriculumForSubjects || !selectedLevelForSubjects) return;

    if (checked) {
      setFormData(prev => ({
        ...prev,
        subjectsWithContext: [
          ...prev.subjectsWithContext,
          {
            curriculum: selectedCurriculumForSubjects,
            level: selectedLevelForSubjects,
            subject
          }
        ]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        subjectsWithContext: prev.subjectsWithContext.filter(
          s => !(
            s.curriculum === selectedCurriculumForSubjects &&
            s.level === selectedLevelForSubjects &&
            s.subject === subject
          )
        )
      }));
    }
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
    if (!tutorId || !userId) return;

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
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, photoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        avatarUrl = publicUrl;

        await supabase
          .from("profiles")
          .update({ avatar_url: avatarUrl })
          .eq("id", userId);
      }

      // Update tutor profile
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

      if (profileError) throw profileError;

      // Delete existing pricing tiers and tier assignments
      await supabase
        .from("curriculum_level_tier_assignments")
        .delete()
        .eq("tutor_id", tutorId);

      await supabase
        .from("tutor_pricing_tiers")
        .delete()
        .eq("tutor_id", tutorId);

      // Create new pricing tiers and assignments
      const tierMap = new Map<string, string>();

      for (const [key, rateStr] of Object.entries(formData.curriculumLevelRates)) {
        const rate = toNumber(rateStr);
        if (rate <= 0) continue;

        const tierName = `${key}-tier`;
        const { data: newTier, error: tierError } = await supabase
          .from("tutor_pricing_tiers")
          .insert({
            tutor_id: tutorId,
            tier_name: tierName,
            online_hourly_rate: rate,
          })
          .select("id")
          .single();

        if (tierError) throw tierError;
        tierMap.set(key, newTier.id);
      }

      // Create tier assignments
      for (const [curriculum, levels] of Object.entries(curriculumLevels)) {
        for (const level of levels) {
          const key = `${curriculum}-${level}`;
          const tierId = tierMap.get(key);
          if (!tierId) continue;

          await supabase
            .from("curriculum_level_tier_assignments")
            .insert({
              tutor_id: tutorId,
              curriculum,
              level,
              tier_id: tierId,
            });
        }
      }

      // Calculate average rate for base hourly_rate field
      const rates = Object.values(formData.curriculumLevelRates)
        .map(r => toNumber(r))
        .filter(r => r > 0);
      const avgRate = rates.length > 0
        ? rates.reduce((sum, r) => sum + r, 0) / rates.length
        : 0;

      await supabase
        .from("tutor_profiles")
        .update({ hourly_rate: avgRate })
        .eq("id", tutorId);

      toast.success("Profile updated successfully!");
      navigate("/tutor-dashboard");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="rates">Rates</TabsTrigger>
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
              <CardTitle>Curriculum, Levels & Subjects</CardTitle>
              <CardDescription>
                Select the curricula, levels, and subjects you teach
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="mb-3 block">Curricula *</Label>
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
                <div key={curriculum} className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">{curriculum} - Select Levels</h4>
                  <div className="grid grid-cols-3 gap-2">
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
              ))}

              <div className="my-6 border-t" />

              <div>
                <Label className="mb-3 block">Select Subjects *</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose a curriculum and level combination, then select subjects
                </p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>Curriculum</Label>
                    <Select
                      value={selectedCurriculumForSubjects}
                      onValueChange={setSelectedCurriculumForSubjects}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select curriculum" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(curriculumLevels).map(curriculum => (
                          <SelectItem key={curriculum} value={curriculum}>
                            {curriculum}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Level</Label>
                    <Select
                      value={selectedLevelForSubjects}
                      onValueChange={setSelectedLevelForSubjects}
                      disabled={!selectedCurriculumForSubjects}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableLevelsForSubjects.map(level => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedCurriculumForSubjects && selectedLevelForSubjects && (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSubjects.map(subject => {
                      const isSelected = formData.subjectsWithContext.some(
                        s => s.curriculum === selectedCurriculumForSubjects &&
                             s.level === selectedLevelForSubjects &&
                             s.subject === subject
                      );
                      return (
                        <div key={subject} className="flex items-center space-x-2">
                          <Checkbox
                            id={`subject-${subject}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSubjectToggle(subject, checked as boolean)}
                          />
                          <Label htmlFor={`subject-${subject}`} className="font-normal cursor-pointer text-sm">
                            {subject}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                )}

                {derivedSubjects.length > 0 && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium mb-2">Selected Subjects:</p>
                    <div className="flex flex-wrap gap-2">
                      {derivedSubjects.map(subject => (
                        <span key={subject} className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates">
          <Card>
            <CardHeader>
              <CardTitle>Hourly Rates</CardTitle>
              <CardDescription>
              Set your rates for each curriculum-level combination (KES per hour)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Rate Guidelines:</strong><br />
                • CBC, 8-4-4, British Year 1-10: KES 1,000 - 2,000/hr<br />
                • IGCSE Year 11, A-Levels: KES 1,500 - 3,000/hr
              </AlertDescription>
            </Alert>

            {Object.entries(curriculumLevels).map(([curriculum, levels]) =>
              levels.map(level => {
                const key = `${curriculum}-${level}`;
                const guidance = getRateGuidance(curriculum, level, 'Online');
                const rangeText = guidance 
                  ? `KES ${guidance.min.toLocaleString()} - ${guidance.max.toLocaleString()}`
                  : "No specific guidance";
                return (
                  <div key={key}>
                    <Label htmlFor={`rate-${key}`}>
                      {curriculum} - {level}
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
                    />
                    {formData.curriculumLevelRates[key] && (
                      <p className="text-sm text-muted-foreground mt-1">
                        KES {Math.round(Number(formData.curriculumLevelRates[key])).toLocaleString()} per hour
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended: {rangeText}
                    </p>
                  </div>
                );
              })
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
                Upload a professional photo of yourself
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {photoPreview && (
                <div className="flex justify-center">
                  <img
                    src={photoPreview}
                    alt="Profile preview"
                    className="w-48 h-48 object-cover rounded-full"
                  />
                </div>
              )}
              <div className="flex justify-center">
                <Button onClick={() => document.getElementById('photo-upload')?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  {photoPreview ? 'Change Photo' : 'Upload Photo'}
                </Button>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>
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

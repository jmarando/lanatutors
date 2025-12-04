import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Upload, X, Plus, Trash2, AlertCircle, Search, User } from "lucide-react";
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

interface TutorOption {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  subjects: string[];
  verified: boolean;
}

export const AdminTutorProfileEdit = () => {
  const [tutors, setTutors] = useState<TutorOption[]>([]);
  const [selectedTutorId, setSelectedTutorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingTutors, setLoadingTutors] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
    fetchTutors();
  }, []);

  const fetchTutors = async () => {
    setLoadingTutors(true);
    try {
      // First fetch all tutor profiles
      const { data: tutorProfiles, error: tutorError } = await supabase
        .from("tutor_profiles")
        .select("id, user_id, subjects, verified")
        .order("created_at", { ascending: false });

      if (tutorError) {
        console.error("Error fetching tutor profiles:", tutorError);
        toast.error("Failed to load tutors");
        setLoadingTutors(false);
        return;
      }

      if (!tutorProfiles || tutorProfiles.length === 0) {
        setTutors([]);
        setLoadingTutors(false);
        return;
      }

      // Get all user IDs
      const userIds = tutorProfiles.map(t => t.user_id);

      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      // Create a map of user_id to profile
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Combine the data
      const formattedTutors = tutorProfiles.map(t => {
        const profile = profileMap.get(t.user_id);
        return {
          id: t.id,
          user_id: t.user_id,
          full_name: profile?.full_name || "Unknown",
          avatar_url: profile?.avatar_url || null,
          subjects: t.subjects || [],
          verified: t.verified
        };
      });

      setTutors(formattedTutors);
    } catch (error) {
      console.error("Error in fetchTutors:", error);
      toast.error("Failed to load tutors");
    }
    setLoadingTutors(false);
  };

  const loadTutorProfile = async (tutorId: string) => {
    setLoading(true);
    setSelectedTutorId(tutorId);

    const tutor = tutors.find(t => t.id === tutorId);
    if (!tutor) {
      toast.error("Tutor not found");
      setLoading(false);
      return;
    }

    // Load tutor profile
    const { data: tutorProfile } = await supabase
      .from("tutor_profiles")
      .select("*")
      .eq("id", tutorId)
      .single();

    if (!tutorProfile) {
      toast.error("Tutor profile not found");
      setLoading(false);
      return;
    }

    // Load pricing tiers
    const { data: pricingTiers } = await supabase
      .from("tutor_pricing_tiers")
      .select("*")
      .eq("tutor_id", tutorId);

    // Load tier assignments
    const { data: tierAssignments } = await supabase
      .from("curriculum_level_tier_assignments")
      .select("curriculum, level, tier_id")
      .eq("tutor_id", tutorId);

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
      .eq("id", tutor.user_id)
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
    if (!selectedTutorId) {
      toast.error("No tutor selected");
      return;
    }

    const tutor = tutors.find(t => t.id === selectedTutorId);
    if (!tutor) {
      toast.error("Tutor not found");
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
      toast.error("Please set rates for curriculum-level combinations");
      return;
    }

    setSaving(true);
    try {
      let avatarUrl = formData.avatarUrl;

      // Upload new photo if selected
      if (photoFile) {
        try {
          const fileExt = photoFile.name.split('.').pop();
          const fileName = `${tutor.user_id}-${Date.now()}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, photoFile, { upsert: true });

          if (uploadError) {
            throw new Error(`Failed to upload photo: ${uploadError.message}`);
          }

          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

          avatarUrl = publicUrl;

          const { error: profileUpdateError } = await supabase
            .from("profiles")
            .update({ avatar_url: avatarUrl })
            .eq("id", tutor.user_id);

          if (profileUpdateError) {
            throw new Error(`Failed to update profile photo: ${profileUpdateError.message}`);
          }

          setFormData(prev => ({ ...prev, avatarUrl }));
          setPhotoPreview(avatarUrl);
        } catch (photoError: any) {
          toast.error(`Photo upload failed: ${photoError.message}`);
        }
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
        .eq("id", selectedTutorId);

      if (profileError) {
        throw new Error(`Failed to update profile: ${profileError.message}`);
      }

      // Delete existing pricing tiers and tier assignments
      await supabase
        .from("curriculum_level_tier_assignments")
        .delete()
        .eq("tutor_id", selectedTutorId);

      await supabase
        .from("tutor_pricing_tiers")
        .delete()
        .eq("tutor_id", selectedTutorId);

      // Create new pricing tiers and assignments
      const tierMap = new Map<string, string>();

      for (const [key, rateStr] of Object.entries(formData.curriculumLevelRates)) {
        const rate = toNumber(rateStr);
        if (rate <= 0) continue;

        const tierName = `${key}-tier`;
        const { data: newTier, error: tierError } = await supabase
          .from("tutor_pricing_tiers")
          .insert({
            tutor_id: selectedTutorId,
            tier_name: tierName,
            online_hourly_rate: rate,
          })
          .select("id")
          .single();

        if (tierError) {
          throw new Error(`Failed to create pricing tier: ${tierError.message}`);
        }
        tierMap.set(key, newTier.id);
      }

      // Create tier assignments
      const assignments: any[] = [];
      for (const [curriculum, levels] of Object.entries(curriculumLevels)) {
        for (const level of levels) {
          const key = `${curriculum}-${level}`;
          const tierId = tierMap.get(key);
          if (tierId) {
            assignments.push({
              tutor_id: selectedTutorId,
              curriculum,
              level,
              tier_id: tierId,
            });
          }
        }
      }

      if (assignments.length > 0) {
        const { error: assignmentError } = await supabase
          .from("curriculum_level_tier_assignments")
          .insert(assignments);

        if (assignmentError) {
          throw new Error(`Failed to create tier assignments: ${assignmentError.message}`);
        }
      }

      toast.success("Tutor profile updated successfully!");
      fetchTutors(); // Refresh the list
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error(error.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const filteredTutors = tutors.filter(t => 
    t.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subjects.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedTutor = tutors.find(t => t.id === selectedTutorId);

  if (loadingTutors) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tutor Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Select Tutor to Edit
          </CardTitle>
          <CardDescription>
            Search and select a tutor profile to edit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tutors by name or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedTutorId || ""} onValueChange={loadTutorProfile}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Select a tutor" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                {filteredTutors.map((tutor) => (
                  <SelectItem key={tutor.id} value={tutor.id}>
                    <div className="flex items-center gap-2">
                      <span>{tutor.full_name}</span>
                      {tutor.verified && (
                        <Badge variant="secondary" className="text-xs">Verified</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTutor && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedTutor.avatar_url || undefined} />
                <AvatarFallback>
                  {selectedTutor.full_name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedTutor.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedTutor.subjects.slice(0, 3).join(', ')}
                  {selectedTutor.subjects.length > 3 && ` +${selectedTutor.subjects.length - 3} more`}
                </p>
              </div>
              {selectedTutor.verified && (
                <Badge className="ml-auto bg-green-600">Verified</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Form */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : selectedTutorId ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile: {selectedTutor?.full_name}</CardTitle>
            <CardDescription>
              Update the tutor's profile information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Photo Upload */}
            <div>
              <Label>Profile Photo</Label>
              <div className="flex items-center gap-4 mt-2">
                {photoPreview ? (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-24 h-24 rounded-full object-cover"
                    />
                    <button
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview(formData.avatarUrl || null);
                      }}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="max-w-xs"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Recommended: Square image, at least 400x400px
                  </p>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div>
              <Label htmlFor="bio">Professional Bio *</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Write a compelling bio..."
                rows={4}
              />
            </div>

            {/* Experience & Institution */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="experience">Years of Experience</Label>
                <Input
                  id="experience"
                  type="number"
                  value={formData.experienceYears}
                  onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="institution">Current Institution</Label>
                <Input
                  id="institution"
                  value={formData.currentInstitution}
                  onChange={(e) => setFormData({ ...formData, currentInstitution: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="displayInstitution"
                checked={formData.displayInstitution}
                onCheckedChange={(checked) => setFormData({ ...formData, displayInstitution: checked })}
              />
              <Label htmlFor="displayInstitution">Display institution on profile</Label>
            </div>

            {/* Gender */}
            <div>
              <Label>Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Qualifications */}
            <div>
              <Label htmlFor="qualifications">Qualifications (one per line)</Label>
              <Textarea
                id="qualifications"
                value={formData.qualifications}
                onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                placeholder="B.Ed Mathematics&#10;TSC Certified&#10;Cambridge Certified"
                rows={3}
              />
            </div>

            {/* Curriculum Selection */}
            <div>
              <Label>Curricula *</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {curriculums.map((curriculum) => (
                  <div key={curriculum} className="flex items-center gap-2">
                    <Checkbox
                      id={`curriculum-${curriculum}`}
                      checked={formData.curriculum.includes(curriculum)}
                      onCheckedChange={(checked) => handleCurriculumToggle(curriculum, !!checked)}
                    />
                    <Label htmlFor={`curriculum-${curriculum}`} className="text-sm">
                      {curriculum}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Levels and Rates for each Curriculum */}
            {formData.curriculum.map((curriculum) => (
              <Card key={curriculum} className="p-4">
                <h4 className="font-semibold mb-3">{curriculum} - Levels & Rates</h4>
                <div className="space-y-4">
                  {getLevelsForCurriculum(curriculum).map((levelObj) => {
                    const levelValue = levelObj.value;
                    const isSelected = curriculumLevels[curriculum]?.includes(levelValue);
                    const rateKey = `${curriculum}-${levelValue}`;
                    const guidance = getRateGuidance(curriculum, levelValue, 'Online');
                    
                    return (
                      <div key={levelValue} className="flex flex-wrap items-center gap-4 pb-3 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`level-${curriculum}-${levelValue}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => handleLevelToggle(curriculum, levelValue, !!checked)}
                          />
                          <Label htmlFor={`level-${curriculum}-${levelValue}`} className="text-sm">
                            {levelObj.label}
                          </Label>
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground whitespace-nowrap">Rate (KES/hr):</Label>
                            <Input
                              type="number"
                              value={formData.curriculumLevelRates[rateKey] || ""}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                curriculumLevelRates: {
                                  ...prev.curriculumLevelRates,
                                  [rateKey]: e.target.value
                                }
                              }))}
                              className="w-28"
                              placeholder={guidance?.min ? `${guidance.min}` : "Rate"}
                            />
                            {guidance && (
                              <span className="text-xs text-muted-foreground">
                                ({guidance.min}-{guidance.max})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Subjects for this curriculum */}
                {curriculumLevels[curriculum]?.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-sm">Subjects for {curriculum}</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Array.from(new Set(
                        curriculumLevels[curriculum].flatMap(level => 
                          getSubjectsForCurriculumLevel(curriculum, level)
                        )
                      )).map((subject) => {
                        const isSelected = formData.subjectsWithContext.some(
                          s => s.curriculum === curriculum && s.subject === subject
                        );
                        return (
                          <Badge
                            key={subject}
                            variant={isSelected ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                              if (isSelected) {
                                setFormData(prev => ({
                                  ...prev,
                                  subjectsWithContext: prev.subjectsWithContext.filter(
                                    s => !(s.curriculum === curriculum && s.subject === subject)
                                  )
                                }));
                              } else {
                                const newEntries = curriculumLevels[curriculum].map(level => ({
                                  curriculum,
                                  level,
                                  subject
                                }));
                                setFormData(prev => ({
                                  ...prev,
                                  subjectsWithContext: [...prev.subjectsWithContext, ...newEntries]
                                }));
                              }
                            }}
                          >
                            {subject}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            ))}

            {/* Teaching Mode */}
            <div>
              <Label>Teaching Mode *</Label>
              <div className="flex flex-wrap gap-4 mt-2">
                {["Online", "In-Person"].map((mode) => (
                  <div key={mode} className="flex items-center gap-2">
                    <Checkbox
                      id={`mode-${mode}`}
                      checked={formData.teachingMode.includes(mode)}
                      onCheckedChange={() => handleToggleTeachingMode(mode)}
                    />
                    <Label htmlFor={`mode-${mode}`}>{mode}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Teaching Locations */}
            {formData.teachingMode.includes("In-Person") && (
              <div>
                <Label>Teaching Locations</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {NAIROBI_LOCATIONS.map((location) => (
                    <Badge
                      key={location}
                      variant={formData.teachingLocations.includes(location) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleToggleLocation(location)}
                    >
                      {location}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Education History */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Education History</Label>
                <Button type="button" variant="outline" size="sm" onClick={addEducationEntry}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
              {formData.educationHistory.map((entry, index) => (
                <div key={index} className="grid md:grid-cols-4 gap-2 mb-2 p-3 border rounded">
                  <Input
                    placeholder="Institution"
                    value={entry.institution}
                    onChange={(e) => updateEducationEntry(index, "institution", e.target.value)}
                  />
                  <Input
                    placeholder="Degree"
                    value={entry.degree}
                    onChange={(e) => updateEducationEntry(index, "degree", e.target.value)}
                  />
                  <Input
                    placeholder="Field"
                    value={entry.field}
                    onChange={(e) => updateEducationEntry(index, "field", e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Year"
                      value={entry.graduationYear}
                      onChange={(e) => updateEducationEntry(index, "graduationYear", e.target.value)}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeEducationEntry(index)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Teaching History */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Teaching Experience</Label>
                <Button type="button" variant="outline" size="sm" onClick={addTeachingEntry}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
              {formData.teachingHistory.map((entry, index) => (
                <div key={index} className="grid md:grid-cols-3 gap-2 mb-2 p-3 border rounded">
                  <Input
                    placeholder="Institution"
                    value={entry.institution}
                    onChange={(e) => updateTeachingEntry(index, "institution", e.target.value)}
                  />
                  <Input
                    placeholder="Role"
                    value={entry.role}
                    onChange={(e) => updateTeachingEntry(index, "role", e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Years"
                      value={entry.years}
                      onChange={(e) => updateTeachingEntry(index, "years", e.target.value)}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeTeachingEntry(index)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={saving} size="lg">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a tutor above to edit their profile</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
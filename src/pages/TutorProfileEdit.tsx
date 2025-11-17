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
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";

const TutorProfileEdit = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tutorId, setTutorId] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    bio: "",
    experienceYears: "",
    currentInstitution: "",
    displayInstitution: true,
    qualifications: "",
    standardRate: "",
    advancedRate: "",
    teachingMode: [] as string[],
    gender: "",
    servicesOffered: [] as string[],
    specializations: "",
    teachingLocation: "",
    whyStudentsLove: "",
    avatarUrl: "",
  });

  useEffect(() => {
    const checkAuth = async () => {
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

      const standardTier = pricingTiers?.find(t => t.tier_name === "Standard");
      const advancedTier = pricingTiers?.find(t => t.tier_name === "Advanced");

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
        standardRate: standardTier?.online_hourly_rate 
          ? Math.round(Number(standardTier.online_hourly_rate)).toString()
          : "",
        advancedRate: advancedTier?.online_hourly_rate 
          ? Math.round(Number(advancedTier.online_hourly_rate)).toString()
          : "",
        teachingMode: tutorProfile.teaching_mode || [],
        gender: tutorProfile.gender || "",
        servicesOffered: tutorProfile.services_offered || [],
        specializations: tutorProfile.specializations || "",
        teachingLocation: tutorProfile.teaching_location || "",
        whyStudentsLove: Array.isArray(tutorProfile.why_students_love)
          ? tutorProfile.why_students_love.join('\n')
          : "",
        avatarUrl: userProfile?.avatar_url || "",
      });

      if (userProfile?.avatar_url) {
        setPhotoPreview(userProfile.avatar_url);
      }

      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const toNumber = (value: string): number => {
    const cleaned = value.replace(/[^\d]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
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

  const handleToggleTeachingMode = (mode: string) => {
    setFormData(prev => ({
      ...prev,
      teachingMode: prev.teachingMode.includes(mode)
        ? prev.teachingMode.filter(m => m !== mode)
        : [...prev.teachingMode, mode]
    }));
  };

  const handleToggleService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      servicesOffered: prev.servicesOffered.includes(service)
        ? prev.servicesOffered.filter(s => s !== service)
        : [...prev.servicesOffered, service]
    }));
  };

  const handleSave = async () => {
    if (!tutorId || !userId) return;

    setSaving(true);
    try {
      let avatarUrl = formData.avatarUrl;

      // Upload new photo if selected
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('avatars')
          .upload(fileName, photoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        avatarUrl = publicUrl;

        // Update profile avatar
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
          teaching_mode: formData.teachingMode,
          gender: formData.gender,
          services_offered: formData.servicesOffered,
          specializations: formData.specializations,
          teaching_location: formData.teachingLocation,
          why_students_love: formData.whyStudentsLove
            .split('\n')
            .map(w => w.trim())
            .filter(w => w.length > 0),
          updated_at: new Date().toISOString(),
        })
        .eq("id", tutorId);

      if (profileError) throw profileError;

      // Update pricing tiers
      const { data: existingTiers } = await supabase
        .from("tutor_pricing_tiers")
        .select("*")
        .eq("tutor_id", tutorId);

      const standardTier = existingTiers?.find(t => t.tier_name === "Standard");
      const advancedTier = existingTiers?.find(t => t.tier_name === "Advanced");

      if (standardTier && formData.standardRate) {
        await supabase
          .from("tutor_pricing_tiers")
          .update({
            online_hourly_rate: toNumber(formData.standardRate),
            updated_at: new Date().toISOString(),
          })
          .eq("id", standardTier.id);
      }

      if (advancedTier && formData.advancedRate) {
        await supabase
          .from("tutor_pricing_tiers")
          .update({
            online_hourly_rate: toNumber(formData.advancedRate),
            updated_at: new Date().toISOString(),
          })
          .eq("id", advancedTier.id);
      }

      // Update hourly_rate in tutor_profiles (use standard rate as base)
      await supabase
        .from("tutor_profiles")
        .update({
          hourly_rate: toNumber(formData.standardRate),
        })
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="rates">Rates</TabsTrigger>
          <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
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
                <Label htmlFor="specializations">Specializations</Label>
                <Textarea
                  id="specializations"
                  value={formData.specializations}
                  onChange={(e) => setFormData(prev => ({ ...prev, specializations: e.target.value }))}
                  rows={3}
                  placeholder="e.g., Exam preparation, Special needs education, Advanced Mathematics"
                />
              </div>

              <div>
                <Label>Why Students Love Learning With You</Label>
                <p className="text-sm text-muted-foreground mb-2">One reason per line (up to 3)</p>
                <Textarea
                  value={formData.whyStudentsLove}
                  onChange={(e) => setFormData(prev => ({ ...prev, whyStudentsLove: e.target.value }))}
                  rows={4}
                  placeholder="Patient and encouraging teaching style&#10;Real-world examples that make concepts clear&#10;Flexible scheduling to fit student needs"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates">
          <Card>
            <CardHeader>
              <CardTitle>Hourly Rates</CardTitle>
              <CardDescription>
                Set your rates for different tier levels (KES per hour)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="standardRate">
                  Standard Tier Rate <span className="text-sm text-muted-foreground">(For foundational levels)</span>
                </Label>
                <Input
                  id="standardRate"
                  type="text"
                  value={formData.standardRate}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d]/g, '');
                    setFormData(prev => ({ ...prev, standardRate: value }));
                  }}
                  placeholder="e.g., 2000"
                />
                {formData.standardRate && (
                  <p className="text-sm text-muted-foreground mt-1">
                    KES {Math.round(Number(formData.standardRate)).toLocaleString()} per hour
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="advancedRate">
                  Advanced Tier Rate <span className="text-sm text-muted-foreground">(For IB, A-Level, IGCSE)</span>
                </Label>
                <Input
                  id="advancedRate"
                  type="text"
                  value={formData.advancedRate}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d]/g, '');
                    setFormData(prev => ({ ...prev, advancedRate: value }));
                  }}
                  placeholder="e.g., 3500"
                />
                {formData.advancedRate && (
                  <p className="text-sm text-muted-foreground mt-1">
                    KES {Math.round(Number(formData.advancedRate)).toLocaleString()} per hour
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qualifications">
          <Card>
            <CardHeader>
              <CardTitle>Qualifications & Certifications</CardTitle>
              <CardDescription>
                List your academic credentials (one per line)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.qualifications}
                onChange={(e) => setFormData(prev => ({ ...prev, qualifications: e.target.value }))}
                rows={8}
                placeholder="Bachelor of Education, Kenyatta University&#10;IGCSE Teacher Training Certificate&#10;TSC Registered Teacher"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Teaching Preferences</CardTitle>
              <CardDescription>
                Configure your teaching modes, location, and services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="mb-3 block">Teaching Modes *</Label>
                <div className="space-y-2">
                  {["Online", "Physical"].map(mode => (
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

              <div>
                <Label htmlFor="teachingLocation">Teaching Location (for physical sessions)</Label>
                <Input
                  id="teachingLocation"
                  value={formData.teachingLocation}
                  onChange={(e) => setFormData(prev => ({ ...prev, teachingLocation: e.target.value }))}
                  placeholder="e.g., Westlands, Nairobi or Student's home"
                />
              </div>

              <div>
                <Label className="mb-3 block">Services Offered</Label>
                <div className="space-y-2">
                  {["One-on-One Tutoring", "Group Sessions", "Exam Preparation", "Homework Help", "Assignment Support"].map(service => (
                    <div key={service} className="flex items-center space-x-2">
                      <Checkbox
                        id={`service-${service}`}
                        checked={formData.servicesOffered.includes(service)}
                        onCheckedChange={() => handleToggleService(service)}
                      />
                      <Label htmlFor={`service-${service}`} className="font-normal cursor-pointer">
                        {service}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photo">
          <Card>
            <CardHeader>
              <CardTitle>Profile Photo</CardTitle>
              <CardDescription>
                Upload a professional photo to help students connect with you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {photoPreview && (
                <div className="relative w-32 h-32">
                  <img
                    src={photoPreview}
                    alt="Profile preview"
                    className="w-full h-full object-cover rounded-full"
                  />
                  <button
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div>
                <Label htmlFor="photo">Upload New Photo</Label>
                <div className="mt-2">
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="cursor-pointer"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Recommended: Square image, minimum 400x400px
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3 mt-6">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate("/tutor-dashboard")}
          disabled={saving}
          size="lg"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default TutorProfileEdit;

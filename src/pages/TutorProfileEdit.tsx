import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const TutorProfileEdit = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tutorId, setTutorId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    bio: "",
    experienceYears: "",
    currentInstitution: "",
    qualifications: "",
    standardRate: "",
    advancedRate: "",
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

      setFormData({
        bio: tutorProfile.bio || "",
        experienceYears: tutorProfile.experience_years?.toString() || "",
        currentInstitution: tutorProfile.current_institution || "",
        qualifications: Array.isArray(tutorProfile.qualifications) 
          ? tutorProfile.qualifications.join('\n')
          : "",
        standardRate: standardTier?.online_hourly_rate 
          ? Math.round(Number(standardTier.online_hourly_rate)).toString()
          : "",
        advancedRate: advancedTier?.online_hourly_rate 
          ? Math.round(Number(advancedTier.online_hourly_rate)).toString()
          : "",
      });

      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const toNumber = (value: string): number => {
    const cleaned = value.replace(/[^\d]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  };

  const handleSave = async () => {
    if (!tutorId || !userId) return;

    setSaving(true);
    try {
      // Update tutor profile
      const { error: profileError } = await supabase
        .from("tutor_profiles")
        .update({
          bio: formData.bio,
          experience_years: toNumber(formData.experienceYears),
          current_institution: formData.currentInstitution,
          qualifications: formData.qualifications
            .split('\n')
            .map(q => q.trim())
            .filter(q => q.length > 0),
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
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Your Profile</h1>
        <p className="text-muted-foreground mt-2">
          Update your professional information and rates
        </p>
      </div>

      <Tabs defaultValue="bio" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bio">About</TabsTrigger>
          <TabsTrigger value="rates">Rates</TabsTrigger>
          <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
        </TabsList>

        <TabsContent value="bio">
          <Card>
            <CardHeader>
              <CardTitle>Professional Bio</CardTitle>
              <CardDescription>
                Tell students about your teaching approach and experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={6}
                  placeholder="Describe your teaching style, experience, and what makes you a great tutor..."
                />
              </div>

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
                <Label htmlFor="experience">Years of Experience</Label>
                <Input
                  id="experience"
                  type="number"
                  value={formData.experienceYears}
                  onChange={(e) => setFormData(prev => ({ ...prev, experienceYears: e.target.value }))}
                  placeholder="e.g., 5"
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

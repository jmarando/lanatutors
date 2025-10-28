import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Award, Upload, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { SEO } from "@/components/SEO";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CURRICULUM_OPTIONS = ["CBC", "8-4-4", "IGCSE", "IB", "American Curriculum"];
const TEACHING_MODES = ["Online", "In-Person", "Hybrid"];
const SERVICES = ["One-on-One Tutoring", "Group Sessions", "Exam Preparation", "Homework Help"];

const TutorProfileSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    bio: "",
    subjects: [] as string[],
    curriculum: [] as string[],
    teachingMode: [] as string[],
    servicesOffered: [] as string[],
    hourlyRate: "",
    experienceYears: "",
    currentInstitution: "",
    qualifications: "",
    specializations: "",
    whyStudentsLove: "",
    teachingLocation: "",
  });

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [subjectInput, setSubjectInput] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please sign up first to complete your profile",
        variant: "destructive"
      });
      navigate("/");
      return;
    }
    setUserId(session.user.id);
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a video smaller than 100MB",
          variant: "destructive"
        });
        return;
      }
      setVideoFile(file);
    }
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

  const addSubject = () => {
    if (subjectInput.trim() && !formData.subjects.includes(subjectInput.trim())) {
      setFormData({ ...formData, subjects: [...formData.subjects, subjectInput.trim()] });
      setSubjectInput("");
    }
  };

  const removeSubject = (subject: string) => {
    setFormData({ ...formData, subjects: formData.subjects.filter(s => s !== subject) });
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
      // Upload video and photo if provided
      let videoUrl = null;
      let photoUrl = null;

      if (videoFile) {
        const videoExt = videoFile.name.split('.').pop();
        const videoPath = `${userId}/teaching-video.${videoExt}`;
        
        const { error: videoError } = await supabase.storage
          .from('tutor-videos')
          .upload(videoPath, videoFile, { upsert: true });

        if (videoError) throw videoError;
        videoUrl = videoPath;
      }

      if (photoFile) {
        const photoExt = photoFile.name.split('.').pop();
        const photoPath = `${userId}/profile-photo.${photoExt}`;
        
        const { error: photoError } = await supabase.storage
          .from('avatars')
          .upload(photoPath, photoFile, { upsert: true });

        if (photoError) throw photoError;
        
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(photoPath);
        
        photoUrl = urlData.publicUrl;
      }

      // Create profile first
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          full_name: formData.currentInstitution, // This should come from auth metadata
          avatar_url: photoUrl,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      // Create tutor profile
      const { error: tutorError } = await supabase
        .from("tutor_profiles")
        .insert({
          user_id: userId,
          bio: formData.bio,
          subjects: formData.subjects,
          curriculum: formData.curriculum,
          teaching_mode: formData.teachingMode,
          services_offered: formData.servicesOffered,
          hourly_rate: parseFloat(formData.hourlyRate),
          experience_years: parseInt(formData.experienceYears),
          current_institution: formData.currentInstitution,
          qualifications: formData.qualifications.split('\n').filter(q => q.trim()),
          specializations: formData.specializations,
          why_students_love: formData.whyStudentsLove.split('\n').filter(w => w.trim()),
          teaching_location: formData.teachingLocation,
          verified: false // Requires admin approval
        });

      if (tutorError) throw tutorError;

      // Assign tutor role
      const { error: roleError } = await supabase.rpc('assign_user_role', {
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

  const progress = (step / 4) * 100;

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)] flex items-center justify-center p-6">
      <SEO
        title="Complete Your Tutor Profile - ElimuConnect"
        description="Set up your tutor profile to start teaching on ElimuConnect"
        keywords="tutor profile setup, online teaching, ElimuConnect"
      />
      
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Award className="w-10 h-10 text-primary" />
          <span className="text-3xl font-bold">ElimuConnect</span>
        </div>

        <Card>
          <CardHeader>
            <div className="mb-4">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">Step {step} of 4</p>
            </div>
            <CardTitle className="text-2xl">Complete Your Tutor Profile</CardTitle>
            <CardDescription>
              Set up your professional profile to start teaching on ElimuConnect
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Personal & Professional Information</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bio">Professional Bio *</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell students about your teaching philosophy and approach..."
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={4}
                      required
                    />
                    <p className="text-xs text-muted-foreground">This will be displayed on your profile</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="experienceYears">Years of Teaching Experience *</Label>
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
                      <Label htmlFor="currentInstitution">Current Institution</Label>
                      <Input
                        id="currentInstitution"
                        value={formData.currentInstitution}
                        onChange={(e) => setFormData({ ...formData, currentInstitution: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="qualifications">Qualifications (one per line) *</Label>
                    <Textarea
                      id="qualifications"
                      placeholder="Bachelor of Education&#10;PGDE in Mathematics&#10;TSC Certification"
                      value={formData.qualifications}
                      onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                      rows={4}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="photoUpload">Profile Photo *</Label>
                    <div className="flex items-center gap-4">
                      {photoFile && (
                        <span className="text-sm text-muted-foreground">{photoFile.name}</span>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => photoInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {photoFile ? "Change Photo" : "Upload Photo"}
                      </Button>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Teaching Details</h3>
                  
                  <div className="space-y-2">
                    <Label>Subjects You Teach *</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter subject (e.g., Mathematics)"
                        value={subjectInput}
                        onChange={(e) => setSubjectInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSubject())}
                      />
                      <Button type="button" onClick={addSubject}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.subjects.map(subject => (
                        <span key={subject} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2">
                          {subject}
                          <button type="button" onClick={() => removeSubject(subject)} className="hover:text-destructive">×</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Curriculum *</Label>
                    <div className="space-y-2">
                      {CURRICULUM_OPTIONS.map(curr => (
                        <div key={curr} className="flex items-center space-x-2">
                          <Checkbox
                            id={curr}
                            checked={formData.curriculum.includes(curr)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({ ...formData, curriculum: [...formData.curriculum, curr] });
                              } else {
                                setFormData({ ...formData, curriculum: formData.curriculum.filter(c => c !== curr) });
                              }
                            }}
                          />
                          <Label htmlFor={curr} className="cursor-pointer">{curr}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Teaching Mode *</Label>
                    <div className="space-y-2">
                      {TEACHING_MODES.map(mode => (
                        <div key={mode} className="flex items-center space-x-2">
                          <Checkbox
                            id={mode}
                            checked={formData.teachingMode.includes(mode)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({ ...formData, teachingMode: [...formData.teachingMode, mode] });
                              } else {
                                setFormData({ ...formData, teachingMode: formData.teachingMode.filter(m => m !== mode) });
                              }
                            }}
                          />
                          <Label htmlFor={mode} className="cursor-pointer">{mode}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teachingLocation">Teaching Location (if in-person)</Label>
                    <Input
                      id="teachingLocation"
                      placeholder="e.g., Nairobi, Westlands"
                      value={formData.teachingLocation}
                      onChange={(e) => setFormData({ ...formData, teachingLocation: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Services & Rates</h3>
                  
                  <div className="space-y-2">
                    <Label>Services Offered *</Label>
                    <div className="space-y-2">
                      {SERVICES.map(service => (
                        <div key={service} className="flex items-center space-x-2">
                          <Checkbox
                            id={service}
                            checked={formData.servicesOffered.includes(service)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({ ...formData, servicesOffered: [...formData.servicesOffered, service] });
                              } else {
                                setFormData({ ...formData, servicesOffered: formData.servicesOffered.filter(s => s !== service) });
                              }
                            }}
                          />
                          <Label htmlFor={service} className="cursor-pointer">{service}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Hourly Rate (KES) *</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      min="2000"
                      max="6000"
                      step="100"
                      placeholder="3000"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Range: KES 2,000 - 6,000. You'll earn 70% of this amount.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specializations">Specializations</Label>
                    <Textarea
                      id="specializations"
                      placeholder="e.g., KCSE Exam Prep, Weak Students, Advanced Learners"
                      value={formData.specializations}
                      onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whyStudentsLove">Why Students Love You (one per line)</Label>
                    <Textarea
                      id="whyStudentsLove"
                      placeholder="Patient and encouraging&#10;Makes complex topics simple&#10;Focuses on exam strategies"
                      value={formData.whyStudentsLove}
                      onChange={(e) => setFormData({ ...formData, whyStudentsLove: e.target.value })}
                      rows={4}
                    />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Teaching Video</h3>
                  
                  <div className="bg-muted/50 border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Video Guidelines</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• 2-3 minutes introducing yourself</li>
                      <li>• Explain your teaching approach</li>
                      <li>• Share what makes you unique</li>
                      <li>• Be authentic and enthusiastic!</li>
                      <li>• Good lighting and clear audio</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="videoUpload">Upload Teaching Video *</Label>
                    <div className="flex items-center gap-4">
                      {videoFile && (
                        <span className="text-sm text-muted-foreground">{videoFile.name}</span>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => videoInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {videoFile ? "Change Video" : "Upload Video"}
                      </Button>
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleVideoChange}
                        className="hidden"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Accepted formats: MP4, MOV, AVI (Max 100MB)
                    </p>
                  </div>

                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold mb-1">Final Step!</p>
                        <p className="text-muted-foreground">
                          Once you submit, your profile will be reviewed by our team. You'll be notified via email when approved (usually within 24-48 hours).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between gap-4 pt-4">
                {step > 1 && (
                  <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                )}
                {step < 4 ? (
                  <Button 
                    type="button" 
                    onClick={() => setStep(step + 1)}
                    className="ml-auto"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isLoading} className="ml-auto">
                    {isLoading ? "Submitting..." : "Submit Profile"}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TutorProfileSetup;

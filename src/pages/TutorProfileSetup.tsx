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
import { Award, Upload, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { SEO } from "@/components/SEO";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCurriculums, getLevelsForCurriculum, getSubjectsForCurriculumLevel } from "@/utils/curriculumData";
import { NAIROBI_LOCATIONS } from "@/utils/locationData";

const TEACHING_MODES = ["Online", "In-Person", "Hybrid"];
const SERVICES = ["One-on-One Tutoring", "Group Sessions", "Exam Preparation", "Homework Help"];

const TutorProfileSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
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
    teachingLocations: [] as string[],
  });

  // New state for hierarchical curriculum/level/subject selection
  const [curriculumLevels, setCurriculumLevels] = useState<{[key: string]: string[]}>({});
  const [selectedCurriculumForSubjects, setSelectedCurriculumForSubjects] = useState("");
  const [selectedLevelForSubjects, setSelectedLevelForSubjects] = useState("");

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  
  const curriculums = getCurriculums();
  const availableLevelsForSubjects = selectedCurriculumForSubjects 
    ? getLevelsForCurriculum(selectedCurriculumForSubjects) 
    : [];
  const availableSubjects = selectedCurriculumForSubjects && selectedLevelForSubjects
    ? getSubjectsForCurriculumLevel(selectedCurriculumForSubjects, selectedLevelForSubjects)
    : [];

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
    
    // Get user's name from auth metadata or profile
    const fullName = session.user.user_metadata?.full_name || 
                     session.user.user_metadata?.name || 
                     "";
    
    if (fullName) {
      setUserName(fullName);
    } else {
      // Try to get from profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .single();
      
      if (profile?.full_name) {
        setUserName(profile.full_name);
      }
    }
  };

  const handleCurriculumToggle = (curriculum: string, checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, curriculum: [...formData.curriculum, curriculum] });
    } else {
      setFormData({ ...formData, curriculum: formData.curriculum.filter(c => c !== curriculum) });
      // Remove associated levels
      const newLevels = { ...curriculumLevels };
      delete newLevels[curriculum];
      setCurriculumLevels(newLevels);
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
    }
  };

  const addSubject = (subject: string) => {
    if (subject && !formData.subjects.includes(subject)) {
      setFormData({ ...formData, subjects: [...formData.subjects, subject] });
    }
  };

  const removeSubject = (subject: string) => {
    setFormData({ ...formData, subjects: formData.subjects.filter(s => s !== subject) });
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
          full_name: userName,
          avatar_url: photoUrl,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      // Build teaching levels from curriculum levels
      const teachingLevels = Object.entries(curriculumLevels).flatMap(([curriculum, levels]) => 
        levels.map(level => `${curriculum} - ${level}`)
      );

      // Create tutor profile
      const { error: tutorError } = await supabase
        .from("tutor_profiles")
        .insert({
          user_id: userId,
          bio: formData.bio,
          subjects: formData.subjects,
          curriculum: formData.curriculum,
          teaching_mode: formData.teachingMode,
          teaching_levels: teachingLevels,
          services_offered: formData.servicesOffered,
          hourly_rate: parseFloat(formData.hourlyRate),
          experience_years: parseInt(formData.experienceYears),
          current_institution: formData.currentInstitution,
          qualifications: formData.qualifications.split('\n').filter(q => q.trim()),
          specializations: formData.specializations,
          why_students_love: formData.whyStudentsLove.split('\n').filter(w => w.trim()),
          teaching_location: formData.teachingLocations.join(', '),
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

  const progress = (step / 3) * 100;

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)] flex items-center justify-center p-6">
      <SEO
        title="Complete Your Tutor Profile - Lana"
        description="Set up your tutor profile to start teaching on Lana"
        keywords="tutor profile setup, online teaching, Lana"
      />
      
      <div className="w-full max-w-7xl">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Award className="w-10 h-10 text-primary" />
          <span className="text-3xl font-bold">Lana</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <Card>
            <CardHeader>
              <div className="mb-4">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground mt-2">Step {step} of 3</p>
              </div>
              <CardTitle className="text-2xl">Complete Your Tutor Profile</CardTitle>
              <CardDescription>
                Set up your professional profile to start teaching on Lana
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
                <div className="space-y-6">
                  <h3 className="font-semibold text-lg">Teaching Details</h3>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Step 1: Select Curricula *</h4>
                    <div className="space-y-2">
                      {curriculums.map(curr => (
                        <div key={curr} className="flex items-center space-x-2">
                          <Checkbox
                            id={`curriculum-${curr}`}
                            checked={formData.curriculum.includes(curr)}
                            onCheckedChange={(checked) => handleCurriculumToggle(curr, checked as boolean)}
                          />
                          <Label htmlFor={`curriculum-${curr}`} className="cursor-pointer">{curr}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {formData.curriculum.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Step 2: Select Levels/Years for Each Curriculum *</h4>
                      {formData.curriculum.map(curriculum => {
                        const levels = getLevelsForCurriculum(curriculum);
                        return (
                          <div key={curriculum} className="border rounded-lg p-4 space-y-2">
                            <p className="font-semibold text-sm">{curriculum}</p>
                            <div className="grid grid-cols-2 gap-2">
                              {levels.map(level => (
                                <div key={level.value} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`level-${curriculum}-${level.value}`}
                                    checked={curriculumLevels[curriculum]?.includes(level.value) || false}
                                    onCheckedChange={(checked) => handleLevelToggle(curriculum, level.value, checked as boolean)}
                                  />
                                  <Label htmlFor={`level-${curriculum}-${level.value}`} className="cursor-pointer text-sm">
                                    {level.label}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {Object.keys(curriculumLevels).length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Step 3: Add Subjects You Teach *</h4>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <Select 
                            value={selectedCurriculumForSubjects} 
                            onValueChange={(value) => {
                              setSelectedCurriculumForSubjects(value);
                              setSelectedLevelForSubjects("");
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select curriculum" />
                            </SelectTrigger>
                            <SelectContent>
                              {formData.curriculum.map(curr => (
                                <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select 
                            value={selectedLevelForSubjects} 
                            onValueChange={setSelectedLevelForSubjects}
                            disabled={!selectedCurriculumForSubjects}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={selectedCurriculumForSubjects ? "Select level" : "Select curriculum first"} />
                            </SelectTrigger>
                            <SelectContent>
                              {availableLevelsForSubjects.map(level => (
                                <SelectItem key={level.value} value={level.value}>
                                  {level.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedCurriculumForSubjects && selectedLevelForSubjects && (
                          <div className="border rounded-lg p-4">
                            <p className="text-sm text-muted-foreground mb-3">
                              Click subjects to add to your teaching list:
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {availableSubjects.map(subject => (
                                <Button
                                  key={subject}
                                  type="button"
                                  variant={formData.subjects.includes(subject) ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => {
                                    if (formData.subjects.includes(subject)) {
                                      removeSubject(subject);
                                    } else {
                                      addSubject(subject);
                                    }
                                  }}
                                  className="justify-start"
                                >
                                  {subject}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>Your Teaching Subjects ({formData.subjects.length})</Label>
                          <div className="flex flex-wrap gap-2 min-h-[60px] border rounded-lg p-3">
                            {formData.subjects.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No subjects selected yet. Choose subjects above.</p>
                            ) : (
                              formData.subjects.map(subject => (
                                <Badge key={subject} variant="secondary" className="gap-2">
                                  {subject}
                                  <button 
                                    type="button" 
                                    onClick={() => removeSubject(subject)} 
                                    className="hover:text-destructive"
                                  >
                                    ×
                                  </button>
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

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
                    <Label>Teaching Locations (if in-person)</Label>
                    <p className="text-sm text-muted-foreground mb-2">Select all areas where you can teach</p>
                    <div className="border rounded-lg p-4 bg-background max-h-[300px] overflow-y-auto space-y-2">
                      {NAIROBI_LOCATIONS.map((location) => (
                        <div key={location} className="flex items-center space-x-2">
                          <Checkbox
                            id={`location-${location}`}
                            checked={formData.teachingLocations.includes(location)}
                            onCheckedChange={(checked) => {
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
                            }}
                          />
                          <Label htmlFor={`location-${location}`} className="cursor-pointer text-sm">
                            {location}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {formData.teachingLocations.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Selected: {formData.teachingLocations.length} location{formData.teachingLocations.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Services, Rates & Additional Info</h3>
                  
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


              <div className="flex justify-between gap-4 pt-4">
                {step > 1 && (
                  <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                )}
                {step < 3 ? (
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

            {/* Preview Section */}
            <Card className="sticky top-6">
          <CardHeader>
            <CardTitle className="text-lg">Profile Preview</CardTitle>
            <CardDescription>See how your profile will appear to students</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Avatar & Name */}
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  {photoFile ? (
                    <AvatarImage src={URL.createObjectURL(photoFile)} />
                  ) : (
                    <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                      {userName.split(' ').map(n => n[0]).join('').slice(0, 2) || "T"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-semibold">{userName || "Your Name"}</p>
                  <p className="text-sm text-muted-foreground">
                    {formData.subjects.join(", ") || "Your Subjects"}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Bio */}
              {formData.bio && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">About Me</h4>
                  <p className="text-sm text-muted-foreground">{formData.bio}</p>
                </div>
              )}

              {/* Rate */}
              {formData.hourlyRate && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">KES {Number(formData.hourlyRate).toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">/hr</span>
                  </div>
                </div>
              )}

              {/* Experience */}
              {formData.experienceYears && (
                <div className="flex items-center gap-2 text-sm">
                  <Award className="w-4 h-4 text-primary" />
                  <span>{formData.experienceYears}+ years experience</span>
                </div>
              )}

              {/* Curriculum */}
              {formData.curriculum.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Curriculum</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.curriculum.map(curr => (
                      <Badge key={curr} variant="secondary" className="text-xs">{curr}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Services */}
              {formData.servicesOffered.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Services</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.servicesOffered.map(service => (
                      <Badge key={service} variant="outline" className="text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

export default TutorProfileSetup;

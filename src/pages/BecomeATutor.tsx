import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Award, Upload, CheckCircle, FileText, Shield, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { validateAndNormalizePhone } from "@/utils/phoneValidation";
import { SEO } from "@/components/SEO";


const TUTOR_REQUIREMENTS = [
  {
    icon: GraduationCap,
    title: "Teaching Experience",
    description: "Minimum 2 years of proven teaching or tutoring experience"
  },
  {
    icon: FileText,
    title: "Qualifications",
    description: "Bachelor's degree or Diploma in Education or relevant subject area required. Valid TSC (Teachers Service Commission) number or equivalent qualification number mandatory"
  },
  {
    icon: CheckCircle,
    title: "Subject Expertise",
    description: "Proven mastery and teaching track record in CBC, IGCSE or other major curriculum subjects with proven student success"
  }
];

const TERMS_AND_CONDITIONS = `
Lana Tutor Terms & Conditions

1. TUTOR QUALIFICATIONS
   - You must have at least 2 years of teaching/tutoring experience
   - You must hold valid teaching credentials and qualifications
   - All credentials are subject to verification

2. PROFESSIONAL CONDUCT
   - Maintain professional behavior at all times
   - Respect student privacy and confidentiality
   - Arrive punctually for all scheduled sessions
   - Provide quality, engaging instruction

 3. COMPENSATION
   - Set your own hourly rate between KES 2,000 - 6,000
   - Platform retains 30% service fee
   - You receive 70% of your set rate
   - Example: KES 3,000/hr rate = KES 2,100/hr earnings
   - Rates can be adjusted based on market feedback

4. SESSION REQUIREMENTS
   - Maintain 95% attendance rate for scheduled sessions
   - Provide 24-hour notice for cancellations
   - Submit session notes within 24 hours of completion
   - Respond to student messages within 12 hours

5. PLATFORM POLICIES
   - No direct payment from students outside the platform
   - Use only Lana platform for session coordination
   - Maintain a minimum 4.0-star rating
   - Complete at least 10 sessions per month to remain active

6. TERMINATION
   - Either party may terminate with 14 days notice
   - Immediate termination for policy violations
   - All pending payments will be settled upon termination

By accepting these terms, you agree to uphold Lana's standards of excellence and professionalism.
`;

const BecomeATutor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    currentSchool: "",
    yearsOfExperience: "",
    tscNumber: "",
    cambridgeQualification: "",
    teachingLevels: [] as string[],
    subjects: "",
  });

  const handleCvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a CV smaller than 5MB",
          variant: "destructive"
        });
        return;
      }
      setCvFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      toast({
        title: "Please accept terms",
        description: "You must agree to the terms and conditions to continue",
        variant: "destructive"
      });
      return;
    }

    if (!cvFile) {
      toast({
        title: "CV required",
        description: "Please upload your CV to continue",
        variant: "destructive"
      });
      return;
    }

    // Validate that at least one qualification number is provided
    if (!formData.tscNumber && !formData.cambridgeQualification) {
      toast({
        title: "Qualification required",
        description: "Please provide either TSC number or equivalent qualification number",
        variant: "destructive"
      });
      return;
    }

    // Validate that at least one teaching level is selected
    if (formData.teachingLevels.length === 0) {
      toast({
        title: "Teaching level required",
        description: "Please select at least one teaching level",
        variant: "destructive"
      });
      return;
    }

    // Validate and normalize phone number
    const phoneValidation = validateAndNormalizePhone(formData.phoneNumber);
    if (!phoneValidation.isValid) {
      toast({
        title: "Invalid phone number",
        description: phoneValidation.error,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      let cvUrl = "";
      
      // Create a temporary ID for file upload (before auth)
      const tempId = crypto.randomUUID();
      
      // Upload CV
      const fileExt = cvFile.name.split('.').pop();
      const filePath = `${tempId}/cv.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('tutor-cvs')
        .upload(filePath, cvFile);

      if (uploadError) throw uploadError;

      // Store the file path (not public URL) since bucket is private
      cvUrl = filePath;

      // Submit application with normalized phone number
      const { error: applicationError } = await supabase
        .from("tutor_applications")
        .insert({
          email: formData.email,
          full_name: formData.fullName,
          phone_number: phoneValidation.normalized,
          current_school: formData.currentSchool,
          years_of_experience: parseInt(formData.yearsOfExperience),
          tsc_number: formData.tscNumber || null,
          cambridge_qualification: formData.cambridgeQualification || null,
          teaching_level: formData.teachingLevels.length > 0 ? formData.teachingLevels.join(', ') : null,
          subjects: formData.subjects ? formData.subjects.split(',').map(s => s.trim()) : [],
          cv_url: cvUrl,
          agreed_to_terms: agreedToTerms,
          status: 'pending'
        });

      if (applicationError) throw applicationError;

      // Send acknowledgment email and WhatsApp
      await Promise.all([
        supabase.functions.invoke('send-application-acknowledgment', {
          body: { 
            email: formData.email,
            fullName: formData.fullName 
          }
        }),
        supabase.functions.invoke('send-tutor-application-whatsapp', {
          body: { 
            phoneNumber: phoneValidation.normalized,
            fullName: formData.fullName 
          }
        })
      ]);

      toast({
        title: "Application submitted!",
        description: "We'll review your application and contact you within 3-5 business days."
      });

      // Move to success step
      setStep(3);
    } catch (error: any) {
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
        title="Become a Tutor - Share Your Knowledge, Earn Income"
        description="Join Lana as a tutor and help Kenyan students excel. Earn competitive rates, set your own schedule, and make an impact. Apply today if you're a qualified teacher."
        keywords="become tutor Kenya, online teaching jobs Kenya, tutoring opportunities, earn teaching Kenya, KCSE tutor jobs"
      />
      
      <div className="w-full max-w-4xl">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8" aria-label="Lana Home">
          <Award className="w-10 h-10 text-primary" />
          <span className="text-3xl font-bold">Lana</span>
        </Link>

        <Card>
          <CardHeader>
            <div className="mb-4">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">Step {step} of 3</p>
            </div>
            <CardTitle className="text-2xl">Become a Tutor</CardTitle>
            <CardDescription>
              Join Kenya's leading tutoring platform through our simple 3-step vetting process.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-4">Our Vetting Process</h3>
                  <div className="space-y-3 mb-6">
                    <div className="flex gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                        1
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">Initial Vetting</h4>
                        <p className="text-sm text-muted-foreground">
                          We review your application and verify you meet our requirements below
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted-foreground text-background flex items-center justify-center font-semibold">
                        2
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">Expert Conversation</h4>
                        <p className="text-sm text-muted-foreground">
                          If you pass, we'll invite you for a 30-minute video call with a Lana Expert
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted-foreground text-background flex items-center justify-center font-semibold">
                        3
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">Enrollment & Profile Setup</h4>
                        <p className="text-sm text-muted-foreground">
                          Upon approval, you'll be enrolled to complete your profile and access the tutor dashboard
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-4">Tutor Requirements</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Before you apply, please ensure you meet the following requirements:
                  </p>
                </div>

                <div className="grid gap-4">
                  {TUTOR_REQUIREMENTS.map((req, index) => {
                    const Icon = req.icon;
                    return (
                      <Card key={index} className="border-2">
                        <CardContent className="p-4 flex gap-4">
                          <div className="flex-shrink-0">
                            <Icon className="w-8 h-8 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold mb-1">{req.title}</h4>
                            <p className="text-sm text-muted-foreground">{req.description}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>


                <div className="flex justify-end gap-4 pt-4">
                  <Link to="/">
                    <Button variant="outline">Cancel</Button>
                  </Link>
                  <Button onClick={() => setStep(2)}>
                    Continue to Application
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Basic Information</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This is initial information for vetting purposes. You'll complete your full tutor profile after approval.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                    />
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
                      <Label htmlFor="phoneNumber">Phone Number *</Label>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        placeholder="+254712345678 or 0712345678"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        required
                      />
                      <p className="text-xs text-muted-foreground">Accepts: +254, 254, or 0 prefix</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentSchool">Current School/Institution *</Label>
                      <Input
                        id="currentSchool"
                        placeholder="Where you currently teach"
                        value={formData.currentSchool}
                        onChange={(e) => setFormData({ ...formData, currentSchool: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="yearsOfExperience">Years of Experience *</Label>
                      <Input
                        id="yearsOfExperience"
                        type="number"
                        min="2"
                        value={formData.yearsOfExperience}
                        onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Teaching Levels *</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        "Early Years",
                        "Primary",
                        "Middle School/Junior Secondary",
                        "Secondary/A-Level"
                      ].map((level) => (
                        <div key={level} className="flex items-center space-x-2">
                          <Checkbox
                            id={level}
                            checked={formData.teachingLevels.includes(level)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  teachingLevels: [...formData.teachingLevels, level]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  teachingLevels: formData.teachingLevels.filter((l) => l !== level)
                                });
                              }
                            }}
                          />
                          <Label htmlFor={level} className="font-normal cursor-pointer">
                            {level}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subjects">Subjects *</Label>
                    <Input
                      id="subjects"
                      placeholder="e.g., Mathematics, Physics, Chemistry"
                      value={formData.subjects}
                      onChange={(e) => setFormData({ ...formData, subjects: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Separate multiple subjects with commas</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tscNumber">TSC Number</Label>
                      <Input
                        id="tscNumber"
                        placeholder="Teachers Service Commission number"
                        value={formData.tscNumber}
                        onChange={(e) => setFormData({ ...formData, tscNumber: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cambridgeQualification">Equivalent professional teaching registration</Label>
                      <Input
                        id="cambridgeQualification"
                        placeholder="e.g., Cambridge, other teaching qualification"
                        value={formData.cambridgeQualification}
                        onChange={(e) => setFormData({ ...formData, cambridgeQualification: e.target.value })}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-2">
                    * At least one qualification number (TSC or equivalent) is required
                  </p>

                  <div className="space-y-2">
                    <Label>Upload CV/Resume *</Label>
                    <div className="flex items-center gap-4">
                      {cvFile && (
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="text-muted-foreground">{cvFile.name}</span>
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {cvFile ? "Change File" : "Upload CV"}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleCvChange}
                        className="hidden"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Accepted formats: PDF, DOC, DOCX (Max 5MB)
                    </p>
                  </div>

                  <div className="flex items-start space-x-2 p-4 border rounded-lg bg-muted/30">
                    <Checkbox
                      id="terms"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label
                        htmlFor="terms"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        I accept the terms and conditions *
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        You agree to our Terms of Service and Privacy Policy. Platform retains 30% service fee from your hourly rate.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Submitting..." : "Submit Application"}
                  </Button>
                </div>
              </form>
            )}

            {step === 3 && (
              <div className="space-y-6 py-8 text-center">
                <div className="flex justify-center">
                  <div className="rounded-full bg-primary/10 p-6">
                    <CheckCircle className="w-16 h-16 text-primary" />
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-2xl mb-2">Application Submitted!</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Thank you for applying to become a Lana tutor. We've received your application and will begin the vetting process.
                  </p>
                </div>

                <div className="bg-muted/50 border rounded-lg p-6 max-w-md mx-auto">
                  <h4 className="font-semibold mb-3">What Happens Next?</h4>
                  <ul className="text-sm text-left space-y-3">
                    <li className="flex gap-2">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                        1
                      </div>
                      <div>
                        <span className="font-medium">Initial Vetting</span>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          We'll review your credentials within 3-5 business days
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-2">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                        2
                      </div>
                      <div>
                        <span className="font-medium">Expert Conversation</span>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          If you pass, we'll schedule a 30-minute video call with you
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-2">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                        3
                      </div>
                      <div>
                        <span className="font-medium">Enrollment & Dashboard Access</span>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          Upon approval, complete your profile and start teaching!
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>

                <Link to="/">
                  <Button size="lg">Return to Home</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Questions?{" "}
            <a href="mailto:support@learnwithlana.com" className="text-primary hover:underline">
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default BecomeATutor;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Users, BookOpen, Award, Phone } from "lucide-react";
import { SEO } from "@/components/SEO";

const ExpertConsultation = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    parentName: "",
    email: "",
    phoneNumber: "",
    numberOfChildren: "1",
    subjectsOfInterest: [] as string[],
    gradeLevels: [] as string[],
    packagePreferences: "",
    preferredContactTime: "",
    additionalNotes: "",
  });

  const subjects = [
    "Mathematics", "Physics", "Chemistry", "Biology",
    "English", "Kiswahili", "History", "Geography",
    "Business Studies", "Computer Studies"
  ];

  const gradeLevels = [
    "Grade 1-3", "Grade 4-6", "Grade 7-9",
    "Form 1", "Form 2", "Form 3", "Form 4",
    "IGCSE Year 1", "IGCSE Year 2", "A-Level"
  ];

  const handleSubjectToggle = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjectsOfInterest: prev.subjectsOfInterest.includes(subject)
        ? prev.subjectsOfInterest.filter(s => s !== subject)
        : [...prev.subjectsOfInterest, subject]
    }));
  };

  const handleGradeLevelToggle = (level: string) => {
    setFormData(prev => ({
      ...prev,
      gradeLevels: prev.gradeLevels.includes(level)
        ? prev.gradeLevels.filter(l => l !== level)
        : [...prev.gradeLevels, level]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.parentName || !formData.email || !formData.phoneNumber) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.subjectsOfInterest.length === 0) {
      toast.error("Please select at least one subject");
      return;
    }

    if (formData.gradeLevels.length === 0) {
      toast.error("Please select at least one grade level");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("expert_consultation_requests")
        .insert({
          parent_name: formData.parentName,
          email: formData.email,
          phone_number: formData.phoneNumber,
          number_of_children: parseInt(formData.numberOfChildren),
          subjects_of_interest: formData.subjectsOfInterest,
          grade_levels: formData.gradeLevels,
          package_preferences: formData.packagePreferences || null,
          preferred_contact_time: formData.preferredContactTime || null,
          additional_notes: formData.additionalNotes || null,
        });

      if (error) throw error;

      toast.success("Request submitted! Our expert will contact you within 24 hours.");
      navigate("/");
    } catch (error: any) {
      console.error("Error submitting request:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO 
        title="Talk to a Lana Tutors Expert - Custom Learning Packages"
        description="Get personalized guidance from our education experts to create the perfect learning package for your child or children. Multi-subject and family packages available."
      />
      
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Talk to a Lana Tutors Expert</h1>
            <p className="text-xl text-muted-foreground mb-6">
              Get personalized package recommendations tailored to your family's unique needs
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <Card>
                <CardContent className="pt-6 text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold">Multi-Child Packages</h3>
                  <p className="text-sm text-muted-foreground">Save up to 22% for siblings</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold">Multi-Subject Plans</h3>
                  <p className="text-sm text-muted-foreground">Cross-subject learning paths</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Award className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold">Custom Solutions</h3>
                  <p className="text-sm text-muted-foreground">Tailored to your goals</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Request Expert Consultation
              </CardTitle>
              <CardDescription>
                Fill out this form and our education expert will contact you to design the perfect package
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="parentName">Your Name *</Label>
                    <Input
                      id="parentName"
                      value={formData.parentName}
                      onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phoneNumber">Phone Number *</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="0712345678"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="numberOfChildren">Number of Children</Label>
                    <Select 
                      value={formData.numberOfChildren} 
                      onValueChange={(value) => setFormData({ ...formData, numberOfChildren: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {[1, 2, 3, 4, 5].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Subjects of Interest *</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {subjects.map(subject => (
                      <Badge
                        key={subject}
                        variant={formData.subjectsOfInterest.includes(subject) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleSubjectToggle(subject)}
                      >
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Grade Levels *</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {gradeLevels.map(level => (
                      <Badge
                        key={level}
                        variant={formData.gradeLevels.includes(level) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleGradeLevelToggle(level)}
                      >
                        {level}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="packagePreferences">Package Preferences (Optional)</Label>
                  <Textarea
                    id="packagePreferences"
                    value={formData.packagePreferences}
                    onChange={(e) => setFormData({ ...formData, packagePreferences: e.target.value })}
                    placeholder="e.g., Looking for intensive exam prep, prefer online sessions, need flexible scheduling..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="preferredContactTime">Preferred Contact Time (Optional)</Label>
                  <Input
                    id="preferredContactTime"
                    value={formData.preferredContactTime}
                    onChange={(e) => setFormData({ ...formData, preferredContactTime: e.target.value })}
                    placeholder="e.g., Weekdays 2-5 PM"
                  />
                </div>

                <div>
                  <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="additionalNotes"
                    value={formData.additionalNotes}
                    onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                    placeholder="Any other information you'd like us to know..."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Request Expert Consultation"
                  )}
                </Button>

                <p className="text-sm text-muted-foreground text-center">
                  Our expert will review your requirements and contact you within 24 hours to discuss customized package options
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default ExpertConsultation;
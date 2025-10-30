import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { CalendarIcon, Clock, CheckCircle, Users, GraduationCap, Target, Award, Sparkles, ArrowRight } from "lucide-react";
import { validateAndNormalizePhone } from "@/utils/phoneValidation";
import { SEO } from "@/components/SEO";
import { getCurriculums, getLevelsForCurriculum, getSubjectsForCurriculumLevel } from "@/utils/curriculumData";

const CONSULTATION_BENEFITS = [
  {
    icon: Users,
    title: "Personalized Matching",
    description: "We'll help identify the perfect tutor based on your student's specific needs, learning style, and academic goals"
  },
  {
    icon: GraduationCap,
    title: "Expert Guidance",
    description: "Speak with experienced education consultants who understand Kenya's education system inside and out"
  },
  {
    icon: Target,
    title: "Custom Learning Plan",
    description: "Get a tailored roadmap for success with subject recommendations, session frequency, and progress milestones"
  }
];

const BookConsultation = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("");
  const [formData, setFormData] = useState({
    parentName: "",
    studentName: "",
    phoneNumber: "",
    email: "",
    curriculum: "",
    gradeLevel: "",
    subjects: [] as string[],
    preferredMode: "",
    additionalNotes: "",
  });

  const curriculums = getCurriculums();
  const availableLevels = formData.curriculum ? getLevelsForCurriculum(formData.curriculum) : [];
  const availableSubjects = formData.curriculum && formData.gradeLevel 
    ? getSubjectsForCurriculumLevel(formData.curriculum, formData.gradeLevel) 
    : [];
  const [loading, setLoading] = useState(false);

  const availableTimeSlots = [
    "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
    "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"
  ];

  const progress = (step / 4) * 100;

  const validateStep1 = () => {
    if (!formData.parentName || !formData.studentName || !formData.phoneNumber || !formData.email) {
      toast.error("Please fill in all required fields");
      return false;
    }
    
    const phoneValidation = validateAndNormalizePhone(formData.phoneNumber);
    if (!phoneValidation.isValid) {
      toast.error(phoneValidation.error || "Invalid phone number");
      return false;
    }
    
    // Update the phone number to normalized format
    setFormData({ ...formData, phoneNumber: phoneValidation.normalized });
    return true;
  };

  const validateStep2 = () => {
    if (!formData.curriculum || !formData.gradeLevel || formData.subjects.length === 0 || !formData.preferredMode) {
      toast.error("Please fill in all required fields");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    // Step 1 is just benefits overview, no validation needed
    // Step 2 needs validateStep1 (basic info: parent, student, phone)
    // Step 3 needs validateStep2 (learning details: grade, subjects, mode) and validateStep3 (date & time)
    
    if (step === 2 && !validateStep1()) return;
    if (step === 3 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    
    if (step === 3) {
      handleSubmit();
    } else {
      setStep(step + 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Step 1: Create Google Calendar event
      const { data: calendarData, error: calendarError } = await supabase.functions.invoke(
        "create-consultation-calendar-event",
        {
          body: {
            parentName: formData.parentName,
            studentName: formData.studentName,
            email: formData.email,
            phoneNumber: formData.phoneNumber,
            consultationDate: selectedDate!.toISOString().split('T')[0],
            consultationTime: selectedTime,
            subjects: formData.subjects,
            gradeLevel: `${formData.curriculum} - ${formData.gradeLevel}`,
            notes: formData.additionalNotes,
          },
        }
      );

      if (calendarError) {
        console.error("Calendar event error:", calendarError);
        throw new Error("Failed to create calendar event");
      }

      const meetingLink = calendarData.meetingLink;

      // Step 2: Insert booking into database
      const { error: dbError } = await supabase.from("consultation_bookings").insert({
        parent_name: formData.parentName,
        student_name: formData.studentName,
        phone_number: formData.phoneNumber,
        email: formData.email,
        grade_level: `${formData.curriculum} - ${formData.gradeLevel}`,
        subjects_interest: formData.subjects,
        preferred_mode: formData.preferredMode,
        additional_notes: formData.additionalNotes,
        consultation_date: selectedDate!.toISOString().split('T')[0],
        consultation_time: selectedTime,
        status: "confirmed",
      });

      if (dbError) throw dbError;

      // Step 3: Send confirmation email
      await supabase.functions.invoke("send-consultation-booking-confirmation", {
        body: {
          email: formData.email,
          parentName: formData.parentName,
          studentName: formData.studentName,
          consultationDate: selectedDate!.toISOString().split('T')[0],
          consultationTime: selectedTime,
          meetingLink,
        },
      });

      // Step 4: Send WhatsApp notification
      await supabase.functions.invoke("send-consultation-whatsapp", {
        body: {
          phoneNumber: formData.phoneNumber,
          parentName: formData.parentName,
          studentName: formData.studentName,
          consultationDate: selectedDate!.toISOString().split('T')[0],
          consultationTime: selectedTime,
          meetingLink,
        },
      });

      toast.success("Consultation booked! Check your email and WhatsApp for details.");
      
      // Navigate to confirmation page with details
      navigate(`/consultation-confirmed?parentName=${encodeURIComponent(formData.parentName)}&studentName=${encodeURIComponent(formData.studentName)}&date=${selectedDate!.toISOString().split('T')[0]}&time=${encodeURIComponent(selectedTime)}&email=${encodeURIComponent(formData.email)}`);
    } catch (error: any) {
      console.error("Error booking consultation:", error);
      toast.error(error.message || "Failed to book consultation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)] py-12 px-6">
      <SEO
        title="Book Free Consultation - Get Expert Tutor Matching"
        description="Schedule a free 30-minute consultation with Lana education experts. Get personalized tutor recommendations, custom learning plan, and expert guidance for your child's success."
        keywords="free tutoring consultation Kenya, education consultation, tutor matching Kenya, academic counseling, learning plan Kenya"
      />
      
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8" aria-label="Lana Home">
          <Award className="w-10 h-10 text-primary" />
          <span className="text-3xl font-bold">Lana</span>
        </Link>

        <Card>
          <CardHeader>
            <div className="mb-4">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">Step {step} of 4</p>
            </div>
            <CardTitle className="text-3xl text-center">Book Your Free Consultation</CardTitle>
            <CardDescription className="text-base text-center">
              30-minute session with an education consultant
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 1: Choose Path or Why Book */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-xl mb-2 text-center">Choose Your Path</h3>
                  <p className="text-sm text-muted-foreground text-center mb-8">
                    Get started with personalized tutor matching
                  </p>
                </div>

                {/* Traditional Consultation - Now First */}
                <Card className="border-2 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <Users className="w-8 h-8 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg mb-2">Free 30-Min Consultation</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Speak with our education consultants for personalized guidance
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 mt-4">
                      {CONSULTATION_BENEFITS.map((benefit, index) => {
                        const Icon = benefit.icon;
                        return (
                          <div key={index} className="flex gap-3">
                            <Icon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <div>
                              <h5 className="font-medium text-sm">{benefit.title}</h5>
                              <p className="text-xs text-muted-foreground">{benefit.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <Button className="w-full mt-4" onClick={() => setStep(2)}>
                      Book Consultation
                    </Button>
                  </CardContent>
                </Card>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-muted"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-4 text-muted-foreground">or try our AI assessment</span>
                  </div>
                </div>

                {/* AI Assessment Option - Now Second */}
                <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(`/learning-assessment?studentName=${formData.studentName || 'Student'}&email=${formData.email || ''}`)}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary rounded-lg">
                        <Sparkles className="w-8 h-8 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-lg">AI Learning Assessment</h4>
                          <Badge variant="secondary" className="bg-primary/20">Recommended</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Take a quick 5-minute AI-powered assessment to instantly discover your learning style, 
                          identify gaps, and get matched with the perfect tutors for your needs.
                        </p>
                        <ul className="space-y-2 text-sm mb-4">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>Instant personalized tutor recommendations</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>AI analysis of learning style & gaps</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>Custom learning path created for you</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>Saves time - no need to wait for consultation</span>
                          </li>
                        </ul>
                        <Button variant="outline" className="w-full group">
                          Start AI Assessment
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>


                <div className="flex justify-center pt-4">
                  <Link to="/">
                    <Button variant="ghost">Back to Home</Button>
                  </Link>
                </div>
              </div>
            )}


            {/* Step 2: Basic Information */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Basic Information</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tell us about yourself and the student
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="parentName">Parent/Guardian Name *</Label>
                    <Input
                      id="parentName"
                      value={formData.parentName}
                      onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="studentName">Student Name *</Label>
                    <Input
                      id="studentName"
                      value={formData.studentName}
                      onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                      placeholder="Student's full name"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number *</Label>
                    <Input
                      id="phoneNumber"
                      placeholder="+254712345678 or 0712345678"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Accepts: +254, 254, or 0 prefix</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-between gap-4 pt-4">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button onClick={handleNext}>
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Learning Details & Schedule */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Learning Details</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Help us understand your student's needs
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="curriculum">Curriculum *</Label>
                  <Select 
                    value={formData.curriculum} 
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      curriculum: value, 
                      gradeLevel: "",
                      subjects: []
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select curriculum" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {curriculums.map(curriculum => (
                        <SelectItem key={curriculum} value={curriculum}>
                          {curriculum}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gradeLevel">Level/Year *</Label>
                    <Select 
                      value={formData.gradeLevel} 
                      onValueChange={(value) => setFormData({ ...formData, gradeLevel: value, subjects: [] })}
                      disabled={!formData.curriculum}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.curriculum ? "Select level" : "Select curriculum first"} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {availableLevels.map(level => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preferredMode">Preferred Learning Mode *</Label>
                    <Select value={formData.preferredMode} onValueChange={(value) => setFormData({ ...formData, preferredMode: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="online">Online Sessions</SelectItem>
                        <SelectItem value="in-person">In-Person Sessions</SelectItem>
                        <SelectItem value="both">Either/Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subjects">Subjects of Interest *</Label>
                  <div className="border rounded-md p-3 min-h-[100px] bg-muted/30">
                    {formData.subjects.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {formData.subjects.map(subject => (
                          <Badge key={subject} variant="secondary" className="cursor-pointer" onClick={() => {
                            setFormData({
                              ...formData,
                              subjects: formData.subjects.filter(s => s !== subject)
                            });
                          }}>
                            {subject} ×
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mb-2">
                        {!formData.curriculum || !formData.gradeLevel 
                          ? "Please select curriculum and level first" 
                          : "Select subjects from the dropdown below"}
                      </p>
                    )}
                    <Select
                      disabled={!formData.curriculum || !formData.gradeLevel}
                      onValueChange={(value) => {
                        if (!formData.subjects.includes(value)) {
                          setFormData({
                            ...formData,
                            subjects: [...formData.subjects, value]
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !formData.curriculum || !formData.gradeLevel 
                            ? "Select curriculum and level first" 
                            : "Add a subject..."
                        } />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50 max-h-[300px]">
                        {availableSubjects.map(subject => (
                          <SelectItem 
                            key={subject} 
                            value={subject}
                            disabled={formData.subjects.includes(subject)}
                          >
                            {subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">Click on badges to remove subjects</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="additionalNotes"
                    placeholder="Any specific concerns or questions you'd like to discuss?"
                    value={formData.additionalNotes}
                    onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" />
                    Select Date & Time
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Choose Date *</Label>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date() || date.getDay() === 0}
                        className="rounded-md border"
                      />
                      <p className="text-xs text-muted-foreground">Consultations available Monday-Saturday</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Choose Time *</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {availableTimeSlots.map((time) => (
                          <Button
                            key={time}
                            type="button"
                            variant={selectedTime === time ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedTime(time)}
                            className="justify-start"
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            {time}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>📧 What happens next:</strong><br/>
                    After booking, you'll receive:
                  </p>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1 ml-4 list-disc">
                    <li>Email with meeting link and calendar invite</li>
                    <li>WhatsApp confirmation with details</li>
                    <li>Reminders 1 day before and 1 hour before</li>
                  </ul>
                </div>

                <div className="flex justify-between gap-4 pt-4">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button onClick={handleNext} disabled={loading}>
                    {loading ? "Booking..." : "Confirm Booking"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && (
              <div className="space-y-6 py-8 text-center">
                <div className="flex justify-center">
                  <div className="rounded-full bg-primary/10 p-6">
                    <CheckCircle className="w-16 h-16 text-primary" />
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-2xl mb-2">Consultation Booked!</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Thank you for booking a consultation with Lana. We'll contact you shortly to confirm your appointment.
                  </p>
                </div>

                <div className="bg-muted/50 border rounded-lg p-6 max-w-md mx-auto text-left">
                  <h4 className="font-semibold mb-3 text-center">Your Consultation Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Parent:</span>
                      <span className="font-medium">{formData.parentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Student:</span>
                      <span className="font-medium">{formData.studentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium">{formData.phoneNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <span className="font-medium">{selectedDate?.toLocaleDateString('en-GB')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time:</span>
                      <span className="font-medium">{selectedTime}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 max-w-md mx-auto">
                  <h4 className="font-semibold mb-2 text-sm">What Happens Next?</h4>
                  <ul className="text-sm text-left space-y-2">
                    <li className="flex gap-2">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>We'll call you within 24 hours to confirm</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Receive meeting link via SMS & email</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Join the consultation at scheduled time</span>
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
      </div>
    </div>
  );
};

export default BookConsultation;
import { useState, useMemo, useEffect } from "react";
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
import { CalendarIcon, Clock, CheckCircle, Users, GraduationCap, Target, Award, AlertTriangle, DollarSign, Timer } from "lucide-react";
import { validateAndNormalizePhone } from "@/utils/phoneValidation";
import { SEO } from "@/components/SEO";
import { getCurriculums, getLevelsForCurriculum, getSubjectsForCurriculumLevel } from "@/utils/curriculumData";
import { startOfDay, addHours, format, parse, isAfter } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { EAT_TIMEZONE } from "@/utils/timezoneUtils";

const CONSULTATION_BENEFITS = [{
  icon: Users,
  title: "Personalized Matching",
  description: "We'll help identify the perfect tutor based on your student's specific needs, learning style, and academic goals"
}, {
  icon: GraduationCap,
  title: "Expert Guidance",
  description: "Speak with experienced education consultants who understand Kenya's education system inside and out"
}, {
  icon: Target,
  title: "Custom Learning Plan",
  description: "Get a tailored roadmap for success with subject recommendations, session frequency, and progress milestones"
}];

// Urgency options for qualifying questions
const URGENCY_OPTIONS = [
  { value: "immediately", label: "Immediately (within this week)" },
  { value: "within_1_week", label: "Within 1 week" },
  { value: "within_2_weeks", label: "Within 2 weeks" },
  { value: "within_month", label: "Within a month" },
  { value: "just_exploring", label: "Just exploring options" },
];

// Budget options for qualifying questions
const BUDGET_OPTIONS = [
  { value: "5000_10000", label: "KES 5,000 - 10,000 per month" },
  { value: "10000_20000", label: "KES 10,000 - 20,000 per month" },
  { value: "20000_30000", label: "KES 20,000 - 30,000 per month" },
  { value: "30000_plus", label: "KES 30,000+ per month" },
  { value: "not_sure", label: "Not sure yet" },
];

// 30-minute slots from 2pm to 7pm
const ALL_TIME_SLOTS = [
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", 
  "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM", 
  "06:00 PM", "06:30 PM", "07:00 PM"
];

const BookConsultation = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("");
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    parentName: "",
    studentName: "",
    phoneNumber: "",
    email: "",
    curriculum: "",
    gradeLevel: "",
    subjects: [] as string[],
    additionalNotes: "",
    // New qualifying question fields
    specificChallenges: "",
    urgency: "",
    budgetRange: ""
  });
  const curriculums = getCurriculums();
  const availableLevels = formData.curriculum ? getLevelsForCurriculum(formData.curriculum) : [];
  const availableSubjects = formData.curriculum && formData.gradeLevel ? getSubjectsForCurriculumLevel(formData.curriculum, formData.gradeLevel) : [];
  const [loading, setLoading] = useState(false);

  // Fetch booked slots when date changes
  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!selectedDate) {
        setBookedSlots([]);
        return;
      }
      
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from("consultation_bookings")
        .select("consultation_time")
        .eq("consultation_date", dateStr)
        .neq("status", "cancelled");
      
      if (!error && data) {
        setBookedSlots(data.map(b => b.consultation_time));
      }
    };
    
    fetchBookedSlots();
  }, [selectedDate]);

  // Filter time slots based on selected date, current time, and already booked slots
  const filteredTimeSlots = useMemo(() => {
    if (!selectedDate) return ALL_TIME_SLOTS;
    
    // Get current time in EAT timezone
    const nowUTC = new Date();
    const nowEAT = toZonedTime(nowUTC, EAT_TIMEZONE);
    const todayEAT = startOfDay(nowEAT);
    const selectedDayStart = startOfDay(selectedDate);
    
    // Check if selected date is today in EAT
    const isToday = selectedDayStart.getTime() === todayEAT.getTime();
    
    let slots = ALL_TIME_SLOTS;
    
    if (isToday) {
      // Today - only show slots at least 1 hour from now (in EAT)
      const oneHourFromNowEAT = addHours(nowEAT, 1);
      slots = slots.filter(timeSlot => {
        const slotTime = parse(timeSlot, "hh:mm a", selectedDate);
        return isAfter(slotTime, oneHourFromNowEAT);
      });
    }
    
    // Filter out already booked slots
    slots = slots.filter(slot => !bookedSlots.includes(slot));
    
    return slots;
  }, [selectedDate, bookedSlots]);
  
  // Disable dates in the past (using EAT timezone)
  const disablePastDates = (date: Date) => {
    const nowUTC = new Date();
    const nowEAT = toZonedTime(nowUTC, EAT_TIMEZONE);
    
    const todayEATString = format(nowEAT, 'yyyy-MM-dd');
    const calendarDateString = format(date, 'yyyy-MM-dd');
    
    return calendarDateString < todayEATString;
  };

  // Now 5 steps total
  const progress = step / 5 * 100;

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
    setFormData({
      ...formData,
      phoneNumber: phoneValidation.normalized
    });
    return true;
  };

  const validateStep2 = () => {
    if (!formData.curriculum || !formData.gradeLevel || formData.subjects.length === 0) {
      toast.error("Please fill in all required fields");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    // Qualifying questions step - challenges is required, others optional
    if (!formData.specificChallenges.trim()) {
      toast.error("Please describe the challenges your child is facing");
      return false;
    }
    if (!formData.urgency) {
      toast.error("Please select how soon you're looking to start");
      return false;
    }
    if (!formData.budgetRange) {
      toast.error("Please select your budget range");
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    // Step 1: Benefits overview (no validation)
    // Step 2: Basic info -> validateStep1
    // Step 3: Learning details -> validateStep2
    // Step 4: Qualifying questions -> validateStep3
    // Step 5: Schedule -> validateStep4 & submit

    if (step === 2 && !validateStep1()) return;
    if (step === 3 && !validateStep2()) return;
    if (step === 4 && !validateStep3()) return;
    if (step === 5 && !validateStep4()) return;
    
    if (step === 5) {
      handleSubmit();
    } else {
      setStep(step + 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const consultationDateStr = format(selectedDate!, 'yyyy-MM-dd');
      
      // Check if slot is still available
      const { data: existingBooking, error: checkError } = await supabase
        .from("consultation_bookings")
        .select("id")
        .eq("consultation_date", consultationDateStr)
        .eq("consultation_time", selectedTime)
        .neq("status", "cancelled")
        .maybeSingle();
      
      if (checkError) {
        console.error("Error checking slot availability:", checkError);
        throw new Error("Failed to verify slot availability");
      }
      
      if (existingBooking) {
        toast.error("This time slot was just booked by someone else. Please select a different time.");
        const { data: updatedBookings } = await supabase
          .from("consultation_bookings")
          .select("consultation_time")
          .eq("consultation_date", consultationDateStr)
          .neq("status", "cancelled");
        if (updatedBookings) {
          setBookedSlots(updatedBookings.map(b => b.consultation_time));
        }
        setSelectedTime("");
        setLoading(false);
        return;
      }
      
      // Create Google Calendar event
      const {
        data: calendarData,
        error: calendarError
      } = await supabase.functions.invoke("create-consultation-calendar-event", {
        body: {
          parentName: formData.parentName,
          studentName: formData.studentName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          consultationDate: consultationDateStr,
          consultationTime: selectedTime,
          subjects: formData.subjects,
          gradeLevel: `${formData.curriculum} - ${formData.gradeLevel}`,
          notes: formData.additionalNotes,
          specificChallenges: formData.specificChallenges,
          urgency: formData.urgency,
          budgetRange: formData.budgetRange
        }
      });
      if (calendarError) {
        console.error("Calendar event error:", calendarError);
        throw new Error("Failed to create calendar event");
      }
      const meetingLink = calendarData.meetingLink;

      // Insert booking into database with new qualifying fields
      const {
        error: dbError
      } = await supabase.from("consultation_bookings").insert({
        parent_name: formData.parentName,
        student_name: formData.studentName,
        phone_number: formData.phoneNumber,
        email: formData.email,
        grade_level: `${formData.curriculum} - ${formData.gradeLevel}`,
        subjects_interest: formData.subjects,
        preferred_mode: "consultation",
        additional_notes: formData.additionalNotes,
        consultation_date: consultationDateStr,
        consultation_time: selectedTime,
        status: "confirmed",
        meeting_link: meetingLink,
        // New qualifying question fields
        specific_challenges: formData.specificChallenges,
        urgency: formData.urgency,
        budget_range: formData.budgetRange
      });
      if (dbError) throw dbError;

      // Send confirmation email and WhatsApp
      await supabase.functions.invoke("send-consultation-booking-confirmation", {
        body: {
          email: formData.email,
          parentName: formData.parentName,
          studentName: formData.studentName,
          consultationDate: consultationDateStr,
          consultationTime: selectedTime,
          meetingLink,
          phoneNumber: formData.phoneNumber
        }
      });
      toast.success("Academic Assessment Call booked! Check your email and WhatsApp for details.");

      // Navigate to confirmation page
      navigate(`/consultation-confirmed?parentName=${encodeURIComponent(formData.parentName)}&studentName=${encodeURIComponent(formData.studentName)}&date=${consultationDateStr}&time=${encodeURIComponent(selectedTime)}&email=${encodeURIComponent(formData.email)}`);
    } catch (error: any) {
      console.error("Error booking consultation:", error);
      toast.error(error.message || "Failed to book consultation");
    } finally {
      setLoading(false);
    }
  };

  return <div className="min-h-screen bg-[image:var(--gradient-page)] py-12 px-6">
      <SEO 
        title="Book Academic Assessment Call - Expert Tutor Matching" 
        description="Schedule a 30-minute academic assessment call with Lana education experts. Get personalized tutor recommendations, custom learning plan, and expert guidance for your child's success." 
        keywords="academic assessment Kenya, tutoring consultation, education assessment, tutor matching Kenya, learning plan Kenya" 
      />
      
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8" aria-label="Lana Home">
          <Award className="w-10 h-10 text-primary" />
          <span className="text-3xl font-bold">Lana</span>
        </Link>

        <Card>
          <CardHeader className="pb-4">
            <div className="mb-3">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-1.5">Step {step} of 5</p>
            </div>
            <CardTitle className="text-2xl text-center">Book Your Academic Assessment Call</CardTitle>
            <CardDescription className="text-sm text-center">
              30-minute session with an education consultant
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Step 1: Choose Path or Why Book */}
            {step === 1 && <div className="space-y-6">
                {/* Academic Assessment Call Card */}
                <Card className="border-2 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <Users className="w-8 h-8 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg mb-2">Academic Assessment Call</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          A personalized 30-minute session to understand your child's needs and create a tailored learning plan
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 mt-4">
                      {CONSULTATION_BENEFITS.map((benefit, index) => {
                        const Icon = benefit.icon;
                        return <div key={index} className="flex gap-3">
                          <Icon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <h5 className="font-medium text-sm">{benefit.title}</h5>
                            <p className="text-xs text-muted-foreground">{benefit.description}</p>
                          </div>
                        </div>;
                      })}
                    </div>

                    <Button className="w-full mt-4" onClick={() => setStep(2)}>
                      Book Assessment Call
                    </Button>
                  </CardContent>
                </Card>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-muted"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-4 text-muted-foreground">or browse tutors directly</span>
                  </div>
                </div>

                <div className="flex justify-center pt-4">
                  <Link to="/tutors">
                    <Button variant="outline">Browse Tutors</Button>
                  </Link>
                </div>

                <div className="flex justify-center pt-4">
                  <Link to="/">
                    <Button variant="ghost">Back to Home</Button>
                  </Link>
                </div>
              </div>}


            {/* Step 2: Basic Information */}
            {step === 2 && <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Basic Information</h3>
                  <p className="text-sm text-muted-foreground">
                    Tell us about yourself and the student
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="parentName">Parent/Guardian Name *</Label>
                    <Input id="parentName" value={formData.parentName} onChange={e => setFormData({
                      ...formData,
                      parentName: e.target.value
                    })} placeholder="Your full name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="studentName">Student Name *</Label>
                    <Input id="studentName" value={formData.studentName} onChange={e => setFormData({
                      ...formData,
                      studentName: e.target.value
                    })} placeholder="Student's full name" required />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number *</Label>
                    <Input id="phoneNumber" placeholder="+254712345678 or 0712345678" value={formData.phoneNumber} onChange={e => setFormData({
                      ...formData,
                      phoneNumber: e.target.value
                    })} required />
                    <p className="text-xs text-muted-foreground">Accepts: +254, 254, or 0 prefix</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" placeholder="your@email.com" value={formData.email} onChange={e => setFormData({
                      ...formData,
                      email: e.target.value
                    })} required />
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
              </div>}

            {/* Step 3: Learning Details */}
            {step === 3 && <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Learning Details</h3>
                  <p className="text-sm text-muted-foreground">
                    Help us understand your student's academic profile
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="curriculum">Curriculum *</Label>
                    <Select value={formData.curriculum} onValueChange={value => setFormData({
                      ...formData,
                      curriculum: value,
                      gradeLevel: "",
                      subjects: []
                    })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select curriculum" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {curriculums.map(curriculum => <SelectItem key={curriculum} value={curriculum}>
                          {curriculum}
                        </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gradeLevel">Level/Year *</Label>
                    <Select value={formData.gradeLevel} onValueChange={value => setFormData({
                      ...formData,
                      gradeLevel: value,
                      subjects: []
                    })} disabled={!formData.curriculum}>
                      <SelectTrigger>
                        <SelectValue placeholder={formData.curriculum ? "Select level" : "Select curriculum first"} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {availableLevels.map(level => <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subjects">Subjects of Interest *</Label>
                  <div className="border rounded-md p-2.5 min-h-[60px] bg-muted/30">
                    {formData.subjects.length > 0 ? <div className="flex flex-wrap gap-1.5 mb-2">
                      {formData.subjects.map(subject => <Badge key={subject} variant="secondary" className="cursor-pointer text-xs" onClick={() => {
                        setFormData({
                          ...formData,
                          subjects: formData.subjects.filter(s => s !== subject)
                        });
                      }}>
                        {subject} ×
                      </Badge>)}
                    </div> : <p className="text-xs text-muted-foreground mb-2">
                      {!formData.curriculum || !formData.gradeLevel ? "Please select curriculum and level first" : "Select subjects from the dropdown below"}
                    </p>}
                    <Select disabled={!formData.curriculum || !formData.gradeLevel} onValueChange={value => {
                      if (!formData.subjects.includes(value)) {
                        setFormData({
                          ...formData,
                          subjects: [...formData.subjects, value]
                        });
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder={!formData.curriculum || !formData.gradeLevel ? "Select curriculum and level first" : "Add a subject..."} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50 max-h-[300px]">
                        {availableSubjects.map(subject => <SelectItem key={subject} value={subject} disabled={formData.subjects.includes(subject)}>
                          {subject}
                        </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">Click on badges to remove subjects</p>
                </div>

                <div className="flex justify-between gap-4 pt-4">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button onClick={handleNext}>
                    Continue
                  </Button>
                </div>
              </div>}

            {/* Step 4: Qualifying Questions (NEW) */}
            {step === 4 && <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Tell Us More About Your Child's Needs</h3>
                  <p className="text-sm text-muted-foreground">
                    This helps us prepare for a more productive assessment call
                  </p>
                </div>

                {/* Specific Challenges */}
                <div className="space-y-2">
                  <Label htmlFor="specificChallenges" className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    What specific challenges is your child facing? *
                  </Label>
                  <Textarea 
                    id="specificChallenges" 
                    placeholder="e.g., Struggling with algebra concepts, difficulty concentrating during homework, falling behind in class, preparing for upcoming exams..."
                    value={formData.specificChallenges}
                    onChange={e => setFormData({
                      ...formData,
                      specificChallenges: e.target.value
                    })}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">Be as specific as possible so we can better assist you</p>
                </div>

                {/* Urgency */}
                <div className="space-y-2">
                  <Label htmlFor="urgency" className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-blue-500" />
                    How soon are you looking to start tutoring? *
                  </Label>
                  <Select value={formData.urgency} onValueChange={value => setFormData({
                    ...formData,
                    urgency: value
                  })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select urgency" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {URGENCY_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Budget Range */}
                <div className="space-y-2">
                  <Label htmlFor="budgetRange" className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    What is your budget range per month? *
                  </Label>
                  <Select value={formData.budgetRange} onValueChange={value => setFormData({
                    ...formData,
                    budgetRange: value
                  })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select budget range" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {BUDGET_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">This helps us recommend the right package for your needs</p>
                </div>

                {/* Additional Notes */}
                <div className="space-y-2">
                  <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
                  <Textarea 
                    id="additionalNotes" 
                    placeholder="Any other information you'd like us to know..."
                    value={formData.additionalNotes}
                    onChange={e => setFormData({
                      ...formData,
                      additionalNotes: e.target.value
                    })}
                    rows={2}
                    className="resize-none"
                  />
                </div>

                <div className="flex justify-between gap-4 pt-4">
                  <Button variant="outline" onClick={() => setStep(3)}>
                    Back
                  </Button>
                  <Button onClick={handleNext}>
                    Continue to Schedule
                  </Button>
                </div>
              </div>}

            {/* Step 5: Schedule Date & Time */}
            {step === 5 && <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Select Date & Time</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose a convenient time for your academic assessment call
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Choose Date *</Label>
                    <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} disabled={date => {
                      return disablePastDates(date) || date.getDay() === 0;
                    }} className="rounded-md border pointer-events-auto" />
                    <p className="text-xs text-muted-foreground">Consultations available Monday-Saturday</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Choose Time *</Label>
                      <span className="text-xs text-muted-foreground">EAT</span>
                    </div>
                    {filteredTimeSlots.length === 0 ? <div className="text-sm text-muted-foreground p-3 border rounded-md">
                      No available time slots for today. Please select a future date or try again later.
                    </div> : <div className="grid grid-cols-2 gap-2">
                      {filteredTimeSlots.map(time => <Button key={time} type="button" variant={selectedTime === time ? "default" : "outline"} size="sm" onClick={() => setSelectedTime(time)} className="justify-start">
                        <Clock className="w-4 h-4 mr-2" />
                        {time}
                      </Button>)}
                    </div>}
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>📧 What happens next:</strong><br />
                    After booking, you'll receive:
                  </p>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1 ml-4 list-disc">
                    <li>Email with meeting link and calendar invite</li>
                    <li>Reminders 1 day before and 1 hour before</li>
                  </ul>
                </div>

                <div className="flex justify-between gap-4 pt-4">
                  <Button variant="outline" onClick={() => setStep(4)}>
                    Back
                  </Button>
                  <Button onClick={handleNext} disabled={loading}>
                    {loading ? "Booking..." : "Confirm Assessment Call"}
                  </Button>
                </div>
              </div>}

            {/* Step 6: Confirmation (now step 6 but we navigate away so not shown) */}
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default BookConsultation;
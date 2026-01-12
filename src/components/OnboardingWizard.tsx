import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  Wallet, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  X
} from "lucide-react";
import { getCurriculums, getLevelsForCurriculum, getSubjectsForCurriculumLevel } from "@/utils/curriculumData";
import { useNavigate } from "react-router-dom";

interface OnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WizardData {
  studentName: string;
  curriculum: string;
  gradeLevel: string;
  subjects: string[];
  sessionsPerWeek: string;
  preferredDays: string[];
  duration: string;
  budget: string;
}

const STEPS = [
  { id: 1, title: "Student Details", icon: GraduationCap, description: "Tell us about the student" },
  { id: 2, title: "Subject Needs", icon: BookOpen, description: "What subjects need help?" },
  { id: 3, title: "Schedule", icon: Calendar, description: "When are you available?" },
  { id: 4, title: "Package Interest", icon: Wallet, description: "What's your preference?" },
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const OnboardingWizard = ({ open, onOpenChange }: OnboardingWizardProps) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    studentName: "",
    curriculum: "",
    gradeLevel: "",
    subjects: [],
    sessionsPerWeek: "",
    preferredDays: [],
    duration: "",
    budget: "",
  });

  const curricula = getCurriculums();
  const availableLevels = data.curriculum ? getLevelsForCurriculum(data.curriculum) : [];
  const availableSubjects = data.curriculum && data.gradeLevel 
    ? getSubjectsForCurriculumLevel(data.curriculum, data.gradeLevel) 
    : [];

  const progress = (currentStep / STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - navigate to request learning plan with data
      const queryParams = new URLSearchParams({
        studentName: data.studentName,
        curriculum: data.curriculum,
        gradeLevel: data.gradeLevel,
        subjects: data.subjects.join(","),
        sessionsPerWeek: data.sessionsPerWeek,
        preferredDays: data.preferredDays.join(","),
        duration: data.duration,
        budget: data.budget,
      });
      onOpenChange(false);
      navigate(`/request-learning-plan?wizard=true&${queryParams.toString()}`);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleSubject = (subject: string) => {
    setData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  const toggleDay = (day: string) => {
    setData(prev => ({
      ...prev,
      preferredDays: prev.preferredDays.includes(day)
        ? prev.preferredDays.filter(d => d !== day)
        : [...prev.preferredDays, day]
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.studentName && data.curriculum && data.gradeLevel;
      case 2:
        return data.subjects.length > 0;
      case 3:
        return data.sessionsPerWeek && data.preferredDays.length > 0;
      case 4:
        return data.duration && data.budget;
      default:
        return false;
    }
  };

  const handleCurriculumChange = (value: string) => {
    setData(prev => ({ ...prev, curriculum: value, gradeLevel: "", subjects: [] }));
  };

  const handleGradeLevelChange = (value: string) => {
    setData(prev => ({ ...prev, gradeLevel: value, subjects: [] }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Let's start with the student</h3>
              <p className="text-sm text-muted-foreground">Tell us about who needs tutoring</p>
            </div>
            
            <div>
              <Label htmlFor="studentName">Student's Name</Label>
              <Input
                id="studentName"
                value={data.studentName}
                onChange={(e) => setData(prev => ({ ...prev, studentName: e.target.value }))}
                placeholder="e.g., Mary Wanjiku"
              />
            </div>

            <div>
              <Label htmlFor="curriculum">Curriculum</Label>
              <Select value={data.curriculum} onValueChange={handleCurriculumChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select curriculum" />
                </SelectTrigger>
                <SelectContent className="bg-background z-[100]">
                  {curricula.map((curr) => (
                    <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="gradeLevel">Grade Level</Label>
              <Select 
                value={data.gradeLevel} 
                onValueChange={handleGradeLevelChange}
                disabled={!data.curriculum}
              >
                <SelectTrigger>
                  <SelectValue placeholder={data.curriculum ? "Select grade" : "Select curriculum first"} />
                </SelectTrigger>
                <SelectContent className="bg-background z-[100]">
                  {availableLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Which subjects need help?</h3>
              <p className="text-sm text-muted-foreground">Select all that apply</p>
            </div>

            {availableSubjects.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-2">
                {availableSubjects.map((subject) => (
                  <Badge
                    key={subject}
                    variant={data.subjects.includes(subject) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/20 py-2 px-3 text-sm"
                    onClick={() => toggleSubject(subject)}
                  >
                    {subject}
                    {data.subjects.includes(subject) && <X className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="p-6 border rounded-lg bg-muted/50 text-center text-muted-foreground">
                Please complete step 1 first
              </div>
            )}

            {data.subjects.length > 0 && (
              <div className="bg-primary/5 rounded-lg p-3">
                <p className="text-sm font-medium">Selected: {data.subjects.length} subject(s)</p>
                <p className="text-xs text-muted-foreground">{data.subjects.join(", ")}</p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">When are you available?</h3>
              <p className="text-sm text-muted-foreground">Help us plan your schedule</p>
            </div>

            <div>
              <Label>Sessions per week</Label>
              <Select 
                value={data.sessionsPerWeek} 
                onValueChange={(v) => setData(prev => ({ ...prev, sessionsPerWeek: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="How many sessions?" />
                </SelectTrigger>
                <SelectContent className="bg-background z-[100]">
                  <SelectItem value="1-2">1-2 sessions/week</SelectItem>
                  <SelectItem value="3-4">3-4 sessions/week</SelectItem>
                  <SelectItem value="5-6">5-6 sessions/week</SelectItem>
                  <SelectItem value="daily">Daily sessions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Preferred days</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {DAYS.map((day) => (
                  <Badge
                    key={day}
                    variant={data.preferredDays.includes(day) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/20 py-2 px-3"
                    onClick={() => toggleDay(day)}
                  >
                    {day.slice(0, 3)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Almost there!</h3>
              <p className="text-sm text-muted-foreground">Let us know your preferences</p>
            </div>

            <div>
              <Label>How long do you need tutoring?</Label>
              <Select 
                value={data.duration} 
                onValueChange={(v) => setData(prev => ({ ...prev, duration: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent className="bg-background z-[100]">
                  <SelectItem value="2">2 weeks (trial)</SelectItem>
                  <SelectItem value="4">1 month</SelectItem>
                  <SelectItem value="8">2 months</SelectItem>
                  <SelectItem value="12">3 months (term)</SelectItem>
                  <SelectItem value="ongoing">Ongoing (no end date)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Budget preference</Label>
              <Select 
                value={data.budget} 
                onValueChange={(v) => setData(prev => ({ ...prev, budget: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select budget range" />
                </SelectTrigger>
                <SelectContent className="bg-background z-[100]">
                  <SelectItem value="economy">Economy (Most affordable)</SelectItem>
                  <SelectItem value="standard">Standard (Balanced quality & price)</SelectItem>
                  <SelectItem value="premium">Premium (Expert tutors)</SelectItem>
                  <SelectItem value="flexible">Flexible (Recommend what's best)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    You're all set!
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    Click "Get My Learning Plan" and our team will create a personalized plan for {data.studentName || "your child"} within 24 hours.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Find Your Perfect Tutor
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between">
            {STEPS.map((step) => (
              <div 
                key={step.id}
                className={`flex flex-col items-center ${
                  step.id === currentStep ? 'text-primary' : 
                  step.id < currentStep ? 'text-primary/60' : 'text-muted-foreground'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  step.id === currentStep ? 'bg-primary text-primary-foreground' :
                  step.id < currentStep ? 'bg-primary/20 text-primary' : 'bg-muted'
                }`}>
                  {step.id < currentStep ? <CheckCircle2 className="w-4 h-4" /> : step.id}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="py-4">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentStep > 1 && (
            <Button variant="outline" onClick={handleBack} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <Button 
            onClick={handleNext} 
            disabled={!canProceed()}
            className="flex-1"
          >
            {currentStep === STEPS.length ? (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Get My Learning Plan
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

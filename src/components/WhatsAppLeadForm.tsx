import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, MessageCircle, Loader2, X } from "lucide-react";
import { getCurriculums, getLevelsForCurriculum, getSubjectsForCurriculumLevel } from "@/utils/curriculumData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WhatsAppLeadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LeadData {
  parentName: string;
  phoneNumber: string;
  curriculum: string;
  gradeLevel: string;
  subjects: string[];
  location: string;
}

export const WhatsAppLeadForm = ({ open, onOpenChange }: WhatsAppLeadFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [data, setData] = useState<LeadData>({
    parentName: "",
    phoneNumber: "",
    curriculum: "",
    gradeLevel: "",
    subjects: [],
    location: "",
  });

  const curricula = getCurriculums();
  const availableLevels = data.curriculum ? getLevelsForCurriculum(data.curriculum) : [];
  const availableSubjects = data.curriculum && data.gradeLevel 
    ? getSubjectsForCurriculumLevel(data.curriculum, data.gradeLevel) 
    : [];

  const canSubmit = data.parentName && data.phoneNumber && data.curriculum && data.gradeLevel && data.subjects.length > 0;

  const handleCurriculumChange = (value: string) => {
    setData(prev => ({ ...prev, curriculum: value, gradeLevel: "", subjects: [] }));
  };

  const handleGradeLevelChange = (value: string) => {
    setData(prev => ({ ...prev, gradeLevel: value, subjects: [] }));
  };

  const toggleSubject = (subject: string) => {
    setData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    
    setIsSubmitting(true);
    
    try {
      // Store the lead in expert_consultation_requests table
      const { error } = await supabase
        .from('expert_consultation_requests')
        .insert({
          parent_name: data.parentName,
          phone_number: data.phoneNumber,
          email: '', // Not collected in this form
          grade_levels: [data.gradeLevel],
          subjects_of_interest: data.subjects,
          number_of_children: 1,
          additional_notes: `Curriculum: ${data.curriculum}, Location: ${data.location || 'Not specified'}`,
          status: 'pending',
        });

      if (error) {
        console.error('Error saving lead:', error);
        toast.error('Something went wrong. Please try again.');
        return;
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form after close animation
    setTimeout(() => {
      setIsSubmitted(false);
      setData({
        parentName: "",
        phoneNumber: "",
        curriculum: "",
        gradeLevel: "",
        subjects: [],
        location: "",
      });
    }, 300);
  };

  if (isSubmitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Thank You, {data.parentName}!</h3>
            <p className="text-muted-foreground mb-6">
              Our team will message you on WhatsApp shortly to discuss tutoring options for your child.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2 mb-6">
              <p className="text-sm"><strong>Grade:</strong> {data.gradeLevel}</p>
              <p className="text-sm"><strong>Subjects:</strong> {data.subjects.join(", ")}</p>
              <p className="text-sm"><strong>Curriculum:</strong> {data.curriculum}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Expect a response within 30 minutes during business hours (8am - 8pm EAT)
            </p>
            <Button onClick={handleClose} className="mt-6 w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
            Chat with Our Team
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Share a few details so we can connect you with the right tutor
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="parentName">Your Name *</Label>
            <Input
              id="parentName"
              value={data.parentName}
              onChange={(e) => setData(prev => ({ ...prev, parentName: e.target.value }))}
              placeholder="e.g., Jane Muthoni"
            />
          </div>

          <div>
            <Label htmlFor="phoneNumber">WhatsApp Number *</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={data.phoneNumber}
              onChange={(e) => setData(prev => ({ ...prev, phoneNumber: e.target.value }))}
              placeholder="e.g., 0712345678"
            />
          </div>

          <div>
            <Label htmlFor="curriculum">Curriculum *</Label>
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
            <Label htmlFor="gradeLevel">Child's Grade *</Label>
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

          <div>
            <Label>Subjects Needed * <span className="text-muted-foreground text-xs">(Select all that apply)</span></Label>
            {data.gradeLevel ? (
              <div className="flex flex-wrap gap-2 mt-2 p-3 border rounded-md bg-muted/30 max-h-40 overflow-y-auto">
                {availableSubjects.map((subject) => (
                  <Badge
                    key={subject}
                    variant={data.subjects.includes(subject) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/20 py-1.5 px-3 text-sm"
                    onClick={() => toggleSubject(subject)}
                  >
                    {subject}
                    {data.subjects.includes(subject) && <X className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="p-3 border rounded-md bg-muted/30 text-muted-foreground text-sm">
                Select curriculum and grade first
              </div>
            )}
            {data.subjects.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Selected: {data.subjects.length} subject(s)
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="location">Location (Optional)</Label>
            <Input
              id="location"
              value={data.location}
              onChange={(e) => setData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="e.g., Nairobi, Westlands"
            />
          </div>
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={!canSubmit || isSubmitting}
          className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <MessageCircle className="w-4 h-4 mr-2" />
              Submit & Chat on WhatsApp
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

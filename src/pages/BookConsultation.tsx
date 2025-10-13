import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { CalendarIcon, Clock } from "lucide-react";

const BookConsultation = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("");
  const [formData, setFormData] = useState({
    parentName: "",
    studentName: "",
    phoneNumber: "",
    email: "",
    gradeLevel: "",
    subjects: "",
    preferredMode: "",
    additionalNotes: "",
  });
  const [loading, setLoading] = useState(false);

  const availableTimeSlots = [
    "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
    "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return;
    }

    if (!formData.phoneNumber.match(/^254[0-9]{9}$/)) {
      toast.error("Phone number must be in format 254XXXXXXXXX");
      return;
    }

    setLoading(true);

    try {
      // Create consultation booking
      const { error } = await supabase.from("consultation_bookings").insert({
        parent_name: formData.parentName,
        student_name: formData.studentName,
        phone_number: formData.phoneNumber,
        email: formData.email,
        grade_level: formData.gradeLevel,
        subjects_interest: formData.subjects.split(",").map(s => s.trim()),
        preferred_mode: formData.preferredMode,
        additional_notes: formData.additionalNotes,
        consultation_date: selectedDate.toISOString().split('T')[0],
        consultation_time: selectedTime,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Consultation booked! We'll contact you shortly to confirm.");
      navigate("/");
    } catch (error: any) {
      console.error("Error booking consultation:", error);
      toast.error(error.message || "Failed to book consultation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)] py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Book Your Free Consultation</CardTitle>
            <CardDescription className="text-base">
              Schedule a 30-minute session with an ElimuConnect consultant to discuss your learning goals and find the perfect tutor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="parentName">Parent/Guardian Name *</Label>
                  <Input
                    id="parentName"
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentName">Student Name *</Label>
                  <Input
                    id="studentName"
                    value={formData.studentName}
                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number (254XXXXXXXXX) *</Label>
                  <Input
                    id="phoneNumber"
                    placeholder="254712345678"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Learning Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gradeLevel">Grade Level *</Label>
                  <Select value={formData.gradeLevel} onValueChange={(value) => setFormData({ ...formData, gradeLevel: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grade-1-3">Grade 1-3 (Lower Primary)</SelectItem>
                      <SelectItem value="grade-4-6">Grade 4-6 (Upper Primary)</SelectItem>
                      <SelectItem value="grade-7-9">Grade 7-9 (Junior Secondary)</SelectItem>
                      <SelectItem value="form-1-2">Form 1-2</SelectItem>
                      <SelectItem value="form-3-4">Form 3-4 (KCSE)</SelectItem>
                      <SelectItem value="igcse">IGCSE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferredMode">Preferred Learning Mode *</Label>
                  <Select value={formData.preferredMode} onValueChange={(value) => setFormData({ ...formData, preferredMode: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="in-person">In-Person</SelectItem>
                      <SelectItem value="both">Either/Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subjects">Subjects of Interest (comma-separated) *</Label>
                <Input
                  id="subjects"
                  placeholder="e.g., Mathematics, Physics, Chemistry"
                  value={formData.subjects}
                  onChange={(e) => setFormData({ ...formData, subjects: e.target.value })}
                  required
                />
              </div>

              {/* Schedule Selection */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Select Consultation Date & Time
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

              <div className="space-y-2">
                <Label htmlFor="additionalNotes">Additional Notes</Label>
                <Textarea
                  id="additionalNotes"
                  placeholder="Any specific concerns or questions you'd like to discuss?"
                  value={formData.additionalNotes}
                  onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                  rows={4}
                />
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Booking..." : "Book Free Consultation"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookConsultation;

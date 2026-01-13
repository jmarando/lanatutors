import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Plus, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface ManualBookingDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Parent {
  id: string;
  full_name: string;
  phone_number: string | null;
  email?: string;
}

interface Student {
  id: string;
  full_name: string;
  parent_id: string;
}

interface Tutor {
  id: string;
  user_id: string;
  full_name: string;
  subjects: string[];
  hourly_rate: number | null;
}

const GRADES_BY_CURRICULUM: Record<string, string[]> = {
  "CBC": ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"],
  "8-4-4": ["Form 1", "Form 2", "Form 3", "Form 4"],
  "IGCSE": ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11"],
  "IB": ["Grade 9", "Grade 10", "Grade 11", "Grade 12"],
  "American": ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"],
  "British": ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"],
};

const CURRICULA = ["CBC", "8-4-4", "IGCSE", "IB", "American", "British"];

export function ManualBookingDialog({ open, onClose, onSuccess }: ManualBookingDialogProps) {
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Mode: existing or new parent
  const [parentMode, setParentMode] = useState<"existing" | "new">("existing");

  // Form state - existing parent
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  
  // Form state - new parent
  const [newParentName, setNewParentName] = useState("");
  const [newParentEmail, setNewParentEmail] = useState("");
  const [newParentPhone, setNewParentPhone] = useState("");
  
  // Form state - new student
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentGrade, setNewStudentGrade] = useState("");
  const [newStudentCurriculum, setNewStudentCurriculum] = useState("");
  const [addNewStudent, setAddNewStudent] = useState(false);

  // Booking details
  const [selectedTutorId, setSelectedTutorId] = useState<string>("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [subject, setSubject] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [classType, setClassType] = useState<"online" | "physical">("online");
  const [notes, setNotes] = useState("");
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [notifyTutor, setNotifyTutor] = useState(true);
  const [addToCalendar, setAddToCalendar] = useState(true);

  // Combobox state
  const [parentOpen, setParentOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  useEffect(() => {
    if (selectedParentId) {
      fetchStudentsForParent(selectedParentId);
    } else {
      setStudents([]);
      setSelectedStudentId("");
    }
  }, [selectedParentId]);

  useEffect(() => {
    const selectedTutor = tutors.find(t => t.id === selectedTutorId);
    if (selectedTutor?.hourly_rate && !amount) {
      setAmount(selectedTutor.hourly_rate.toString());
    }
  }, [selectedTutorId, tutors]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, phone_number")
        .eq("account_type", "parent")
        .order("full_name");

      setParents(profilesData || []);

      const { data: tutorData } = await supabase
        .from("tutor_profiles")
        .select("id, user_id, subjects, hourly_rate")
        .eq("verified", true);

      const enrichedTutors = await Promise.all(
        (tutorData || []).map(async (tutor) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", tutor.user_id)
            .single();
          
          return {
            ...tutor,
            full_name: profile?.full_name || "Unknown",
          };
        })
      );

      setTutors(enrichedTutors);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsForParent = async (parentId: string) => {
    const { data } = await supabase
      .from("students")
      .select("id, full_name, parent_id")
      .eq("parent_id", parentId);
    
    setStudents(data || []);
  };

  const createNewParent = async (): Promise<string | null> => {
    // Use edge function to create parent with proper auth user
    const { data, error } = await supabase.functions.invoke("create-parent-profile", {
      body: {
        fullName: newParentName,
        phoneNumber: newParentPhone,
        email: newParentEmail || undefined,
      },
    });

    if (error) {
      console.error("Edge function error:", error);
      throw new Error(error.message || "Failed to create parent profile");
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    if (!data?.userId) {
      throw new Error("No user ID returned from server");
    }

    return data.userId;
  };

  const createNewStudent = async (parentId: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from("students")
      .insert({
        parent_id: parentId,
        full_name: newStudentName,
        grade_level: newStudentGrade,
        curriculum: newStudentCurriculum,
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  };

  const handleSubmit = async () => {
    // Validation
    if (parentMode === "new") {
      if (!newParentName || !newParentPhone) {
        toast.error("Please fill in parent name and phone");
        return;
      }
      if (!newStudentName || !newStudentGrade || !newStudentCurriculum) {
        toast.error("Please fill in student details");
        return;
      }
    } else {
      if (!selectedParentId) {
        toast.error("Please select a parent");
        return;
      }
    }

    if (!selectedTutorId || !date || !time || !subject) {
      toast.error("Please fill in all booking details");
      return;
    }

    setSubmitting(true);
    try {
      let parentId = selectedParentId;
      let studentProfileId = selectedStudentId || null;

      // Create new parent if needed
      if (parentMode === "new") {
        const newParentId = await createNewParent();
        if (!newParentId) throw new Error("Failed to create parent");
        parentId = newParentId;

        // Create student for new parent
        const newStudentId = await createNewStudent(parentId);
        studentProfileId = newStudentId;
      } else if (addNewStudent && newStudentName && newStudentGrade) {
        // Add new student to existing parent
        const newStudentId = await createNewStudent(parentId);
        studentProfileId = newStudentId;
      }

      const startTime = new Date(`${date}T${time}`);
      const endTime = new Date(startTime.getTime() + parseInt(duration) * 60 * 1000);

      // Get the tutor's user_id (auth.users.id) for the availability slot
      const selectedTutor = tutors.find(t => t.id === selectedTutorId);
      if (!selectedTutor) {
        throw new Error("Selected tutor not found");
      }

      // Create availability slot using user_id (foreign key references auth.users)
      const { data: slot, error: slotError } = await supabase
        .from("tutor_availability")
        .insert({
          tutor_id: selectedTutor.user_id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          is_booked: true,
          slot_type: "manual",
        })
        .select()
        .single();

      if (slotError) throw slotError;

      // Create booking (using user_id for tutor since FK references auth.users)
      // Note: payment_option must be 'deposit', 'full', or 'package' per DB constraint
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          student_id: parentId,
          tutor_id: selectedTutor.user_id,
          availability_slot_id: slot.id,
          subject,
          amount: parseFloat(amount) || 0,
          status: "confirmed",
          payment_option: paymentStatus === "paid" ? "full" : "deposit",
          notes: `[OFFLINE BOOKING] ${notes}`.trim(),
          student_profile_id: studentProfileId,
          booking_source: "manual",
          class_type: classType,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Get student and tutor names for meeting/emails
      const studentName = studentProfileId 
        ? (parentMode === "new" ? newStudentName : students.find(s => s.id === studentProfileId)?.full_name || "Student")
        : (parentMode === "new" ? newStudentName : "Student");
      const tutorName = tutors.find(t => t.id === selectedTutorId)?.full_name || "Tutor";

      // Generate meeting link for online classes
      let meetingLink = null;
      if (classType === "online") {
        try {
          const { data: meetData } = await supabase.functions.invoke("generate-google-meet-link", {
            body: {
              summary: `${subject} Session`,
              description: `Tutoring session with ${tutorName} for ${studentName}`,
              startDateTime: startTime.toISOString(),
              endDateTime: endTime.toISOString(),
            },
          });
          if (meetData?.meetingLink) {
            meetingLink = meetData.meetingLink;
            // Update booking with meeting link
            await supabase
              .from("bookings")
              .update({ meeting_link: meetingLink })
              .eq("id", bookingData.id);
          }
        } catch (meetError) {
          console.error("Google Meet generation error:", meetError);
        }
      }

      // Send confirmation email to parent/student
      if (sendConfirmation) {
        try {
          await supabase.functions.invoke("send-booking-email", {
            body: {
              bookingId: bookingData.id,
              meetingLink: meetingLink,
              recipientType: "student",
            },
          });
          console.log("Parent confirmation email sent");
        } catch (emailError) {
          console.error("Failed to send parent email:", emailError);
          toast.warning("Booking created but parent email failed to send");
        }
      }

      // Send notification email to tutor
      if (notifyTutor) {
        try {
          await supabase.functions.invoke("send-booking-email", {
            body: {
              bookingId: bookingData.id,
              meetingLink: meetingLink,
              recipientType: "tutor",
            },
          });
          console.log("Tutor notification email sent");
        } catch (emailError) {
          console.error("Failed to send tutor email:", emailError);
          toast.warning("Booking created but tutor email failed to send");
        }
      }

      // Add to central calendar if enabled
      if (addToCalendar) {
        try {
          await supabase.functions.invoke("sync-to-central-calendar", {
            body: {
              bookingId: bookingData.id,
              summary: `${subject} - ${studentName}`,
              description: `Tutoring session\nStudent: ${studentName}\nTutor: ${tutorName}\nSubject: ${subject}\n${meetingLink ? `Meeting Link: ${meetingLink}\n` : ""}${notes ? `Notes: ${notes}` : ""}`,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
            },
          });
        } catch (calError) {
          console.error("Calendar sync error:", calError);
          toast.warning("Booking created but calendar sync failed");
        }
      }

      toast.success(parentMode === "new" 
        ? "Parent, student and booking created successfully!" 
        : "Booking created successfully!");
      handleClose();
      onSuccess();
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast.error("Failed to create booking: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setParentMode("existing");
    setSelectedParentId("");
    setSelectedStudentId("");
    setNewParentName("");
    setNewParentEmail("");
    setNewParentPhone("");
    setNewStudentName("");
    setNewStudentGrade("");
    setNewStudentCurriculum("");
    setAddNewStudent(false);
    setSelectedTutorId("");
    setDate("");
    setTime("");
    setDuration("60");
    setSubject("");
    setAmount("");
    setPaymentStatus("pending");
    setNotes("");
    setSendConfirmation(true);
    setNotifyTutor(true);
    onClose();
  };

  const selectedTutor = tutors.find(t => t.id === selectedTutorId);
  const selectedParent = parents.find(p => p.id === selectedParentId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Create Manual Booking</DialogTitle>
          <DialogDescription>
            Add a booking for a client who contacted you outside the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Parent/Student Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Parent & Student</h3>
            </div>

            <Tabs value={parentMode} onValueChange={(v) => setParentMode(v as "existing" | "new")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">Existing Parent</TabsTrigger>
                <TabsTrigger value="new">
                  <UserPlus className="h-4 w-4 mr-2" />
                  New Parent
                </TabsTrigger>
              </TabsList>

              <TabsContent value="existing" className="space-y-4 mt-4">
                {/* Existing Parent Selection */}
                <div className="space-y-2">
                  <Label>Select Parent *</Label>
                  <Popover open={parentOpen} onOpenChange={setParentOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={parentOpen}
                        className="w-full justify-between"
                      >
                        {selectedParent
                          ? `${selectedParent.full_name} ${selectedParent.phone_number ? `(${selectedParent.phone_number})` : ''}`
                          : "Search parents..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search by name or phone..." />
                        <CommandList>
                          <CommandEmpty>No parent found. Try "New Parent" tab.</CommandEmpty>
                          <CommandGroup>
                            {parents.map((parent) => (
                              <CommandItem
                                key={parent.id}
                                value={`${parent.full_name} ${parent.phone_number || ''}`}
                                onSelect={() => {
                                  setSelectedParentId(parent.id);
                                  setParentOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedParentId === parent.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div>
                                  <p>{parent.full_name}</p>
                                  {parent.phone_number && (
                                    <p className="text-xs text-muted-foreground">{parent.phone_number}</p>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Existing Students */}
                {students.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select Child</Label>
                    <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select child..." />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Add New Student to Existing Parent */}
                {selectedParentId && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="addNewStudent"
                        checked={addNewStudent}
                        onCheckedChange={(checked) => setAddNewStudent(checked as boolean)}
                      />
                      <Label htmlFor="addNewStudent" className="text-sm font-normal">
                        Add new child to this parent
                      </Label>
                    </div>

                    {addNewStudent && (
                      <Card>
                        <CardContent className="pt-4 space-y-3">
                          <Input
                            placeholder="Child's name *"
                            value={newStudentName}
                            onChange={(e) => setNewStudentName(e.target.value)}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <Select value={newStudentCurriculum} onValueChange={(v) => { setNewStudentCurriculum(v); setNewStudentGrade(""); }}>
                              <SelectTrigger>
                                <SelectValue placeholder="Curriculum *" />
                              </SelectTrigger>
                              <SelectContent>
                                {CURRICULA.map((c) => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={newStudentGrade} onValueChange={setNewStudentGrade} disabled={!newStudentCurriculum}>
                              <SelectTrigger>
                                <SelectValue placeholder={newStudentCurriculum ? "Grade level *" : "Select curriculum first"} />
                              </SelectTrigger>
                              <SelectContent>
                                {(GRADES_BY_CURRICULUM[newStudentCurriculum] || []).map((grade) => (
                                  <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="new" className="space-y-4 mt-4">
                {/* New Parent Details */}
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Parent Details</p>
                    <Input
                      placeholder="Parent's full name *"
                      value={newParentName}
                      onChange={(e) => setNewParentName(e.target.value)}
                    />
                    <Input
                      placeholder="Phone number *"
                      value={newParentPhone}
                      onChange={(e) => setNewParentPhone(e.target.value)}
                    />
                    <div className="space-y-1">
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={newParentEmail}
                        onChange={(e) => setNewParentEmail(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {newParentEmail 
                          ? "✓ Welcome email with login credentials will be sent" 
                          : "Add email to send login credentials automatically"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* New Student Details */}
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Student Details</p>
                    <Input
                      placeholder="Student's full name *"
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Select value={newStudentCurriculum} onValueChange={(v) => { setNewStudentCurriculum(v); setNewStudentGrade(""); }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Curriculum *" />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRICULA.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={newStudentGrade} onValueChange={setNewStudentGrade} disabled={!newStudentCurriculum}>
                        <SelectTrigger>
                          <SelectValue placeholder={newStudentCurriculum ? "Grade level *" : "Select curriculum first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {(GRADES_BY_CURRICULUM[newStudentCurriculum] || []).map((grade) => (
                            <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <Separator />

          {/* Booking Details */}
          <div className="space-y-4">
            <h3 className="font-semibold">Booking Details</h3>

            {/* Tutor Selection */}
            <div className="space-y-2">
              <Label>Tutor *</Label>
              <Popover open={tutorOpen} onOpenChange={setTutorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={tutorOpen}
                    className="w-full justify-between"
                  >
                    {selectedTutor
                      ? selectedTutor.full_name
                      : "Select tutor..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by name or subject..." />
                    <CommandList>
                      <CommandEmpty>No tutor found.</CommandEmpty>
                      <CommandGroup>
                        {tutors.map((tutor) => (
                          <CommandItem
                            key={tutor.id}
                            value={`${tutor.full_name} ${tutor.subjects.join(' ')}`}
                            onSelect={() => {
                              setSelectedTutorId(tutor.id);
                              setTutorOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedTutorId === tutor.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div>
                              <p>{tutor.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {tutor.subjects.slice(0, 3).join(", ")}
                              </p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Session Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedTutor?.subjects && selectedTutor.subjects.length > 0 ? (
                      selectedTutor.subjects.map((subj) => (
                        <SelectItem key={subj} value={subj}>
                          {subj}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Select a tutor first
                      </div>
                    )}
                  </SelectContent>
              </Select>
              </div>
            </div>

            {/* Class Type */}
            <div className="space-y-2">
              <Label>Class Type</Label>
              <Select value={classType} onValueChange={(v) => setClassType(v as "online" | "physical")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="physical">Physical (In-Person)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (KES)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="deposit">Deposit Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="How they heard about us, special requirements, etc..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Notification Options */}
            <div className="flex flex-wrap gap-6 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendConfirmation"
                  checked={sendConfirmation}
                  onCheckedChange={(checked) => setSendConfirmation(checked as boolean)}
                />
                <Label htmlFor="sendConfirmation" className="text-sm font-normal">
                  Email parent
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notifyTutor"
                  checked={notifyTutor}
                  onCheckedChange={(checked) => setNotifyTutor(checked as boolean)}
                />
                <Label htmlFor="notifyTutor" className="text-sm font-normal">
                  Notify tutor
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="addToCalendar"
                  checked={addToCalendar}
                  onCheckedChange={(checked) => setAddToCalendar(checked as boolean)}
                />
                <Label htmlFor="addToCalendar" className="text-sm font-normal">
                  Add to Lana Calendar
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            <Plus className="h-4 w-4 mr-2" />
            {submitting ? "Creating..." : parentMode === "new" ? "Create Parent & Booking" : "Create Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

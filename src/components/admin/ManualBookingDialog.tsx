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
import { toast } from "sonner";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
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

export function ManualBookingDialog({ open, onClose, onSuccess }: ManualBookingDialogProps) {
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedTutorId, setSelectedTutorId] = useState<string>("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [subject, setSubject] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [notifyTutor, setNotifyTutor] = useState(true);

  // Combobox state
  const [parentOpen, setParentOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  useEffect(() => {
    // Filter students when parent changes
    if (selectedParentId) {
      fetchStudentsForParent(selectedParentId);
    } else {
      setStudents([]);
      setSelectedStudentId("");
    }
  }, [selectedParentId]);

  useEffect(() => {
    // Auto-fill amount from tutor rate
    const selectedTutor = tutors.find(t => t.id === selectedTutorId);
    if (selectedTutor?.hourly_rate && !amount) {
      setAmount(selectedTutor.hourly_rate.toString());
    }
  }, [selectedTutorId, tutors]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch parents
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, phone_number")
        .eq("account_type", "parent")
        .order("full_name");

      setParents(profilesData || []);

      // Fetch tutors
      const { data: tutorData } = await supabase
        .from("tutor_profiles")
        .select("id, user_id, subjects, hourly_rate")
        .eq("verified", true);

      // Enrich with names
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

  const handleSubmit = async () => {
    if (!selectedParentId || !selectedTutorId || !date || !time || !subject) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const startTime = new Date(`${date}T${time}`);
      const endTime = new Date(startTime.getTime() + parseInt(duration) * 60 * 1000);

      // Create availability slot
      const { data: slot, error: slotError } = await supabase
        .from("tutor_availability")
        .insert({
          tutor_id: selectedTutorId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          is_booked: true,
          slot_type: "manual",
        })
        .select()
        .single();

      if (slotError) throw slotError;

      // Create booking
      const { error: bookingError } = await supabase
        .from("bookings")
        .insert({
          student_id: selectedParentId,
          tutor_id: selectedTutorId,
          availability_slot_id: slot.id,
          subject,
          amount: parseFloat(amount) || 0,
          status: "confirmed",
          payment_option: paymentStatus === "paid" ? "full" : "pending",
          notes: `[OFFLINE BOOKING] ${notes}`.trim(),
          student_profile_id: selectedStudentId || null,
          booking_source: "manual",
        });

      if (bookingError) throw bookingError;

      // Send notifications if enabled
      if (sendConfirmation) {
        // Get parent email and send confirmation
        const { data: emailData } = await supabase.rpc('get_user_email', {
          _user_id: selectedParentId
        });

        if (emailData) {
          await supabase.functions.invoke('send-booking-email', {
            body: {
              bookingId: slot.id,
              recipientEmail: emailData,
            },
          });
        }
      }

      toast.success("Booking created successfully");
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
    setSelectedParentId("");
    setSelectedStudentId("");
    setSelectedTutorId("");
    setDate("");
    setTime("");
    setDuration("60");
    setSubject("");
    setAmount("");
    setPaymentStatus("pending");
    setPaymentMethod("");
    setNotes("");
    setSendConfirmation(true);
    setNotifyTutor(true);
    onClose();
  };

  const selectedTutor = tutors.find(t => t.id === selectedTutorId);
  const selectedParent = parents.find(p => p.id === selectedParentId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Manual Booking</DialogTitle>
          <DialogDescription>
            Book a session for a client who called or messaged in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Parent Selection */}
          <div className="space-y-2">
            <Label>Parent / Client *</Label>
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
                    : "Select parent..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search by name or phone..." />
                  <CommandList>
                    <CommandEmpty>No parent found.</CommandEmpty>
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

          {/* Student Selection (optional) */}
          {students.length > 0 && (
            <div className="space-y-2">
              <Label>Student (Optional)</Label>
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
                  {selectedTutor?.subjects.map((subj) => (
                    <SelectItem key={subj} value={subj}>
                      {subj}
                    </SelectItem>
                  )) || (
                    <SelectItem value="" disabled>
                      Select a tutor first
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
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
              placeholder="Any additional notes about this booking..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Notification Options */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendConfirmation"
                checked={sendConfirmation}
                onCheckedChange={(checked) => setSendConfirmation(checked as boolean)}
              />
              <Label htmlFor="sendConfirmation" className="text-sm font-normal">
                Send confirmation email to parent
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notifyTutor"
                checked={notifyTutor}
                onCheckedChange={(checked) => setNotifyTutor(checked as boolean)}
              />
              <Label htmlFor="notifyTutor" className="text-sm font-normal">
                Notify tutor about this session
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            <Plus className="h-4 w-4 mr-2" />
            {submitting ? "Creating..." : "Create Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

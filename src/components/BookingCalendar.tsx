import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isSameDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, Smartphone } from "lucide-react";
import { PaymentOptionsCard } from "./PaymentOptionsCard";
import { NAIROBI_LOCATIONS } from "@/utils/locationData";
import { getLevelsForCurriculum } from "@/utils/curriculumData";

interface AvailabilitySlot {
  id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

interface BookingCalendarProps {
  tutorId: string;
  tutorName: string;
  tutorEmail: string;
  studentEmail: string;
  studentName: string;
  hourlyRate: number;
  tutorSubjects?: string[];
  tutorLocations?: string[];
  tutorCurriculum?: string[];
  tutorTeachingMode?: string[];
  onBookingComplete?: () => void;
  classType?: 'online' | 'in-person';
  isTrialSession?: boolean;
  selectedTier?: 'standard' | 'advanced';
}

interface PackageOffer {
  id: string;
  name: string;
  description: string;
  session_count: number;
  total_price: number;
  discount_percentage: number;
  validity_days: number;
}

interface PackagePurchase {
  id: string;
  sessions_remaining: number;
  expires_at: string;
}

export const BookingCalendar = ({
  tutorId,
  tutorName,
  tutorEmail,
  studentEmail,
  studentName,
  hourlyRate,
  tutorSubjects = [],
  tutorLocations = [],
  tutorCurriculum = [],
  tutorTeachingMode = [],
  onBookingComplete,
  classType = 'online',
  isTrialSession = false,
  selectedTier = 'standard',
}: BookingCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [monthSlots, setMonthSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [subject, setSubject] = useState("");
  const [curriculum, setCurriculum] = useState("");
  const [level, setLevel] = useState("");
  const [notes, setNotes] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedClassType, setSelectedClassType] = useState<'online' | 'in-person'>(classType);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [sessionDuration, setSessionDuration] = useState<1 | 2>(1); // 1 hour or 2 hours
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');
  const [paymentOption, setPaymentOption] = useState<'deposit' | 'full' | 'package'>('deposit');
  const [packageOffers, setPackageOffers] = useState<PackageOffer[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageOffer | null>(null);
  const [existingPackages, setExistingPackages] = useState<PackagePurchase[]>([]);
  const [selectedExistingPackage, setSelectedExistingPackage] = useState<PackagePurchase | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [pricingTiers, setPricingTiers] = useState<any[]>([]);
  const [curriculumSpecificRate, setCurriculumSpecificRate] = useState<number | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tutorUserId, setTutorUserId] = useState<string | null>(null);

  useEffect(() => {
    // Determine curriculum-level-specific rate when curriculum or level changes
    if (!curriculum || !level) {
      setCurriculumSpecificRate(null);
      return;
    }

    (async () => {
      // Query curriculum_level_tier_assignments to find the correct tier for this curriculum-level combo
      const { data: assignment } = await supabase
        .from('curriculum_level_tier_assignments')
        .select('tier_id, tutor_pricing_tiers(online_hourly_rate)')
        .eq('tutor_id', tutorId)
        .eq('curriculum', curriculum)
        .eq('level', level)
        .maybeSingle();
      
      if (assignment && assignment.tutor_pricing_tiers) {
        const tierData = assignment.tutor_pricing_tiers as any;
        setCurriculumSpecificRate(Number(tierData.online_hourly_rate));
      } else {
        // Fallback to base hourly rate if no specific tier found
        setCurriculumSpecificRate(hourlyRate);
      }
    })();
  }, [curriculum, level, tutorId, hourlyRate]);

  useEffect(() => {
    // Resolve the tutor's auth user_id from the tutor profile id and fetch pricing tiers
    (async () => {
      const { data } = await supabase
        .from('tutor_profiles')
        .select('user_id')
        .eq('id', tutorId)
        .eq('verified', true)
        .maybeSingle();
      
      if (data?.user_id) {
        setTutorUserId(data.user_id);
      }
    })();
    
    // Fetch tutor pricing tiers
    (async () => {
      const { data } = await supabase
        .from('tutor_pricing_tiers')
        .select('*')
        .eq('tutor_id', tutorId)
        .order('tier_name');
      
      if (data) {
        setPricingTiers(data);
      }
    })();
  }, [tutorId]);

  useEffect(() => {
    if (selectedDate && tutorUserId) {
      fetchAvailableSlots();
      fetchMonthSlots();
    }
  }, [selectedDate, tutorId, tutorUserId]);

  useEffect(() => {
    fetchPackageOffers();
    fetchExistingPackages();
  }, [tutorId]);

  const effectiveRate = curriculumSpecificRate !== null ? curriculumSpecificRate : hourlyRate;
  const onlineRateDisplay = effectiveRate.toLocaleString();
  const inPersonRateDisplay = Math.round(effectiveRate * 1.5).toLocaleString();

  const fetchPackageOffers = async () => {
    const { data } = await supabase
      .from("package_offers")
      .select("*")
      .eq("tutor_id", tutorId)
      .eq("is_active", true)
      .order("session_count");
    
    if (data) setPackageOffers(data);
  };

  const fetchExistingPackages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("package_purchases")
      .select("*")
      .eq("student_id", user.id)
      .eq("tutor_id", tutorId)
      .eq("payment_status", "completed")
      .gt("sessions_remaining", 0)
      .gt("expires_at", new Date().toISOString());
    
    if (data) setExistingPackages(data);
  };

  const fetchAvailableSlots = async () => {
    if (!selectedDate || !tutorUserId) return;

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("tutor_availability")
      .select("*")
      .in("tutor_id", [tutorUserId as string, tutorId])
      .gte("start_time", startOfDay.toISOString())
      .lte("start_time", endOfDay.toISOString())
      .order("start_time");

    if (error) {
      console.error("Error fetching slots:", error);
      return;
    }

    const slots = data || [];

    // Build blocked intervals for overlap checks
    const blockedIntervals = slots
      .filter((s: any) => s.slot_type === "blocked")
      .map((s: any) => ({
        start: new Date(s.start_time).getTime(),
        end: new Date(s.end_time).getTime(),
      }));

    // If total blocked time for the day is >= 10 hours, treat the whole day as unavailable
    const totalBlockedHours = blockedIntervals.reduce((sum, b) => {
      return sum + (b.end - b.start) / (1000 * 60 * 60);
    }, 0);

    const hasFullDayBlock = totalBlockedHours >= 10; // our working day is roughly 8 AM - 8 PM

    if (hasFullDayBlock) {
      setAvailableSlots([]);
      return;
    }

    const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
      Math.max(aStart, bStart) < Math.min(aEnd, bEnd);

    // Start from all non-booked, available slots
    const candidateAvailable = slots.filter((s: any) =>
      !s.is_booked && (s.slot_type === null || s.slot_type === "available")
    );

    // Remove any available slots that overlap a blocked interval
    const filtered = candidateAvailable.filter((s: any) => {
      const sStart = new Date(s.start_time).getTime();
      const sEnd = new Date(s.end_time).getTime();
      return !blockedIntervals.some((b) => overlaps(sStart, sEnd, b.start, b.end));
    });

    setAvailableSlots(filtered);
  };
  const fetchMonthSlots = async () => {
    if (!selectedDate) return;

    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("tutor_availability")
      .select("*")
      .in("tutor_id", [tutorUserId as string, tutorId])
      .gte("start_time", monthStart.toISOString())
      .lte("start_time", monthEnd.toISOString());

    if (error) {
      console.error("Error fetching month slots:", error);
      return;
    }

    setMonthSlots(data || []);
  };

  const handleBookSlot = async () => {
    if (!selectedSlot || !subject.trim() || !curriculum.trim() || !level.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a slot, enter a subject, select a curriculum, and select a level",
        variant: "destructive",
      });
      return;
    }

    if (!tutorUserId) {
      toast({
        title: "Error",
        description: "Tutor information not loaded. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    // Validate location for in-person sessions
    if (selectedClassType === 'in-person' && !selectedLocation) {
      toast({
        title: "Missing location",
        description: "Please select a teaching location for in-person sessions",
        variant: "destructive",
      });
      return;
    }

    // Skip payment validation for trial sessions
    if (!isTrialSession && paymentMethod === 'mpesa' && (!phoneNumber || phoneNumber.length !== 10)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit M-Pesa phone number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Save phone number to profile if provided (for M-Pesa payments)
      if (!isTrialSession && paymentMethod === 'mpesa' && phoneNumber) {
        await supabase
          .from("profiles")
          .update({ phone_number: phoneNumber.trim() })
          .eq("id", user.id);
      }

      // For trial sessions, always 30 minutes and free
      let duration, totalAmount, depositAmount, balanceDue;
      
      if (isTrialSession) {
        duration = 0.5; // 30 minutes
        totalAmount = 0;
        depositAmount = 0;
        balanceDue = 0;
      } else {
        duration =
          (new Date(selectedSlot.end_time).getTime() -
            new Date(selectedSlot.start_time).getTime()) /
          (1000 * 60 * 60);
        
        // Use curriculum-specific rate if available, otherwise use base hourly rate
        const effectiveRate = curriculumSpecificRate !== null ? curriculumSpecificRate : hourlyRate;
        // Calculate rate (50% more for in-person)
        const rate = selectedClassType === 'in-person' ? effectiveRate * 1.5 : effectiveRate;
        totalAmount = duration * rate;
        
        // Handle different payment options
        // Special testing rate for Justin Anyona
        const depositRate = tutorId === '4d9426d7-7294-492a-a2e9-4b1642ba1954' ? 0.01 : 0.3;
        
        if (paymentOption === 'deposit') {
          depositAmount = totalAmount * depositRate;
          balanceDue = totalAmount - depositAmount;
        } else if (paymentOption === 'full') {
          depositAmount = totalAmount;
          balanceDue = 0;
        } else if (paymentOption === 'package') {
          // Using existing package - no payment needed
          if (selectedExistingPackage) {
            depositAmount = 0;
            balanceDue = 0;
            totalAmount = 0;
          } 
          // Purchasing new package
          else if (selectedPackage) {
            totalAmount = selectedPackage.total_price;
            depositAmount = selectedPackage.total_price;
            balanceDue = 0;
          } else {
            throw new Error("Please select a package");
          }
        }
      }

      // For new package purchases, create package purchase first
      let packagePurchaseId = null;
      if (paymentOption === 'package' && selectedPackage && !selectedExistingPackage) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + selectedPackage.validity_days);

        const { data: pkgData, error: pkgError } = await supabase
          .from("package_purchases")
          .insert({
            student_id: user.id,
            tutor_id: tutorId,
            package_offer_id: selectedPackage.id,
            total_sessions: selectedPackage.session_count,
            sessions_remaining: selectedPackage.session_count,
            total_amount: selectedPackage.total_price,
            amount_paid: 0,
            payment_status: "pending",
            expires_at: expiresAt.toISOString(),
          })
          .select()
          .single();

        if (pkgError) throw pkgError;
        packagePurchaseId = pkgData.id;
      } else if (paymentOption === 'package' && selectedExistingPackage) {
        packagePurchaseId = selectedExistingPackage.id;
      }

      // Create booking with appropriate status
      const noteText = isTrialSession 
        ? `FREE CONSULTATION (30 min chemistry check): ${notes.trim()}` 
        : (notes.trim() || null);
      
      const notesWithLocation = selectedClassType === 'in-person' && selectedLocation
        ? `${noteText ? noteText + ' | ' : ''}Location: ${selectedLocation}`
        : noteText;

      const notesWithCurriculumLevel = `${notesWithLocation ? notesWithLocation + ' | ' : ''}Curriculum: ${curriculum} | Level: ${level} | Tier: ${selectedTier}`;

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          student_id: user.id,
          tutor_id: tutorUserId,
          availability_slot_id: selectedSlot.id,
          subject: subject.trim(),
          notes: notesWithCurriculumLevel,
          amount: totalAmount,
          deposit_paid: depositAmount,
          balance_due: balanceDue,
          class_type: selectedClassType,
          status: (isTrialSession || paymentOption === 'package') ? "pending" : "pending",
          payment_option: isTrialSession ? 'deposit' : paymentOption,
          package_purchase_id: packagePurchaseId,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Try to create Google Meet session for all bookings (optional)
      let meetData = null;
      try {
        const { data, error: meetError } = await supabase.functions.invoke(
          "create-google-meet-session",
          {
            body: {
              bookingId: booking.id,
              tutorEmail: tutorEmail || "tutor@example.com",
              studentEmail: studentEmail || "student@example.com",
              studentName: studentName || "Student",
              tutorName: tutorName,
              subject,
              startTime: selectedSlot.start_time,
              endTime: selectedSlot.end_time,
            },
          }
        );

        if (meetError) {
          console.error("Failed to create Google Meet session:", meetError);
        } else {
          meetData = data;
        }
      } catch (error) {
        console.error("Error creating Google Meet session:", error);
        // Continue with booking process even if Meet link fails
      }

      // For trial sessions, skip payment and send confirmation immediately
      if (isTrialSession) {
        // Send email notifications
        await supabase.functions.invoke("send-booking-email", {
          body: {
            studentEmail,
            studentName,
            tutorEmail,
            tutorName,
            subject: `FREE CONSULTATION: ${subject.trim()}`,
            startTime: selectedSlot.start_time,
            endTime: selectedSlot.end_time,
            meetingLink: meetData?.meetLink,
            classType: selectedClassType,
            totalAmount: 0,
            depositPaid: 0,
            balanceDue: 0,
            testEmail: "justin@glab.africa", // TEST MODE
          },
        });

        toast({
          title: "Consultation booked!",
          description: "Your free 30-minute chemistry session has been confirmed. Check your email for details.",
        });

        window.location.href = `/booking-confirmed?bookingId=${booking.id}`;
        return;
      }

      // Handle payment based on payment option
      if (paymentOption === 'package' && selectedExistingPackage) {
        // Using existing package - book for free, confirm immediately
        await supabase
          .from("bookings")
          .update({ status: "confirmed" })
          .eq("id", booking.id);

        await supabase.functions.invoke("send-booking-email", {
          body: {
            studentEmail,
            studentName,
            tutorEmail,
            tutorName,
            subject: subject.trim(),
            startTime: selectedSlot.start_time,
            endTime: selectedSlot.end_time,
            meetingLink: meetData?.meetLink,
            classType: selectedClassType,
            totalAmount: 0,
            depositPaid: 0,
            balanceDue: 0,
            testEmail: "justin@glab.africa", // TEST MODE
          },
        });

        toast({
          title: "Booking confirmed!",
          description: "Your session has been booked using your package credits.",
        });

        window.location.href = `/booking-confirmed?bookingId=${booking.id}`;
        return;
      }

      // For paid options (deposit, full, or new package), redirect to invoice preview
      const invoiceUrl = paymentOption === 'package'
        ? `/invoice-preview?type=package&packageId=${packagePurchaseId}`
        : `/invoice-preview?type=booking&bookingId=${booking.id}`;
      
      window.location.href = invoiceUrl;
    } catch (error: any) {
      console.error("Error booking slot:", error);
      toast({
        title: "Booking failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };



  const resetForm = () => {
    setSubject("");
    setNotes("");
    setPhoneNumber("");
    setSelectedSlot(null);
    setPaymentInitiated(false);
    setSelectedClassType('online');
    setSelectedLocation("");
    fetchAvailableSlots();

    onBookingComplete?.();
  };

  // Get availability status for a given date
  const getDateStatus = (date: Date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const daySlots = monthSlots.filter(slot => {
      const slotStart = new Date(slot.start_time);
      return slotStart >= dayStart && slotStart <= dayEnd;
    });

    if (daySlots.length === 0) return null;

    const hasBooked = daySlots.some(s => s.is_booked);
    const hasBlocked = daySlots.some(s => s.slot_type === "blocked");
    const hasAvailable = daySlots.some(s => (s.slot_type === "available" || !s.slot_type) && !s.is_booked);

    if (hasBooked && !hasAvailable) return "fully-booked";
    if (hasBlocked && !hasAvailable) return "unavailable";
    if (hasAvailable) return "available";
    return null;
  };

  // Build modifiers for calendar styling
  const availableDates: Date[] = [];
  const unavailableDates: Date[] = [];

  if (selectedDate) {
    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    
    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
      const status = getDateStatus(new Date(d));
      if (status === "available") availableDates.push(new Date(d));
      else if (status === "unavailable" || status === "fully-booked") unavailableDates.push(new Date(d));
    }
  }


  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium block">Select Date</label>
          <div className="border rounded-lg p-3 bg-background">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="pointer-events-auto"
              modifiers={{
                available: availableDates,
                unavailable: unavailableDates,
              }}
              modifiersClassNames={{
                available: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-green-500 after:rounded-full",
                unavailable: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-red-500 after:rounded-full opacity-60",
              }}
            />
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 pt-2 border-t">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Unavailable</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium block">Available Time Slots</label>
            <div className="space-y-2 max-h-72 overflow-y-auto border rounded-lg p-3 bg-background">
              {availableSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No available slots for this date
                </p>
              ) : (
                availableSlots.map((slot) => (
                  <Button
                    key={slot.id}
                    variant={selectedSlot?.id === slot.id ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {format(new Date(slot.start_time), "h:mm a")} -{" "}
                    {format(new Date(slot.end_time), "h:mm a")}
                  </Button>
                ))
              )}
            </div>
          </div>

          {selectedSlot && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label className="text-sm font-medium mb-2 block">Curriculum *</Label>
                {tutorCurriculum && tutorCurriculum.length > 0 ? (
                  <Select 
                    value={curriculum} 
                    onValueChange={(val) => {
                      setCurriculum(val);
                      setLevel(""); // Reset level when curriculum changes
                    }} 
                    disabled={paymentInitiated}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select curriculum" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {tutorCurriculum.map((curr) => (
                        <SelectItem key={curr} value={curr}>
                          {curr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="e.g., CBC, IGCSE, 8-4-4"
                    value={curriculum}
                    onChange={(e) => {
                      setCurriculum(e.target.value);
                      setLevel(""); // Reset level when curriculum changes
                    }}
                    disabled={paymentInitiated}
                  />
                )}
              </div>

              {curriculum && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Level/Grade *</Label>
                  <Select value={level} onValueChange={setLevel} disabled={paymentInitiated}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level/grade" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50 max-h-[300px]">
                      {getLevelsForCurriculum(curriculum).map((lvl) => (
                        <SelectItem key={lvl.value} value={lvl.value}>
                          {lvl.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {curriculumSpecificRate !== null && curriculum && level && (
                    <p className="text-sm font-semibold text-primary mt-2">
                      Rate for {curriculum} - {level}: KES {curriculumSpecificRate.toLocaleString()}/hr
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label className="text-sm font-medium mb-2 block">Subject *</Label>
                {tutorSubjects && tutorSubjects.length > 0 ? (
                  <Select value={subject} onValueChange={setSubject} disabled={paymentInitiated}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {tutorSubjects.map((subj) => (
                        <SelectItem key={subj} value={subj}>
                          {subj}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="e.g., Mathematics - Algebra"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={paymentInitiated}
                  />
                )}
              </div>

              {!isTrialSession && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Class Type *</Label>
                  <div className={`grid ${tutorTeachingMode.includes('In-Person') ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                    <button
                      type="button"
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedClassType === 'online' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      } ${paymentInitiated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      onClick={() => !paymentInitiated && setSelectedClassType('online')}
                      disabled={paymentInitiated}
                    >
                      <div className="font-semibold mb-1">
                        Online - KES {onlineRateDisplay}/hr
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>✓ Session recordings</li>
                        <li>✓ AI transcripts</li>
                        <li>✓ Virtual whiteboard</li>
                      </ul>
                    </button>
                    {tutorTeachingMode.includes('In-Person') && (
                      <button
                        type="button"
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          selectedClassType === 'in-person' 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        } ${paymentInitiated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        onClick={() => !paymentInitiated && setSelectedClassType('in-person')}
                        disabled={paymentInitiated}
                      >
                        <div className="font-semibold mb-1">
                          In-Person - KES {inPersonRateDisplay}/hr
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>✓ Face-to-face learning</li>
                          <li>✓ Hands-on guidance</li>
                          <li>✓ Physical materials</li>
                        </ul>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!isTrialSession && selectedClassType === 'in-person' && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Teaching Location *</Label>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation} disabled={paymentInitiated}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50 max-h-[300px]">
                      {tutorLocations.length > 0 ? (
                        tutorLocations.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))
                      ) : (
                        NAIROBI_LOCATIONS.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {tutorLocations.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Tutor hasn't specified locations yet. All locations available.
                    </p>
                  )}
                </div>
              )}

              {!isTrialSession && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Session Duration *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        sessionDuration === 1 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      } ${paymentInitiated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      onClick={() => !paymentInitiated && setSessionDuration(1)}
                      disabled={paymentInitiated}
                    >
                      <div className="font-semibold mb-1">Single Session (1 hour)</div>
                      <div className="text-sm text-muted-foreground">
                        {curriculumSpecificRate !== null && curriculum ? (
                          <>From KES {selectedClassType === 'online' ? curriculumSpecificRate : (curriculumSpecificRate * 1.5).toFixed(0)}</>
                        ) : (
                          <>KES {selectedClassType === 'online' ? hourlyRate : (hourlyRate * 1.5).toFixed(0)}</>
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        sessionDuration === 2 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      } ${paymentInitiated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      onClick={() => !paymentInitiated && setSessionDuration(2)}
                      disabled={paymentInitiated}
                    >
                      <div className="font-semibold mb-1 flex items-center gap-2">
                        Double Session (2 hours)
                        <Badge variant="secondary" className="text-xs">Save 5%</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {curriculumSpecificRate !== null && curriculum ? (
                          <>From KES {selectedClassType === 'online' ? (curriculumSpecificRate * 2 * 0.95).toFixed(0) : (curriculumSpecificRate * 1.5 * 2 * 0.95).toFixed(0)}</>
                        ) : (
                          <>KES {selectedClassType === 'online' ? (hourlyRate * 2 * 0.95).toFixed(0) : (hourlyRate * 1.5 * 2 * 0.95).toFixed(0)}</>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              )}


              <div>
                <Label className="text-sm font-medium mb-2 block">Notes (Optional)</Label>
                <Textarea
                  placeholder="Any specific topics or questions?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  disabled={paymentInitiated}
                />
              </div>

              {!isTrialSession && (
                <>
                  {selectedSlot && (() => {
                    const slotDuration = (new Date(selectedSlot.end_time).getTime() - new Date(selectedSlot.start_time).getTime()) / (1000 * 60 * 60);
                    const duration = slotDuration * sessionDuration;
                    // Use curriculum-specific rate if available, otherwise use base hourly rate
                    const effectiveRate = curriculumSpecificRate !== null ? curriculumSpecificRate : hourlyRate;
                    const baseRate = selectedClassType === 'in-person' ? effectiveRate * 1.5 : effectiveRate;
                    // Apply 5% discount for double lessons (2 hours)
                    const rate = sessionDuration === 2 ? baseRate * 0.95 : baseRate;
                    const total = duration * rate;
                    const depositRate = tutorId === '4d9426d7-7294-492a-a2e9-4b1642ba1954' ? 0.01 : 0.3;
                    const deposit = total * depositRate;
                    const balance = total - deposit;

                    return (
                      <>
                        <div className="p-4 bg-muted/30 rounded-lg border">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Session Type:</span>
                            <span className="font-semibold">
                              {selectedClassType === 'online' ? 'Online' : 'In-Person'} - {sessionDuration === 1 ? '1 hour' : '2 hours'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Total Amount:</span>
                            <span className="text-lg font-bold text-primary">KES {total.toFixed(0)}</span>
                          </div>
                        </div>

                        {/* Payment Option Selector */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Payment Option *</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              className={`p-4 rounded-lg border-2 transition-all text-left ${
                                paymentOption === 'deposit' 
                                  ? 'border-primary bg-primary/5' 
                                  : 'border-border hover:border-primary/50'
                              } ${paymentInitiated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                              onClick={() => !paymentInitiated && setPaymentOption('deposit')}
                              disabled={paymentInitiated}
                            >
                              <div className="font-semibold mb-1">{tutorId === '4d9426d7-7294-492a-a2e9-4b1642ba1954' ? '1%' : '30%'} Deposit</div>
                              <div className="text-sm text-muted-foreground mb-2">
                                Pay KES {deposit.toFixed(0)} now
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Balance due: KES {balance.toFixed(0)}
                              </div>
                            </button>
                            <button
                              type="button"
                              className={`p-4 rounded-lg border-2 transition-all text-left ${
                                paymentOption === 'full' 
                                  ? 'border-primary bg-primary/5' 
                                  : 'border-border hover:border-primary/50'
                              } ${paymentInitiated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                              onClick={() => !paymentInitiated && setPaymentOption('full')}
                              disabled={paymentInitiated}
                            >
                              <div className="font-semibold mb-1">Full Payment</div>
                              <div className="text-sm text-muted-foreground mb-2">
                                Pay KES {total.toFixed(0)} now
                              </div>
                              <div className="text-xs text-muted-foreground">
                                No balance due
                              </div>
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {/* Payment Method Section */}
                  <>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Payment Method *</Label>
                      <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'mpesa' | 'card')} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="mpesa" className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4" />
                            M-Pesa
                          </TabsTrigger>
                          <TabsTrigger value="card" className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            Card
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    {paymentMethod === 'mpesa' && (
                      <div>
                        <Label className="text-sm font-medium mb-2 block">M-Pesa Phone Number *</Label>
                        <Input
                          type="tel"
                          placeholder="0712345678"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          maxLength={10}
                          disabled={paymentInitiated}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Enter your Safaricom number (format: 07XXXXXXXX)
                        </p>
                      </div>
                    )}
                  </>
                </>
              )}

              <div className="text-sm space-y-1 bg-muted/50 p-3 rounded">
                {isTrialSession ? (
                  <div>
                    <p className="font-semibold text-primary">🎉 FREE 30-Minute Consultation</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No payment required - this is a complimentary chemistry session to check compatibility
                    </p>
                  </div>
                ) : paymentInitiated ? (
                  <p className="text-amber-600">⏳ Waiting for payment confirmation...</p>
                ) : null}
              </div>

              <Button 
                onClick={handleBookSlot} 
                disabled={loading || paymentInitiated} 
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isTrialSession ? "Booking..." : "Processing..."}
                  </>
                ) : paymentInitiated ? (
                  "Waiting for Payment..."
                ) : isTrialSession ? (
                  "Confirm Free Trial"
                ) : paymentOption === 'full' ? (
                  <>
                    {paymentMethod === 'mpesa' ? <Smartphone className="w-4 h-4 mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                    Pay Full Amount & Confirm
                  </>
                ) : (
                  <>
                    {paymentMethod === 'mpesa' ? <Smartphone className="w-4 h-4 mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                    Pay Deposit & Confirm Booking
                  </>
                )}
              </Button>

              {!paymentInitiated && !isTrialSession && (
                <div className="text-xs text-muted-foreground space-y-1">
                  {selectedExistingPackage ? (
                    <>
                      <p>✓ No payment needed - using your active package</p>
                      <p>• 1 session will be deducted from your package</p>
                    </>
                  ) : paymentOption === 'package' ? (
                    <>
                      <p>• Pay now to purchase this package</p>
                      <p>• Use sessions anytime within {selectedPackage?.validity_days} days</p>
                      {paymentMethod === 'mpesa' ? (
                        <>
                          <p>• You will receive an M-Pesa prompt on your phone</p>
                          <p>• Enter your M-Pesa PIN to complete the purchase</p>
                        </>
                      ) : (
                        <p>• You'll be redirected to secure payment</p>
                      )}
                    </>
                  ) : paymentOption === 'full' ? (
                    <>
                      <p>• Pay the full amount now - no balance required later</p>
                      {paymentMethod === 'mpesa' ? (
                        <>
                          <p>• You will receive an M-Pesa prompt on your phone</p>
                          <p>• Enter your M-Pesa PIN to complete the payment</p>
                        </>
                      ) : (
                        <p>• You'll be redirected to secure payment</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p>• Pay only {tutorId === '4d9426d7-7294-492a-a2e9-4b1642ba1954' ? '1%' : '30%'} deposit now to secure your booking</p>
                      <p>• Balance due before the session starts</p>
                      {paymentMethod === 'mpesa' ? (
                        <>
                          <p>• You will receive an M-Pesa prompt on your phone</p>
                          <p>• Enter your M-Pesa PIN to complete the deposit</p>
                        </>
                      ) : (
                        <p>• You'll be redirected to secure payment</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

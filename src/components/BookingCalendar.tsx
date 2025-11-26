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
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tutorUserId, setTutorUserId] = useState<string | null>(null);

  useEffect(() => {
    // Resolve the tutor's auth user_id from the tutor profile id
    (async () => {
      const { data } = await supabase
        .from('tutor_profiles')
        .select('user_id')
        .eq('id', tutorId)
        .eq('verified', true)
        .maybeSingle();
      setTutorUserId(data?.user_id ?? null);
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
    if (!selectedDate) return;

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("tutor_availability")
      .select("*")
      .eq("tutor_id", tutorUserId as string)
      .eq("is_booked", false)
      .or("slot_type.is.null,slot_type.eq.available")
      .gte("start_time", startOfDay.toISOString())
      .lte("start_time", endOfDay.toISOString())
      .order("start_time");

    if (error) {
      console.error("Error fetching slots:", error);
      return;
    }

    setAvailableSlots(data || []);
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
      .eq("tutor_id", tutorUserId as string)
      .gte("start_time", monthStart.toISOString())
      .lte("start_time", monthEnd.toISOString());

    if (error) {
      console.error("Error fetching month slots:", error);
      return;
    }

    setMonthSlots(data || []);
  };

  const handleBookSlot = async () => {
    if (!selectedSlot || !subject.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a slot and enter a subject",
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
        
        // Calculate rate (50% more for in-person)
        const rate = selectedClassType === 'in-person' ? hourlyRate * 1.5 : hourlyRate;
        totalAmount = duration * rate;
        
        // Handle different payment options
        if (paymentOption === 'deposit') {
          depositAmount = totalAmount * 0.3;
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

      const notesWithTier = `${notesWithLocation ? notesWithLocation + ' | ' : ''}Tier: ${selectedTier}`;

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          student_id: user.id,
          tutor_id: tutorId,
          availability_slot_id: selectedSlot.id,
          subject: subject.trim(),
          notes: notesWithTier,
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
      console.log("Creating Google Meet session...");
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
          console.log("Google Meet session created:", meetData);
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

      // For paid options (deposit, full, or new package), handle payment
      const amountToPay = depositAmount;
      
      if (paymentMethod === 'mpesa') {
        // Initiate Pesapal payment
        const description = paymentOption === 'package' 
          ? `${selectedPackage?.name} - ${selectedPackage?.session_count} sessions`
          : `${subject} tutoring session with ${tutorName}`;

        const { data: paymentData, error: paymentError} = await supabase.functions.invoke(
          "initiate-pesapal-payment",
          {
            body: {
              amount: Math.round(amountToPay),
              description,
              paymentType: paymentOption === 'package' ? "package_purchase" : "tutor_booking_deposit",
              referenceId: paymentOption === 'package' ? packagePurchaseId : booking.id,
              callbackUrl: window.location.origin + '/payment-callback',
              phoneNumber: phoneNumber,
            },
          }
        );

        if (paymentError) {
          console.error("Payment initiation error:", paymentError);
          
          // Clean up booking and package if payment fails
          await supabase.from("bookings").delete().eq("id", booking.id);
          if (packagePurchaseId) {
            await supabase.from("package_purchases").delete().eq("id", packagePurchaseId);
          }

          // Check for specific Pesapal test limit error
          const errorMessage = paymentError.message || '';
          if (errorMessage.includes('maximum_amount_limit_exceeded') || errorMessage.includes('test transactions limit')) {
            throw new Error('Pesapal test transaction limit reached. Please contact support or try again later.');
          }
          
          throw new Error(errorMessage || 'Payment initialization failed');
        }

        // Check if we got the data back with error
        if (paymentData?.error) {
          await supabase.from("bookings").delete().eq("id", booking.id);
          if (packagePurchaseId) {
            await supabase.from("package_purchases").delete().eq("id", packagePurchaseId);
          }

          if (paymentData.code === 'maximum_amount_limit_exceeded') {
            throw new Error('Pesapal test transaction limit reached. Please contact support or try again later.');
          }
          
          throw new Error(paymentData.error);
        }

        // Redirect to Pesapal payment page
        if (paymentData?.redirect_url) {
          window.location.href = paymentData.redirect_url;
        } else {
          throw new Error('No redirect URL received from payment gateway');
        }
      } else {
        // Handle Stripe payment
        await handleStripePayment(booking.id, depositAmount, balanceDue);
      }
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


  const handleStripePayment = async (bookingId: string, depositAmount: number, balanceDue: number) => {
    try {
      // Create Stripe checkout session
      const { data, error } = await supabase.functions.invoke("create-stripe-checkout", {
        body: {
          amount: Math.round(depositAmount * 100), // Convert to cents
          bookingId,
          successUrl: `${window.location.origin}/student/dashboard?payment=success`,
          cancelUrl: `${window.location.origin}/tutors/${tutorId}?payment=cancelled`,
        },
      });

      if (error) {
        await supabase.from("bookings").delete().eq("id", bookingId);
        throw error;
      }

      // Redirect to Stripe Checkout
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Stripe payment error:", error);
      toast({
        title: "Payment failed",
        description: error.message,
        variant: "destructive",
      });
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
              {!isTrialSession && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Class Type *</Label>
                  <div className="grid grid-cols-2 gap-3">
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
                        Online - KES {hourlyRate}/hr
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>✓ Session recordings</li>
                        <li>✓ AI transcripts</li>
                        <li>✓ Virtual whiteboard</li>
                      </ul>
                    </button>
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
                        In-Person - KES {(hourlyRate * 1.3).toFixed(0)}/hr
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>✓ Face-to-face learning</li>
                        <li>✓ Hands-on guidance</li>
                        <li>✓ Physical materials</li>
                      </ul>
                    </button>
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
                        KES {selectedClassType === 'online' ? hourlyRate : (hourlyRate * 1.5).toFixed(0)}
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
                        KES {selectedClassType === 'online' ? (hourlyRate * 2 * 0.95).toFixed(0) : (hourlyRate * 1.5 * 2 * 0.95).toFixed(0)}
                      </div>
                    </button>
                  </div>
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
                    const baseRate = selectedClassType === 'in-person' ? hourlyRate * 1.5 : hourlyRate;
                    // Apply 5% discount for double lessons (2 hours)
                    const rate = sessionDuration === 2 ? baseRate * 0.95 : baseRate;
                    const total = duration * rate;
                    const deposit = total * 0.3;
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
                              <div className="font-semibold mb-1">30% Deposit</div>
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
                        <p>• You'll be redirected to secure Stripe checkout</p>
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
                        <p>• You'll be redirected to secure Stripe checkout</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p>• Pay only 30% deposit now to secure your booking</p>
                      <p>• Balance due before the session starts</p>
                      {paymentMethod === 'mpesa' ? (
                        <>
                          <p>• You will receive an M-Pesa prompt on your phone</p>
                          <p>• Enter your M-Pesa PIN to complete the deposit</p>
                        </>
                      ) : (
                        <p>• You'll be redirected to secure Stripe checkout</p>
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

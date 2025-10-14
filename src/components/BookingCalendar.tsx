import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isSameDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, Smartphone } from "lucide-react";
import { PaymentOptionsCard } from "./PaymentOptionsCard";

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
  onBookingComplete?: () => void;
  classType?: 'online' | 'in-person';
  isTrialSession?: boolean;
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
  onBookingComplete,
  classType = 'online',
  isTrialSession = false,
}: BookingCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedClassType, setSelectedClassType] = useState<'online' | 'in-person'>(classType);
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

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate, tutorId]);

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
      .eq("tutor_id", tutorId)
      .eq("is_booked", false)
      .gte("start_time", startOfDay.toISOString())
      .lte("start_time", endOfDay.toISOString())
      .order("start_time");

    if (error) {
      console.error("Error fetching slots:", error);
      return;
    }

    setAvailableSlots(data || []);
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
        
        // Calculate rate (30% more for in-person)
        const rate = selectedClassType === 'in-person' ? hourlyRate * 1.3 : hourlyRate;
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
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          student_id: user.id,
          tutor_id: tutorId,
          availability_slot_id: selectedSlot.id,
          subject: subject.trim(),
          notes: isTrialSession 
            ? `FREE CONSULTATION (30 min chemistry check): ${notes.trim()}` 
            : (notes.trim() || null),
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

      // Create Google Meet session for all bookings
      console.log("Creating Google Meet session...");
      const { data: meetData, error: meetError } = await supabase.functions.invoke(
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
        toast({
          title: "Warning",
          description: "Booking created but failed to generate meeting link",
          variant: "destructive",
        });
      } else {
        console.log("Google Meet session created:", meetData);
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
        // Initiate M-Pesa payment
        const { data: paymentData, error: paymentError} = await supabase.functions.invoke(
          "initiate-mpesa-payment",
          {
            body: {
              phoneNumber: `254${phoneNumber.substring(1)}`,
              amount: Math.round(amountToPay),
              paymentType: paymentOption === 'package' ? "package_purchase" : "tutor_booking_deposit",
              referenceId: paymentOption === 'package' ? packagePurchaseId : booking.id,
              testMode: true  // TEST MODE
            },
          }
        );

        if (paymentError) {
          await supabase.from("bookings").delete().eq("id", booking.id);
          if (packagePurchaseId) {
            await supabase.from("package_purchases").delete().eq("id", packagePurchaseId);
          }
          throw paymentError;
        }

        // In test mode, payment is auto-confirmed
        if (paymentData?.testMode) {
          // Update package payment status if applicable
          if (paymentOption === 'package' && packagePurchaseId) {
            await supabase
              .from("package_purchases")
              .update({ 
                payment_status: "completed",
                amount_paid: amountToPay
              })
              .eq("id", packagePurchaseId);
          }

          // Confirm booking
          await supabase
            .from("bookings")
            .update({ status: "confirmed" })
            .eq("id", booking.id);

          // Send confirmation email
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
              totalAmount,
              depositPaid: depositAmount,
              balanceDue,
            },
          });

          // Redirect to booking confirmed page
          window.location.href = `/booking-confirmed?bookingId=${booking.id}`;
          resetForm();
        } else {
          setPaymentInitiated(true);
          toast({
            title: "Payment Initiated",
            description: `Please check your phone and pay the deposit of KES ${depositAmount.toFixed(0)}. Balance of KES ${balanceDue.toFixed(0)} due before the session.`,
          });

          // Poll for payment completion
          pollMpesaPayment(booking.id, balanceDue);
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

  const pollMpesaPayment = async (bookingId: string, balanceDue: number) => {
    // Poll for payment completion (simplified - in production use webhooks)
    let attempts = 0;
    const checkPayment = setInterval(async () => {
      attempts++;
      
      // Check if booking status has been updated to "confirmed"
      const { data: updatedBooking } = await supabase
        .from("bookings")
        .select("status")
        .eq("id", bookingId)
        .single();

      if (updatedBooking?.status === "confirmed") {
        clearInterval(checkPayment);
        
        // Get the booking to fetch the meeting link
        const { data: fullBooking } = await supabase
          .from("bookings")
          .select("meeting_link")
          .eq("id", bookingId)
          .single();

        // Send email notifications
        await supabase.functions.invoke("send-booking-email", {
          body: {
            studentEmail,
            studentName,
            tutorEmail,
            tutorName,
            subject: subject.trim(),
            startTime: selectedSlot!.start_time,
            endTime: selectedSlot!.end_time,
            meetingLink: fullBooking?.meeting_link,
            classType: selectedClassType,
            totalAmount: selectedSlot ? ((new Date(selectedSlot.end_time).getTime() - new Date(selectedSlot.start_time).getTime()) / (1000 * 60 * 60)) * (selectedClassType === 'in-person' ? hourlyRate * 1.3 : hourlyRate) : 0,
            depositPaid: selectedSlot ? ((new Date(selectedSlot.end_time).getTime() - new Date(selectedSlot.start_time).getTime()) / (1000 * 60 * 60)) * (selectedClassType === 'in-person' ? hourlyRate * 1.3 : hourlyRate) * 0.3 : 0,
            balanceDue,
          },
        });

        toast({
          title: "Deposit confirmed!",
          description: `Deposit payment successful. Balance of KES ${balanceDue.toFixed(0)} due before the session. You'll receive a confirmation email shortly.`,
        });

        window.location.href = `/booking-confirmed?bookingId=${bookingId}`;
        resetForm();
      } else if (attempts >= 24) { // 2 minutes (24 * 5 seconds)
        clearInterval(checkPayment);
        toast({
          title: "Payment timeout",
          description: "Payment is taking longer than expected. Please check your M-Pesa messages.",
          variant: "destructive",
        });
        setPaymentInitiated(false);
      }
    }, 5000);
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
    fetchAvailableSlots();
    onBookingComplete?.();
  };

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
            />
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

              <div>
                <Label className="text-sm font-medium mb-2 block">Subject *</Label>
                <Input
                  placeholder="e.g., Mathematics - Algebra"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={paymentInitiated}
                />
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
              )}

              {!isTrialSession && (
                <>
                  {selectedSlot && (() => {
                    const duration = (new Date(selectedSlot.end_time).getTime() - new Date(selectedSlot.start_time).getTime()) / (1000 * 60 * 60);
                    const rate = selectedClassType === 'in-person' ? hourlyRate * 1.3 : hourlyRate;
                    const total = duration * rate;
                    const deposit = total * 0.3;
                    const balance = total - deposit;

                    return (
                      <PaymentOptionsCard
                        paymentOption={paymentOption}
                        onPaymentOptionChange={(option) => {
                          setPaymentOption(option);
                          if (option !== 'package') {
                            setSelectedPackage(null);
                            setSelectedExistingPackage(null);
                          }
                        }}
                        totalAmount={total}
                        depositAmount={deposit}
                        balanceDue={balance}
                        packageOffers={packageOffers}
                        existingPackages={existingPackages}
                        selectedPackage={selectedPackage}
                        selectedExistingPackage={selectedExistingPackage}
                        onPackageSelect={setSelectedPackage}
                        onExistingPackageSelect={(pkg) => {
                          setSelectedExistingPackage(pkg);
                          if (pkg) {
                            setPaymentOption('package');
                          }
                        }}
                        disabled={paymentInitiated}
                      />
                    );
                  })()}

                  {/* Show payment method when NOT using existing package */}
                  {!(paymentOption === 'package' && selectedExistingPackage) && (
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
                  )}
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
                ) : selectedExistingPackage ? (
                  "Book with Package"
                ) : paymentOption === 'package' ? (
                  <>
                    {paymentMethod === 'mpesa' ? <Smartphone className="w-4 h-4 mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                    Pay for Package & Book
                  </>
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

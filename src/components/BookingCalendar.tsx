import { useState, useEffect } from "react";
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
}: BookingCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedClassType, setSelectedClassType] = useState<'online' | 'in-person'>(classType);
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');
  const [loading, setLoading] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate, tutorId]);

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

    if (paymentMethod === 'mpesa' && (!phoneNumber || phoneNumber.length !== 10)) {
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

      const duration =
        (new Date(selectedSlot.end_time).getTime() -
          new Date(selectedSlot.start_time).getTime()) /
        (1000 * 60 * 60);
      
      // Calculate rate (30% more for in-person)
      const rate = selectedClassType === 'in-person' ? hourlyRate * 1.3 : hourlyRate;
      const totalAmount = duration * rate;
      
      // Deposit is 30% of total
      const depositAmount = totalAmount * 0.3;
      const balanceDue = totalAmount - depositAmount;

      // Create booking first with "pending_payment" status
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          student_id: user.id,
          tutor_id: tutorId,
          availability_slot_id: selectedSlot.id,
          subject: subject.trim(),
          notes: notes.trim() || null,
          amount: totalAmount,
          deposit_paid: depositAmount,
          balance_due: balanceDue,
          class_type: selectedClassType,
          status: "pending",
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Handle payment based on selected method
      if (paymentMethod === 'mpesa') {
        // Initiate M-Pesa payment for deposit
        const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
          "initiate-mpesa-payment",
          {
            body: {
              phoneNumber: `254${phoneNumber.substring(1)}`,
              amount: Math.round(depositAmount),
              paymentType: "tutor_booking_deposit",
              referenceId: booking.id,
            },
          }
        );

        if (paymentError) {
          await supabase.from("bookings").delete().eq("id", booking.id);
          throw paymentError;
        }

        setPaymentInitiated(true);
        toast({
          title: "Deposit Payment Initiated",
          description: `Please check your phone and pay the deposit of KES ${depositAmount.toFixed(0)}. Balance of KES ${balanceDue.toFixed(0)} due before the session.`,
        });

        // Poll for payment completion
        pollMpesaPayment(booking.id, balanceDue);
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
          },
        });

        toast({
          title: "Deposit confirmed!",
          description: `Deposit payment successful. Balance of KES ${balanceDue.toFixed(0)} due before the session. You'll receive a confirmation email shortly.`,
        });

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
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Book a Session</h3>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="text-sm font-medium mb-2 block">Select Date</label>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            className="rounded-md border pointer-events-auto"
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Available Time Slots</label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No available slots for this date</p>
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

              <div className="text-sm space-y-1 bg-muted/50 p-3 rounded">
                {(() => {
                  const duration = (new Date(selectedSlot.end_time).getTime() - new Date(selectedSlot.start_time).getTime()) / (1000 * 60 * 60);
                  const rate = selectedClassType === 'in-person' ? hourlyRate * 1.3 : hourlyRate;
                  const total = duration * rate;
                  const deposit = total * 0.3;
                  const balance = total - deposit;
                  
                  return (
                    <>
                      <p className="font-medium">Total Amount: KES {total.toFixed(2)} {selectedClassType === 'in-person' && <span className="text-xs">(+30% for in-person)</span>}</p>
                      <p className="text-primary font-semibold">Deposit Now: KES {deposit.toFixed(2)} (30%)</p>
                      <p className="text-muted-foreground text-xs">Balance Due: KES {balance.toFixed(2)} (before session)</p>
                      {paymentInitiated && (
                        <p className="text-amber-600">⏳ Waiting for M-Pesa deposit confirmation...</p>
                      )}
                    </>
                  );
                })()}
              </div>

              <Button 
                onClick={handleBookSlot} 
                disabled={loading || paymentInitiated} 
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : paymentInitiated ? (
                  "Waiting for Payment..."
                ) : (
                  <>
                    {paymentMethod === 'mpesa' ? <Smartphone className="w-4 h-4 mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                    Pay Deposit & Confirm Booking
                  </>
                )}
              </Button>

              {!paymentInitiated && (
                <div className="text-xs text-muted-foreground space-y-1">
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
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

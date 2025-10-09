import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format, isSameDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

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
}

export const BookingCalendar = ({
  tutorId,
  tutorName,
  tutorEmail,
  studentEmail,
  studentName,
  hourlyRate,
  onBookingComplete,
}: BookingCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
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

    if (!phoneNumber || phoneNumber.length !== 10) {
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
      const amount = duration * hourlyRate;

      // Create booking first with "pending_payment" status
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          student_id: user.id,
          tutor_id: tutorId,
          availability_slot_id: selectedSlot.id,
          subject: subject.trim(),
          notes: notes.trim() || null,
          amount,
          status: "pending",
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Initiate M-Pesa payment
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        "initiate-mpesa-payment",
        {
          body: {
            phoneNumber: `254${phoneNumber.substring(1)}`,
            amount: Math.round(amount),
            paymentType: "tutor_booking",
            referenceId: booking.id,
          },
        }
      );

      if (paymentError) {
        // Delete the booking if payment initiation fails
        await supabase.from("bookings").delete().eq("id", booking.id);
        throw paymentError;
      }

      setPaymentInitiated(true);
      toast({
        title: "Payment Initiated",
        description: "Please check your phone and enter your M-Pesa PIN to complete the payment. Your booking will be confirmed once payment is successful.",
      });

      // Poll for payment completion (simplified - in production use webhooks)
      let attempts = 0;
      const checkPayment = setInterval(async () => {
        attempts++;
        
        // Check if booking status has been updated to "confirmed"
        const { data: updatedBooking } = await supabase
          .from("bookings")
          .select("status")
          .eq("id", booking.id)
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
              startTime: selectedSlot.start_time,
              endTime: selectedSlot.end_time,
            },
          });

          toast({
            title: "Booking confirmed!",
            description: "Payment successful. You'll receive a confirmation email shortly.",
          });

          setSubject("");
          setNotes("");
          setPhoneNumber("");
          setSelectedSlot(null);
          setPaymentInitiated(false);
          fetchAvailableSlots();
          onBookingComplete?.();
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

              <div className="text-sm space-y-1">
                <p className="font-medium">Total Amount: KES {
                  (((new Date(selectedSlot.end_time).getTime() - new Date(selectedSlot.start_time).getTime()) / (1000 * 60 * 60)) * hourlyRate).toFixed(2)
                }</p>
                {paymentInitiated && (
                  <p className="text-amber-600">⏳ Waiting for M-Pesa payment confirmation...</p>
                )}
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
                  "Pay & Confirm Booking"
                )}
              </Button>

              {!paymentInitiated && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• You will receive an M-Pesa prompt on your phone</p>
                  <p>• Enter your M-Pesa PIN to complete the payment</p>
                  <p>• Booking is confirmed after successful payment</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

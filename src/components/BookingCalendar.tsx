import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format, isSameDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [loading, setLoading] = useState(false);
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

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const duration =
        (new Date(selectedSlot.end_time).getTime() -
          new Date(selectedSlot.start_time).getTime()) /
        (1000 * 60 * 60);
      const amount = duration * hourlyRate;

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          student_id: user.id,
          tutor_id: tutorId,
          availability_slot_id: selectedSlot.id,
          subject: subject.trim(),
          notes: notes.trim() || null,
          amount,
          status: "confirmed",
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

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
        description: "You'll receive a confirmation email shortly",
      });

      setSubject("");
      setNotes("");
      setSelectedSlot(null);
      fetchAvailableSlots();
      onBookingComplete?.();
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
            className="rounded-md border"
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
                <label className="text-sm font-medium mb-2 block">Subject *</label>
                <Input
                  placeholder="e.g., Mathematics - Algebra"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
                <Textarea
                  placeholder="Any specific topics or questions?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="text-sm">
                <p className="font-medium">Total Amount: KES {
                  (((new Date(selectedSlot.end_time).getTime() - new Date(selectedSlot.start_time).getTime()) / (1000 * 60 * 60)) * hourlyRate).toFixed(2)
                }</p>
              </div>

              <Button onClick={handleBookSlot} disabled={loading} className="w-full">
                {loading ? "Booking..." : "Confirm Booking"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

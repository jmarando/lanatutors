import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameDay, startOfMonth, endOfMonth } from "date-fns";
import { Loader2, CalendarCheck, CalendarX } from "lucide-react";

interface TutorCalendarOverviewProps {
  tutorId: string;
}

export const TutorCalendarOverview = ({ tutorId }: TutorCalendarOverviewProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availability, setAvailability] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalendarData();
  }, [tutorId]);

  const fetchCalendarData = async () => {
    try {
      const startDate = startOfMonth(new Date());
      const endDate = endOfMonth(new Date());

      // Fetch availability slots for the month
      const { data: availabilityData } = await supabase
        .from("tutor_availability")
        .select("*")
        .eq("tutor_id", tutorId)
        .gte("start_time", startDate.toISOString())
        .lte("start_time", endDate.toISOString());

      setAvailability(availabilityData || []);

      // Fetch bookings for the month
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select(`
          *,
          tutor_availability!inner(start_time, end_time),
          profiles!bookings_student_id_fkey(full_name)
        `)
        .eq("tutor_id", tutorId)
        .gte("tutor_availability.start_time", startDate.toISOString())
        .lte("tutor_availability.start_time", endDate.toISOString());

      setBookings(bookingsData || []);
    } catch (error) {
      console.error("Error fetching calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDaySlots = (date: Date) => {
    return availability.filter(slot => 
      isSameDay(new Date(slot.start_time), date)
    );
  };

  const getDayBookings = (date: Date) => {
    return bookings.filter(booking => 
      isSameDay(new Date(booking.tutor_availability.start_time), date)
    );
  };

  const selectedDaySlots = getDaySlots(selectedDate);
  const selectedDayBookings = getDayBookings(selectedDate);
  const availableSlots = selectedDaySlots.filter(slot => !slot.is_booked);

  // Get dates with availability or bookings for calendar highlighting
  const datesWithSlots = availability.map(slot => new Date(slot.start_time));

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-primary" />
          Calendar Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Calendar */}
          <div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border pointer-events-auto"
              modifiers={{
                hasSlots: datesWithSlots,
              }}
              modifiersClassNames={{
                hasSlots: "bg-primary/10 font-semibold",
              }}
            />
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded bg-primary/10 border border-primary/20" />
                <span className="text-muted-foreground">Days with availability</span>
              </div>
            </div>
          </div>

          {/* Selected Day Details */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </h3>
              
              {selectedDaySlots.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarX className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No availability set for this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Slots:</span>
                    <Badge variant="outline">{selectedDaySlots.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Booked:</span>
                    <Badge className="bg-primary">{selectedDayBookings.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Available:</span>
                    <Badge className="bg-green-600">{availableSlots.length}</Badge>
                  </div>

                  <div className="border-t pt-3 mt-3">
                    <h4 className="text-sm font-semibold mb-2">Time Slots</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedDaySlots.map((slot) => {
                        const booking = selectedDayBookings.find(
                          b => b.availability_slot_id === slot.id
                        );
                        return (
                          <div
                            key={slot.id}
                            className={`p-2 rounded-md border text-sm ${
                              slot.is_booked
                                ? "bg-primary/5 border-primary/20"
                                : "bg-green-50 border-green-200"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {format(new Date(slot.start_time), "h:mm a")} -{" "}
                                {format(new Date(slot.end_time), "h:mm a")}
                              </span>
                              {slot.is_booked ? (
                                <Badge variant="secondary" className="text-xs">
                                  Booked
                                </Badge>
                              ) : (
                                <Badge className="bg-green-600 text-xs">
                                  Available
                                </Badge>
                              )}
                            </div>
                            {booking && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                Student: {booking.profiles?.full_name || "Unknown"}
                                <br />
                                Subject: {booking.subject}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

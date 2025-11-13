import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import { Loader2, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface TutorWeeklyCalendarProps {
  tutorId: string;
}

export const TutorWeeklyCalendar = ({ tutorId }: TutorWeeklyCalendarProps) => {
  const navigate = useNavigate();
  const [availability, setAvailability] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyData();
  }, [tutorId]);

  const fetchWeeklyData = async () => {
    try {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
      const weekEnd = addDays(weekStart, 6);

      // Fetch availability slots for the week
      const { data: availabilityData } = await supabase
        .from("tutor_availability")
        .select("*")
        .eq("tutor_id", tutorId)
        .gte("start_time", weekStart.toISOString())
        .lte("start_time", weekEnd.toISOString())
        .order("start_time");

      setAvailability(availabilityData || []);

      // Fetch bookings for the week
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select(`
          *,
          tutor_availability!inner(start_time, end_time),
          profiles!bookings_student_id_fkey(full_name)
        `)
        .eq("tutor_id", tutorId)
        .gte("tutor_availability.start_time", weekStart.toISOString())
        .lte("tutor_availability.start_time", weekEnd.toISOString())
        .order("tutor_availability(start_time)");

      setBookings(bookingsData || []);
    } catch (error) {
      console.error("Error fetching weekly data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekDays = () => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  };

  const getDaySlots = (date: Date) => {
    return availability.filter(slot => 
      isSameDay(parseISO(slot.start_time), date)
    );
  };

  const getDayBookings = (date: Date) => {
    return bookings.filter(booking => 
      isSameDay(parseISO(booking.tutor_availability.start_time), date)
    );
  };

  const weekDays = getWeekDays();

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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          This Week's Schedule
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate("/tutor/availability")}
        >
          Manage Availability
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const daySlots = getDaySlots(day);
            const dayBookings = getDayBookings(day);
            const availableSlots = daySlots.filter(slot => !slot.is_booked);
            const isToday = isSameDay(day, new Date());

            return (
              <div 
                key={day.toISOString()} 
                className={`border rounded-lg p-3 min-h-[120px] ${
                  isToday ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="text-center mb-2">
                  <div className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-lg font-bold ${isToday ? 'text-primary' : ''}`}>
                    {format(day, 'd')}
                  </div>
                </div>

                <div className="space-y-1">
                  {/* Bookings */}
                  {dayBookings.map((booking) => (
                    <div 
                      key={booking.id}
                      className="bg-primary/10 border border-primary/20 rounded px-2 py-1 text-xs"
                    >
                      <div className="flex items-center gap-1 text-primary font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{format(parseISO(booking.tutor_availability.start_time), 'HH:mm')}</span>
                      </div>
                      <div className="text-foreground/70 truncate mt-0.5">
                        {booking.subject}
                      </div>
                    </div>
                  ))}

                  {/* Available Slots */}
                  {availableSlots.slice(0, 2).map((slot) => (
                    <div 
                      key={slot.id}
                      className="bg-muted border border-border rounded px-2 py-1 text-xs"
                    >
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{format(parseISO(slot.start_time), 'HH:mm')}</span>
                      </div>
                    </div>
                  ))}

                  {/* Show count if more slots */}
                  {availableSlots.length > 2 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{availableSlots.length - 2} more
                    </div>
                  )}

                  {/* No slots indicator */}
                  {daySlots.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      No slots
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary/10 border border-primary/20" />
            <span>Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-muted border border-border" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2 border-primary" />
            <span>Today</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

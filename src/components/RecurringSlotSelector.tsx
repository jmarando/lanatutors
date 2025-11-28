import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { format, addDays, isSameDay, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { supabase } from "@/integrations/supabase/client";
import { Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface AvailabilitySlot {
  id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

interface RecurringSlotSelectorProps {
  tutorUserId: string;
  onSlotsSelected: (slots: string[]) => void;
  selectedSlots: string[];
}

export const RecurringSlotSelector = ({ 
  tutorUserId, 
  onSlotsSelected,
  selectedSlots 
}: RecurringSlotSelectorProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [weekDates, setWeekDates] = useState<Date[]>([]);

  useEffect(() => {
    // Generate next 7 days
    const dates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));
    setWeekDates(dates);
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailability(selectedDate);
    }
  }, [selectedDate, tutorUserId]);

  const fetchAvailability = async (date: Date) => {
    setLoading(true);
    try {
      const EAT_TIMEZONE = 'Africa/Nairobi';
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Convert to UTC from EAT for database query
      const startOfDayUTC = fromZonedTime(startOfDay, EAT_TIMEZONE);
      const endOfDayUTC = fromZonedTime(endOfDay, EAT_TIMEZONE);

      const { data, error } = await supabase
        .from("tutor_availability")
        .select("*")
        .eq("tutor_id", tutorUserId)
        .gte("start_time", startOfDayUTC.toISOString())
        .lte("start_time", endOfDayUTC.toISOString())
        .order("start_time", { ascending: true });

      if (error) throw error;

      const allSlots = data || [];

      // Filter using the same logic as BookingCalendar
      const blockedIntervals = allSlots
        .filter((s: any) => s.slot_type === "blocked")
        .map((s: any) => ({
          start: new Date(s.start_time).getTime(),
          end: new Date(s.end_time).getTime(),
        }));

      const totalBlockedHours = blockedIntervals.reduce((sum, b) => {
        return sum + (b.end - b.start) / (1000 * 60 * 60);
      }, 0);

      const hasFullDayBlock = totalBlockedHours >= 10;

      if (hasFullDayBlock) {
        setAvailableSlots([]);
        setLoading(false);
        return;
      }

      const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
        Math.max(aStart, bStart) < Math.min(aEnd, bEnd);

      const candidateAvailable = allSlots.filter((s: any) =>
        !s.is_booked && (s.slot_type === null || s.slot_type === "available")
      );

      const filteredAvailable = candidateAvailable.filter((s: any) => {
        const sStart = new Date(s.start_time).getTime();
        const sEnd = new Date(s.end_time).getTime();
        return !blockedIntervals.some((b) => overlaps(sStart, sEnd, b.start, b.end));
      });

      setAvailableSlots(filteredAvailable);
    } catch (error) {
      console.error("Error fetching availability:", error);
      toast.error("Failed to load availability");
    } finally {
      setLoading(false);
    }
  };

  const toggleSlot = (slotId: string) => {
    const newSelectedSlots = selectedSlots.includes(slotId)
      ? selectedSlots.filter(id => id !== slotId)
      : [...selectedSlots, slotId];
    
    onSlotsSelected(newSelectedSlots);
  };

  const formatTimeSlot = (startTime: string, endTime: string) => {
    const EAT_TIMEZONE = 'Africa/Nairobi';
    const startEAT = formatInTimeZone(parseISO(startTime), EAT_TIMEZONE, "h:mm a");
    const endEAT = formatInTimeZone(parseISO(endTime), EAT_TIMEZONE, "h:mm a");
    return `${startEAT} - ${endEAT}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-3 block">Select Recurring Time Slots</Label>
        <p className="text-xs text-muted-foreground mb-4">
          Choose the same time slots across different days to create your recurring schedule. Selected slots will be blocked on the tutor's calendar after payment. <span className="font-medium">Times shown in EAT.</span>
        </p>
      </div>

      {/* Quick Day Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {weekDates.map((date, index) => (
          <button
            key={index}
            onClick={() => setSelectedDate(date)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg border-2 transition-all ${
              isSameDay(date, selectedDate)
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30"
            }`}
          >
            <div className="text-xs font-medium">{format(date, "EEE")}</div>
            <div className="text-sm">{format(date, "MMM d")}</div>
          </button>
        ))}
      </div>

      {/* Selected Slots Summary */}
      {selectedSlots.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{selectedSlots.length} slot(s) selected</span>
            </div>
            <p className="text-xs text-muted-foreground">
              These slots will be reserved for your recurring sessions
            </p>
          </CardContent>
        </Card>
      )}

      {/* Available Time Slots */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm">
              Available on {format(selectedDate, "EEEE, MMM d")}
            </h4>
            <Badge variant="secondary">{availableSlots.length} slots</Badge>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading slots...</p>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No available slots for this day</p>
              <p className="text-xs text-muted-foreground mt-1">Try selecting a different date</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableSlots.map((slot) => {
                const isSelected = selectedSlots.includes(slot.id);
                return (
                  <button
                    key={slot.id}
                    onClick={() => toggleSlot(slot.id)}
                    disabled={slot.is_booked}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center justify-between ${
                      slot.is_booked
                        ? "opacity-50 cursor-not-allowed border-border bg-muted/30"
                        : isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/30 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {formatTimeSlot(slot.start_time, slot.end_time)}
                      </span>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    )}
                    {slot.is_booked && (
                      <Badge variant="secondary" className="text-xs">Booked</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-900">
          <strong>How it works:</strong> Select time slots from different days that work for your schedule. After payment, the tutor will block these recurring slots on their calendar for the duration of your package (90 days).
        </p>
      </div>
    </div>
  );
};

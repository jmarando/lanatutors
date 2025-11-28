import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format, addDays, parseISO, startOfWeek } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Plus, X, Calendar, BookOpen, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface AvailabilitySlot {
  id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  slot_type: string | null;
}

interface RecurringScheduleItem {
  id: string;
  subject: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  timeSlot: string; // e.g., "8:00 AM - 9:00 AM"
  weeks: number;
  availabilitySlotId: string;
}

interface RecurringScheduleBuilderProps {
  tutorUserId: string;
  subjects: string[];
  onScheduleComplete: (schedule: RecurringScheduleItem[]) => void;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

export const RecurringScheduleBuilder = ({
  tutorUserId,
  subjects,
  onScheduleComplete,
}: RecurringScheduleBuilderProps) => {
  const [schedule, setSchedule] = useState<RecurringScheduleItem[]>([]);
  const [currentSubject, setCurrentSubject] = useState<string>("");
  const [currentDay, setCurrentDay] = useState<number | null>(null);
  const [currentWeeks, setCurrentWeeks] = useState<number>(4);
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentDay !== null) {
      fetchAvailabilityForDay(currentDay);
    }
  }, [currentDay, tutorUserId]);

  useEffect(() => {
    onScheduleComplete(schedule);
  }, [schedule]);

  const fetchAvailabilityForDay = async (dayOfWeek: number) => {
    setLoading(true);
    try {
      const EAT_TIMEZONE = 'Africa/Nairobi';
      
      // Get the next occurrence of this day of week
      const today = new Date();
      const daysUntilTarget = (dayOfWeek - today.getDay() + 7) % 7;
      const targetDate = addDays(today, daysUntilTarget === 0 ? 7 : daysUntilTarget);
      
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
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

  const formatTimeSlot = (startTime: string, endTime: string) => {
    const EAT_TIMEZONE = 'Africa/Nairobi';
    const startEAT = formatInTimeZone(parseISO(startTime), EAT_TIMEZONE, "h:mm a");
    const endEAT = formatInTimeZone(parseISO(endTime), EAT_TIMEZONE, "h:mm a");
    return `${startEAT} - ${endEAT}`;
  };

  const handleAddToSchedule = () => {
    if (!currentSubject) {
      toast.error("Please select a subject");
      return;
    }
    if (currentDay === null) {
      toast.error("Please select a day");
      return;
    }
    if (!selectedSlot) {
      toast.error("Please select a time slot");
      return;
    }
    if (currentWeeks < 1) {
      toast.error("Please enter at least 1 week");
      return;
    }

    const dayLabel = DAYS_OF_WEEK.find(d => d.value === currentDay)?.label || "";
    const timeSlot = formatTimeSlot(selectedSlot.start_time, selectedSlot.end_time);

    // Check if this exact slot already exists
    const duplicate = schedule.find(
      item => 
        item.subject === currentSubject && 
        item.dayOfWeek === currentDay && 
        item.availabilitySlotId === selectedSlot.id
    );

    if (duplicate) {
      toast.error(`${currentSubject} on ${dayLabel} ${timeSlot} is already in your schedule`);
      return;
    }

    const newItem: RecurringScheduleItem = {
      id: `${Date.now()}-${Math.random()}`,
      subject: currentSubject,
      dayOfWeek: currentDay,
      timeSlot,
      weeks: currentWeeks,
      availabilitySlotId: selectedSlot.id,
    };

    setSchedule([...schedule, newItem]);
    
    // Reset form
    setCurrentSubject("");
    setCurrentDay(null);
    setSelectedSlot(null);
    setCurrentWeeks(4);
    setAvailableSlots([]);

    toast.success(`Added ${currentSubject} to recurring schedule`);
  };

  const handleRemoveFromSchedule = (id: string) => {
    setSchedule(schedule.filter(item => item.id !== id));
    toast.success("Removed from schedule");
  };

  const totalSessions = schedule.reduce((sum, item) => sum + item.weeks, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="font-semibold text-lg mb-2">Build Your Recurring Schedule</h3>
        <p className="text-sm text-muted-foreground">
          Create a weekly schedule by adding recurring time slots for each subject. 
          <span className="font-medium"> All times shown in EAT.</span>
        </p>
      </div>

      {/* Current Schedule Summary */}
      {schedule.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Your Recurring Schedule</span>
              </div>
              <Badge variant="secondary">{totalSessions} total sessions</Badge>
            </div>
            <div className="space-y-2">
              {schedule.map((item) => {
                const dayLabel = DAYS_OF_WEEK.find(d => d.value === item.dayOfWeek)?.label || "";
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-background"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.subject}</div>
                      <div className="text-xs text-muted-foreground">
                        {dayLabel}s • {item.timeSlot} • {item.weeks} week{item.weeks !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveFromSchedule(item.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Recurring Slot Form */}
      <Card className="border-dashed">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Add Recurring Time Slot</span>
          </div>

          {/* Subject Selection */}
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={currentSubject} onValueChange={setCurrentSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Day Selection */}
          <div className="space-y-2">
            <Label>Day of Week</Label>
            <Select
              value={currentDay !== null ? currentDay.toString() : ""}
              onValueChange={(value) => {
                setCurrentDay(parseInt(value));
                setSelectedSlot(null); // Reset slot when day changes
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((day) => (
                  <SelectItem key={day.value} value={day.value.toString()}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Slot Selection */}
          {currentDay !== null && (
            <div className="space-y-2">
              <Label>Time Slot (EAT)</Label>
              {loading ? (
                <div className="text-center py-4">
                  <Clock className="w-5 h-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Loading available times...</p>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-4 border rounded-lg border-dashed">
                  <AlertCircle className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">No available slots for this day</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`w-full p-2 rounded-lg border-2 transition-all text-left flex items-center justify-between ${
                        selectedSlot?.id === slot.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          {formatTimeSlot(slot.start_time, slot.end_time)}
                        </span>
                      </div>
                      {selectedSlot?.id === slot.id && (
                        <Badge variant="secondary" className="text-xs">Selected</Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Number of Weeks */}
          {selectedSlot && (
            <div className="space-y-2">
              <Label>Number of Weeks</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentWeeks(Math.max(1, currentWeeks - 1))}
                >
                  -
                </Button>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={currentWeeks}
                  onChange={(e) => setCurrentWeeks(Math.max(1, parseInt(e.target.value) || 1))}
                  className="text-center font-bold w-20"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentWeeks(Math.min(12, currentWeeks + 1))}
                >
                  +
                </Button>
                <span className="text-sm text-muted-foreground">
                  = {currentWeeks} session{currentWeeks !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[4, 8, 12].map((weeks) => (
                  <Button
                    key={weeks}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentWeeks(weeks)}
                    className={currentWeeks === weeks ? "border-primary" : ""}
                  >
                    {weeks} weeks
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Add Button */}
          {selectedSlot && (
            <Button
              type="button"
              onClick={handleAddToSchedule}
              className="w-full"
              variant="default"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add to Schedule
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <BookOpen className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-900">
              <strong>How it works:</strong> Add each recurring slot separately. For example, "English - Monday 2:00 PM - 4 weeks" creates 4 English sessions. 
              After payment, these slots will be blocked on the tutor's calendar for the specified weeks.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

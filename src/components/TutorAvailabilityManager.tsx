import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Clock, Trash2, Info, Sparkles, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const TutorAvailabilityManager = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [weekSlots, setWeekSlots] = useState<any[]>([]);
  const [hasExistingSlots, setHasExistingSlots] = useState(false);
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingAvailability, setGeneratingAvailability] = useState(false);
  const { toast } = useToast();

  const checkExistingSlots = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const fourWeeksLater = addWeeks(now, 4);

      const { data, error } = await supabase
        .from("tutor_availability")
        .select("id")
        .eq("tutor_id", user.id)
        .gte("start_time", now.toISOString())
        .lte("start_time", fourWeeksLater.toISOString())
        .limit(1);

      if (!error && data && data.length > 0) {
        setHasExistingSlots(true);
      }
    } catch (err) {
      console.error("Error checking existing slots:", err);
    }
  };

  const fetchWeekSlots = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const weekStart = new Date(currentWeekStart);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = addDays(weekStart, 7);

      const { data, error }: any = await supabase
        .from("tutor_availability")
        .select("*")
        .eq("tutor_id", user.id)
        .gte("start_time", weekStart.toISOString())
        .lt("start_time", weekEnd.toISOString());

      if (error) {
        console.error("Error fetching week slots:", error);
        return;
      }

      setWeekSlots(data || []);
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  const fetchBlockedSlots = async () => {
    if (!selectedDate) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Use simple query without complex chaining
      const { data, error }: any = await supabase
        .from("tutor_availability")
        .select("*")
        .eq("tutor_id", user.id)
        .filter("slot_type", "eq", "blocked")
        .filter("start_time", "gte", startOfDay.toISOString())
        .filter("start_time", "lte", endOfDay.toISOString());

      if (error) {
        console.error("Error fetching blocked slots:", error);
        return;
      }

      // Sort by start_time
      const sorted = (data || []).sort((a: any, b: any) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      
      setBlockedSlots(sorted);
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  useEffect(() => {
    checkExistingSlots();
    fetchWeekSlots();
    fetchBlockedSlots();
  }, [selectedDate, currentWeekStart]);

  const handleBlockTime = async () => {
    if (!selectedDate || !startTime || !endTime) {
      toast({
        title: "Missing information",
        description: "Please select a date and provide start and end times",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);

    const startDateTime = new Date(selectedDate);
    const [startHour, startMin] = startTime.split(":").map(Number);
    startDateTime.setHours(startHour, startMin, 0, 0);

    const endDateTime = new Date(selectedDate);
    const [endHour, endMin] = endTime.split(":").map(Number);
    endDateTime.setHours(endHour, endMin, 0, 0);

    if (endDateTime <= startDateTime) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("tutor_availability")
      .insert({
        tutor_id: user.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        is_booked: false,
        slot_type: "blocked",
      });

    if (error) {
      console.error("Error blocking time:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Time blocked",
        description: "You will not be available during this time",
      });
      setStartTime("");
      setEndTime("");
      fetchBlockedSlots();
      fetchWeekSlots();
    }

    setLoading(false);
  };

  const handleBlockEntireDay = async () => {
    if (!selectedDate) {
      toast({
        title: "Missing information",
        description: "Please select a date to block",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);

    // Block from 8 AM to 8 PM
    const blockStart = new Date(selectedDate);
    blockStart.setHours(8, 0, 0, 0);

    const blockEnd = new Date(selectedDate);
    blockEnd.setHours(20, 0, 0, 0);

    const { error } = await supabase
      .from("tutor_availability")
      .insert({
        tutor_id: user.id,
        start_time: blockStart.toISOString(),
        end_time: blockEnd.toISOString(),
        is_booked: false,
        slot_type: "blocked",
      });

    if (error) {
      console.error("Error blocking entire day:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Entire day blocked",
        description: `${format(selectedDate, "MMMM d, yyyy")} is now unavailable (8 AM - 8 PM)`,
      });
      fetchBlockedSlots();
      fetchWeekSlots();
    }

    setLoading(false);
  };

  const handleDeleteSlot = async (slotId: string, isBooked: boolean | null) => {
    if (isBooked) {
      toast({
        title: "Cannot delete",
        description: "This slot is already booked",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("tutor_availability")
      .delete()
      .eq("id", slotId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Slot deleted",
        description: "The time slot has been removed",
      });
      fetchBlockedSlots();
    }
  };

  const handleGenerateAvailability = async () => {
    setGeneratingAvailability(true);
    
    try {
      const { error } = await supabase.functions.invoke('generate-weekly-availability', {
        body: { weeksAhead: 4 }
      });

      if (error) {
        console.error('Error generating availability:', error);
        toast({
          title: "Error",
          description: "Failed to generate availability slots. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Availability Generated",
          description: "Your availability for the next 4 weeks has been created (8 AM - 8 PM daily)",
        });
        checkExistingSlots();
        fetchWeekSlots();
        fetchBlockedSlots();
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setGeneratingAvailability(false);
    }
  };

  const getSlotStyle = (slot: any) => {
    if (slot.is_booked) return "bg-blue-100 border-blue-300 text-blue-900";
    if (slot.slot_type === "blocked") return "bg-red-50 border-red-200 text-red-700";
    return "bg-green-50 border-green-200 text-green-700";
  };

  const getSlotLabel = (slot: any) => {
    if (slot.is_booked) return "Booked";
    if (slot.slot_type === "blocked") return "Blocked";
    return "Available";
  };

  const hours = Array.from({ length: 14 }, (_, i) => i + 6); // 6 AM to 8 PM
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const getSlotsForDayAndHour = (day: Date, hour: number) => {
    const dayStart = new Date(day);
    dayStart.setHours(hour, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(hour + 1, 0, 0, 0);

    return weekSlots.filter(slot => {
      const slotStart = new Date(slot.start_time);
      const slotEnd = new Date(slot.end_time);
      
      // Only show slot if it STARTS in this hour (prevents duplicates for multi-hour blocks)
      return slotStart >= dayStart && slotStart < dayEnd;
    });
  };

  // Check if a given hour is covered by any blocked slot (for visual marking)
  const isHourBlocked = (day: Date, hour: number) => {
    const dayStart = new Date(day);
    dayStart.setHours(hour, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(hour + 1, 0, 0, 0);

    return weekSlots.some(slot => {
      if (slot.slot_type !== "blocked") return false;
      const slotStart = new Date(slot.start_time);
      const slotEnd = new Date(slot.end_time);
      // Check if this hour is covered by the blocked slot
      return (slotStart < dayEnd && slotEnd > dayStart);
    });
  };

  return (
    <div className="space-y-4">
      {/* Manage Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Manage Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label className="mb-2 block">Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-md border"
              />
            </div>

            <div className="space-y-4">
              {/* Generate Availability Button */}
              <div>
                <Label className="mb-2 block">Quick Setup</Label>
                <Alert className="mb-3 bg-primary/10 border-primary/30">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <AlertDescription>
                    <strong>First time here?</strong> Generate your default availability (8 AM - 8 PM daily) for the next 4 weeks.
                  </AlertDescription>
                </Alert>
                <Button 
                  onClick={handleGenerateAvailability} 
                  disabled={generatingAvailability || hasExistingSlots}
                  variant={hasExistingSlots ? "secondary" : "default"}
                  className="w-full"
                >
                  {generatingAvailability ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : hasExistingSlots ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Availability Already Generated
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate 4 Weeks of Availability
                    </>
                  )}
                </Button>
              </div>

              <div>
                <Label className="mb-2 block">Block Unavailable Time</Label>
                <Alert className="mb-3">
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    Block specific times when you're unavailable (meetings, personal time, etc.)
                  </AlertDescription>
                </Alert>
                
                <Button 
                  onClick={handleBlockEntireDay} 
                  disabled={loading || !selectedDate}
                  variant="outline"
                  className="w-full mb-4"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Blocking...
                    </>
                  ) : (
                    "Block Entire Day (8 AM - 8 PM)"
                  )}
                </Button>

                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or block specific time
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Start Time</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">End Time</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={handleBlockTime} disabled={loading} className="w-full">
                  <Info className="w-4 h-4 mr-2" />
                  Block Time
                </Button>
              </div>

              <div>
                <Label className="mb-2 block">
                  Blocked Times for {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Selected Date"}
                </Label>
                {blockedSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No blocked times for this date</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {blockedSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between p-2 border rounded-md"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(slot.start_time), "h:mm a")} -{" "}
                            {format(new Date(slot.end_time), "h:mm a")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSlot(slot.id, slot.is_booked)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Week Calendar View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Weekly Schedule
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium px-4">
                {format(currentWeekStart, "MMM d")} - {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header Row */}
              <div className="grid grid-cols-8 gap-1 mb-1">
                <div className="text-xs font-medium text-muted-foreground p-1.5">Time</div>
                {weekDays.map((day, i) => (
                  <div key={i} className="text-center p-1.5">
                    <div className="text-xs font-medium">{format(day, "EEE")}</div>
                    <div className="text-sm font-bold">{format(day, "d")}</div>
                  </div>
                ))}
              </div>
              
              {/* Time Grid */}
              <div className="space-y-0.5">
                {hours.map((hour) => (
                  <div key={hour} className="grid grid-cols-8 gap-1">
                    <div className="text-xs text-muted-foreground p-1.5 flex items-start">
                      {format(new Date().setHours(hour, 0, 0, 0), "h a")}
                    </div>
                    {weekDays.map((day, dayIndex) => {
                      const slots = getSlotsForDayAndHour(day, hour);
                      const blocked = isHourBlocked(day, hour);
                      return (
                        <div 
                          key={dayIndex} 
                          className={`min-h-[40px] border border-border/40 rounded p-1 ${
                            blocked && slots.length === 0 ? 'bg-red-50/50' : ''
                          }`}
                        >
                          {slots.map((slot, slotIndex) => (
                            <div
                              key={slotIndex}
                              className={`text-xs p-1 rounded border mb-1 ${getSlotStyle(slot)}`}
                            >
                              <div className="font-medium truncate">{getSlotLabel(slot)}</div>
                              <div className="text-[10px] opacity-75">
                                {format(new Date(slot.start_time), "h:mm a")}
                              </div>
                            </div>
                          ))}
                          {blocked && slots.length === 0 && (
                            <div className="text-[10px] text-red-600 opacity-60">Blocked</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              
              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>
                  <span>Blocked</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                  <span>Booked</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

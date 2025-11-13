import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Ban, Trash2, Info } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const TutorAvailabilityManager = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedDate) {
      fetchBlockedSlots();
    }
  }, [selectedDate]);

  const fetchBlockedSlots = async () => {
    if (!selectedDate) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("tutor_availability")
      .select("*")
      .eq("tutor_id", user.id)
      .eq("slot_type", "blocked")
      .gte("start_time", startOfDay.toISOString())
      .lte("start_time", endOfDay.toISOString())
      .order("start_time");

    if (error) {
      console.error("Error fetching blocked slots:", error);
      return;
    }

    setBlockedSlots(data || []);
  };

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
    }

    setLoading(false);
  };

  const handleDeleteSlot = async (slotId: string, isBooked: boolean) => {
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
      fetchSlots();
    }
  };

  return (
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
            <div>
              <Label className="mb-2 block">Add Time Slot</Label>
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
              <Button onClick={handleAddSlot} disabled={loading} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Slot
              </Button>
            </div>

            <div>
              <Label className="mb-2 block">
                Available Slots for {selectedDate ? format(selectedDate, "MMM d, yyyy") : "selected date"}
              </Label>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No slots for this date
                  </p>
                ) : (
                  slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {format(new Date(slot.start_time), "h:mm a")} -{" "}
                          {format(new Date(slot.end_time), "h:mm a")}
                        </span>
                        {slot.is_booked && (
                          <Badge variant="default" className="text-xs">Booked</Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSlot(slot.id, slot.is_booked)}
                        disabled={slot.is_booked}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
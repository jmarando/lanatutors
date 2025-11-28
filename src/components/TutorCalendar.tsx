import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format, addMinutes, isBefore, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TutorCalendarProps {
  tutorId: string;
  onSlotCreated?: () => void;
}

export const TutorCalendar = ({ tutorId, onSlotCreated }: TutorCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateSlot = async () => {
    if (!selectedDate) {
      toast({
        title: "Please select a date",
        variant: "destructive",
      });
      return;
    }

    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    const startDateTime = new Date(selectedDate);
    startDateTime.setHours(startHour, startMinute, 0, 0);

    const endDateTime = new Date(selectedDate);
    endDateTime.setHours(endHour, endMinute, 0, 0);

    if (isBefore(startDateTime, new Date())) {
      toast({
        title: "Invalid time",
        description: "Cannot create slots in the past",
        variant: "destructive",
      });
      return;
    }

    if (!isBefore(startDateTime, endDateTime)) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("tutor_availability").insert({
        tutor_id: tutorId,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        is_booked: false,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Availability slot created",
      });

      onSlotCreated?.();
    } catch (error: any) {
      console.error("Error creating slot:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Create Availability Slot</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Select Date</label>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => isBefore(date, startOfDay(new Date()))}
            className="rounded-md border"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Start Time (EAT)</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">End Time (EAT)</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>

        <Button
          onClick={handleCreateSlot}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Creating..." : "Create Availability Slot"}
        </Button>
      </div>
    </Card>
  );
};

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Clock, Trash2, Info, Sparkles, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const TutorAvailabilityManager = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingAvailability, setGeneratingAvailability] = useState(false);
  const { toast } = useToast();

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
    fetchBlockedSlots();
  }, [selectedDate]);

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
                disabled={generatingAvailability}
                variant="default"
                className="w-full"
              >
                {generatingAvailability ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
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
                Blocked Times for {selectedDate ? format(selectedDate, "MMM d, yyyy") : "selected date"}
              </Label>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {blockedSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No blocked times for this date
                  </p>
                ) : (
                  blockedSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {format(new Date(slot.start_time), "h:mm a")} -{" "}
                          {format(new Date(slot.end_time), "h:mm a")}
                        </span>
                        <Badge variant="secondary" className="text-xs">Blocked</Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSlot(slot.id, slot.is_booked)}
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

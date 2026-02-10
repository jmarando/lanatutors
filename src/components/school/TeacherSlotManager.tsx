import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, isBefore, startOfDay, parseISO } from "date-fns";
import { CalendarPlus, Clock, Trash2, User } from "lucide-react";

interface TeacherSlotManagerProps {
  schoolId: string;
  teacherMemberId: string;
}

interface Slot {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

interface Booking {
  id: string;
  slot_id: string;
  reason: string | null;
  status: string;
  school_students: { student_name: string; class_name: string } | null;
  school_members: { full_name: string } | null;
}

const TeacherSlotManager: React.FC<TeacherSlotManagerProps> = ({ schoolId, teacherMemberId }) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("14:30");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSlots();
  }, [teacherMemberId]);

  const fetchSlots = async () => {
    const { data: slotsData } = await supabase
      .from("school_teacher_slots")
      .select("*")
      .eq("teacher_member_id", teacherMemberId)
      .gte("slot_date", format(new Date(), "yyyy-MM-dd"))
      .order("slot_date", { ascending: true });

    setSlots(slotsData || []);

    if (slotsData && slotsData.length > 0) {
      const slotIds = slotsData.map(s => s.id);
      const { data: bookingsData } = await supabase
        .from("school_parent_bookings")
        .select("*, school_students(student_name, class_name), school_members!school_parent_bookings_parent_member_id_fkey(full_name)")
        .in("slot_id", slotIds);
      setBookings((bookingsData as any) || []);
    }
  };

  const handleCreateSlot = async () => {
    if (!selectedDate) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("school_teacher_slots").insert({
        school_id: schoolId,
        teacher_member_id: teacherMemberId,
        slot_date: format(selectedDate, "yyyy-MM-dd"),
        start_time: startTime,
        end_time: endTime,
      });

      if (error) throw error;
      toast.success("Consultation slot created!");
      fetchSlots();
    } catch (err: any) {
      toast.error(err.message || "Failed to create slot");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    const { error } = await supabase.from("school_teacher_slots").delete().eq("id", slotId);
    if (error) {
      toast.error("Cannot delete a booked slot");
    } else {
      toast.success("Slot removed");
      fetchSlots();
    }
  };

  const slotsForDate = selectedDate
    ? slots.filter(s => s.slot_date === format(selectedDate, "yyyy-MM-dd"))
    : [];

  const datesWithSlots = slots.map(s => parseISO(s.slot_date));

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Create slot */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarPlus className="h-5 w-5" /> Add Consultation Slot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => isBefore(date, startOfDay(new Date()))}
              modifiers={{ hasSlot: datesWithSlots }}
              modifiersStyles={{ hasSlot: { fontWeight: "bold", textDecoration: "underline" } }}
              className="rounded-md border"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
            </div>
            <Button onClick={handleCreateSlot} disabled={loading || !selectedDate} className="w-full">
              {loading ? "Creating..." : "Create Slot"}
            </Button>
          </CardContent>
        </Card>

        {/* Slots for selected date */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Select a date"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {slotsForDate.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No consultation slots on this date.</p>
            ) : (
              <div className="space-y-3">
                {slotsForDate.map(slot => {
                  const booking = bookings.find(b => b.slot_id === slot.id);
                  return (
                    <div key={slot.id} className={`p-3 rounded-lg border ${slot.is_booked ? "bg-accent/50 border-accent" : "bg-background"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}</span>
                        </div>
                        {slot.is_booked ? (
                          <Badge variant="secondary">Booked</Badge>
                        ) : (
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteSlot(slot.id)} className="h-8 w-8">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      {booking && (
                        <div className="mt-2 text-sm text-muted-foreground space-y-1">
                          <p className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {(booking.school_members as any)?.full_name} — {(booking.school_students as any)?.student_name} ({(booking.school_students as any)?.class_name})
                          </p>
                          {booking.reason && <p className="italic">"{booking.reason}"</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming bookings summary */}
      {bookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Parent Meetings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bookings.map(b => {
                const slot = slots.find(s => s.id === b.slot_id);
                if (!slot) return null;
                return (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                    <div>
                      <span className="font-medium">{format(parseISO(slot.slot_date), "MMM d")}</span>
                      <span className="text-muted-foreground ml-2">{slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{(b.school_members as any)?.full_name}</p>
                      <p className="text-muted-foreground">{(b.school_students as any)?.student_name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeacherSlotManager;

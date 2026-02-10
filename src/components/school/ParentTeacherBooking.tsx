import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Calendar, Clock, CheckCircle, XCircle } from "lucide-react";

interface Student {
  id: string;
  student_name: string;
  class_name: string;
}

interface ParentTeacherBookingProps {
  schoolId: string;
  parentMemberId: string;
  myStudents: Student[];
}

interface TeacherSlot {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  school_members: { full_name: string } | null;
}

interface MyBooking {
  id: string;
  slot_id: string;
  reason: string | null;
  status: string;
  student_id: string;
  school_teacher_slots: {
    slot_date: string;
    start_time: string;
    end_time: string;
    school_members: { full_name: string } | null;
  } | null;
  school_students: { student_name: string } | null;
}

const ParentTeacherBooking: React.FC<ParentTeacherBookingProps> = ({
  schoolId,
  parentMemberId,
  myStudents,
}) => {
  const [availableSlots, setAvailableSlots] = useState<TeacherSlot[]>([]);
  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>(myStudents[0]?.id || "");
  const [reason, setReason] = useState("");
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [schoolId, parentMemberId]);

  const fetchData = async () => {
    // Fetch available (unbooked) slots
    const { data: slotsData } = await supabase
      .from("school_teacher_slots")
      .select("*, school_members!school_teacher_slots_teacher_member_id_fkey(full_name)")
      .eq("school_id", schoolId)
      .eq("is_booked", false)
      .gte("slot_date", format(new Date(), "yyyy-MM-dd"))
      .order("slot_date", { ascending: true });

    setAvailableSlots((slotsData as any) || []);

    // Fetch my bookings
    const { data: bookingsData } = await supabase
      .from("school_parent_bookings")
      .select("*, school_teacher_slots(slot_date, start_time, end_time, school_members!school_teacher_slots_teacher_member_id_fkey(full_name)), school_students(student_name)")
      .eq("parent_member_id", parentMemberId)
      .order("created_at", { ascending: false });

    setMyBookings((bookingsData as any) || []);
  };

  const handleBook = async (slotId: string) => {
    if (!selectedStudent) {
      toast.error("Please select a child first");
      return;
    }

    setLoading(true);
    try {
      // Create booking
      const { error: bookingError } = await supabase.from("school_parent_bookings").insert({
        school_id: schoolId,
        slot_id: slotId,
        parent_member_id: parentMemberId,
        student_id: selectedStudent,
        reason: reason || null,
      });

      if (bookingError) throw bookingError;

      // Mark slot as booked
      const { error: slotError } = await supabase
        .from("school_teacher_slots")
        .update({ is_booked: true })
        .eq("id", slotId);

      if (slotError) throw slotError;

      toast.success("Meeting booked successfully!");
      setBookingSlotId(null);
      setReason("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to book meeting");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: string, slotId: string) => {
    try {
      await supabase.from("school_parent_bookings").delete().eq("id", bookingId);
      await supabase.from("school_teacher_slots").update({ is_booked: false }).eq("id", slotId);
      toast.success("Booking cancelled");
      fetchData();
    } catch {
      toast.error("Failed to cancel");
    }
  };

  // Group available slots by date
  const slotsByDate: Record<string, TeacherSlot[]> = {};
  availableSlots.forEach(slot => {
    if (!slotsByDate[slot.slot_date]) slotsByDate[slot.slot_date] = [];
    slotsByDate[slot.slot_date].push(slot);
  });

  return (
    <div className="space-y-6">
      {/* My Bookings */}
      {myBookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" /> My Booked Meetings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {myBookings.map(b => {
              const slot = b.school_teacher_slots;
              return (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border bg-accent/30">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">
                        {slot ? format(parseISO(slot.slot_date), "EEEE, MMMM d") : ""}
                      </span>
                      <Clock className="h-4 w-4 ml-2" />
                      <span>{slot?.start_time?.slice(0, 5)} – {slot?.end_time?.slice(0, 5)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Teacher: {(slot?.school_members as any)?.full_name} · Child: {(b.school_students as any)?.student_name}
                    </p>
                    {b.reason && <p className="text-xs text-muted-foreground italic">"{b.reason}"</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleCancel(b.id, b.slot_id)} className="text-destructive">
                    <XCircle className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Available Slots */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Available Teacher Consultation Slots
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myStudents.length > 1 && (
            <div className="mb-4">
              <label className="text-sm font-medium mb-1 block">Booking for:</label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {myStudents.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.student_name} ({s.class_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {Object.keys(slotsByDate).length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No available consultation slots at the moment. Check back later!
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(slotsByDate).map(([date, dateSlots]) => (
                <div key={date}>
                  <h4 className="font-medium text-sm mb-2">{format(parseISO(date), "EEEE, MMMM d, yyyy")}</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {dateSlots.map(slot => (
                      <div key={slot.id} className="p-3 rounded-lg border hover:border-primary/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {(slot.school_members as any)?.full_name}
                            </p>
                          </div>
                          {bookingSlotId === slot.id ? (
                            <Badge variant="outline">Booking...</Badge>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => setBookingSlotId(slot.id)}>
                              Book
                            </Button>
                          )}
                        </div>

                        {bookingSlotId === slot.id && (
                          <div className="mt-3 space-y-2 border-t pt-3">
                            <Textarea
                              placeholder="Reason for meeting (optional)"
                              value={reason}
                              onChange={e => setReason(e.target.value)}
                              rows={2}
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleBook(slot.id)} disabled={loading}>
                                {loading ? "Booking..." : "Confirm"}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => { setBookingSlotId(null); setReason(""); }}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ParentTeacherBooking;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Phone,
  RefreshCw,
  User,
  BookOpen,
  XCircle,
  CheckCircle,
  ExternalLink,
  Filter,
  Search,
} from "lucide-react";
import { format, addDays, startOfDay, endOfDay, isToday, isTomorrow } from "date-fns";
import { EmailComposer } from "./EmailComposer";

interface Booking {
  id: string;
  subject: string;
  status: string;
  meeting_link: string | null;
  notes: string | null;
  amount: number;
  created_at: string;
  tutor_availability: {
    start_time: string;
    end_time: string;
  };
  profiles: {
    full_name: string;
    phone_number: string;
    id: string;
  } | null;
  tutor_profiles: {
    id: string;
    email: string;
    user_id: string;
  } | null;
  tutor_name?: string;
}

type DateFilter = 'today' | 'tomorrow' | 'this-week' | 'all';
type StatusFilter = 'all' | 'confirmed' | 'pending' | 'completed' | 'cancelled';

export function AdminClassManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('tomorrow');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [rescheduleDialog, setRescheduleDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [emailDialog, setEmailDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // Reschedule form
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  
  // Cancel form
  const [cancelReason, setCancelReason] = useState('');
  
  // Email form
  const [emailRecipient, setEmailRecipient] = useState<'student' | 'tutor' | 'both'>('student');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  useEffect(() => {
    fetchBookings();
  }, [dateFilter, statusFilter]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("bookings")
        .select(`
          id, subject, status, meeting_link, notes, amount, created_at, student_id, tutor_id,
          tutor_availability!inner(start_time, end_time)
        `)
        .order("tutor_availability(start_time)", { ascending: true });

      // Date filtering
      const now = new Date();
      if (dateFilter === 'today') {
        query = query
          .gte("tutor_availability.start_time", startOfDay(now).toISOString())
          .lte("tutor_availability.start_time", endOfDay(now).toISOString());
      } else if (dateFilter === 'tomorrow') {
        const tomorrow = addDays(now, 1);
        query = query
          .gte("tutor_availability.start_time", startOfDay(tomorrow).toISOString())
          .lte("tutor_availability.start_time", endOfDay(tomorrow).toISOString());
      } else if (dateFilter === 'this-week') {
        const weekEnd = addDays(now, 7);
        query = query
          .gte("tutor_availability.start_time", now.toISOString())
          .lte("tutor_availability.start_time", weekEnd.toISOString());
      } else {
        // 'all' - show upcoming classes
        query = query.gte("tutor_availability.start_time", now.toISOString());
      }

      // Status filtering
      if (statusFilter !== 'all') {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      // Fetch student and tutor names separately
      const bookingsWithNames = await Promise.all(
        (data || []).map(async (booking: any) => {
          let studentInfo = null;
          let tutorName = 'Unknown';
          let tutorEmail = '';
          let tutorUserId = '';

          // Fetch student info from profiles using student_id
          if (booking.student_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id, full_name, phone_number")
              .eq("id", booking.student_id)
              .maybeSingle();
            if (profile) {
              studentInfo = profile;
            }
          }

          // Fetch tutor info from tutor_profiles using tutor_id
          if (booking.tutor_id) {
            const { data: tutorProfile } = await supabase
              .from("tutor_profiles")
              .select("id, email, user_id")
              .eq("id", booking.tutor_id)
              .maybeSingle();
            
            if (tutorProfile) {
              tutorEmail = tutorProfile.email || '';
              tutorUserId = tutorProfile.user_id;
              
              // Now fetch tutor name from profiles
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", tutorProfile.user_id)
                .maybeSingle();
              tutorName = profile?.full_name || 'Unknown';
            }
          }

          return { 
            ...booking, 
            profiles: studentInfo,
            tutor_profiles: { id: booking.tutor_id, email: tutorEmail, user_id: tutorUserId },
            tutor_name: tutorName 
          };
        })
      );

      setBookings(bookingsWithNames);
    } catch (error: any) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      booking.subject.toLowerCase().includes(query) ||
      booking.profiles?.full_name?.toLowerCase().includes(query) ||
      booking.tutor_name?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      confirmed: "bg-green-500 text-white",
      pending: "bg-yellow-500 text-white",
      completed: "bg-blue-500 text-white",
      cancelled: "bg-red-500 text-white",
    };
    return variants[status] || "bg-gray-500 text-white";
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: format(date, "EEE, MMM d"),
      time: format(date, "h:mm a"),
      isToday: isToday(date),
      isTomorrow: isTomorrow(date),
    };
  };

  const openWhatsApp = (phone: string, name: string, booking: Booking) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') 
      ? '254' + cleanPhone.slice(1) 
      : cleanPhone.startsWith('254') 
        ? cleanPhone 
        : '254' + cleanPhone;
    
    const { date, time } = formatDateTime(booking.tutor_availability.start_time);
    const message = encodeURIComponent(
      `Hi ${name},\n\nThis is regarding your ${booking.subject} session scheduled for ${date} at ${time}.\n\n- Lana Tutors Admin`
    );
    
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  const handleReschedule = async () => {
    if (!selectedBooking || !newDate || !newTime) {
      toast.error("Please select a new date and time");
      return;
    }

    try {
      // Create new availability slot
      const newStartTime = new Date(`${newDate}T${newTime}`);
      const newEndTime = new Date(newStartTime.getTime() + 60 * 60 * 1000); // 1 hour

      const { data: newSlot, error: slotError } = await supabase
        .from("tutor_availability")
        .insert({
          tutor_id: selectedBooking.tutor_profiles?.id,
          start_time: newStartTime.toISOString(),
          end_time: newEndTime.toISOString(),
          is_booked: true,
        })
        .select()
        .single();

      if (slotError) throw slotError;

      // Update booking with new slot
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({
          availability_slot_id: newSlot.id,
          notes: `${selectedBooking.notes || ''}\n\nRescheduled: ${rescheduleReason}`.trim(),
        })
        .eq("id", selectedBooking.id);

      if (bookingError) throw bookingError;

      // Mark old slot as available
      const { error: oldSlotError } = await supabase
        .from("tutor_availability")
        .update({ is_booked: false })
        .eq("start_time", selectedBooking.tutor_availability.start_time);

      if (oldSlotError) console.error("Failed to free old slot:", oldSlotError);

      toast.success("Session rescheduled successfully");
      setRescheduleDialog(false);
      setSelectedBooking(null);
      setNewDate('');
      setNewTime('');
      setRescheduleReason('');
      fetchBookings();
    } catch (error: any) {
      console.error("Error rescheduling:", error);
      toast.error("Failed to reschedule session");
    }
  };

  const handleCancel = async () => {
    if (!selectedBooking) return;

    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          notes: `${selectedBooking.notes || ''}\n\nCancelled: ${cancelReason}`.trim(),
        })
        .eq("id", selectedBooking.id);

      if (error) throw error;

      // Free up the slot
      await supabase
        .from("tutor_availability")
        .update({ is_booked: false })
        .eq("start_time", selectedBooking.tutor_availability.start_time);

      toast.success("Session cancelled");
      setCancelDialog(false);
      setSelectedBooking(null);
      setCancelReason('');
      fetchBookings();
    } catch (error: any) {
      console.error("Error cancelling:", error);
      toast.error("Failed to cancel session");
    }
  };

  const handleMarkComplete = async (booking: Booking) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", booking.id);

      if (error) throw error;
      toast.success("Session marked as complete");
      fetchBookings();
    } catch (error: any) {
      console.error("Error marking complete:", error);
      toast.error("Failed to update status");
    }
  };

  const handleSendEmail = async () => {
    if (!selectedBooking || !emailSubject || !emailBody) {
      toast.error("Please fill in all email fields");
      return;
    }

    try {
      const recipients: string[] = [];
      
      if (emailRecipient === 'student' || emailRecipient === 'both') {
        // Get student email from auth
        const { data: studentEmail } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", selectedBooking.profiles?.id)
          .single();
        
        if (studentEmail) {
          const { data: authData } = await supabase.auth.admin.getUserById(studentEmail.id);
          if (authData?.user?.email) recipients.push(authData.user.email);
        }
      }
      
      if (emailRecipient === 'tutor' || emailRecipient === 'both') {
        if (selectedBooking.tutor_profiles?.email) {
          recipients.push(selectedBooking.tutor_profiles.email);
        }
      }

      // Send email via edge function
      const { error } = await supabase.functions.invoke('send-admin-email', {
        body: {
          to: recipients,
          subject: emailSubject,
          message: emailBody,
        },
      });

      if (error) throw error;

      toast.success(`Email sent to ${recipients.length} recipient(s)`);
      setEmailDialog(false);
      setSelectedBooking(null);
      setEmailSubject('');
      setEmailBody('');
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email");
    }
  };

  const prepareEmailForBooking = (booking: Booking) => {
    const { date, time } = formatDateTime(booking.tutor_availability.start_time);
    setSelectedBooking(booking);
    setEmailSubject(`Regarding your ${booking.subject} session on ${date}`);
    setEmailBody(`Dear ${booking.profiles?.full_name || 'Student'},\n\nThis is regarding your ${booking.subject} session scheduled for ${date} at ${time}.\n\n[Your message here]\n\nBest regards,\nLana Tutors Team`);
    setEmailDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Class Management</h2>
          <p className="text-muted-foreground">Manage 1-on-1 tutoring sessions</p>
        </div>
        <Button onClick={fetchBookings} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student, tutor, or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="all">All Upcoming</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredBookings.length} session{filteredBookings.length !== 1 ? 's' : ''}
      </div>

      {/* Bookings Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No sessions found for the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Tutor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => {
                    const { date, time, isToday: isTodaySession, isTomorrow: isTomorrowSession } = 
                      formatDateTime(booking.tutor_availability.start_time);
                    
                    return (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {date}
                                {isTodaySession && (
                                  <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                    Today
                                  </Badge>
                                )}
                                {isTomorrowSession && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    Tomorrow
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {time}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{booking.subject}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{booking.profiles?.full_name || 'Unknown'}</div>
                            {booking.profiles?.phone_number && (
                              <div className="text-xs text-muted-foreground">
                                {booking.profiles.phone_number}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{booking.tutor_name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(booking.status || 'pending')}>
                            {booking.status || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {booking.profiles?.phone_number && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => openWhatsApp(
                                  booking.profiles!.phone_number,
                                  booking.profiles!.full_name,
                                  booking
                                )}
                                title="WhatsApp Student"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => prepareEmailForBooking(booking)}
                              title="Email"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            {booking.meeting_link && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => window.open(booking.meeting_link!, '_blank')}
                                title="Join Meeting"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setRescheduleDialog(true);
                                }}
                              >
                                <Calendar className="h-4 w-4 mr-2" />
                                Reschedule
                              </DropdownMenuItem>
                              {booking.status !== 'completed' && (
                                <DropdownMenuItem onClick={() => handleMarkComplete(booking)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark Complete
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setCancelDialog(true);
                                }}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel Session
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialog} onOpenChange={setRescheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Session</DialogTitle>
            <DialogDescription>
              {selectedBooking && (
                <>
                  Rescheduling {selectedBooking.subject} session for{" "}
                  {selectedBooking.profiles?.full_name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>New Date</Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div className="space-y-2">
                <Label>New Time</Label>
                <Input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason for Rescheduling</Label>
              <Textarea
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Enter reason..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReschedule}>Confirm Reschedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Session</DialogTitle>
            <DialogDescription>
              {selectedBooking && (
                <>
                  Are you sure you want to cancel the {selectedBooking.subject} session for{" "}
                  {selectedBooking.profiles?.full_name}?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason for Cancellation</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter reason..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(false)}>
              Keep Session
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              Cancel Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={emailDialog} onOpenChange={setEmailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
            <DialogDescription>
              {selectedBooking && (
                <>
                  Send email regarding {selectedBooking.subject} session
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Send To</Label>
              <Select value={emailRecipient} onValueChange={(v) => setEmailRecipient(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student Only</SelectItem>
                  <SelectItem value="tutor">Tutor Only</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail}>
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

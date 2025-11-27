import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, ExternalLink, Calendar, DollarSign, CalendarClock, Sparkles, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function StudentClassesTab() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [pastBookings, setPastBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryDialog, setSummaryDialog] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [currentSummary, setCurrentSummary] = useState("");
  const [currentBooking, setCurrentBooking] = useState<any>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch bookings with tutor availability details
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select(`
            *,
            tutor_availability (
              start_time,
              end_time
            )
          `)
          .eq('student_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching bookings:', error);
          toast({
            title: "Error",
            description: "Failed to load your classes",
            variant: "destructive"
          });
          return;
        }

        if (bookings) {
          const now = new Date();
          // Filter by actual slot time, not booking creation time
          const upcoming = bookings.filter(b => {
            if (b.status !== 'confirmed') return false;
            const slotTime = b.tutor_availability?.start_time 
              ? new Date(b.tutor_availability.start_time)
              : new Date(b.created_at);
            return slotTime > now;
          }).sort((a, b) => {
            const timeA = a.tutor_availability?.start_time 
              ? new Date(a.tutor_availability.start_time).getTime()
              : new Date(a.created_at).getTime();
            const timeB = b.tutor_availability?.start_time 
              ? new Date(b.tutor_availability.start_time).getTime()
              : new Date(b.created_at).getTime();
            return timeA - timeB;
          });
          
          const past = bookings.filter(b => {
            if (b.status === 'confirmed') {
              const slotTime = b.tutor_availability?.start_time 
                ? new Date(b.tutor_availability.start_time)
                : new Date(b.created_at);
              return slotTime <= now;
            }
            return b.status !== 'confirmed';
          });
          
          setUpcomingBookings(upcoming);
          setPastBookings(past);
        }
      }
      setLoading(false);
    };
    fetchBookings();
  }, []);

  const generateAISummary = async (booking: any) => {
    setCurrentBooking(booking);
    setSummaryDialog(true);
    setGeneratingSummary(true);
    setCurrentSummary("");

    try {
      const createdAt = new Date(booking.created_at);
      const formattedDate = createdAt.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      const { data, error } = await supabase.functions.invoke("generate-session-summary", {
        body: {
          subject: booking.subject,
          date: formattedDate,
          duration: "1 hour"
        }
      });

      if (error) throw error;

      setCurrentSummary(data.summary);
    } catch (error: any) {
      console.error("Error generating summary:", error);
      toast({
        title: "Error",
        description: "Failed to generate AI summary. Please try again.",
        variant: "destructive"
      });
      setSummaryDialog(false);
    } finally {
      setGeneratingSummary(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading classes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">My Classes</h2>
        <p className="text-muted-foreground">Manage your upcoming and past tutoring sessions.</p>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastBookings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {upcomingBookings.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">No Upcoming Classes</h3>
                    <p className="text-muted-foreground text-sm">
                      Book a session with one of our expert tutors to get started.
                    </p>
                  </div>
                  <Link to="/tutors">
                    <Button className="mt-4">Find a Tutor</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {upcomingBookings.map((booking) => {
                const slotTime = booking.tutor_availability?.start_time 
                  ? new Date(booking.tutor_availability.start_time)
                  : new Date(booking.created_at);
                const balanceDue = booking.balance_due || 0;
                
                return (
                  <Card key={booking.id} className="border-l-4 border-l-primary hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-2xl font-bold">{booking.subject}</h3>
                            <Badge className="bg-primary">Confirmed</Badge>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              <p className="text-base font-medium">
                                {format(slotTime, 'EEEE, MMMM d, yyyy')}
                              </p>
                            </div>
                            <p className="text-sm text-muted-foreground ml-6">
                              {format(slotTime, 'hh:mm a')} EAT
                            </p>
                          </div>

                          {balanceDue > 0 && (
                            <Badge variant="outline" className="text-xs mt-2">
                              Balance Due: {booking.currency || 'KES'} {balanceDue.toLocaleString()}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2 min-w-[160px]">
                          {booking.meeting_link && (
                            <Button
                              onClick={() => window.open(booking.meeting_link, '_blank')}
                              className="w-full"
                              size="lg"
                            >
                              <Video className="w-4 h-4 mr-2" />
                              Join Class
                            </Button>
                          )}
                          
                          {balanceDue > 0 && (
                            <Button
                              variant="outline"
                              onClick={() => navigate(`/pay-balance/${booking.id}`)}
                              className="w-full"
                            >
                              <DollarSign className="w-4 h-4 mr-2" />
                              Pay Balance
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            onClick={() => {
                              const subject = encodeURIComponent('Reschedule Request');
                              const body = encodeURIComponent(
                                `Booking ID: ${booking.id}\nSubject: ${booking.subject}\nCurrent Date/Time: ${format(slotTime, 'EEEE, MMMM d, yyyy')} at ${format(slotTime, 'hh:mm a')} EAT\n\nPreferred New Date/Time:\n\nReason for Rescheduling:`
                              );
                              window.location.href = `mailto:info@lanatutors.africa?subject=${subject}&body=${body}`;
                            }}
                            className="w-full"
                          >
                            <CalendarClock className="w-4 h-4 mr-2" />
                            Reschedule
                          </Button>
                          
                          {booking.classroom_link && (
                            <Button
                              variant="outline"
                              onClick={() => window.open(booking.classroom_link, '_blank')}
                              className="w-full"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Classroom
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          {pastBookings.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No past classes yet</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Past Classes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium">Subject</th>
                        <th className="pb-3 font-medium">Date</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastBookings.map((booking) => {
                        const createdAt = new Date(booking.created_at);
                        
                        return (
                          <tr key={booking.id} className="border-b last:border-0">
                            <td className="py-4 font-medium">{booking.subject}</td>
                            <td className="py-4 text-muted-foreground">
                              {createdAt.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </td>
                            <td className="py-4">
                              <Badge variant="secondary">{booking.status}</Badge>
                            </td>
                            <td className="py-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => generateAISummary(booking)}
                                >
                                  <Sparkles className="w-4 h-4 mr-2" />
                                  AI Summary
                                </Button>
                                {booking.classroom_link && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(booking.classroom_link, '_blank')}
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Classroom
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* AI Summary Dialog */}
      <Dialog open={summaryDialog} onOpenChange={setSummaryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Session Summary
            </DialogTitle>
            <DialogDescription>
              {currentBooking && `${currentBooking.subject} - ${new Date(currentBooking.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {generatingSummary ? (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Generating your session summary...</p>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">{currentSummary}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, ExternalLink, Calendar, DollarSign, CalendarClock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function StudentClassesTab() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [pastBookings, setPastBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select('*')
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
          const upcoming = bookings.filter(b => b.status === 'confirmed');
          const past = bookings.filter(b => b.status !== 'confirmed');
          
          setUpcomingBookings(upcoming);
          setPastBookings(past);
        }
      }
      setLoading(false);
    };
    fetchBookings();
  }, []);

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
                const createdAt = new Date(booking.created_at);
                
                return (
                  <Card key={booking.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-semibold">{booking.subject}</h3>
                            <Badge>Confirmed</Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {createdAt.toLocaleDateString('en-US', { 
                                weekday: 'long',
                                month: 'long', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </p>
                            <p className="ml-6">
                              {createdAt.toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                timeZone: 'Africa/Nairobi'
                              })} EAT
                            </p>
                          </div>
                          {booking.balance_due && booking.balance_due > 0 && (
                            <Badge variant="outline" className="mt-2">
                              Balance Due: {booking.currency} {booking.balance_due}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2">
                          {booking.balance_due && booking.balance_due > 0 && (
                            <Button
                              variant="outline"
                              onClick={() => navigate(`/pay-balance?bookingId=${booking.id}`)}
                              className="w-full sm:w-auto"
                            >
                              <DollarSign className="w-4 h-4 mr-2" />
                              Pay Balance
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => {
                              const subject = encodeURIComponent('Reschedule Request - Booking #' + booking.id.substring(0, 8));
                              const body = encodeURIComponent(
                                `Hello Lana Tutors,\n\n` +
                                `I would like to reschedule my upcoming class.\n\n` +
                                `Booking Details:\n` +
                                `- Booking ID: ${booking.id}\n` +
                                `- Subject: ${booking.subject}\n` +
                                `- Current Date: ${new Date(booking.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}\n` +
                                `- Current Time: ${new Date(booking.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' })} EAT\n\n` +
                                `Preferred new date/time:\n` +
                                `[Please specify your preferred date and time]\n\n` +
                                `Reason for rescheduling:\n` +
                                `[Please provide a brief reason]\n\n` +
                                `Thank you!`
                              );
                              window.location.href = `mailto:info@lanatutors.africa?subject=${subject}&body=${body}`;
                            }}
                            className="w-full sm:w-auto"
                          >
                            <CalendarClock className="w-4 h-4 mr-2" />
                            Reschedule
                          </Button>
                          {booking.meeting_link && (
                            <Button
                              onClick={() => window.open(booking.meeting_link, '_blank')}
                              className="w-full sm:w-auto"
                            >
                              <Video className="w-4 h-4 mr-2" />
                              Join Class
                            </Button>
                          )}
                          {booking.classroom_link && (
                            <Button
                              variant="outline"
                              onClick={() => window.open(booking.classroom_link, '_blank')}
                              className="w-full sm:w-auto"
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
                              {booking.classroom_link && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(booking.classroom_link, '_blank')}
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  View
                                </Button>
                              )}
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
    </div>
  );
}

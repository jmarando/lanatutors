import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Video, Calendar, TrendingUp, BookOpen, CalendarClock, DollarSign } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function StudentOverviewTab() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("Student");
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [classroomCount, setClassroomCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (profile?.full_name) {
          setUserName(profile.full_name);
        }

        // Fetch upcoming bookings with slot details
        const { data: bookings } = await supabase
          .from('bookings')
          .select(`
            *,
            tutor_availability (
              start_time,
              end_time
            )
          `)
          .eq('student_id', user.id)
          .eq('status', 'confirmed')
          .gte('tutor_availability.start_time', new Date().toISOString())
          .order('tutor_availability(start_time)', { ascending: true });

        setUpcomingBookings(bookings || []);

        // Count classrooms
        const { data: classroomBookings } = await supabase
          .from('bookings')
          .select('classroom_id')
          .eq('student_id', user.id)
          .not('classroom_id', 'is', null);

        setClassroomCount(classroomBookings?.length || 0);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const learningProgress = [
    { subject: "Math", progress: 85, color: "bg-blue-500" },
    { subject: "Physics", progress: 78, color: "bg-purple-500" },
    { subject: "Chemistry", progress: 92, color: "bg-green-500" }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Welcome back, {userName}!</h1>
        <p className="text-muted-foreground">Here's a summary of your learning journey.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Classes</p>
                <p className="text-3xl font-bold">{upcomingBookings.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Classrooms</p>
                <p className="text-3xl font-bold">{classroomCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Progress</p>
                <p className="text-3xl font-bold">85%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Classes */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Lessons</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No upcoming classes scheduled</p>
              <Link to="/tutors">
                <Button>Find a Tutor</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.slice(0, 5).map((booking) => {
                const slotTime = booking.tutor_availability?.start_time 
                  ? new Date(booking.tutor_availability.start_time)
                  : new Date(booking.created_at);
                const now = new Date();
                const isUpcoming = slotTime > now;
                const balanceDue = booking.balance_due || 0;
                
                return (
                  <Card key={booking.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold">{booking.subject}</h3>
                            <Badge variant="destructive" className="bg-primary">
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <p className="text-sm">
                              {format(slotTime, 'EEEE, MMMM d, yyyy')}
                            </p>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {format(slotTime, 'hh:mm a')} EAT
                          </p>

                          {balanceDue > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Balance Due: KES {balanceDue.toLocaleString()}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 min-w-[140px]">
                          {booking.meeting_link && isUpcoming && (
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => window.open(booking.meeting_link, '_blank')}
                            >
                              <Video className="w-4 h-4 mr-2" />
                              Join Class
                            </Button>
                          )}
                          
                          {balanceDue > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => navigate(`/pay-balance/${booking.id}`)}
                            >
                              <DollarSign className="w-4 h-4 mr-2" />
                              Pay Balance
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              const subject = encodeURIComponent('Reschedule Request');
                              const body = encodeURIComponent(
                                `Booking ID: ${booking.id}\nSubject: ${booking.subject}\nCurrent Date/Time: ${format(slotTime, 'EEEE, MMMM d, yyyy')} at ${format(slotTime, 'hh:mm a')} EAT\n\nPreferred New Date/Time:\n\nReason for Rescheduling:`
                              );
                              window.location.href = `mailto:info@lanatutors.africa?subject=${subject}&body=${body}`;
                            }}
                          >
                            <CalendarClock className="w-4 h-4 mr-2" />
                            Reschedule
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {upcomingBookings.length > 5 && (
                <div className="text-center pt-2">
                  <Link to="/student/dashboard?tab=classes">
                    <Button variant="link">View all classes →</Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Learning Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Learning Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {learningProgress.map((item) => (
            <div key={item.subject}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{item.subject}</span>
                <span className="text-sm text-muted-foreground">{item.progress}%</span>
              </div>
              <Progress value={item.progress} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

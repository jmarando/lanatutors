import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Video, 
  Calendar,
  DollarSign,
  Users,
  Star,
  TrendingUp,
  Clock,
  Loader2,
  AlertCircle,
  FileText,
  CalendarDays,
  Edit,
  LogOut
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isToday, isThisWeek, startOfMonth, endOfMonth } from "date-fns";
import { GoogleCalendarConnect } from "@/components/GoogleCalendarConnect";
import { TutorCalendarOverview } from "@/components/TutorCalendarOverview";
import { TutorWeeklyCalendar } from "@/components/TutorWeeklyCalendar";
import { StudentProgressTracker } from "@/components/StudentProgressTracker";
import { LearningPlanRequests } from "@/components/tutor/LearningPlanRequests";

const TutorDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tutorProfile, setTutorProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [learningPlansOpen, setLearningPlansOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);

  useEffect(() => {
    fetchTutorData();
  }, []);

  const fetchTutorData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        navigate("/become-a-tutor");
        return;
      }

      setUser(authUser);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      setProfile(profileData);

      const { data: tutorData, error: tutorError } = await supabase
        .from("tutor_profiles")
        .select("*")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (tutorError) {
        console.error("Tutor profile fetch error:", tutorError);
        toast.error(`Failed to load tutor profile: ${tutorError.message}`);
        setLoading(false);
        return;
      }

      setTutorProfile(tutorData);

      if (!tutorData) {
        toast.error("You don't have a tutor profile. Please apply to become a tutor.");
        navigate("/become-a-tutor");
        return;
      }

      const { data: bookingsData } = await supabase
        .from("bookings")
        .select(`
          *,
          tutor_availability!inner(start_time, end_time),
          profiles!bookings_student_id_fkey(full_name)
        `)
        .eq("tutor_id", authUser.id)
        .order("created_at", { ascending: false });

      setBookings(bookingsData || []);

      if (bookingsData) {
        const bookingIds = bookingsData.map(b => b.id);
        const { data: paymentsData } = await supabase
          .from("payments")
          .select("*")
          .in("reference_id", bookingIds)
          .eq("status", "completed")
          .order("created_at", { ascending: false });

        setPayments(paymentsData || []);
      }

      const { data: reviewsData } = await supabase
        .from("tutor_reviews")
        .select(`
          *,
          profiles!tutor_reviews_student_id_fkey(full_name)
        `)
        .eq("tutor_id", tutorData.id)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(3);

      setReviews(reviewsData || []);
    } catch (error) {
      console.error("Error fetching tutor data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const COMMISSION_RATE = 0.30;
  const calculateNetEarnings = (gross: number) => gross * (1 - COMMISSION_RATE);

  const totalGrossEarnings = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalNetEarnings = calculateNetEarnings(totalGrossEarnings);

  const thisWeekPayments = payments.filter(p => 
    isThisWeek(new Date(p.created_at), { weekStartsOn: 1 })
  );
  const thisWeekGross = thisWeekPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const thisWeekNet = calculateNetEarnings(thisWeekGross);

  const thisMonthPayments = payments.filter(p => {
    const date = new Date(p.created_at);
    return date >= startOfMonth(new Date()) && date <= endOfMonth(new Date());
  });
  const thisMonthGross = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const thisMonthNet = calculateNetEarnings(thisMonthGross);

  const now = new Date();
  const upcomingBookings = bookings.filter(b => 
    new Date(b.tutor_availability.start_time) > now
  ).sort((a, b) => 
    new Date(a.tutor_availability.start_time).getTime() - new Date(b.tutor_availability.start_time).getTime()
  );

  const todaySessions = upcomingBookings.filter(b => 
    isToday(new Date(b.tutor_availability.start_time))
  );

  const thisWeekSessions = upcomingBookings.filter(b => 
    isThisWeek(new Date(b.tutor_availability.start_time), { weekStartsOn: 1 })
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[image:var(--gradient-page)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      {/* Compact Header */}
      <div className="border-b bg-background sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Tutor Hub</h2>
              <p className="text-sm text-muted-foreground">Welcome back, {profile?.full_name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/tutor-profile-edit")}
              >
                <Edit className="w-4 h-4 mr-2" />
                Profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/tutor/availability")}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Availability
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Calendar Connection Alert */}
        {!tutorProfile?.google_calendar_connected && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="p-4 flex items-start gap-4">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 mb-1">Connect Your Google Calendar</h3>
                <p className="text-sm text-orange-700">
                  Connect your calendar to automatically sync bookings and generate Google Meet links.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Next Session - Prominent */}
            {todaySessions.length > 0 && (
              <Card className="border-primary/50 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Clock className="w-5 h-5" />
                    Next Session
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const nextSession = todaySessions[0];
                    const sessionTime = new Date(nextSession.tutor_availability.start_time);
                    const minutesUntil = Math.floor((sessionTime.getTime() - now.getTime()) / (1000 * 60));
                    const isStartingSoon = minutesUntil <= 15 && minutesUntil >= 0;
                    
                    return (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <Badge className="text-lg px-3 py-1">
                                {format(sessionTime, "h:mm a")} - {format(new Date(nextSession.tutor_availability.end_time), "h:mm a")}
                              </Badge>
                              {isStartingSoon && (
                                <Badge variant="destructive" className="animate-pulse">
                                  Starting in {minutesUntil} min
                                </Badge>
                              )}
                            </div>
                            <div>
                              <p className="text-2xl font-bold">{nextSession.subject}</p>
                              <p className="text-muted-foreground">
                                Student: {nextSession.profiles?.full_name || "Unknown"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{nextSession.class_type}</Badge>
                              <Badge className="bg-green-600">
                                KES {calculateNetEarnings(Number(nextSession.amount)).toFixed(0)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {nextSession.meeting_link ? (
                          <Button 
                            size="lg" 
                            className="w-full"
                            onClick={() => window.open(nextSession.meeting_link, '_blank')}
                          >
                            <Video className="w-5 h-5 mr-2" />
                            Join Session Now
                          </Button>
                        ) : (
                          <Button size="lg" variant="outline" className="w-full" disabled>
                            Meeting link will be shared soon
                          </Button>
                        )}
                        {nextSession.notes && (
                          <p className="text-sm text-muted-foreground">
                            <strong>Notes:</strong> {nextSession.notes}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Today's Full Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  Today's Schedule ({todaySessions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todaySessions.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No sessions scheduled for today</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todaySessions.map((booking, index) => (
                      index === 0 ? null : (
                        <Card key={booking.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <Badge variant="outline" className="font-mono">
                                    {format(new Date(booking.tutor_availability.start_time), "h:mm a")}
                                  </Badge>
                                  <span className="font-semibold">{booking.subject}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {booking.profiles?.full_name} • {booking.class_type} • KES {calculateNetEarnings(Number(booking.amount)).toFixed(0)}
                                </p>
                              </div>
                              {booking.meeting_link && (
                                <Button size="sm" onClick={() => window.open(booking.meeting_link, '_blank')}>
                                  <Video className="w-4 h-4 mr-2" />
                                  Join
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weekly Calendar */}
            <div>
              {tutorProfile?.google_calendar_connected ? (
                <TutorWeeklyCalendar tutorId={user?.id} />
              ) : (
                <GoogleCalendarConnect 
                  tutorId={tutorProfile?.id}
                  isConnected={tutorProfile?.google_calendar_connected}
                  calendarEmail={tutorProfile?.google_calendar_email}
                />
              )}
            </div>

            {/* Tabs for secondary content */}
            <Tabs defaultValue="upcoming" className="space-y-4">
              <TabsList className="w-full">
                <TabsTrigger value="upcoming" className="flex-1">
                  This Week ({thisWeekSessions.length})
                </TabsTrigger>
                <TabsTrigger value="calendar" className="flex-1">
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="reviews" className="flex-1">
                  Reviews ({reviews.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-3">
                {thisWeekSessions.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No upcoming sessions this week</p>
                    </CardContent>
                  </Card>
                ) : (
                  thisWeekSessions.map((booking) => (
                    <Card key={booking.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline">
                                {format(new Date(booking.tutor_availability.start_time), "EEE, MMM d")}
                              </Badge>
                              <Badge variant="outline" className="font-mono">
                                {format(new Date(booking.tutor_availability.start_time), "h:mm a")}
                              </Badge>
                            </div>
                            <div className="font-semibold">{booking.subject}</div>
                            <p className="text-sm text-muted-foreground">
                              {booking.profiles?.full_name} • {booking.class_type}
                            </p>
                          </div>
                          {booking.meeting_link && (
                            <Button size="sm" variant="outline" onClick={() => window.open(booking.meeting_link, '_blank')}>
                              <Video className="w-4 h-4 mr-2" />
                              Join
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="calendar">
                <TutorCalendarOverview tutorId={tutorProfile?.id} />
              </TabsContent>

              <TabsContent value="reviews" className="space-y-4">
                {reviews.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Star className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No reviews yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold">{review.profiles?.full_name || "Student"}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(review.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating 
                                    ? "fill-yellow-500 text-yellow-500" 
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground">{review.comment}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Stats and Actions */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Earnings & Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">This Week (Net)</p>
                  <p className="text-2xl font-bold text-primary">
                    KES {thisWeekNet.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Gross: KES {thisWeekGross.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">This Month (Net)</p>
                  <p className="text-2xl font-bold text-accent">
                    KES {thisMonthNet.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Gross: KES {thisMonthGross.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Sessions</p>
                    <p className="text-xl font-bold">{bookings.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rating</p>
                    <div className="flex items-center gap-1">
                      <p className="text-xl font-bold">
                        {Number(tutorProfile?.rating || 0).toFixed(1)}
                      </p>
                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  Net earnings shown after 30% commission
                </p>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setLearningPlansOpen(true)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Learning Plans
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setProgressOpen(true)}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Student Progress
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Learning Plans Dialog */}
      <Dialog open={learningPlansOpen} onOpenChange={setLearningPlansOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Learning Plans
            </DialogTitle>
          </DialogHeader>
          {tutorProfile && <LearningPlanRequests tutorProfileId={tutorProfile.id} />}
        </DialogContent>
      </Dialog>

      {/* Student Progress Dialog */}
      <Dialog open={progressOpen} onOpenChange={setProgressOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Student Progress
            </DialogTitle>
          </DialogHeader>
          <StudentProgressTracker tutorId={user?.id} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TutorDashboard;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Video, 
  Calendar,
  DollarSign,
  Users,
  Star,
  TrendingUp,
  Clock,
  Loader2,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isToday, isThisWeek, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
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

  useEffect(() => {
    fetchTutorData();
  }, []);

  const fetchTutorData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        // Not signed in - redirect to application
        navigate("/become-a-tutor");
        return;
      }

      setUser(authUser);

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      setProfile(profileData);

      // Fetch tutor profile
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
        // User is signed in but not a tutor - redirect to application
        toast.error("You don't have a tutor profile. Please apply to become a tutor.");
        navigate("/become-a-tutor");
        return;
      }

      // Fetch bookings with student info
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

      // Fetch payments
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

      // Fetch reviews
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

  // Calculate earnings AFTER 30% commission
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

  // Filter upcoming bookings
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
      {/* Dashboard Header */}
      <div className="border-b bg-background">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Tutor Dashboard</h2>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/tutor-onboarding-guide")}>
              Onboarding Guide
            </Button>
            <Button variant="ghost" onClick={() => navigate("/tutor-profile-edit")}>
              Edit Profile
            </Button>
            <Button variant="ghost" onClick={() => navigate("/tutor/availability")}>
              Manage Availability
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {profile?.full_name || "Tutor"}!
          </h1>
          <p className="text-muted-foreground">Here's your tutoring overview</p>
        </div>

        {/* Calendar Connection Alert */}
        {!tutorProfile?.google_calendar_connected && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="p-6 flex items-start gap-4">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 mb-1">Connect Your Google Calendar</h3>
                <p className="text-sm text-orange-700">
                  Connect your calendar to automatically sync bookings and generate Google Meet links for online sessions.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Google Calendar Connection or Weekly Calendar */}
        <div className="mb-8">
          {tutorProfile?.google_calendar_connected ? (
            <TutorWeeklyCalendar tutorId={tutorProfile?.id} />
          ) : (
            <GoogleCalendarConnect 
              tutorId={tutorProfile?.id}
              isConnected={tutorProfile?.google_calendar_connected}
              calendarEmail={tutorProfile?.google_calendar_email}
            />
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">This Week (Net)</p>
                  <p className="text-2xl font-bold text-primary">
                    KES {thisWeekNet.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Gross: KES {thisWeekGross.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="w-10 h-10 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">This Month (Net)</p>
                  <p className="text-2xl font-bold text-accent">
                    KES {thisMonthNet.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Gross: KES {thisMonthGross.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 text-accent/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Sessions</p>
                  <p className="text-2xl font-bold">{bookings.length}</p>
                </div>
                <Users className="w-10 h-10 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Rating</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">
                      {Number(tutorProfile?.rating || 0).toFixed(1)}
                    </p>
                    <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tutorProfile?.total_reviews || 0} reviews
                  </p>
                </div>
                <Star className="w-10 h-10 text-yellow-400/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Earnings Note */}
        <Card className="mb-8 bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> All earnings shown are net amounts (after Lana's 30% commission). 
              Gross amounts are shown in smaller text for reference.
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="today" className="space-y-6">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
            <TabsTrigger value="today" className="whitespace-nowrap">
              Today ({todaySessions.length})
            </TabsTrigger>
            <TabsTrigger value="week" className="whitespace-nowrap">
              This Week ({thisWeekSessions.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="whitespace-nowrap">
              All Upcoming ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="calendar" className="whitespace-nowrap">
              Calendar
            </TabsTrigger>
            <TabsTrigger value="learning-plans" className="whitespace-nowrap">
              Learning Plans
            </TabsTrigger>
            <TabsTrigger value="progress" className="whitespace-nowrap">
              Student Progress
            </TabsTrigger>
            <TabsTrigger value="reviews" className="whitespace-nowrap">
              Reviews ({reviews.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-4">
            {todaySessions.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No sessions scheduled for today</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Today's Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todaySessions.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-semibold">
                                {format(new Date(booking.tutor_availability.start_time), "h:mm a")}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {format(new Date(booking.tutor_availability.end_time), "h:mm a")}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {booking.profiles?.full_name || "Unknown"}
                          </TableCell>
                          <TableCell>{booking.subject}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{booking.class_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-semibold text-green-600">
                                KES {calculateNetEarnings(Number(booking.amount)).toFixed(0)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Gross: {Number(booking.amount).toFixed(0)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {booking.meeting_link ? (
                              <Button size="sm" onClick={() => window.open(booking.meeting_link, '_blank')}>
                                <Video className="w-4 h-4 mr-2" />
                                Join
                              </Button>
                            ) : (
                              <Badge variant="outline">In-Person</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="week" className="space-y-4">
            {thisWeekSessions.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No sessions scheduled this week</p>
                </CardContent>
              </Card>
            ) : (
              thisWeekSessions.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1">{booking.subject}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Student: {booking.profiles?.full_name || "Unknown"}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <Badge variant="outline">
                            {format(new Date(booking.tutor_availability.start_time), "EEE, MMM d")}
                          </Badge>
                          <Badge variant="outline">
                            {format(new Date(booking.tutor_availability.start_time), "h:mm a")} - 
                            {format(new Date(booking.tutor_availability.end_time), "h:mm a")}
                          </Badge>
                          <Badge variant="secondary">{booking.class_type}</Badge>
                          <Badge className="bg-green-600">
                            Net: KES {calculateNetEarnings(Number(booking.amount)).toFixed(0)}
                          </Badge>
                        </div>
                        {booking.notes && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Notes: {booking.notes}
                          </p>
                        )}
                      </div>
                      {booking.meeting_link && (
                        <Button onClick={() => window.open(booking.meeting_link, '_blank')}>
                          <Video className="w-4 h-4 mr-2" />
                          Join Session
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {upcomingBookings.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No upcoming sessions</p>
                  <Button onClick={() => navigate("/tutor/availability")}>
                    Set Your Availability
                  </Button>
                </CardContent>
              </Card>
            ) : (
              upcomingBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1">{booking.subject}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Student: {booking.profiles?.full_name || "Unknown"}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <Badge variant="outline">
                            {format(new Date(booking.tutor_availability.start_time), "MMM d, yyyy")}
                          </Badge>
                          <Badge variant="outline">
                            {format(new Date(booking.tutor_availability.start_time), "h:mm a")} - 
                            {format(new Date(booking.tutor_availability.end_time), "h:mm a")}
                          </Badge>
                          <Badge variant="secondary">{booking.class_type}</Badge>
                          <Badge className="bg-green-600">
                            Net: KES {calculateNetEarnings(Number(booking.amount)).toFixed(0)}
                          </Badge>
                        </div>
                      </div>
                      {booking.meeting_link && (
                        <Button onClick={() => window.open(booking.meeting_link, '_blank')}>
                          <Video className="w-4 h-4 mr-2" />
                          Join Session
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="calendar">
            <TutorCalendarOverview tutorId={user?.id} />
          </TabsContent>

          <TabsContent value="learning-plans">
            {tutorProfile && <LearningPlanRequests tutorProfileId={tutorProfile.id} />}
          </TabsContent>

          <TabsContent value="progress">
            <StudentProgressTracker tutorId={user?.id} />
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            {reviews.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Star className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No reviews yet</p>
                </CardContent>
              </Card>
            ) : (
              reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
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
    </div>
  );
};

export default TutorDashboard;
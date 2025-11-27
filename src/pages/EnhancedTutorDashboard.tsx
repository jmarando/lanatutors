import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Video, 
  Calendar,
  DollarSign,
  Users,
  Star,
  TrendingUp,
  Clock,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { TutorAvailabilityManager } from "@/components/TutorAvailabilityManager";

const EnhancedTutorDashboard = () => {
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
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      navigate("/login");
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
    const { data: tutorData } = await supabase
      .from("tutor_profiles")
      .select("*")
      .eq("user_id", authUser.id)
      .single();

    setTutorProfile(tutorData);

    if (!tutorData) {
      toast.error("Tutor profile not found");
      navigate("/");
      return;
    }

    // Fetch bookings
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select(`
        *,
        tutor_availability!inner(start_time, end_time)
      `)
      .eq("tutor_id", authUser.id)
      .order("created_at", { ascending: false });

    setBookings(bookingsData || []);

    // Fetch payments through bookings
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
      .select("*")
      .eq("tutor_id", tutorData.id)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(5);

    setReviews(reviewsData || []);
    setLoading(false);
  };

  const upcomingBookings = bookings.filter(b => 
    new Date(b.tutor_availability.start_time) > new Date()
  );

  const totalEarnings = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const thisMonthEarnings = payments
    .filter(p => new Date(p.created_at).getMonth() === new Date().getMonth())
    .reduce((sum, p) => sum + Number(p.amount), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[image:var(--gradient-page)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {profile?.full_name}!
          </h1>
          <p className="text-muted-foreground">Here's your tutoring overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">This Month</p>
                  <p className="text-2xl font-bold text-primary">
                    KES {thisMonthEarnings.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
                  <p className="text-2xl font-bold text-accent">
                    KES {totalEarnings.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="w-10 h-10 text-accent/20" />
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
                    <p className="text-2xl font-bold">{Number(tutorProfile?.rating || 0).toFixed(1)}</p>
                    <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                  </div>
                </div>
                <Star className="w-10 h-10 text-yellow-400/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming Sessions ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="availability">
              Manage Availability
            </TabsTrigger>
            <TabsTrigger value="reviews">
              Reviews ({reviews.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingBookings.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No upcoming sessions</p>
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
                          Booking ID: {booking.id.slice(0, 8)}
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
                            KES {Number(booking.amount).toFixed(0)}
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
                          Start Session
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="availability">
            <TutorAvailabilityManager />
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
                        <p className="font-semibold">Student</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(review.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"
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

export default EnhancedTutorDashboard;
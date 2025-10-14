import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar,
  Clock,
  Video, 
  Package,
  BookOpen,
  TrendingUp,
  Star,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  PlayCircle,
  Download,
  ChevronRight
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import Navigation from "@/components/Navigation";

interface PackagePurchase {
  id: string;
  total_sessions: number;
  sessions_used: number;
  sessions_remaining: number;
  expires_at: string;
  package_offers: {
    name: string;
    description: string;
  } | null;
  tutorName?: string;
}

interface Booking {
  id: string;
  subject: string;
  status: string;
  amount: number;
  balance_due: number;
  class_type: string;
  meeting_link: string | null;
  tutor_availability: {
    start_time: string;
    end_time: string;
  };
  tutorName?: string;
}

const NewStudentDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [activePackages, setActivePackages] = useState<PackagePurchase[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    completedSessions: 0,
    upcomingSessions: 0,
    totalSpent: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        navigate("/login");
        return;
      }

      setUser(currentUser);

      // Fetch active packages
      const { data: packagesData } = await supabase
        .from("package_purchases")
        .select(`
          *,
          package_offers(name, description)
        `)
        .eq("student_id", currentUser.id)
        .eq("payment_status", "completed")
        .gt("sessions_remaining", 0)
        .gt("expires_at", new Date().toISOString());

      const packages: PackagePurchase[] = [];

      // Fetch tutor names for packages
      if (packagesData) {
        for (const pkg of packagesData) {
          const { data: tutorProfile } = await supabase
            .from("tutor_profiles")
            .select("user_id")
            .eq("id", pkg.tutor_id)
            .single();
          
          let tutorName = "Tutor";
          if (tutorProfile) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", tutorProfile.user_id)
              .single();
            
            tutorName = profile?.full_name || "Tutor";
          }
          
          packages.push({
            ...pkg,
            tutorName
          } as PackagePurchase);
        }
      }

      setActivePackages(packages);

      // Fetch upcoming bookings
      const { data: upcomingData } = await supabase
        .from("bookings")
        .select(`
          *,
          tutor_availability!inner(start_time, end_time)
        `)
        .eq("student_id", currentUser.id)
        .in("status", ["confirmed", "pending"])
        .gte("tutor_availability.start_time", new Date().toISOString())
        .order("tutor_availability(start_time)", { ascending: true })
        .limit(5);

      const upcoming: Booking[] = [];

      // Fetch tutor names for upcoming bookings
      if (upcomingData) {
        for (const booking of upcomingData) {
          const { data: tutorProfile } = await supabase
            .from("tutor_profiles")
            .select("user_id")
            .eq("id", booking.tutor_id)
            .single();
          
          let tutorName = "Tutor";
          if (tutorProfile) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", tutorProfile.user_id)
              .single();
            
            tutorName = profile?.full_name || "Tutor";
          }
          
          upcoming.push({
            ...booking,
            tutorName
          } as Booking);
        }
      }

      setUpcomingBookings(upcoming);

      // Fetch past bookings
      const { data: pastData } = await supabase
        .from("bookings")
        .select(`
          *,
          tutor_availability!inner(start_time, end_time)
        `)
        .eq("student_id", currentUser.id)
        .eq("status", "completed")
        .order("tutor_availability(start_time)", { ascending: false })
        .limit(10);

      const past: Booking[] = [];

      // Fetch tutor names for past bookings
      if (pastData) {
        for (const booking of pastData) {
          const { data: tutorProfile } = await supabase
            .from("tutor_profiles")
            .select("user_id")
            .eq("id", booking.tutor_id)
            .single();
          
          let tutorName = "Tutor";
          if (tutorProfile) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", tutorProfile.user_id)
              .single();
            
            tutorName = profile?.full_name || "Tutor";
          }
          
          past.push({
            ...booking,
            tutorName
          } as Booking);
        }
      }

      setPastBookings(past);

      // Calculate stats
      const allBookings = [...(upcoming || []), ...(past || [])];
      const completed = allBookings.filter(b => b.status === "completed").length;
      const totalSpent = allBookings.reduce((sum, b) => sum + (b.amount || 0), 0);

      setStats({
        totalSessions: allBookings.length,
        completedSessions: completed,
        upcomingSessions: (upcoming || []).length,
        totalSpent
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      confirmed: { variant: "default", label: "Confirmed" },
      pending: { variant: "secondary", label: "Pending" },
      completed: { variant: "default", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" }
    };
    const { variant, label } = variants[status] || variants.pending;
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[image:var(--gradient-page)]">
        <Navigation />
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, <span className="text-primary">{user?.email?.split('@')[0] || 'Student'}</span>!
          </h1>
          <p className="text-muted-foreground text-lg">Track your learning journey and manage your sessions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-primary hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Sessions</p>
                  <p className="text-3xl font-bold">{stats.totalSessions}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-full">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Completed</p>
                  <p className="text-3xl font-bold">{stats.completedSessions}</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Upcoming</p>
                  <p className="text-3xl font-bold">{stats.upcomingSessions}</p>
                </div>
                <div className="p-3 bg-accent/10 rounded-full">
                  <Calendar className="w-6 h-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Invested</p>
                  <p className="text-3xl font-bold">KES {stats.totalSpent.toFixed(0)}</p>
                </div>
                <div className="p-3 bg-amber-100 dark:bg-amber-900 rounded-full">
                  <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Packages */}
        {activePackages.length > 0 && (
          <Card className="mb-8 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Your Active Packages
              </CardTitle>
              <p className="text-sm text-muted-foreground">Use your package credits to book sessions</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activePackages.map((pkg) => (
                  <Card key={pkg.id} className="bg-background">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-lg mb-1">{pkg.package_offers?.name || "Package"}</h3>
                          <p className="text-sm text-muted-foreground">{pkg.package_offers?.description || ""}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            with {pkg.tutorName || "Tutor"}
                          </p>
                        </div>
                        <Badge className="bg-primary">
                          {pkg.sessions_remaining} Left
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span>Sessions Used</span>
                          <span className="font-medium">{pkg.sessions_used}/{pkg.total_sessions}</span>
                        </div>
                        <Progress 
                          value={(pkg.sessions_used / pkg.total_sessions) * 100} 
                          className="h-2"
                        />
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Expires {format(new Date(pkg.expires_at), "MMM d, yyyy")}
                        </span>
                        <Link to="/tutors">
                          <Button size="sm" className="gap-2">
                            Book Session
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="upcoming" className="gap-2">
              <Calendar className="w-4 h-4" />
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Past Sessions
            </TabsTrigger>
          </TabsList>

          {/* Upcoming Sessions */}
          <TabsContent value="upcoming" className="space-y-4">
            {upcomingBookings.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Upcoming Sessions</h3>
                  <p className="text-muted-foreground mb-6">
                    Book your first tutoring session to get started
                  </p>
                  <Link to="/tutors">
                    <Button className="gap-2">
                      Find a Tutor
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              upcomingBookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Video className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg">{booking.subject}</h3>
                            {getStatusBadge(booking.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-primary text-primary" />
                              <span>{booking.tutorName || "Tutor"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{format(new Date(booking.tutor_availability.start_time), "MMM d, yyyy")}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>
                                {format(new Date(booking.tutor_availability.start_time), "h:mm a")} - 
                                {format(new Date(booking.tutor_availability.end_time), "h:mm a")}
                              </span>
                            </div>
                          </div>
                          {booking.balance_due > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <AlertCircle className="w-4 h-4 text-amber-600" />
                              <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                                Balance Due: KES {booking.balance_due.toFixed(0)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {booking.meeting_link && booking.status === "confirmed" && (
                          <Button 
                            onClick={() => window.open(booking.meeting_link!, '_blank')}
                            className="gap-2"
                          >
                            <Video className="w-4 h-4" />
                            Join Session
                          </Button>
                        )}
                        {booking.balance_due > 0 && (
                          <Button variant="outline" className="gap-2">
                            Pay Balance
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Past Sessions */}
          <TabsContent value="past" className="space-y-4">
            {pastBookings.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Past Sessions</h3>
                  <p className="text-muted-foreground">
                    Your completed sessions will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {pastBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-secondary/50 transition-colors">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold mb-1">{booking.subject}</h4>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span>{booking.tutorName || "Tutor"}</span>
                              <span>•</span>
                              <span>{format(new Date(booking.tutor_availability.start_time), "MMM d, yyyy")}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="gap-2">
                            <PlayCircle className="w-4 h-4" />
                            Recording
                          </Button>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Download className="w-4 h-4" />
                            Summary
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* CTA Section */}
        <Card className="mt-8 bg-gradient-to-br from-primary to-primary/80 text-white border-0">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Ready for Your Next Session?</h2>
            <p className="text-white/90 mb-6">
              Browse our verified tutors and book your next learning experience
            </p>
            <Link to="/tutors">
              <Button size="lg" variant="secondary" className="gap-2 bg-white text-primary hover:bg-white/90">
                Browse Tutors
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewStudentDashboard;

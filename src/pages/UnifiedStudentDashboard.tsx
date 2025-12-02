import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Calendar, 
  Package, 
  BookOpen, 
  Video, 
  ChevronDown,
  ChevronUp,
  CalendarClock,
  Sparkles,
  MessageSquare,
  Search,
  Clock,
  Users,
  Loader2,
  DollarSign,
  ExternalLink
} from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { format, parseISO, isWithinInterval } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { GroupedBookingCard } from "@/components/student/GroupedBookingCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PackagePurchase {
  id: string;
  tutor_id: string;
  total_sessions: number;
  sessions_used: number;
  sessions_remaining: number;
  total_amount: number;
  amount_paid: number;
  payment_status: string;
  expires_at: string | null;
  created_at: string;
  currency: string;
}

interface TutorInfo {
  id: string;
  user_id: string;
  profile_slug: string | null;
  full_name: string;
}

interface IntensiveEnrollment {
  id: string;
  program_id: string;
  enrolled_class_ids: string[];
  total_subjects: number;
  total_amount: number;
  payment_status: string;
}

interface IntensiveClass {
  id: string;
  subject: string;
  curriculum: string;
  grade_levels: string[];
  time_slot: string;
  meeting_link: string | null;
  tutor_name?: string;
}

interface IntensiveProgram {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export default function UnifiedStudentDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  
  // Bookings
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [pastBookings, setPastBookings] = useState<any[]>([]);
  
  // Packages
  const [packages, setPackages] = useState<PackagePurchase[]>([]);
  const [tutorInfo, setTutorInfo] = useState<Record<string, TutorInfo>>({});
  
  // Bootcamp
  const [bootcampEnrollments, setBootcampEnrollments] = useState<IntensiveEnrollment[]>([]);
  const [bootcampClasses, setBootcampClasses] = useState<IntensiveClass[]>([]);
  const [bootcampProgram, setBootcampProgram] = useState<IntensiveProgram | null>(null);
  
  // UI State
  const [pastSessionsOpen, setPastSessionsOpen] = useState(false);
  const [summaryDialog, setSummaryDialog] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [currentSummary, setCurrentSummary] = useState("");
  const [currentBooking, setCurrentBooking] = useState<any>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    
    if (profile?.full_name) {
      setUserName(profile.full_name.split(" ")[0]);
    }

    // Fetch all data in parallel
    await Promise.all([
      fetchBookings(user.id),
      fetchPackages(user.id),
      fetchBootcamp(user.id)
    ]);

    setLoading(false);
  };

  const fetchBookings = async (userId: string) => {
    const { data: bookings } = await supabase
      .from('bookings')
      .select(`*, tutor_availability (start_time, end_time)`)
      .eq('student_id', userId)
      .order('created_at', { ascending: false });

    if (bookings) {
      const now = new Date();
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
  };

  const fetchPackages = async (userId: string) => {
    const { data: purchaseData } = await supabase
      .from('package_purchases')
      .select('*')
      .eq('student_id', userId)
      .order('created_at', { ascending: false });

    if (purchaseData && purchaseData.length > 0) {
      setPackages(purchaseData);

      const tutorIds = [...new Set(purchaseData.map(p => p.tutor_id))];
      const { data: tutorProfiles } = await supabase
        .from('tutor_profiles')
        .select('id, user_id, profile_slug')
        .in('id', tutorIds);

      if (tutorProfiles) {
        const userIds = tutorProfiles.map(t => t.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        const tutorInfoMap: Record<string, TutorInfo> = {};
        tutorProfiles.forEach(tp => {
          const profile = profiles?.find(p => p.id === tp.user_id);
          tutorInfoMap[tp.id] = {
            id: tp.id,
            user_id: tp.user_id,
            profile_slug: tp.profile_slug,
            full_name: profile?.full_name || 'Unknown Tutor'
          };
        });
        setTutorInfo(tutorInfoMap);
      }
    }
  };

  const fetchBootcamp = async (userId: string) => {
    const { data: programData } = await supabase
      .from("intensive_programs")
      .select("*")
      .eq("is_active", true)
      .single();

    if (programData) {
      setBootcampProgram(programData);
    }

    const { data: enrollmentData } = await supabase
      .from("intensive_enrollments")
      .select("*")
      .eq("student_id", userId);

    if (enrollmentData && enrollmentData.length > 0) {
      setBootcampEnrollments(enrollmentData);

      const allClassIds = enrollmentData.flatMap(e => e.enrolled_class_ids);
      const { data: classData } = await supabase
        .from("intensive_classes")
        .select("*")
        .in("id", allClassIds);

      if (classData) {
        const tutorIds = classData.filter(c => c.tutor_id).map(c => c.tutor_id);
        
        if (tutorIds.length > 0) {
          const { data: tutorProfiles } = await supabase
            .from("tutor_profiles")
            .select("id, user_id")
            .in("id", tutorIds);

          const userIds = tutorProfiles?.map(t => t.user_id) || [];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds);

          const enrichedClasses = classData.map(cls => {
            const tutorProfile = tutorProfiles?.find(t => t.id === cls.tutor_id);
            const profile = profiles?.find(p => p.id === tutorProfile?.user_id);
            return { ...cls, tutor_name: profile?.full_name || "TBA" };
          });

          setBootcampClasses(enrichedClasses);
        } else {
          setBootcampClasses(classData);
        }
      }
    }
  };

  const generateAISummary = async (booking: any) => {
    setCurrentBooking(booking);
    setSummaryDialog(true);
    setGeneratingSummary(true);
    setCurrentSummary("");

    try {
      const { data, error } = await supabase.functions.invoke("generate-session-summary", {
        body: {
          subject: booking.subject,
          date: new Date(booking.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          duration: "1 hour"
        }
      });
      if (error) throw error;
      setCurrentSummary(data.summary);
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate AI summary", variant: "destructive" });
      setSummaryDialog(false);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const isPackageActive = (pkg: PackagePurchase) => {
    if (pkg.payment_status !== 'completed') return false;
    if (pkg.sessions_remaining <= 0) return false;
    if (pkg.expires_at && new Date(pkg.expires_at) < new Date()) return false;
    return true;
  };

  const isProgramActive = () => {
    if (!bootcampProgram) return false;
    const now = new Date();
    const start = parseISO(bootcampProgram.start_date);
    const end = parseISO(bootcampProgram.end_date);
    return isWithinInterval(now, { start, end });
  };

  // Group bookings
  const groupedUpcomingBookings = upcomingBookings.reduce((groups: Record<string, any[]>, booking) => {
    const groupId = booking.booking_group_id || (booking.package_purchase_id ? `pkg_${booking.package_purchase_id}` : booking.id);
    if (!groups[groupId]) groups[groupId] = [];
    groups[groupId].push(booking);
    return groups;
  }, {});

  const activePackages = packages.filter(isPackageActive);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome back{userName ? `, ${userName}` : ''}!</h1>
            <p className="text-muted-foreground">Here's an overview of your learning journey</p>
          </div>
          <Link to="/tutors">
            <Button size="lg">
              <Search className="w-4 h-4 mr-2" />
              Find a Tutor
            </Button>
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{upcomingBookings.length}</div>
                  <p className="text-sm text-muted-foreground">Upcoming Classes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{activePackages.length}</div>
                  <p className="text-sm text-muted-foreground">Active Packages</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {bootcampEnrollments.length > 0 ? bootcampClasses.length : 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Bootcamp Subjects</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Sessions */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Upcoming 1-on-1 Sessions</h2>
          {Object.keys(groupedUpcomingBookings).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">No upcoming 1-on-1 sessions</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {bootcampEnrollments.length > 0 
                    ? "Check your Bootcamp classes below for group sessions."
                    : "Book a session with one of our expert tutors to get started."}
                </p>
                <Link to="/tutors">
                  <Button variant="outline" size="sm">Find a Tutor</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {(Object.values(groupedUpcomingBookings) as any[][]).slice(0, 5).map((groupBookings) => (
                <GroupedBookingCard 
                  key={groupBookings[0].booking_group_id || groupBookings[0].package_purchase_id || groupBookings[0].id}
                  bookings={groupBookings}
                  isUpcoming={true}
                />
              ))}
            </div>
          )}
        </section>

        {/* Active Packages */}
        {activePackages.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">My Packages</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activePackages.map((pkg) => {
                const tutor = tutorInfo[pkg.tutor_id];
                const progress = ((pkg.total_sessions - pkg.sessions_remaining) / pkg.total_sessions) * 100;

                return (
                  <Card key={pkg.id} className="border-l-4 border-l-green-500">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {pkg.total_sessions}-Session Package
                          </h3>
                          {tutor && (
                            <p className="text-sm text-muted-foreground">
                              with {tutor.full_name}
                            </p>
                          )}
                        </div>
                        <Badge className="bg-green-500">Active</Badge>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Sessions Used</span>
                            <span className="font-medium">
                              {pkg.total_sessions - pkg.sessions_remaining} / {pkg.total_sessions}
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {pkg.expires_at && (
                          <p className="text-xs text-muted-foreground">
                            Expires: {format(new Date(pkg.expires_at), 'MMM d, yyyy')}
                          </p>
                        )}

                        <Button 
                          className="w-full" 
                          onClick={() => {
                            if (tutor?.profile_slug) {
                              navigate(`/tutors/${tutor.profile_slug}?redeemPackageId=${pkg.id}&openBooking=1`);
                            } else {
                              navigate('/tutors');
                            }
                          }}
                        >
                          Book a Session
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* December Bootcamp */}
        {bootcampEnrollments.length > 0 && (
          <section className="mb-8">
            <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">December Holiday Bootcamp</CardTitle>
                    {bootcampProgram && (
                      <CardDescription>
                        {format(parseISO(bootcampProgram.start_date), "MMM d")} - {format(parseISO(bootcampProgram.end_date), "MMM d, yyyy")}
                      </CardDescription>
                    )}
                  </div>
                  {isProgramActive() && (
                    <Badge className="bg-green-500 text-white">
                      <span className="animate-pulse mr-2">●</span> Live Now
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bootcampClasses.map((cls) => {
                    const enrollment = bootcampEnrollments.find(e => e.enrolled_class_ids.includes(cls.id));
                    
                    return (
                      <Card key={cls.id} className="bg-background">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{cls.subject}</h4>
                            {enrollment?.payment_status === "completed" ? (
                              <Badge className="bg-green-500 text-white text-xs">Paid</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-yellow-500 text-white text-xs">Pending</Badge>
                            )}
                          </div>
                          <div className="flex gap-2 mb-3">
                            <Badge variant="outline" className="text-xs">{cls.curriculum}</Badge>
                            <Badge variant="outline" className="text-xs">{cls.grade_levels[0]}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1 mb-4">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>{cls.time_slot} EAT daily</span>
                            </div>
                            {cls.tutor_name && (
                              <div className="flex items-center gap-2">
                                <Users className="h-3 w-3" />
                                <span>{cls.tutor_name}</span>
                              </div>
                            )}
                          </div>
                          {cls.meeting_link ? (
                            <Button 
                              className="w-full"
                              onClick={() => window.open(cls.meeting_link!, '_blank')}
                            >
                              <Video className="h-4 w-4 mr-2" />
                              Join Class
                            </Button>
                          ) : (
                            <Button variant="outline" className="w-full" disabled>
                              <Clock className="h-4 w-4 mr-2" />
                              Link Coming Soon
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Past Sessions (Collapsible) */}
        {pastBookings.length > 0 && (
          <Collapsible open={pastSessionsOpen} onOpenChange={setPastSessionsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between mb-4 p-4 h-auto">
                <h2 className="text-xl font-semibold">Past Sessions ({pastBookings.length})</h2>
                {pastSessionsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b bg-muted/30">
                        <tr className="text-left text-sm text-muted-foreground">
                          <th className="p-4 font-medium">Subject</th>
                          <th className="p-4 font-medium">Date</th>
                          <th className="p-4 font-medium">Status</th>
                          <th className="p-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pastBookings.slice(0, 10).map((booking) => {
                          const sessionTime = booking.tutor_availability?.start_time 
                            ? new Date(booking.tutor_availability.start_time)
                            : new Date(booking.created_at);
                          
                          return (
                            <tr key={booking.id} className="border-b last:border-0">
                              <td className="p-4 font-medium">{booking.subject}</td>
                              <td className="p-4 text-muted-foreground">
                                {formatInTimeZone(sessionTime, 'Africa/Nairobi', 'MMM d, yyyy')}
                              </td>
                              <td className="p-4">
                                <Badge variant="secondary">{booking.status}</Badge>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => generateAISummary(booking)}
                                  >
                                    <Sparkles className="w-4 h-4 mr-1" />
                                    Summary
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const subject = encodeURIComponent('Feedback on Session');
                                      const body = encodeURIComponent(`Booking ID: ${booking.id}\nSubject: ${booking.subject}\n\nMy Feedback:\n\n`);
                                      window.location.href = `mailto:info@lanatutors.africa?subject=${subject}&body=${body}`;
                                    }}
                                  >
                                    <MessageSquare className="w-4 h-4 mr-1" />
                                    Feedback
                                  </Button>
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
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* AI Summary Dialog */}
        <Dialog open={summaryDialog} onOpenChange={setSummaryDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Session Summary
              </DialogTitle>
              <DialogDescription>
                {currentBooking && `${currentBooking.subject}`}
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
    </div>
  );
}

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Video, 
  Sparkles,
  PlayCircle,
  Lock,
  Calendar,
  DollarSign,
  BookOpen,
  Download,
  Loader2
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RecordingPayment } from "@/components/RecordingPayment";
import { TutorReviewForm } from "@/components/TutorReviewForm";
import { format } from "date-fns";

const EnhancedStudentDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [recordingDialogOpen, setRecordingDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [summary, setSummary] = useState("");
  const [generatingSummary, setGeneratingSummary] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
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

    // Fetch bookings with tutor info
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select(`
        *,
        tutor_profiles!inner(id, user_id, hourly_rate),
        tutor_availability!inner(start_time, end_time)
      `)
      .eq("student_id", authUser.id)
      .order("created_at", { ascending: false });

    if (bookingsData) {
      // Fetch tutor names
      const enrichedBookings = await Promise.all(
        bookingsData.map(async (booking: any) => {
          const { data: tutorProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", booking.tutor_profiles.user_id)
            .single();

          return {
            ...booking,
            tutorName: tutorProfile?.full_name || "Tutor",
          };
        })
      );

      setBookings(enrichedBookings);
    }

    // Fetch payments
    const { data: paymentsData } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", authUser.id)
      .order("created_at", { ascending: false })
      .limit(10);

    setPayments(paymentsData || []);
    setLoading(false);
  };

  const handleGenerateSummary = async (booking: any) => {
    setSelectedBooking(booking);
    setGeneratingSummary(true);
    setSummaryDialogOpen(true);

    try {
      const dummyTranscript = `This was a comprehensive session on ${booking.subject}. The tutor ${booking.tutorName} explained the key concepts clearly and provided practical examples. The student demonstrated good understanding and asked relevant questions.`;

      const { data, error } = await supabase.functions.invoke("generate-session-summary", {
        body: {
          transcript: dummyTranscript,
          subject: booking.subject,
          tutorName: booking.tutorName,
          studentName: profile?.full_name || "Student",
        },
      });

      if (error) throw error;

      setSummary(data.summary);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate summary",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleWatchRecording = (booking: any) => {
    setSelectedBooking(booking);
    setRecordingDialogOpen(true);
  };

  const handleLeaveReview = (booking: any) => {
    setSelectedBooking(booking);
    setReviewDialogOpen(true);
  };

  const upcomingBookings = bookings.filter(b => 
    new Date(b.tutor_availability.start_time) > new Date() && b.status === 'confirmed'
  );
  
  const pastBookings = bookings.filter(b => 
    new Date(b.tutor_availability.start_time) < new Date() && b.status === 'confirmed'
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[image:var(--gradient-page)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {profile?.full_name || user?.email}!
          </h1>
          <p className="text-muted-foreground">Here's your learning journey summary</p>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past Sessions ({pastBookings.length})
            </TabsTrigger>
            <TabsTrigger value="payments">
              Payments ({payments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingBookings.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No upcoming sessions</h3>
                  <p className="text-muted-foreground mb-4">Book a session to get started!</p>
                  <Link to="/tutors">
                    <Button>Find Tutors</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              upcomingBookings.map((booking) => (
                <Card key={booking.id} className="border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback>
                            {booking.tutorName.split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-1">{booking.subject}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            with {booking.tutorName}
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
                          </div>
                          {booking.balance_due > 0 && (
                            <p className="text-xs text-amber-600 mt-2">
                              Balance Due: KES {booking.balance_due.toFixed(0)}
                            </p>
                          )}
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

          <TabsContent value="past" className="space-y-4">
            {pastBookings.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No past sessions yet</p>
                </CardContent>
              </Card>
            ) : (
              pastBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold mb-1">{booking.subject}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {booking.tutorName} • {format(new Date(booking.tutor_availability.start_time), "MMM d, yyyy")}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {booking.class_type}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleGenerateSummary(booking)}
                        >
                          <Sparkles className="w-4 h-4 mr-1" />
                          AI Summary
                        </Button>
                        {booking.class_type === 'online' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleWatchRecording(booking)}
                          >
                            <PlayCircle className="w-4 h-4 mr-1" />
                            Recording
                          </Button>
                        )}
                        <Button 
                          size="sm"
                          onClick={() => handleLeaveReview(booking)}
                        >
                          Leave Review
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            {payments.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <DollarSign className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No payment history</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div>
                          <p className="font-medium">{payment.payment_type.replace('_', ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(payment.created_at), "MMM d, yyyy h:mm a")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">KES {payment.amount}</p>
                          <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* AI Summary Dialog */}
        <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                AI-Generated Session Summary
              </DialogTitle>
              <DialogDescription>
                {selectedBooking?.subject} with {selectedBooking?.tutorName}
              </DialogDescription>
            </DialogHeader>
            {generatingSummary ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {summary}
                </div>
              </div>
            )}
            {!generatingSummary && (
              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Recording Dialog */}
        <Dialog open={recordingDialogOpen} onOpenChange={setRecordingDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-primary" />
                Session Recording
              </DialogTitle>
              <DialogDescription>
                {selectedBooking?.subject} • {selectedBooking && format(new Date(selectedBooking.tutor_availability?.start_time), "MMM d, yyyy")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <PlayCircle className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Recording will be available here</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" className="flex-1">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Transcript
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Review Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leave a Review</DialogTitle>
              <DialogDescription>
                Share your experience with {selectedBooking?.tutorName}
              </DialogDescription>
            </DialogHeader>
            {selectedBooking && (
              <TutorReviewForm
                tutorId={selectedBooking.tutor_id}
                tutorName={selectedBooking.tutorName}
                bookingId={selectedBooking.id}
                onSuccess={() => {
                  setReviewDialogOpen(false);
                  toast({
                    title: "Review submitted",
                    description: "Thank you for your feedback!",
                  });
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default EnhancedStudentDashboard;
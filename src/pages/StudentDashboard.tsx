import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Award, 
  Video, 
  Sparkles,
  MessageCircle,
  PlayCircle,
  Lock
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RecordingPayment } from "@/components/RecordingPayment";

const StudentDashboard = () => {
  const { toast } = useToast();
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [recordingDialogOpen, setRecordingDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [hasAccess, setHasAccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [pastBookings, setPastBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("Student");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        // Get user profile name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (profile?.full_name) {
          setUserName(profile.full_name);
        }
        
        // Fetch bookings
        await fetchBookings(user.id);
      }
      setLoading(false);
    };
    getUser();
  }, []);

  const fetchBookings = async (userId: string) => {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        availability_slot:tutor_availability!availability_slot_id(start_time, end_time),
        tutor:profiles!tutor_id(full_name)
      `)
      .eq('student_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Error",
        description: "Failed to load your bookings",
        variant: "destructive"
      });
      return;
    }

    console.log('Fetched bookings:', bookings);

    if (bookings) {
      const now = new Date();
      const upcoming = bookings.filter(b => {
        const slotTime = new Date((b.availability_slot as any)?.start_time);
        return slotTime > now && b.status !== 'cancelled';
      });
      const past = bookings.filter(b => {
        const slotTime = new Date((b.availability_slot as any)?.start_time);
        return slotTime <= now || b.status === 'cancelled';
      });
      
      console.log('Upcoming bookings:', upcoming);
      console.log('Past bookings:', past);
      
      setUpcomingBookings(upcoming);
      setPastBookings(past);
    }
  };

  const pastClasses = [
    { 
      id: "class-1",
      subject: "Classical Mechanics", 
      date: "12th Oct, 2023", 
      tutor: "Sarah Wanjiru", 
      hasRecording: true 
    },
    { 
      id: "class-2",
      subject: "Stoichiometry", 
      date: "10th Oct, 2023", 
      tutor: "David Kamau", 
      hasRecording: true 
    },
    { 
      id: "class-3",
      subject: "Fasihi Simulizi", 
      date: "8th Oct, 2023", 
      tutor: "Jane Muthoni", 
      hasRecording: true 
    }
  ];

  const learningProgress = [
    { subject: "Math", progress: 85 },
    { subject: "Physics", progress: 78 },
    { subject: "Chemistry", progress: 92 }
  ];

  const messages = [
    { 
      from: "David Kamau", 
      message: "Great work on the assignment! Just a few notes...", 
      unread: true 
    },
    { 
      from: "Sarah Wanjiru", 
      message: "Our session for tomorrow is confirmed. See you then!", 
      unread: false 
    },
    { 
      from: "Jane Muthoni", 
      message: "I've rescheduled our class to 5 PM. Please confirm.", 
      unread: true 
    }
  ];

  const handleGenerateSummary = (subject: string) => {
    setSelectedClass(subject);
    setSummaryDialogOpen(true);
  };

  const handleWatchRecording = async (subject: string, classId: string) => {
    setSelectedClass(subject);
    setSelectedClassId(classId);

    // Check if user has access
    if (!userId) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to access recordings",
        variant: "destructive"
      });
      return;
    }

    const { data, error } = await supabase.rpc('has_recording_access', {
      _user_id: userId,
      _class_id: classId
    });

    if (error) {
      console.error('Error checking access:', error);
      toast({
        title: "Error",
        description: "Failed to check recording access",
        variant: "destructive"
      });
      return;
    }

    setHasAccess(data || false);
    
    if (data) {
      setRecordingDialogOpen(true);
    } else {
      setPaymentDialogOpen(true);
    }
  };

  const handlePaymentSuccess = () => {
    setPaymentDialogOpen(false);
    setHasAccess(true);
    setRecordingDialogOpen(true);
    toast({
      title: "Payment Successful",
      description: "You now have access to this recording!",
    });
  };

  const dummySummary = `
**Session Overview:**
This was an engaging session covering key concepts in ${selectedClass}. The tutor provided clear explanations and practical examples to help understand the material better.

**Key Topics Covered:**
• Introduction to fundamental principles
• Step-by-step problem-solving techniques
• Real-world applications and examples
• Common mistakes to avoid
• Practice problems and exercises

**Main Takeaways:**
1. Understanding the core concepts is essential before moving to advanced topics
2. Practice regularly to build confidence and speed
3. Review the examples provided during the session

**Action Items:**
- Complete the assigned practice problems
- Review notes from this session
- Prepare questions for the next class

**Next Steps:**
Continue practicing the concepts learned today and reach out if you need clarification on any topics.
  `;

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome back, {userName}!</h1>
          <p className="text-muted-foreground">Here's a summary of your learning journey.</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading your bookings...</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Classes */}
            {upcomingBookings.length > 0 ? (
              upcomingBookings.map((booking) => {
                const slot = booking.availability_slot as any;
                const tutor = booking.tutor as any;
                const startTime = new Date(slot?.start_time);
                const now = new Date();
                const daysUntil = Math.ceil((startTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <Card key={booking.id} className="bg-[hsl(188,75%,40%)] border-0 text-white">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h2 className="text-2xl font-bold mb-1">Upcoming Class</h2>
                          <p className="text-white/90">{booking.subject}</p>
                        </div>
                        <Badge className="bg-white text-[hsl(188,75%,40%)] hover:bg-white/90">
                          {daysUntil === 0 ? 'Today' : `in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 mb-6">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-white/20 text-white">
                            {tutor?.full_name?.split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{tutor?.full_name}</p>
                          <p className="text-sm text-white/80">
                            {startTime.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })} at {startTime.toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>

                      {booking.meeting_link ? (
                        <Button 
                          onClick={() => window.open(booking.meeting_link, '_blank')}
                          className="w-full bg-white text-[hsl(188,75%,40%)] hover:bg-white/90"
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Join Class
                        </Button>
                      ) : (
                        <div className="bg-white/10 rounded-lg p-3 text-sm">
                          <p className="text-white/90">Meeting link will be available closer to the session time.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground mb-4">No upcoming classes scheduled</p>
                  <Link to="/tutors">
                    <Button>Find a Tutor</Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Past Classes */}
            <Card>
              <CardHeader>
                <CardTitle>Past Classes</CardTitle>
                <p className="text-sm text-muted-foreground">Review your previous sessions.</p>
              </CardHeader>
              <CardContent>
                {pastBookings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No past classes yet</p>
                ) : (
                  <>
                    {/* Mobile View - Cards */}
                    <div className="md:hidden space-y-4">
                      {pastBookings.map((booking) => {
                        const slot = booking.availability_slot as any;
                        const tutor = booking.tutor as any;
                        const startTime = new Date(slot?.start_time);
                        
                        return (
                          <div key={booking.id} className="border rounded-lg p-4 space-y-3">
                            <div>
                              <h3 className="font-semibold text-base mb-1">{booking.subject}</h3>
                              <p className="text-sm text-muted-foreground">{tutor?.full_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {startTime.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </p>
                            </div>
                            <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                              {booking.status}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop View - Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b">
                          <tr className="text-left text-sm text-muted-foreground">
                            <th className="pb-3 font-medium w-[30%]">Subject</th>
                            <th className="pb-3 font-medium w-[25%]">Tutor</th>
                            <th className="pb-3 font-medium w-[25%]">Date</th>
                            <th className="pb-3 font-medium w-[20%]">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pastBookings.map((booking) => {
                            const slot = booking.availability_slot as any;
                            const tutor = booking.tutor as any;
                            const startTime = new Date(slot?.start_time);
                            
                            return (
                              <tr key={booking.id} className="border-b last:border-0">
                                <td className="py-4 font-medium break-words">{booking.subject}</td>
                                <td className="py-4 text-muted-foreground break-words">{tutor?.full_name}</td>
                                <td className="py-4 text-muted-foreground whitespace-nowrap">
                                  {startTime.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                  })}
                                </td>
                                <td className="py-4">
                                  <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                                    {booking.status}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
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

            {/* Messages */}
            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {messages.map((msg, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
                      {msg.unread && (
                        <div className="w-2 h-2 rounded-full bg-[hsl(188,75%,40%)] mt-2 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm mb-1">{msg.from}</p>
                        <p className="text-sm text-muted-foreground truncate">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  View All Messages
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        )}

        {/* AI Summary Dialog */}
        <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                AI-Generated Summary: {selectedClass}
              </DialogTitle>
              <DialogDescription>
                This summary was automatically generated from your class session.
              </DialogDescription>
            </DialogHeader>
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {dummySummary}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1">
                Download PDF
              </Button>
              <Button variant="outline" className="flex-1">
                Share Summary
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="max-w-md">
            <RecordingPayment 
              classId={selectedClassId}
              className={selectedClass}
              onSuccess={handlePaymentSuccess}
            />
          </DialogContent>
        </Dialog>

        {/* Recording Dialog */}
        <Dialog open={recordingDialogOpen} onOpenChange={setRecordingDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-cyan-600" />
                Class Recording: {selectedClass}
              </DialogTitle>
              <DialogDescription>
                Watch the recording of your previous class session.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Dummy Video Player */}
              <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <PlayCircle className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Video Player Placeholder</p>
                  <p className="text-sm text-muted-foreground">Duration: 45:30</p>
                </div>
              </div>
              
              {/* Recording Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Recorded on</p>
                  <p className="font-medium">October 12, 2023</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Quality</p>
                  <p className="font-medium">1080p HD</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  Download Recording
                </Button>
                <Button variant="outline" className="flex-1">
                  Generate Transcript
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default StudentDashboard;
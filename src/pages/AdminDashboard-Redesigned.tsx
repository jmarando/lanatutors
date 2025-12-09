import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CheckCircle, XCircle, AlertCircle, Calendar as CalendarIcon, Clock, Mail, Phone, User, BookOpen, FileText, Video, Edit, Save, X, MessageCircle, Send, TrendingUp, Users, DollarSign, BookMarked, Activity, ArrowUpRight, ArrowDownRight, GraduationCap, Star, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatConsultationDate, formatToEAT, formatFullDateTime } from "@/utils/dateUtils";
import { BlogManagement } from "@/components/admin/BlogManagement";
import { TutorSignupList } from "@/components/admin/TutorSignupList";
import { TutorEmailList } from "@/components/admin/TutorEmailList";
import { AdminIntensivePrograms } from "@/components/admin/AdminIntensivePrograms";
import { AdminTutorProfileEdit } from "@/components/admin/AdminTutorProfileEdit";
import { StudentList } from "@/components/admin/StudentList";
import { BootcampEnrollments } from "@/components/admin/BootcampEnrollments";
import { EmailComposer } from "@/components/admin/EmailComposer";
import { Sparkles, UserCog } from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingApplications, setPendingApplications] = useState<any[]>([]);
  const [interviewRecords, setInterviewRecords] = useState<any[]>([]);
  const [pendingTutors, setPendingTutors] = useState<any[]>([]);
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [consultationBookings, setConsultationBookings] = useState<any[]>([]);
  const [tutoringBookings, setTutoringBookings] = useState<any[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days'>('30days');
  const [unassignedIntensiveClasses, setUnassignedIntensiveClasses] = useState(0);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [interviewFilter, setInterviewFilter] = useState<'all' | 'scheduled' | 'passed' | 'failed'>('all');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [followUpDialog, setFollowUpDialog] = useState(false);
  const [messageDialog, setMessageDialog] = useState(false);
  const [messageType, setMessageType] = useState<'email' | 'whatsapp'>('email');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [followUpData, setFollowUpData] = useState({
    consultationOutcome: "",
    recommendedSubjects: [] as string[],
    recommendedTutors: [] as string[],
    nextSteps: "",
    nextAction: "",
    nextActionDate: "",
  });
  const [fixingPrices, setFixingPrices] = useState(false);
  const [priceStats, setPriceStats] = useState<{ total: number; needsFix: number } | null>(null);
  const [processingTutorId, setProcessingTutorId] = useState<string | null>(null);

  // Message templates for customer journey
  const messageTemplates = {
    email: {
      confirmation: {
        title: "Consultation Confirmed",
        subject: "Your Yehtu Tutors Consultation is Confirmed",
        body: (booking: any) => `Dear ${booking.parent_name},

Thank you for booking a consultation with Yehtu Tutors. We're pleased to confirm your appointment for ${booking.student_name}.

Consultation Details:
Date: ${formatConsultationDate(booking.consultation_date)}
Time: ${booking.consultation_time}
Grade Level: ${booking.grade_level}
Subjects of Interest: ${booking.subjects_interest.join(', ')}

We will send you the meeting link 24 hours before your scheduled consultation.

We look forward to discussing ${booking.student_name}'s educational needs with you.

Best regards,
The Yehtu Tutors Team`
      },
      reminder_24h: {
        title: "24-Hour Reminder",
        subject: "Reminder: Your Consultation is Tomorrow",
        body: (booking: any) => `Dear ${booking.parent_name},

This is a reminder that your consultation for ${booking.student_name} is scheduled for tomorrow.

Consultation Details:
Date: ${new Date(booking.consultation_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
Time: ${booking.consultation_time}
Meeting Link: [Insert meeting link]

To help us make the most of our time together, please consider:
- Specific academic challenges ${booking.student_name} is currently facing
- Your learning goals for this academic year
- Any questions you have about our tutoring programs

If you need to reschedule, please contact us at info@yehtu.com.

Best regards,
The Yehtu Tutors Team`
      },
      reminder_1h: {
        title: "1-Hour Reminder",
        subject: "Your Consultation Starts in 1 Hour",
        body: (booking: any) => `Dear ${booking.parent_name},

Your consultation for ${booking.student_name} begins in one hour.

Time: ${booking.consultation_time}
Meeting Link: [Insert meeting link]

We look forward to speaking with you shortly.

Best regards,
The Yehtu Tutors Team`
      },
      post_consultation: {
        title: "Post-Consultation Summary",
        subject: "Thank You - Next Steps for ${booking.student_name}",
        body: (booking: any) => `Dear ${booking.parent_name},

Thank you for taking the time to meet with us today. We appreciated learning about ${booking.student_name}'s educational journey and goals.

Key Discussion Points:
[Add summary of main topics discussed]

Recommended Next Steps:
[Add personalized recommendations based on the consultation]

Suggested Tutors and Subjects:
[Add recommended tutors and subject areas]

Ready to Get Started?
You can book your first tutoring session here: [Add booking link]

Limited Time Offer: Book within 48 hours to receive 20% off your first session.

If you have any questions or would like to discuss further, please don't hesitate to reply to this email or call us at [phone number].

Best regards,
The Yehtu Tutors Team`
      },
      follow_up_3days: {
        title: "3-Day Follow-up",
        subject: "Following Up: Tutoring for ${booking.student_name}",
        body: (booking: any) => `Dear ${booking.parent_name},

I hope this email finds you well.

I wanted to follow up regarding ${booking.student_name}'s tutoring needs. We have experienced tutors available who specialize in ${booking.subjects_interest.join(' and ')}.

We can help you with:
- Scheduling a trial tutoring session
- Answering any questions about our programs
- Providing more information about our recommended tutors

Please note: Your 20% discount expires in 24 hours.

Would you like to proceed with booking a session? Simply reply to this email or give us a call.

Best regards,
The Yehtu Tutors Team`
      }
    },
    whatsapp: {
      confirmation: {
        title: "Consultation Confirmed",
        body: (booking: any) => `Yehtu Tutors - Consultation Confirmed

Dear ${booking.parent_name},

Your consultation for ${booking.student_name} has been confirmed.

Date: ${new Date(booking.consultation_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
Time: ${booking.consultation_time}
Grade: ${booking.grade_level}

We will send the meeting link 24 hours before your appointment.

Best regards,
Yehtu Tutors`
      },
      reminder_24h: {
        title: "24-Hour Reminder",
        body: (booking: any) => `Reminder: Consultation Tomorrow

Dear ${booking.parent_name},

Your consultation for ${booking.student_name} is tomorrow.

Time: ${booking.consultation_time}
Meeting Link: [Insert link]

Please prepare:
- Current academic challenges
- Learning goals
- Questions about our programs

Best regards,
Yehtu Tutors`
      },
      reminder_1h: {
        title: "1-Hour Reminder",
        body: (booking: any) => `Consultation Starting Soon

Dear ${booking.parent_name},

Your consultation for ${booking.student_name} begins in 1 hour.

Time: ${booking.consultation_time}
Link: [Insert link]

See you soon.

Yehtu Tutors`
      },
      post_consultation: {
        title: "Post-Consultation Follow-up",
        body: (booking: any) => `Thank You for Meeting With Us

Dear ${booking.parent_name},

Thank you for discussing ${booking.student_name}'s educational needs with us today.

Summary: [Add key points]
Recommendations: [Add next steps]
Suggested Tutors: [Add recommendations]

Book your first session: [Add link]

Special Offer: 20% off if you book within 48 hours.

Questions? Reply to this message or call us.

Best regards,
Yehtu Tutors`
      },
      follow_up_3days: {
        title: "3-Day Follow-up",
        body: (booking: any) => `Following Up on ${booking.student_name}'s Tutoring

Dear ${booking.parent_name},

I wanted to follow up regarding tutoring for ${booking.student_name}.

We have qualified tutors ready to help with ${booking.subjects_interest.join(' and ')}.

Can we help you with:
- Scheduling a trial session
- Answering questions
- More tutor information

Reminder: 20% discount expires in 24 hours.

Let us know how we can assist.

Best regards,
Yehtu Tutors`
      }
    }
  };

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    // Set up realtime subscription for new applications
    const channel = supabase
      .channel('tutor-applications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tutor_applications'
        },
        (payload) => {
          fetchPendingApplications();
          fetchInterviewRecords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
      return;
    }

    setIsAdmin(true);
    fetchDashboardMetrics();
    fetchPendingApplications();
    fetchInterviewRecords();
    fetchPendingTutors();
    fetchPendingReviews();
    fetchConsultationBookings();
    fetchTutoringBookings();
    fetchPriceStats();
    fetchUnassignedIntensiveClasses();
    setLoading(false);
  };

  const fetchUnassignedIntensiveClasses = async () => {
    const { count } = await supabase
      .from("intensive_classes")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .is("tutor_id", null);
    setUnassignedIntensiveClasses(count || 0);
  };

  const fetchPriceStats = async () => {
    const { data: packages, error } = await supabase
      .from('package_offers')
      .select('id, total_price');
    
    if (!error && packages) {
      const needsFix = packages.filter(pkg => pkg.total_price < 100).length;
      setPriceStats({ total: packages.length, needsFix });
    }
  };

  const handleBulkPriceFix = async () => {
    if (!confirm('This will multiply all package prices under 100 by 1000. Continue?')) {
      return;
    }

    setFixingPrices(true);
    try {
      const { data: packagesToFix, error: fetchError } = await supabase
        .from('package_offers')
        .select('id, total_price')
        .lt('total_price', 100);

      if (fetchError) throw fetchError;

      if (!packagesToFix || packagesToFix.length === 0) {
        toast.info('No packages found with prices under 100');
        setFixingPrices(false);
        return;
      }

      let fixed = 0;
      for (const pkg of packagesToFix) {
        const { error: updateError } = await supabase
          .from('package_offers')
          .update({ total_price: pkg.total_price * 1000 })
          .eq('id', pkg.id);

        if (!updateError) fixed++;
      }

      toast.success(`Fixed ${fixed} package prices`);
      await fetchPriceStats();
    } catch (error: any) {
      toast.error('Failed to fix prices: ' + error.message);
    } finally {
      setFixingPrices(false);
    }
  };

  const fetchDashboardMetrics = async () => {
    try {
      const daysBack = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Fetch consultations data
      const { data: consultations } = await supabase
        .from('consultation_bookings')
        .select('*')
        .gte('created_at', startDate.toISOString());

      // Fetch bookings data
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .gte('created_at', startDate.toISOString());

      // Fetch payments data
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString());

      // Fetch tutor profiles
      const { data: tutors } = await supabase
        .from('tutor_profiles')
        .select('*')
        .gte('created_at', startDate.toISOString());

      // Fetch all profiles (students)
      const { data: students } = await supabase
        .from('profiles')
        .select('*')
        .gte('created_at', startDate.toISOString());

      // Total counts
      const { count: totalStudents } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: totalTutors } = await supabase
        .from('tutor_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('verified', true);

      const { count: totalConsultations } = await supabase
        .from('consultation_bookings')
        .select('*', { count: 'exact', head: true });

      const { count: totalBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });

      // Calculate totals
      const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const convertedConsultations = consultations?.filter(c => c.converted_to_customer).length || 0;
      const conversionRate = consultations?.length ? (convertedConsultations / consultations.length) * 100 : 0;

      // Group data by day for charts
      const groupByDay = (data: any[], dateField: string = 'created_at') => {
        const grouped: any = {};
        data?.forEach(item => {
          const date = new Date(item[dateField]).toLocaleDateString();
          grouped[date] = (grouped[date] || 0) + 1;
        });
        return Object.entries(grouped).map(([date, count]) => ({ date, count }));
      };

      const consultationsTrend = groupByDay(consultations || []);
      const bookingsTrend = groupByDay(bookings || []);
      const studentsTrend = groupByDay(students || []);
      const tutorsTrend = groupByDay(tutors || []);

      // Revenue trend
      const revenueTrend = payments?.reduce((acc: any, p) => {
        const date = new Date(p.created_at).toLocaleDateString();
        const existing = acc.find((item: any) => item.date === date);
        if (existing) {
          existing.amount += Number(p.amount);
        } else {
          acc.push({ date, amount: Number(p.amount) });
        }
        return acc;
      }, []) || [];

      setDashboardMetrics({
        totalStudents,
        totalTutors,
        totalConsultations,
        totalBookings,
        newStudents: students?.length || 0,
        newTutors: tutors?.length || 0,
        newConsultations: consultations?.length || 0,
        newBookings: bookings?.length || 0,
        totalRevenue,
        conversionRate,
        convertedConsultations,
        consultationsTrend,
        bookingsTrend,
        studentsTrend,
        tutorsTrend,
        revenueTrend,
      });
    } catch (error: any) {
      console.error('Error fetching dashboard metrics:', error);
    }
  };

  const fetchPendingApplications = async () => {
    const { data, error } = await supabase
      .from("tutor_applications")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching applications:", error);
    } else {
      setPendingApplications(data || []);
    }
  };

  const fetchInterviewRecords = async () => {
    const { data, error } = await supabase
      .from("tutor_applications")
      .select("*")
      .in("status", ["interview_scheduled", "interview_passed", "interview_failed"])
      .order("interview_scheduled_at", { ascending: false });

    if (error) {
      console.error("Error fetching interview records:", error);
    } else {
      setInterviewRecords(data || []);
    }
  };

  const fetchPendingTutors = async () => {
    const { data: tutorData, error } = await supabase
      .from("tutor_profiles")
      .select("*")
      .eq("verified", false);

    if (error) {
      console.error("Error fetching pending tutors:", error);
      setPendingTutors([]);
      return;
    }

    if (tutorData) {
      // Enrich with profile data
      const enriched = await Promise.all(
        tutorData.map(async (tutor) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, phone_number")
            .eq("id", tutor.user_id)
            .maybeSingle();
          
          return { 
            ...tutor, 
            profiles: profile || { full_name: "No name provided", phone_number: "No phone provided" }
          };
        })
      );
      setPendingTutors(enriched);
    }
  };

  const fetchPendingReviews = async () => {
    const { data, error } = await supabase
      .from("tutor_reviews")
      .select(`
        *,
        tutor_profiles!inner(id),
        profiles!tutor_reviews_student_id_fkey(full_name)
      `)
      .eq("is_moderated", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending reviews:", error);
      // Fallback query
      const { data: reviewData } = await supabase
        .from("tutor_reviews")
        .select("*")
        .eq("is_moderated", false)
        .order("created_at", { ascending: false });
      
      if (reviewData) {
        const enriched = await Promise.all(
          reviewData.map(async (review) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", review.student_id)
              .single();
            const { data: tutorProfile } = await supabase
              .from("tutor_profiles")
              .select("id")
              .eq("id", review.tutor_id)
              .single();
            return { ...review, profiles: profile, tutor_profiles: tutorProfile };
          })
        );
        setPendingReviews(enriched);
      }
    } else {
      setPendingReviews(data || []);
    }
  };

  const handleApplicationReview = async (
    applicationId: string, 
    action: "schedule_interview" | "reject", 
    notes?: string,
    interviewDate?: string,
    meetLink?: string
  ) => {
    const application = pendingApplications.find(app => app.id === applicationId);
    if (!application) return;

    if (action === "schedule_interview") {
      try {
        if (!meetLink?.trim()) {
          toast.error("Please enter a Google Meet link");
          return;
        }

        // Update application status
        const { error: updateError } = await supabase
          .from("tutor_applications")
          .update({ 
            status: 'interview_scheduled',
            interview_scheduled_at: interviewDate,
            interview_meet_link: meetLink,
            admin_notes: notes || null,
            updated_at: new Date().toISOString()
          })
          .eq("id", applicationId);

        if (updateError) throw updateError;

        // Send interview invitation email
        await supabase.functions.invoke('send-interview-invitation', {
          body: { 
            email: application.email,
            fullName: application.full_name,
            meetLink: meetLink,
            interviewDate: interviewDate
          }
        });

        toast.success("Interview scheduled! Invitation email sent.");
        fetchPendingApplications();
      } catch (error: any) {
        console.error("Error scheduling interview:", error);
        toast.error("Failed to schedule interview: " + error.message);
      }
    } else if (action === "reject") {
      const { error } = await supabase
        .from("tutor_applications")
        .update({ 
          status: 'rejected',
          admin_notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", applicationId);

      if (error) {
        toast.error("Failed to reject application");
        return;
      }

      toast.success("Application rejected");
      fetchPendingApplications();
      fetchInterviewRecords();
    }
  };

  const handleInterviewResult = async (
    applicationId: string,
    passed: boolean,
    notes?: string
  ) => {
    // Try finding in both arrays
    const application = pendingApplications.find(app => app.id === applicationId) || 
                       interviewRecords.find(app => app.id === applicationId);
    
    if (!application) {
      console.error("Application not found with ID:", applicationId);
      toast.error("Application not found");
      return;
    }

    try {
      if (passed) {
        console.log("Marking interview as passed for:", application.email);
        
        // Call edge function to create account and send approval email
        const { data, error } = await supabase.functions.invoke('approve-tutor-interview', {
          body: { 
            applicationId: applicationId,
            notes: notes
          }
        });

        if (error) {
          console.error("Approval error:", error);
          throw new Error(error.message || "Failed to approve application");
        }

        console.log("Approval successful:", data);
        toast.success("Account created! Profile setup invitation sent with temporary password.");
      } else {
        // Mark as interview failed
        const { error: updateError } = await supabase
          .from("tutor_applications")
          .update({ 
            status: 'interview_failed',
            interview_notes: notes || null,
            updated_at: new Date().toISOString()
          })
          .eq("id", applicationId);

        if (updateError) throw updateError;

        toast.success("Interview marked as failed");
      }

      fetchInterviewRecords();
      fetchPendingApplications();
    } catch (error: any) {
      console.error("Error updating interview result:", error);
      toast.error("Failed to update interview result: " + (error.message || "Unknown error"));
    }
  };

  const handleTutorApproval = async (tutorId: string, approved: boolean) => {
    setProcessingTutorId(tutorId);
    try {
      const tutor = pendingTutors.find(t => t.id === tutorId);
      
      const { error } = await supabase
        .from("tutor_profiles")
        .update({ verified: approved })
        .eq("id", tutorId);

      if (error) {
        toast.error("Failed to update tutor status");
        return;
      }

      // Send approval or rejection email
      if (tutor) {
        try {
          if (approved) {
            // Send profile live notification email
            await supabase.functions.invoke("send-profile-live-email", {
              body: {
                email: tutor.email,
                fullName: tutor.profiles?.full_name || "Tutor"
              }
            });
            console.log("Profile live email sent to:", tutor.email);
          } else {
            // Send rejection email
            await supabase.functions.invoke("send-tutor-rejection-email", {
              body: {
                tutorName: tutor.profiles?.full_name || "Tutor",
                email: tutor.email,
                rejectionReason: "After careful review, we are unable to proceed with your application at this time."
              }
            });
            console.log("Rejection email sent");
          }
        } catch (emailError) {
          console.error("Failed to send email:", emailError);
          // Don't fail the whole operation if email fails
        }
      }

      toast.success(approved ? "Tutor approved!" : "Tutor rejected");
      await fetchPendingTutors();
    } finally {
      setProcessingTutorId(null);
    }
  };

  const handleReviewModeration = async (reviewId: string, approved: boolean, notes?: string) => {
    const { error } = await supabase
      .from("tutor_reviews")
      .update({
        is_moderated: true,
        is_approved: approved,
        moderation_notes: notes || null,
      })
      .eq("id", reviewId);

    if (error) {
      toast.error("Failed to moderate review");
      return;
    }

    toast.success(approved ? "Review approved!" : "Review rejected");
    fetchPendingReviews();
  };

  const fetchConsultationBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("consultation_bookings")
        .select("*")
        .order("consultation_date", { ascending: true })
        .order("consultation_time", { ascending: true });

      if (error) throw error;
      setConsultationBookings(data || []);
    } catch (error: any) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to load consultation bookings");
    }
  };

  const fetchTutoringBookings = async () => {
    try {
      const { data: bookingsData, error } = await supabase
        .from("bookings")
        .select(`
          *,
          tutor_availability(start_time, end_time)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch student and tutor profiles separately
      const bookingsWithProfiles = await Promise.all(
        (bookingsData || []).map(async (booking) => {
          const [studentRes, tutorRes] = await Promise.all([
            supabase.from("profiles").select("full_name, phone_number").eq("id", booking.student_id).single(),
            supabase.from("tutor_profiles").select("id, user_id").eq("user_id", booking.tutor_id).single()
          ]);

          let tutorProfile = null;
          if (tutorRes.data) {
            const tutorUserProfile = await supabase.from("profiles").select("full_name").eq("id", tutorRes.data.user_id).single();
            tutorProfile = {
              id: tutorRes.data.id,
              profiles: tutorUserProfile.data
            };
          }

          return {
            ...booking,
            profiles: studentRes.data,
            tutor_profiles: tutorProfile
          };
        })
      );

      setTutoringBookings(bookingsWithProfiles || []);
    } catch (error: any) {
      console.error("Error fetching tutoring bookings:", error);
      toast.error("Failed to load tutoring bookings");
    }
  };

  const handleEditNote = (bookingId: string, currentNote: string) => {
    setEditingNote(bookingId);
    setNoteContent(currentNote || "");
  };

  const handleSaveNote = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from("consultation_bookings")
        .update({ additional_notes: noteContent })
        .eq("id", bookingId);

      if (error) throw error;

      toast.success("Note saved successfully");
      setEditingNote(null);
      fetchConsultationBookings();
    } catch (error: any) {
      toast.error("Failed to save note: " + error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setNoteContent("");
  };

  const handleWhatsAppMessage = (booking: any) => {
    const cleanPhone = booking.phone_number.replace(/[\s\-\(\)]/g, '');
    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };
    
    const message = `Hi ${booking.parent_name}! 👋

This is a reminder about your free consultation for ${booking.student_name}.

📅 Date: ${formatDate(booking.consultation_date)}
⏰ Time: ${booking.consultation_time}
📚 Grade: ${booking.grade_level}
📖 Subjects: ${booking.subjects_interest.join(', ')}

We're looking forward to discussing ${booking.student_name}'s learning needs with you!

If you have any questions before the consultation, feel free to reply to this message.

Best regards,
The Lana Team`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  };

  const openMessageDialog = (booking: any, type: 'email' | 'whatsapp') => {
    setSelectedBooking(booking);
    setMessageType(type);
    setSelectedTemplate('');
    setCustomMessage('');
    setMessageDialog(true);
  };

  const handleTemplateSelect = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    const templates = messageType === 'email' ? messageTemplates.email : messageTemplates.whatsapp;
    const template = templates[templateKey as keyof typeof templates];
    if (template && selectedBooking) {
      setCustomMessage(template.body(selectedBooking));
    }
  };

  const [sendingEmail, setSendingEmail] = useState(false);

  const handleSendMessage = async () => {
    if (!selectedBooking || !customMessage) {
      toast.error("Please select a template or write a message");
      return;
    }

    if (messageType === 'whatsapp') {
      const phoneNumber = selectedBooking.phone_number.replace(/\D/g, '');
      window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(customMessage)}`, '_blank');
      toast.success("WhatsApp opened with message");
    } else {
      // Send email via edge function
      if (!selectedBooking.email) {
        toast.error("No email address available for this contact");
        return;
      }

      setSendingEmail(true);
      try {
        const { data, error } = await supabase.functions.invoke("send-admin-email", {
          body: {
            to: selectedBooking.email,
            recipientName: selectedBooking.parent_name,
            subject: `Lana Tutors - ${selectedTemplate === 'confirmation' ? 'Consultation Confirmed' : 
                     selectedTemplate === 'reminder_24h' ? '24-Hour Reminder' :
                     selectedTemplate === 'reminder_1h' ? '1-Hour Reminder' :
                     selectedTemplate === 'post_consultation' ? 'Post-Consultation Summary' :
                     selectedTemplate === 'follow_up_3days' ? 'Follow-up' : 'Message'}`,
            message: customMessage,
          },
        });

        if (error) throw error;
        toast.success("Email sent successfully!");
      } catch (error: any) {
        console.error("Failed to send email:", error);
        toast.error("Failed to send email: " + error.message);
      } finally {
        setSendingEmail(false);
      }
    }

    setMessageDialog(false);
  };

  const handleJoinCall = (booking: any) => {
    if (booking.meeting_link) {
      window.open(booking.meeting_link, '_blank');
    } else {
      toast.error("Meeting link not available. Please create one manually or check the consultation settings.");
    }
  };

  const openFollowUpDialog = (booking: any) => {
    setSelectedBooking(booking);
    setFollowUpData({
      consultationOutcome: booking.consultation_outcome || "",
      recommendedSubjects: booking.recommended_subjects || [],
      recommendedTutors: booking.recommended_tutors || [],
      nextSteps: "",
      nextAction: booking.next_action || "",
      nextActionDate: booking.next_action_date || "",
    });
    setFollowUpDialog(true);
  };

  const handleSendFollowUp = async () => {
    if (!selectedBooking) return;
    
    try {
      // Send follow-up email
      const { error: emailError } = await supabase.functions.invoke("send-consultation-followup", {
        body: {
          email: selectedBooking.email,
          parentName: selectedBooking.parent_name,
          studentName: selectedBooking.student_name,
          consultationOutcome: followUpData.consultationOutcome,
          recommendedSubjects: followUpData.recommendedSubjects,
          recommendedTutors: followUpData.recommendedTutors,
          nextSteps: followUpData.nextSteps,
        },
      });

      if (emailError) throw emailError;

      // Update booking with follow-up details
      const { error: updateError } = await supabase
        .from("consultation_bookings")
        .update({
          consultation_outcome: followUpData.consultationOutcome,
          recommended_subjects: followUpData.recommendedSubjects,
          recommended_tutors: followUpData.recommendedTutors,
          follow_up_status: 'follow_up_sent',
          follow_up_sent_at: new Date().toISOString(),
          next_action: followUpData.nextAction,
          next_action_date: followUpData.nextActionDate || null,
        })
        .eq("id", selectedBooking.id);

      if (updateError) throw updateError;

      toast.success("Follow-up email sent successfully!");
      setFollowUpDialog(false);
      fetchConsultationBookings();
    } catch (error: any) {
      console.error("Error sending follow-up:", error);
      toast.error("Failed to send follow-up: " + error.message);
    }
  };

  const handleMarkAsConverted = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from("consultation_bookings")
        .update({
          converted_to_customer: true,
          converted_at: new Date().toISOString(),
          follow_up_status: 'converted',
        })
        .eq("id", bookingId);

      if (error) throw error;

      toast.success("Marked as converted! 🎉");
      fetchConsultationBookings();
    } catch (error: any) {
      toast.error("Failed to update status: " + error.message);
    }
  };

  const handleUpdateFollowUpStatus = async (bookingId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("consultation_bookings")
        .update({ follow_up_status: status })
        .eq("id", bookingId);

      if (error) throw error;

      toast.success("Status updated successfully!");
      fetchConsultationBookings();
    } catch (error: any) {
      toast.error("Failed to update status: " + error.message);
    }
  };

  // Calculate conversion metrics
  const conversionStats = {
    total: consultationBookings.length,
    pending: consultationBookings.filter(b => b.follow_up_status === 'pending').length,
    followUpSent: consultationBookings.filter(b => b.follow_up_status === 'follow_up_sent').length,
    converted: consultationBookings.filter(b => b.converted_to_customer).length,
    conversionRate: consultationBookings.length > 0 
      ? ((consultationBookings.filter(b => b.converted_to_customer).length / consultationBookings.length) * 100).toFixed(1)
      : '0.0',
  };

  if (loading) {
    return <div className="min-h-screen bg-[image:var(--gradient-page)] flex items-center justify-center">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="border-b pb-8 mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Dashboard</h1>
          <p className="text-muted-foreground text-lg">Overview of your tutoring platform</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="border-b -mx-6 px-6">
            <TabsList className="h-auto p-0 bg-transparent w-full justify-start gap-6 flex-wrap border-0">
              <TabsTrigger 
                value="dashboard"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none bg-transparent px-4 py-3 border-b-2 border-transparent"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="applications" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none bg-transparent px-4 py-3 border-b-2 border-transparent"
              >
                <span className="flex items-center gap-2">
                  Applications
                  {pendingApplications.length > 0 && (
                    <Badge variant="destructive" className="rounded-full h-5 min-w-5 px-1.5">
                      {pendingApplications.length}
                    </Badge>
                  )}
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="interviews"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none bg-transparent px-4 py-3 border-b-2 border-transparent"
              >
                <span className="flex items-center gap-2">
                  Interviews
                  {interviewRecords.length > 0 && (
                    <Badge className="rounded-full h-5 min-w-5 px-1.5">
                      {interviewRecords.length}
                    </Badge>
                  )}
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="profiles"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none bg-transparent px-4 py-3 border-b-2 border-transparent"
              >
                <span className="flex items-center gap-2">
                  Profiles
                  {pendingTutors.length > 0 && (
                    <Badge variant="secondary" className="rounded-full h-5 min-w-5 px-1.5">
                      {pendingTutors.length}
                    </Badge>
                  )}
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="reviews"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none bg-transparent px-4 py-3 border-b-2 border-transparent"
              >
                Reviews
              </TabsTrigger>
              <TabsTrigger 
                value="blog"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none bg-transparent px-4 py-3 border-b-2 border-transparent"
              >
                Blog
              </TabsTrigger>
              <TabsTrigger 
                value="consultations"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none bg-transparent px-4 py-3 border-b-2 border-transparent"
              >
                <span className="flex items-center gap-2">
                  Consultations
                  {consultationBookings.length > 0 && (
                    <Badge className="rounded-full h-5 min-w-5 px-1.5 bg-teal-600">
                      {consultationBookings.length}
                    </Badge>
                  )}
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="bookings"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none bg-transparent px-4 py-3 border-b-2 border-transparent"
              >
                <span className="flex items-center gap-2">
                  <BookMarked className="h-4 w-4" />
                  Tutoring Bookings
                  {tutoringBookings.length > 0 && (
                    <Badge className="rounded-full h-5 min-w-5 px-1.5 bg-indigo-600">
                      {tutoringBookings.length}
                    </Badge>
                  )}
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="tutor-signups"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none bg-transparent px-4 py-3 border-b-2 border-transparent"
              >
                <span className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Tutor Signups
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="december-bootcamp"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none bg-transparent px-4 py-3 border-b-2 border-transparent"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  December Bootcamp
                  {unassignedIntensiveClasses > 0 && (
                    <Badge className="rounded-full h-5 min-w-5 px-1.5 bg-orange-600">
                      {unassignedIntensiveClasses}
                    </Badge>
                  )}
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="edit-tutors"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none bg-transparent px-4 py-3 border-b-2 border-transparent"
              >
                <span className="flex items-center gap-2">
                  <UserCog className="h-4 w-4" />
                  Edit Tutors
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="students"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none bg-transparent px-4 py-3 border-b-2 border-transparent"
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Students
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="bootcamp-enrollments"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none bg-transparent px-4 py-3 border-b-2 border-transparent"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Bootcamp Students
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Business Pulse</h2>
                <p className="text-muted-foreground mt-1">Real-time insights and platform metrics</p>
              </div>
              <Select value={timeRange} onValueChange={(value: any) => {
                setTimeRange(value);
                setTimeout(() => fetchDashboardMetrics(), 100);
              }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dashboardMetrics ? (
              <div className="space-y-8">
                {/* Key Metrics Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('students')}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold tracking-tight">{dashboardMetrics.totalStudents || 0}</div>
                      <div className="flex items-center gap-1 mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                        <ArrowUpRight className="h-4 w-4" />
                        <span className="font-medium">{dashboardMetrics.newStudents} new</span>
                        <span className="text-muted-foreground ml-1">this period</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('tutors')}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Tutors</CardTitle>
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <GraduationCap className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold tracking-tight">{dashboardMetrics.totalTutors || 0}</div>
                      <div className="flex items-center gap-1 mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                        <ArrowUpRight className="h-4 w-4" />
                        <span className="font-medium">{dashboardMetrics.newTutors} new</span>
                        <span className="text-muted-foreground ml-1">this period</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('bookings')}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold tracking-tight">KES {dashboardMetrics.totalRevenue?.toLocaleString() || 0}</div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        <span className="font-medium">{dashboardMetrics.totalBookings || 0}</span> bookings completed
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold tracking-tight">{dashboardMetrics.conversionRate?.toFixed(1) || 0}%</div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        <span className="font-medium">{dashboardMetrics.convertedConsultations}/{dashboardMetrics.totalConsultations}</span> converted
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Pipeline Metrics */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5" />
                        Consultations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{dashboardMetrics.newConsultations}</div>
                      <p className="text-xs text-muted-foreground mt-2">Booked in period</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <BookMarked className="h-5 w-5" />
                        Sessions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{dashboardMetrics.newBookings}</div>
                      <p className="text-xs text-muted-foreground mt-2">Completed in period</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Daily Average
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {(timeRange === '7days' ? (dashboardMetrics.newBookings / 7) :
                         timeRange === '30days' ? (dashboardMetrics.newBookings / 30) :
                         (dashboardMetrics.newBookings / 90)).toFixed(1)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Sessions per day</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={dashboardMetrics.revenueTrend || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Conversion Funnel</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={[
                          { name: 'Consultations', value: dashboardMetrics.newConsultations },
                          { name: 'Converted', value: dashboardMetrics.convertedConsultations },
                          { name: 'Sessions', value: dashboardMetrics.newBookings }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="hsl(var(--primary))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Student Growth</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={dashboardMetrics.studentsTrend || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Tutor Onboarding</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={dashboardMetrics.tutorsTrend || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading dashboard metrics...</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="applications" className="space-y-4">
            <div className="bg-muted/50 border rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-2">Step 1: Initial Vetting</h3>
              <p className="text-sm text-muted-foreground">
                Review credentials and decide whether to invite for an expert conversation or reject.
              </p>
            </div>
            {pendingApplications.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No pending initial applications
                </CardContent>
              </Card>
            ) : (
              pendingApplications.map((application) => (
                <ApplicationReviewCard
                  key={application.id}
                  application={application}
                  onReview={handleApplicationReview}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="interviews" className="space-y-4">
            <div className="bg-muted/50 border rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-2">Step 2: Expert Conversations</h3>
              <p className="text-sm text-muted-foreground">
                View all interviews - scheduled, passed, and failed.
              </p>
            </div>
            
            {/* Filter buttons */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={interviewFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setInterviewFilter('all')}
              >
                All ({interviewRecords.length})
              </Button>
              <Button
                variant={interviewFilter === 'scheduled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setInterviewFilter('scheduled')}
              >
                Scheduled ({interviewRecords.filter(a => a.status === 'interview_scheduled').length})
              </Button>
              <Button
                variant={interviewFilter === 'passed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setInterviewFilter('passed')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Passed ({interviewRecords.filter(a => a.status === 'passed').length})
              </Button>
              <Button
                variant={interviewFilter === 'failed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setInterviewFilter('failed')}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Failed ({interviewRecords.filter(a => a.status === 'failed').length})
              </Button>
            </div>

            {interviewRecords.filter(a => 
              interviewFilter === 'all' || a.status === (interviewFilter === 'scheduled' ? 'interview_scheduled' : interviewFilter)
            ).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No {interviewFilter === 'all' ? '' : interviewFilter} interviews
                </CardContent>
              </Card>
            ) : (
              interviewRecords
                .filter(a => interviewFilter === 'all' || a.status === (interviewFilter === 'scheduled' ? 'interview_scheduled' : interviewFilter))
                .map((application) => (
                  <InterviewCard
                    key={application.id}
                    application={application}
                    onResult={handleInterviewResult}
                  />
                ))
            )}
          </TabsContent>

          <TabsContent value="profiles" className="space-y-4">
            <div className="bg-muted/50 border rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-2">Step 3: Profile Verification</h3>
              <p className="text-sm text-muted-foreground">
                Review completed tutor profiles and approve or reject for final activation.
              </p>
            </div>
            {pendingTutors.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No pending tutor applications
                </CardContent>
              </Card>
            ) : (
              pendingTutors.map((tutor) => (
                <Card key={tutor.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16">
                          <AvatarFallback>
                            {tutor.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('') || "T"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle>{tutor.profiles?.full_name || "Unknown"}</CardTitle>
                          <p className="text-sm text-muted-foreground">{tutor.profiles?.phone_number}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleTutorApproval(tutor.id, true)}
                          className="bg-green-600 hover:bg-green-700"
                          disabled={processingTutorId === tutor.id}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {processingTutorId === tutor.id ? "Processing..." : "Approve"}
                        </Button>
                        <Button
                          onClick={() => handleTutorApproval(tutor.id, false)}
                          variant="destructive"
                          disabled={processingTutorId === tutor.id}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          {processingTutorId === tutor.id ? "Processing..." : "Reject"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Contact Information */}
                    <div>
                      <h4 className="font-semibold mb-3 text-base">Contact Information</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Email</p>
                          <p className="text-sm">{tutor.email || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Phone</p>
                          <p className="text-sm">{tutor.profiles?.phone_number || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Gender</p>
                          <p className="text-sm capitalize">{tutor.gender || "Not specified"}</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Teaching Details */}
                    <div>
                      <h4 className="font-semibold mb-3 text-base">Teaching Information</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Subjects</p>
                          <p className="text-sm">{tutor.subjects?.join(", ") || "None"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Curriculum</p>
                          <p className="text-sm">{tutor.curriculum?.join(", ") || "None"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Teaching Levels</p>
                          <p className="text-sm">{tutor.teaching_levels?.join(", ") || "None"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Teaching Mode</p>
                          <p className="text-sm capitalize">{tutor.teaching_mode?.join(", ") || "None"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Teaching Locations</p>
                          <p className="text-sm">{tutor.teaching_location || "Not specified"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Current Institution</p>
                          <p className="text-sm">{tutor.current_institution || "Not specified"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Experience</p>
                          <p className="text-sm">{tutor.experience_years} years</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Hourly Rate</p>
                          <p className="text-sm">KES {tutor.hourly_rate?.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Qualifications */}
                    <div>
                      <h4 className="font-semibold mb-3 text-base">Qualifications</h4>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        {tutor.qualifications?.map((qual: string, idx: number) => (
                          <li key={idx}>{qual}</li>
                        )) || <li className="text-muted-foreground">None provided</li>}
                      </ul>
                    </div>

                    {/* Education History */}
                    {tutor.graduation_year && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold mb-3 text-base">Education</h4>
                          <p className="text-sm">Graduation Year: {tutor.graduation_year}</p>
                        </div>
                      </>
                    )}

                    {/* Teaching Experience */}
                    {tutor.teaching_experience && Array.isArray(tutor.teaching_experience) && tutor.teaching_experience.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold mb-3 text-base">Teaching Experience</h4>
                          <div className="space-y-3">
                            {tutor.teaching_experience.map((exp: any, idx: number) => (
                              <div key={idx} className="bg-muted/30 rounded-lg p-3">
                                <p className="text-sm font-medium">{exp.institution}</p>
                                <p className="text-sm text-muted-foreground">{exp.role} • {exp.years} years</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    {/* Bio */}
                    <div>
                      <h4 className="font-semibold mb-3 text-base">Bio</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tutor.bio || "No bio provided"}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            {pendingReviews.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No pending reviews
                </CardContent>
              </Card>
            ) : (
              pendingReviews.map((review) => (
                <ReviewModerationCard
                  key={review.id}
                  review={review}
                  onModerate={handleReviewModeration}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="blog" className="space-y-4">
            <BlogManagement />
          </TabsContent>


          <TabsContent value="edit-tutors" className="space-y-4">
            <AdminTutorProfileEdit />
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-4">
            <StudentList />
          </TabsContent>

          {/* Bootcamp Enrollments Tab */}
          <TabsContent value="bootcamp-enrollments" className="space-y-4">
            <div className="flex justify-end mb-4">
              <EmailComposer />
            </div>
            <BootcampEnrollments />
          </TabsContent>

          <TabsContent value="consultations" className="space-y-4">
            {/* Conversion Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Consultations</p>
                      <p className="text-3xl font-bold">{conversionStats.total}</p>
                    </div>
                    <Users className="h-10 w-10 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Follow-ups Sent</p>
                      <p className="text-3xl font-bold">{conversionStats.followUpSent}</p>
                    </div>
                    <Send className="h-10 w-10 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Converted</p>
                      <p className="text-3xl font-bold text-green-600">{conversionStats.converted}</p>
                    </div>
                    <DollarSign className="h-10 w-10 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Conversion Rate</p>
                      <p className="text-3xl font-bold text-accent">{conversionStats.conversionRate}%</p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-accent" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-muted/50 border rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-2">Consultation Conversion Journey</h3>
              <p className="text-sm text-muted-foreground">
                Track consultations, send follow-up emails with booking links, and convert parents into paying customers.
              </p>
            </div>
            {consultationBookings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No consultation bookings yet.
                </CardContent>
              </Card>
            ) : (
              consultationBookings.map((booking) => {
                // Calculate if consultation is past, today, or upcoming
                const consultationDate = new Date(booking.consultation_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                consultationDate.setHours(0, 0, 0, 0);
                
                const isPast = consultationDate < today;
                const isToday = consultationDate.getTime() === today.getTime();
                const isUpcoming = consultationDate > today;
                
                // Determine card border color based on timing
                let borderClass = "";
                if (isPast) borderClass = "border-l-4 border-l-muted-foreground/30";
                else if (isToday) borderClass = "border-l-4 border-l-green-500";
                else if (isUpcoming) borderClass = "border-l-4 border-l-blue-500";
                
                return (
                  <Card key={booking.id} className={`hover:shadow-lg transition-shadow ${borderClass}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-2xl flex items-center gap-2">
                            <User className="h-5 w-5" />
                            {booking.student_name}
                            {isToday && <Badge className="bg-green-500 ml-2">Today</Badge>}
                            {isPast && <Badge variant="outline" className="ml-2 opacity-60">Past</Badge>}
                          </CardTitle>
                          <p className="text-muted-foreground mt-1">
                            Parent: {booking.parent_name}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <Badge className={
                            booking.status === 'confirmed' ? 'bg-green-500' :
                            booking.status === 'pending' ? 'bg-yellow-500' :
                            booking.status === 'cancelled' ? 'bg-red-500' :
                            booking.status === 'completed' ? 'bg-blue-500' : 'bg-gray-500'
                          }>
                            {booking.status}
                          </Badge>
                        <Badge variant={
                          booking.follow_up_status === 'converted' ? 'default' :
                          booking.follow_up_status === 'follow_up_sent' ? 'secondary' :
                          booking.follow_up_status === 'needs_callback' ? 'destructive' : 'outline'
                        } className={
                          booking.follow_up_status === 'converted' ? 'bg-green-600' :
                          booking.follow_up_status === 'follow_up_sent' ? 'bg-blue-600' :
                          booking.follow_up_status === 'needs_callback' ? 'bg-orange-600' : ''
                        }>
                          {booking.follow_up_status === 'pending' ? '⏳ Pending' :
                           booking.follow_up_status === 'follow_up_sent' ? '📧 Follow-up Sent' :
                           booking.follow_up_status === 'needs_callback' ? '📞 Needs Callback' :
                           booking.follow_up_status === 'converted' ? '✅ Converted' :
                           booking.follow_up_status === 'not_interested' ? '❌ Not Interested' : booking.follow_up_status}
                        </Badge>
                        {booking.converted_to_customer && (
                          <Badge className="bg-green-600">
                            💰 Customer
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Contact & Consultation Details */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pb-4 border-b">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground">Date</div>
                          <div className="font-medium truncate">{formatConsultationDate(booking.consultation_date)}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground">Time</div>
                          <div className="font-medium">{booking.consultation_time}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground">Email</div>
                          <a href={`mailto:${booking.email}`} className="text-primary hover:underline truncate block font-medium">
                            {booking.email}
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground">Phone</div>
                          <a href={`tel:${booking.phone_number}`} className="text-primary hover:underline font-medium">
                            {booking.phone_number}
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Academic Details */}
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-sm mb-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Grade</span>
                        </div>
                        <Badge variant="outline">{booking.grade_level}</Badge>
                      </div>

                      <div className="sm:col-span-2">
                        <div className="flex items-center gap-2 text-sm mb-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Subjects</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {booking.subjects_interest.map((subject: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-sm mb-2">
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Mode</span>
                      </div>
                      <Badge variant="secondary">{booking.preferred_mode}</Badge>
                    </div>

                    <div className="pt-4 border-t space-y-4">
                      {/* Meeting Link Section */}
                      {booking.meeting_link ? (
                        <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-md border border-green-200 dark:border-green-800 space-y-3">
                          <div className="flex items-center gap-2">
                            <Video className="h-4 w-4 text-green-600" />
                            <p className="text-sm font-medium text-green-900 dark:text-green-100">Meeting Link Available</p>
                          </div>
                          <div className="flex gap-2">
                            <Input 
                              value={booking.meeting_link} 
                              readOnly 
                              className="font-mono text-xs bg-white dark:bg-green-950/40"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(booking.meeting_link);
                                toast.success("Link copied to clipboard!");
                              }}
                              className="shrink-0"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                          <Button
                            onClick={() => handleJoinCall(booking)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                          >
                            <Video className="h-4 w-4 mr-2" />
                            Join Consultation Call
                          </Button>
                        </div>
                      ) : (
                        <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md border border-amber-200 dark:border-amber-800 overflow-hidden">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">No Meeting Link Set</p>
                          </div>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
                            Create a Google Meet link automatically from the connected calendar.
                          </p>
                          <div className="flex gap-2">
                            <Button
                              onClick={async () => {
                                try {
                                  toast.loading("Generating meeting link...");

                                  const { data: calendarData, error: calendarError } = await supabase.functions.invoke("create-consultation-calendar-event", {
                                    body: {
                                      parentName: booking.parent_name,
                                      studentName: booking.student_name,
                                      email: booking.email,
                                      phoneNumber: booking.phone_number,
                                      consultationDate: booking.consultation_date,
                                      consultationTime: booking.consultation_time,
                                      subjects: booking.subjects_interest,
                                      gradeLevel: booking.grade_level,
                                      notes: booking.additional_notes,
                                    },
                                  });

                                  if (calendarError) throw calendarError;

                                  // Save meeting link
                                  await supabase
                                    .from('consultation_bookings')
                                    .update({ meeting_link: calendarData.meetingLink })
                                    .eq('id', booking.id);

                                  // Auto-send email confirmation with link
                                  if (booking.email) {
                                    await supabase.functions.invoke('send-consultation-booking-confirmation', {
                                      body: {
                                        email: booking.email,
                                        parentName: booking.parent_name,
                                        studentName: booking.student_name,
                                        consultationDate: booking.consultation_date,
                                        consultationTime: booking.consultation_time,
                                        meetingLink: calendarData.meetingLink,
                                      },
                                    });
                                  }

                                  // Auto-send WhatsApp confirmation with link
                                  await supabase.functions.invoke('send-consultation-whatsapp', {
                                    body: {
                                      phoneNumber: booking.phone_number,
                                      parentName: booking.parent_name,
                                      studentName: booking.student_name,
                                      consultationDate: booking.consultation_date,
                                      consultationTime: booking.consultation_time,
                                      meetingLink: calendarData.meetingLink,
                                    },
                                  });

                                  toast.success("Meeting link generated and confirmations sent!");
                                  fetchConsultationBookings();
                                } catch (err: any) {
                                  console.error('Error generating meeting link:', err);
                                  toast.error(err.message || "Failed to generate meeting link");
                                }
                              }}
                              className="flex-1"
                            >
                              <Video className="h-4 w-4 mr-2" />
                              Generate & Send Link
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                const meetLink = prompt("Or enter manually:");
                                if (meetLink) {
                                  supabase
                                    .from('consultation_bookings')
                                    .update({ meeting_link: meetLink })
                                    .eq('id', booking.id)
                                    .then(() => {
                                      toast.success("Meeting link added!");
                                      fetchConsultationBookings();
                                    });
                                }
                              }}
                            >
                              Manual
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Conversion Tracking Actions */}
                      {booking.consultation_outcome && (
                        <div className="bg-muted p-3 rounded-md">
                          <p className="text-sm font-medium mb-1">Consultation Outcome:</p>
                          <p className="text-sm text-muted-foreground">{booking.consultation_outcome}</p>
                          {booking.follow_up_sent_at && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Follow-up sent: {formatFullDateTime(booking.follow_up_sent_at)}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Button
                          onClick={() => openMessageDialog(booking, 'email')}
                          variant="default"
                          className="w-full"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Send Email
                        </Button>

                        <Button
                          onClick={() => openMessageDialog(booking, 'whatsapp')}
                          variant="outline"
                          className="w-full"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Send WhatsApp
                        </Button>
                      </div>

                      {!booking.converted_to_customer && (
                        <div className="flex gap-2">
                          <Select
                            value={booking.follow_up_status}
                            onValueChange={(value) => handleUpdateFollowUpStatus(booking.id, value)}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Update status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">⏳ Pending</SelectItem>
                              <SelectItem value="follow_up_sent">📧 Follow-up Sent</SelectItem>
                              <SelectItem value="needs_callback">📞 Needs Callback</SelectItem>
                              <SelectItem value="not_interested">❌ Not Interested</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            onClick={() => handleMarkAsConverted(booking.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark as Converted
                          </Button>
                        </div>
                      )}

                      {booking.next_action && (
                        <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md border border-amber-200 dark:border-amber-800">
                          <p className="text-sm font-medium mb-1">Next Action:</p>
                          <p className="text-sm text-muted-foreground">{booking.next_action}</p>
                          {booking.next_action_date && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Due: {formatConsultationDate(booking.next_action_date)}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-sm flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Admin Notes
                        </span>
                        {editingNote !== booking.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditNote(booking.id, booking.additional_notes || "")}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                      
                      {editingNote === booking.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            placeholder="Add notes about this consultation..."
                            className="min-h-[100px]"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveNote(booking.id)}>
                              <Save className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                          {booking.additional_notes || "No notes added yet."}
                        </p>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      Booked on: {formatFullDateTime(booking.created_at)}
                    </div>
                  </CardContent>
                </Card>
              );
            })
            )}
      </TabsContent>

      {/* Tutoring Bookings Tab */}
      <TabsContent value="bookings" className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold">Tutoring Session Bookings</h2>
            <p className="text-muted-foreground">All tutoring sessions booked through the platform</p>
          </div>
        </div>

        {tutoringBookings.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookMarked className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No tutoring bookings yet</p>
            </CardContent>
          </Card>
        ) : (
          tutoringBookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{booking.subject}</h3>
                      <div className="flex gap-2 mt-2">
                        <Badge variant={
                          booking.status === 'confirmed' ? 'default' :
                          booking.status === 'pending' ? 'secondary' :
                          booking.status === 'cancelled' ? 'destructive' :
                          'outline'
                        }>
                          {booking.status}
                        </Badge>
                        <Badge variant="outline">{booking.class_type}</Badge>
                        <Badge className="bg-green-600">
                          KES {Number(booking.amount).toFixed(0)}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Booked: {formatFullDateTime(booking.created_at)}</p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Student</p>
                      <p className="font-medium">{booking.profiles?.full_name || 'Unknown'}</p>
                      {booking.profiles?.phone_number && (
                        <p className="text-sm text-muted-foreground">{booking.profiles.phone_number}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Tutor</p>
                      <p className="font-medium">
                        {booking.tutor_profiles?.profiles?.full_name || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Session Time</p>
                      <p className="font-medium">
                        {booking.tutor_availability ? 
                          formatFullDateTime(booking.tutor_availability.start_time) : 
                          'Time not set'}
                      </p>
                      {booking.tutor_availability && (
                        <p className="text-sm text-muted-foreground">
                          Duration: {Math.round((new Date(booking.tutor_availability.end_time).getTime() - new Date(booking.tutor_availability.start_time).getTime()) / 60000)} mins
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Payment Details</p>
                      <p className="text-sm">
                        <span className="text-green-600">✓ Deposit: KES {Number(booking.deposit_paid).toFixed(0)}</span>
                      </p>
                      {booking.balance_due > 0 && (
                        <p className="text-sm text-orange-600">
                          Balance Due: KES {Number(booking.balance_due).toFixed(0)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Meeting Link */}
                  {booking.meeting_link && (
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <p className="text-sm font-medium mb-1">Meeting Link</p>
                      <a 
                        href={booking.meeting_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline break-all"
                      >
                        {booking.meeting_link}
                      </a>
                    </div>
                  )}

                  {/* Notes */}
                  {booking.notes && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium mb-1">Session Notes</p>
                      <p className="text-sm text-muted-foreground">{booking.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      {/* Tutor Signups Tab */}
                <TabsContent value="tutor-signups">
                  <TutorSignupList />
                </TabsContent>


                <TabsContent value="december-bootcamp">
                  <AdminIntensivePrograms />
                </TabsContent>
    </Tabs>

    {/* Message Template Dialog */}
    <Dialog open={messageDialog} onOpenChange={setMessageDialog}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {messageType === 'email' ? '📧 Send Email' : '💬 Send WhatsApp Message'}
          </DialogTitle>
          <DialogDescription>
            Select a template or write a custom message for {selectedBooking?.parent_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Select Message Template</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmation">
                  ✅ Consultation Confirmed
                </SelectItem>
                <SelectItem value="reminder_24h">
                  📅 24-Hour Reminder
                </SelectItem>
                <SelectItem value="reminder_1h">
                  ⏰ 1-Hour Reminder
                </SelectItem>
                <SelectItem value="post_consultation">
                  📝 Post-Consultation Summary
                </SelectItem>
                <SelectItem value="follow_up_3days">
                  🔔 3-Day Follow-up
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Message Content</Label>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder={messageType === 'email' ? 
                "Type your email message here or select a template above..." :
                "Type your WhatsApp message here or select a template above..."}
              className="min-h-[300px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {customMessage.length} characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setMessageDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleSendMessage} disabled={!customMessage || sendingEmail}>
            <Send className="h-4 w-4 mr-2" />
            {messageType === 'email' ? (sendingEmail ? 'Sending...' : 'Send Email') : 'Open WhatsApp'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Follow-up Dialog */}
    <Dialog open={followUpDialog} onOpenChange={setFollowUpDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Send Follow-up Email</DialogTitle>
              <DialogDescription>
                Send a personalized follow-up email to {selectedBooking?.parent_name} with consultation summary and booking links.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label>Consultation Outcome *</Label>
                <Textarea
                  value={followUpData.consultationOutcome}
                  onChange={(e) => setFollowUpData({...followUpData, consultationOutcome: e.target.value})}
                  placeholder="Summarize what was discussed during the consultation..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Recommended Subjects (comma-separated)</Label>
                <Input
                  value={followUpData.recommendedSubjects.join(', ')}
                  onChange={(e) => setFollowUpData({...followUpData, recommendedSubjects: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                  placeholder="Mathematics, English, Science"
                />
              </div>

              <div>
                <Label>Recommended Tutors (comma-separated names)</Label>
                <Input
                  value={followUpData.recommendedTutors.join(', ')}
                  onChange={(e) => setFollowUpData({...followUpData, recommendedTutors: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                  placeholder="John Doe, Jane Smith"
                />
              </div>

              <div>
                <Label>Next Steps *</Label>
                <Textarea
                  value={followUpData.nextSteps}
                  onChange={(e) => setFollowUpData({...followUpData, nextSteps: e.target.value})}
                  placeholder="Browse our tutors and book your first session..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Next Action (Internal Tracking)</Label>
                <Input
                  value={followUpData.nextAction}
                  onChange={(e) => setFollowUpData({...followUpData, nextAction: e.target.value})}
                  placeholder="Call parent, send package pricing, etc."
                />
              </div>

              <div>
                <Label>Next Action Date</Label>
                <Input
                  type="date"
                  value={followUpData.nextActionDate}
                  onChange={(e) => setFollowUpData({...followUpData, nextActionDate: e.target.value})}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setFollowUpDialog(false)}>Cancel</Button>
              <Button onClick={handleSendFollowUp} disabled={!followUpData.consultationOutcome || !followUpData.nextSteps}>
                <Send className="h-4 w-4 mr-2" />
                Send Follow-up Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

const ApplicationReviewCard = ({ application, onReview }: any) => {
  const [notes, setNotes] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState("");
  const [meetLink, setMeetLink] = useState("");
  const [loadingCv, setLoadingCv] = useState(false);
  const [generatingMeet, setGeneratingMeet] = useState(false);

  const availableTimeSlots = [
    "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
    "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"
  ];

  const handleGenerateMeetLink = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time first");
      return;
    }

    setGeneratingMeet(true);
    try {
      // Convert selected date and time to ISO format
      const [time, period] = selectedTime.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(hours, minutes, 0, 0);
      
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + 30);

      const { data, error } = await supabase.functions.invoke('generate-google-meet-link', {
        body: {
          summary: `Lana Tutor Interview - ${application.full_name}`,
          description: `Interview with ${application.full_name} for tutor position at Lana Tutors`,
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString(),
          attendeeEmail: application.email,
        }
      });

      if (error) throw error;
      
      if (data?.meetingLink) {
        setMeetLink(data.meetingLink);
        toast.success("Google Meet link generated!");
      }
    } catch (error: any) {
      console.error("Error generating Meet link:", error);
      toast.error("Failed to generate Meet link");
    } finally {
      setGeneratingMeet(false);
    }
  };

  const handleViewCv = async () => {
    if (!application.cv_url) return;
    
    setLoadingCv(true);
    try {
      const { data, error } = await supabase.storage
        .from('tutor-cvs')
        .download(application.cv_url);

      if (error) throw error;
      
      if (data) {
        const blobUrl = URL.createObjectURL(data);
        const newWin = window.open(blobUrl, '_blank');
        // If popup blocked, fallback to forced download
        if (!newWin) {
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = application.cv_url.split('/').pop() || 'cv.pdf';
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
        // Revoke after some time to free memory
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      }
    } catch (error: any) {
      console.error("Error downloading CV:", error);
      toast.error("Failed to load CV");
    } finally {
      setLoadingCv(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{application.full_name}</CardTitle>
            <p className="text-sm text-muted-foreground">{application.email}</p>
            <p className="text-sm text-muted-foreground">{application.phone_number}</p>
            <Badge className="mt-2" variant="secondary">
              Applied: {formatConsultationDate(application.created_at)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-sm">Current School</p>
            <p className="text-sm text-muted-foreground">{application.current_school}</p>
          </div>
          <div>
            <p className="font-semibold text-sm">Experience</p>
            <p className="text-sm text-muted-foreground">{application.years_of_experience} years</p>
          </div>
          <div>
            <p className="font-semibold text-sm">TSC Number</p>
            <p className="text-sm text-muted-foreground">{application.tsc_number || "Not provided"}</p>
          </div>
          <div>
            <p className="font-semibold text-sm">CV</p>
            {application.cv_url ? (
              <Button
                variant="link"
                className="h-auto p-0 text-sm text-primary hover:underline"
                onClick={handleViewCv}
                disabled={loadingCv}
              >
                {loadingCv ? "Loading..." : "View CV"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Not uploaded</p>
            )}
          </div>
        </div>

        <div className="space-y-4 border-t pt-4">
          <h4 className="font-semibold text-sm">Schedule Interview</h4>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Interview Date *</Label>
              <Input
                type="date"
                value={selectedDate ? selectedDate.toISOString().split("T")[0] : ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedDate(value ? new Date(value) : null);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Select Time *</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time slot" />
                </SelectTrigger>
                <SelectContent>
                  {availableTimeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`meet-link-${application.id}`}>Google Meet Link *</Label>
              <div className="flex gap-2">
                <Input
                  id={`meet-link-${application.id}`}
                  type="url"
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  value={meetLink}
                  onChange={(e) => setMeetLink(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleGenerateMeetLink}
                  disabled={generatingMeet || !selectedDate || !selectedTime}
                >
                  {generatingMeet ? "Generating..." : "Generate Link"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Click "Generate Link" to automatically create a Google Meet from info@lanatutors.africa
              </p>
            </div>
          </div>
        </div>

        <Textarea
          placeholder="Admin notes (optional - for internal use only)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        <div className="flex gap-2 mt-4">
          <Button
            onClick={() => {
              if (!selectedDate || !selectedTime || !meetLink) {
                toast.error("Please fill in all required fields");
                return;
              }
              // Convert to datetime string format
              const [time, period] = selectedTime.split(' ');
              let [hours, minutes] = time.split(':').map(Number);
              if (period === 'PM' && hours !== 12) hours += 12;
              if (period === 'AM' && hours === 12) hours = 0;
              
              const dateTime = new Date(selectedDate);
              dateTime.setHours(hours, minutes, 0, 0);
              const interviewDateTime = dateTime.toISOString().slice(0, 16);
              
              onReview(application.id, "schedule_interview", notes, interviewDateTime, meetLink);
            }}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!selectedDate || !selectedTime || !meetLink}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Schedule Interview & Send Invitation
          </Button>
          <Button
            onClick={() => onReview(application.id, "reject", notes)}
            variant="destructive"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const InterviewCard = ({ application, onResult }: any) => {
  const [notes, setNotes] = useState(application.interview_notes || "");
  const isPending = application.status === 'interview_scheduled';
  const isPassed = application.status === 'passed';
  const isFailed = application.status === 'failed' || application.status === 'interview_failed';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{application.full_name}</CardTitle>
              {isPassed && (
                <Badge className="bg-green-600">Passed</Badge>
              )}
              {isFailed && (
                <Badge className="bg-red-600">Failed</Badge>
              )}
              {isPending && (
                <Badge className="bg-blue-600">Scheduled</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{application.email}</p>
            <p className="text-sm text-muted-foreground">{application.phone_number}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">
                Interview: {formatFullDateTime(application.interview_scheduled_at)}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-sm">Current School</p>
            <p className="text-sm text-muted-foreground">{application.current_school}</p>
          </div>
          <div>
            <p className="font-semibold text-sm">Experience</p>
            <p className="text-sm text-muted-foreground">{application.years_of_experience} years</p>
          </div>
          <div className="col-span-2">
            <p className="font-semibold text-sm">Google Meet Link</p>
            <a 
              href={application.interview_meet_link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              {application.interview_meet_link}
            </a>
          </div>
        </div>

        {application.admin_notes && (
          <div className="bg-muted/50 p-3 rounded">
            <p className="font-semibold text-sm mb-1">Initial Notes</p>
            <p className="text-sm text-muted-foreground">{application.admin_notes}</p>
          </div>
        )}

        {(isPassed || isFailed) && application.interview_notes && (
          <div className={`p-3 rounded ${isPassed ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className="font-semibold text-sm mb-1">Interview Outcome Notes</p>
            <p className="text-sm text-muted-foreground">{application.interview_notes}</p>
          </div>
        )}

        {isPending && (
          <>
            <Textarea
              placeholder="Interview notes - record your observations and decision rationale..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />

            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => onResult(application.id, true, notes)}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Passed - Send Profile Setup Invite
              </Button>
              <Button
                onClick={() => onResult(application.id, false, notes)}
                variant="destructive"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Failed
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const ReviewModerationCard = ({ review, onModerate }: any) => {
  const [notes, setNotes] = useState("");

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < review.rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              By {review.profiles?.full_name || "Unknown Student"}
            </p>
          </div>
          <AlertCircle className="w-5 h-5 text-orange-600" />
        </div>

        <p className="text-sm mb-4">{review.comment}</p>

        <Textarea
          placeholder="Moderation notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mb-4"
          rows={2}
        />

        <div className="flex gap-2">
          <Button
            onClick={() => onModerate(review.id, true, notes)}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve
          </Button>
          <Button
            onClick={() => onModerate(review.id, false, notes)}
            variant="destructive"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminDashboard;

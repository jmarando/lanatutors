import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CheckCircle, XCircle, AlertCircle, Calendar as CalendarIcon, Clock, Mail, Phone, User, BookOpen, FileText, Video, Edit, Save, X, MessageCircle, Send, TrendingUp, Users, DollarSign, BookMarked, Activity, ArrowUpRight, ArrowDownRight, GraduationCap, Star, ExternalLink, Bell, Download } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatConsultationDate, formatToEAT, formatFullDateTime } from "@/utils/dateUtils";
import { BlogManagement } from "@/components/admin/BlogManagement";
import { TutorSignupList } from "@/components/admin/TutorSignupList";
import { TutorEmailList } from "@/components/admin/TutorEmailList";
import { AdminIntensivePrograms } from "@/components/admin/AdminIntensivePrograms";
import { AdminTutorProfileEdit } from "@/components/admin/AdminTutorProfileEdit";
import { AdminStudentHub } from "@/components/admin/AdminStudentHub";
import { DailyOperationsCard } from "@/components/admin/DailyOperationsCard";
import { BootcampEnrollments } from "@/components/admin/BootcampEnrollments";
import { EmailComposer } from "@/components/admin/EmailComposer";
import { AdminCreateLearningPlan } from "@/components/admin/AdminCreateLearningPlan";
import { AdminLearningPlanRequests } from "@/components/admin/AdminLearningPlanRequests";
import { AdminLearningPlansList } from "@/components/admin/AdminLearningPlansList";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminClassManagement } from "@/components/admin/AdminClassManagement";
import { AdminReports } from "@/components/admin/AdminReports";

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
  const [rescheduleDialog, setRescheduleDialog] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [processingTutorId, setProcessingTutorId] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [addingNoteToBooking, setAddingNoteToBooking] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [consultationNotes, setConsultationNotes] = useState<Record<string, any[]>>({});
  const [expandedQuickView, setExpandedQuickView] = useState<'today' | 'tomorrow' | 'week' | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);

  // Message templates for customer journey - Enhanced and professional
  const messageTemplates = {
    email: {
      confirmation: {
        title: "Consultation Confirmed",
        subject: "✅ Lana Tutors: Your Consultation is Confirmed",
        body: (booking: any) => `Dear ${booking.parent_name},

Thank you for choosing Lana Tutors! We're excited to confirm your upcoming consultation for ${booking.student_name}.

📅 CONSULTATION DETAILS
━━━━━━━━━━━━━━━━━━━━━━
Date: ${formatConsultationDate(booking.consultation_date)}
Time: ${booking.consultation_time} (East Africa Time)
Grade Level: ${booking.grade_level}
Subjects: ${booking.subjects_interest.join(', ')}
Mode: ${booking.preferred_mode}

📝 WHAT TO EXPECT
━━━━━━━━━━━━━━━━━━━━━━
During our 15-20 minute consultation, we'll:
• Understand ${booking.student_name}'s current academic situation
• Discuss specific learning goals and challenges
• Recommend the best tutoring approach for your child
• Answer any questions about our programs and pricing

💡 TO PREPARE
━━━━━━━━━━━━━━━━━━━━━━
• Have ${booking.student_name}'s recent test scores or report cards handy
• Note down specific topics or concepts they're struggling with
• Think about your preferred schedule for tutoring sessions

We'll send you the Google Meet link 24 hours before your consultation.

Need to reschedule? Simply reply to this email or WhatsApp us at +254 700 000 000.

We look forward to helping ${booking.student_name} excel!

Warm regards,
The Lana Tutors Team
🌐 www.lanatutors.africa`
      },
      reminder_24h: {
        title: "24-Hour Reminder",
        subject: "⏰ Reminder: Your Consultation is Tomorrow!",
        body: (booking: any) => `Dear ${booking.parent_name},

This is a friendly reminder that your consultation for ${booking.student_name} is scheduled for TOMORROW!

📅 CONSULTATION DETAILS
━━━━━━━━━━━━━━━━━━━━━━
Date: ${new Date(booking.consultation_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
Time: ${booking.consultation_time} (East Africa Time)
📹 Meeting Link: ${booking.meeting_link || '[Will be shared shortly]'}

📝 QUICK PREP CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━
✓ Current academic challenges ${booking.student_name} is facing
✓ Learning goals for this term/year
✓ Any specific questions about our tutoring programs
✓ Quiet space with stable internet for the video call

💡 PRO TIP: Having ${booking.student_name}'s recent schoolwork nearby can help us better understand their needs.

Can't make it? Please let us know ASAP so we can reschedule. Just reply to this email or call +254 700 000 000.

See you tomorrow!

Best regards,
The Lana Tutors Team`
      },
      reminder_1h: {
        title: "1-Hour Reminder",
        subject: "🔔 Starting Soon: Your Consultation in 1 Hour",
        body: (booking: any) => `Dear ${booking.parent_name},

Your consultation for ${booking.student_name} starts in ONE HOUR!

⏰ Time: ${booking.consultation_time} (East Africa Time)
📹 Join here: ${booking.meeting_link || '[Meeting link]'}

Quick reminders:
• Find a quiet spot with good internet
• Have ${booking.student_name}'s schoolwork nearby if possible
• We'll keep it brief and focused (15-20 minutes)

See you very soon!

The Lana Tutors Team`
      },
      post_consultation: {
        title: "Post-Consultation Summary",
        subject: "🎓 Thank You! Here's Your Personalized Learning Plan for ${booking.student_name}",
        body: (booking: any) => `Dear ${booking.parent_name},

Thank you for taking the time to meet with us today! It was a pleasure learning about ${booking.student_name}'s academic journey.

📋 CONSULTATION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━
Student: ${booking.student_name}
Grade: ${booking.grade_level}
Subjects Discussed: ${booking.subjects_interest.join(', ')}

🎯 KEY DISCUSSION POINTS
━━━━━━━━━━━━━━━━━━━━━━
[Add summary of main topics discussed]
[Add specific challenges identified]
[Add learning style observations]

📚 OUR RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━
Based on our discussion, here's what we recommend for ${booking.student_name}:

1. Subject Focus: [Subject priorities]
2. Session Frequency: [Recommended sessions per week]
3. Suggested Tutor(s): [Tutor names and specialties]

💰 PRICING & PACKAGES
━━━━━━━━━━━━━━━━━━━━━━
[Insert relevant package details]

🎁 SPECIAL OFFER - VALID 48 HOURS
━━━━━━━━━━━━━━━━━━━━━━
Book your first tutoring package within 48 hours and receive:
✨ 20% OFF your first month
✨ FREE learning assessment
✨ Flexible rescheduling

👉 READY TO GET STARTED?
Reply to this email or click here: [Booking link]

Questions? We're here to help! Just reply to this email or WhatsApp us.

Looking forward to being part of ${booking.student_name}'s success story!

Warm regards,
The Lana Tutors Team`
      },
      follow_up_3days: {
        title: "3-Day Follow-up",
        subject: "Quick Check-in: Ready to Start ${booking.student_name}'s Tutoring Journey?",
        body: (booking: any) => `Dear ${booking.parent_name},

I hope this finds you well! I wanted to follow up on our recent consultation about ${booking.student_name}'s academic support needs.

I understand choosing the right tutoring can be a big decision. I wanted to share that we have excellent tutors ready to help with ${booking.subjects_interest.join(' and ')} - the subjects we discussed.

🎯 WHAT'S INCLUDED
━━━━━━━━━━━━━━━━━━━━━━
✓ Personalized 1-on-1 attention
✓ Flexible scheduling to fit your routine
✓ Progress reports after each session
✓ Direct communication with your tutor
✓ Google Classroom for resources & homework

⏳ REMINDER: Your 20% welcome discount expires tomorrow!

I'd love to help you get started. Would any of these work for you?

Option A: Schedule a trial session this week
Option B: Book a 4-session starter pack
Option C: Set up a quick call to discuss further

Simply reply with A, B, or C, and I'll take care of the rest!

Here to help,
[Admin Name]
Lana Tutors Team

P.S. Many parents find that starting sooner helps children build momentum before exams. Let's make this term ${booking.student_name}'s best yet!`
      },
      nurture_7days: {
        title: "7-Day Nurture",
        subject: "Still thinking about tutoring for ${booking.student_name}?",
        body: (booking: any) => `Dear ${booking.parent_name},

I hope you're having a great week! I wanted to reach out one more time about tutoring support for ${booking.student_name}.

I understand timing is everything, and there's no pressure. However, I wanted to share a quick success story that reminded me of your consultation:

📖 SUCCESS STORY
━━━━━━━━━━━━━━━━━━━━━━
"When Sarah joined Lana Tutors, she was struggling with Maths. After just 8 sessions, her confidence improved dramatically and she moved from a C to a B+. The personalized attention made all the difference."
- Mary K., Parent

🤔 COMMON QUESTIONS WE GET
━━━━━━━━━━━━━━━━━━━━━━
Q: What if my child doesn't click with the tutor?
A: We offer free tutor matching - if it's not a fit, we'll find someone better!

Q: How do I know if it's working?
A: You'll receive progress updates after every session, plus monthly reports.

Q: Can we pause if needed?
A: Absolutely - our packages are flexible to your schedule.

If you have any questions or concerns holding you back, I'd love to address them. Just reply to this email.

Wishing ${booking.student_name} a productive school term!

Warm regards,
The Lana Tutors Team`
      }
    },
    whatsapp: {
      confirmation: {
        title: "Consultation Confirmed",
        body: (booking: any) => `✅ *Lana Tutors - Consultation Confirmed*

Dear ${booking.parent_name},

Your consultation for *${booking.student_name}* is confirmed! 🎉

📅 *Date:* ${new Date(booking.consultation_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
⏰ *Time:* ${booking.consultation_time}
📚 *Grade:* ${booking.grade_level}
📖 *Subjects:* ${booking.subjects_interest.join(', ')}

We'll send the Google Meet link 24 hours before.

_Need to reschedule? Just reply to this message._

See you soon! 👋
*Lana Tutors*`
      },
      reminder_24h: {
        title: "24-Hour Reminder",
        body: (booking: any) => `⏰ *Reminder: Consultation Tomorrow!*

Dear ${booking.parent_name},

Your consultation for *${booking.student_name}* is *TOMORROW*!

⏰ *Time:* ${booking.consultation_time}
📹 *Link:* ${booking.meeting_link || '[Coming soon]'}

📝 *Quick prep:*
• Current challenges
• Learning goals
• Your questions

_Can't make it? Reply now to reschedule._

See you tomorrow! 🌟
*Lana Tutors*`
      },
      reminder_1h: {
        title: "1-Hour Reminder",
        body: (booking: any) => `🔔 *Starting in 1 Hour!*

Hi ${booking.parent_name}!

Your consultation for ${booking.student_name} starts soon.

⏰ ${booking.consultation_time}
📹 ${booking.meeting_link || '[Join link]'}

See you shortly! 👋
*Lana Tutors*`
      },
      post_consultation: {
        title: "Post-Consultation Follow-up",
        body: (booking: any) => `🙏 *Thank You, ${booking.parent_name}!*

It was great meeting you today to discuss ${booking.student_name}'s learning journey.

📋 *What's Next:*
• Review our tutor recommendations (sent via email)
• Book your first session
• Get *20% OFF* - valid 48 hours!

👉 Ready to start? Reply "BOOK" and we'll help you schedule.

Questions? Just message us!

*Lana Tutors* 📚`
      },
      follow_up_3days: {
        title: "3-Day Follow-up",
        body: (booking: any) => `Hi ${booking.parent_name}! 👋

Just checking in about tutoring for ${booking.student_name}.

We have great tutors ready for *${booking.subjects_interest.join(' & ')}*! ✨

⏳ Your *20% discount* expires tomorrow!

Quick options:
A - Schedule trial session
B - Ask a question
C - See tutor profiles

Reply with A, B, or C!

*Lana Tutors*`
      }
    }
  };

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('tutor-applications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tutor_applications'
        },
        () => {
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

      const { data: consultations } = await supabase
        .from('consultation_bookings')
        .select('*')
        .gte('created_at', startDate.toISOString());

      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .gte('created_at', startDate.toISOString());

      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString());

      const { data: tutors } = await supabase
        .from('tutor_profiles')
        .select('*')
        .gte('created_at', startDate.toISOString());

      const { data: students } = await supabase
        .from('profiles')
        .select('*')
        .gte('created_at', startDate.toISOString());

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

      const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const convertedConsultations = consultations?.filter(c => c.converted_to_customer).length || 0;
      const conversionRate = consultations?.length ? (convertedConsultations / consultations.length) * 100 : 0;

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

      if (tutor) {
        try {
          if (approved) {
            await supabase.functions.invoke("send-profile-live-email", {
              body: {
                email: tutor.email,
                fullName: tutor.profiles?.full_name || "Tutor"
              }
            });
            console.log("Profile live email sent to:", tutor.email);
          } else {
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
        .order("created_at", { ascending: false });

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

  const fetchConsultationNotes = async (consultationId: string) => {
    const { data, error } = await supabase
      .from("consultation_notes")
      .select("*")
      .eq("consultation_id", consultationId)
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setConsultationNotes(prev => ({ ...prev, [consultationId]: data }));
    }
  };

  const handleAddNote = async (bookingId: string, note: string) => {
    if (!note.trim()) {
      toast.error("Please enter a note");
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("consultation_notes")
        .insert({ consultation_id: bookingId, note: note.trim(), created_by: user?.id });

      if (error) throw error;

      toast.success("Note added!");
      setAddingNoteToBooking(null);
      setNewNoteContent("");
      fetchConsultationNotes(bookingId);
    } catch (error: any) {
      toast.error("Failed to add note: " + error.message);
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

  const handleRescheduleConsultation = async () => {
    if (!rescheduleBooking || !rescheduleDate || !rescheduleTime) {
      toast.error("Please select date and time");
      return;
    }
    
    try {
      const { error } = await supabase
        .from("consultation_bookings")
        .update({
          consultation_date: rescheduleDate,
          consultation_time: rescheduleTime,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rescheduleBooking.id);

      if (error) throw error;

      if (rescheduleBooking.email) {
        await supabase.functions.invoke("send-admin-email", {
          body: {
            to: rescheduleBooking.email,
            recipientName: rescheduleBooking.parent_name,
            subject: "Lana Tutors - Consultation Rescheduled",
            message: `Dear ${rescheduleBooking.parent_name},

Your consultation for ${rescheduleBooking.student_name} has been rescheduled.

New Date: ${new Date(rescheduleDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
New Time: ${rescheduleTime}

We look forward to speaking with you.

Best regards,
The Lana Tutors Team`
          }
        });
      }

      toast.success("Consultation rescheduled and notification sent!");
      setRescheduleDialog(false);
      setRescheduleBooking(null);
      setRescheduleDate("");
      setRescheduleTime("");
      fetchConsultationBookings();
    } catch (error: any) {
      toast.error("Failed to reschedule: " + error.message);
    }
  };

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

  const sidebarCounts = {
    pendingApplications: pendingApplications.length,
    interviewRecords: interviewRecords.length,
    pendingTutors: pendingTutors.length,
    pendingReviews: pendingReviews.length,
    consultationBookings: consultationBookings.length,
    tutoringBookings: tutoringBookings.length,
    unassignedIntensiveClasses,
  };

  // Render Dashboard Overview Content
  const renderDashboardContent = () => (
    <div className="space-y-8">
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

      {dashboardMetrics && (
        <div className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('student-hub')}>
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

            <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('edit-tutors')}>
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

          {/* Daily Operations + Quick Stats Row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <DailyOperationsCard />
            
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
          </div>

          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardMetrics.revenueTrend?.slice(-14) || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  // Render Applications Content
  const renderApplicationsContent = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Pending Applications</h2>
        <Badge variant="destructive">{pendingApplications.length} pending</Badge>
      </div>
      {pendingApplications.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No pending applications
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
    </div>
  );

  // Render Interviews Content
  const renderInterviewsContent = () => {
    const filteredInterviews = interviewRecords.filter(interview => {
      if (interviewFilter === 'all') return true;
      if (interviewFilter === 'scheduled') return interview.status === 'interview_scheduled';
      if (interviewFilter === 'passed') return interview.status === 'interview_passed';
      if (interviewFilter === 'failed') return interview.status === 'interview_failed';
      return true;
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Interview Records</h2>
          <Select value={interviewFilter} onValueChange={(v: any) => setInterviewFilter(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Interviews</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filteredInterviews.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No interview records found
            </CardContent>
          </Card>
        ) : (
          filteredInterviews.map((interview) => (
            <InterviewCard
              key={interview.id}
              application={interview}
              onResult={handleInterviewResult}
            />
          ))
        )}
      </div>
    );
  };

  // Render Profiles Content
  const renderProfilesContent = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Pending Profile Approvals</h2>
        <Badge variant="secondary">{pendingTutors.length} pending</Badge>
      </div>
      {pendingTutors.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No pending tutor profiles
          </CardContent>
        </Card>
      ) : (
        pendingTutors.map((tutor) => (
          <Card key={tutor.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{tutor.profiles?.full_name || "No name"}</CardTitle>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mt-1">
                    {tutor.email && <span>{tutor.email}</span>}
                    {tutor.profiles?.phone_number && (
                      <>
                        <span>•</span>
                        <span>{tutor.profiles.phone_number}</span>
                      </>
                    )}
                  </div>
                </div>
                {tutor.gender && (
                  <Badge variant="outline" className="capitalize">{tutor.gender}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Bio */}
              {tutor.bio && (
                <div>
                  <p className="font-semibold text-sm mb-1">Bio</p>
                  <p className="text-sm text-muted-foreground line-clamp-3">{tutor.bio}</p>
                </div>
              )}

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="font-semibold text-sm">Subjects</p>
                  <p className="text-sm text-muted-foreground">{tutor.subjects?.join(", ") || "None"}</p>
                </div>
                <div>
                  <p className="font-semibold text-sm">Experience</p>
                  <p className="text-sm text-muted-foreground">{tutor.experience_years || 0} years</p>
                </div>
                <div>
                  <p className="font-semibold text-sm">Hourly Rate</p>
                  <p className="text-sm text-muted-foreground">
                    {tutor.hourly_rate ? `KES ${tutor.hourly_rate.toLocaleString()}` : "Not set"}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="font-semibold text-sm">Curriculum</p>
                  <p className="text-sm text-muted-foreground">{tutor.curriculum?.join(", ") || "Not specified"}</p>
                </div>
                <div>
                  <p className="font-semibold text-sm">Teaching Levels</p>
                  <p className="text-sm text-muted-foreground">{tutor.teaching_levels?.join(", ") || "Not specified"}</p>
                </div>
                <div>
                  <p className="font-semibold text-sm">Teaching Mode</p>
                  <p className="text-sm text-muted-foreground capitalize">{tutor.teaching_mode?.join(", ") || "Not specified"}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold text-sm">Current Institution</p>
                  <p className="text-sm text-muted-foreground">
                    {tutor.current_institution || "Not specified"}
                    {tutor.institution_years && ` (${tutor.institution_years} years)`}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-sm">Teaching Location</p>
                  <p className="text-sm text-muted-foreground">{tutor.teaching_location || "Not specified"}</p>
                </div>
              </div>

              {/* Qualifications */}
              {tutor.qualifications && tutor.qualifications.length > 0 && (
                <div>
                  <p className="font-semibold text-sm mb-1">Qualifications</p>
                  <div className="flex flex-wrap gap-1">
                    {tutor.qualifications.map((qual: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">{qual}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {tutor.education && Array.isArray(tutor.education) && tutor.education.length > 0 && (
                <div>
                  <p className="font-semibold text-sm mb-1">Education</p>
                  <div className="space-y-1">
                    {tutor.education.slice(0, 2).map((edu: any, i: number) => (
                      <p key={i} className="text-sm text-muted-foreground">
                        {edu.degree || edu.qualification} - {edu.institution} {edu.year && `(${edu.year})`}
                      </p>
                    ))}
                    {tutor.education.length > 2 && (
                      <p className="text-xs text-muted-foreground">+{tutor.education.length - 2} more</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {tutor.diaspora_friendly && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Diaspora Friendly</Badge>
                )}
                {tutor.display_institution && (
                  <Badge variant="outline" className="text-xs">Shows Institution</Badge>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  onClick={() => handleTutorApproval(tutor.id, true)}
                  disabled={processingTutorId === tutor.id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {processingTutorId === tutor.id ? "Processing..." : "Approve"}
                </Button>
                <Button
                  onClick={() => handleTutorApproval(tutor.id, false)}
                  disabled={processingTutorId === tutor.id}
                  variant="destructive"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  // Render Reviews Content
  const renderReviewsContent = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Review Moderation</h2>
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
    </div>
  );

  // Render Consultations Content
  const renderConsultationsContent = () => {
    // Use local date formatting to avoid timezone issues
    const now = new Date();
    const formatLocalDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const todayStr = formatLocalDate(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatLocalDate(tomorrow);
    
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const todayConsultations = consultationBookings.filter(b => 
      b.consultation_date === todayStr && b.status !== 'cancelled'
    );
    
    const tomorrowConsultations = consultationBookings.filter(b => 
      b.consultation_date === tomorrowStr && b.status !== 'cancelled'
    );

    const thisWeekConsultations = consultationBookings.filter(b => {
      const bookingDateStr = b.consultation_date;
      return bookingDateStr >= todayStr && bookingDateStr <= formatLocalDate(weekEnd) && b.status !== 'cancelled';
    });

    const pendingFollowUps = consultationBookings.filter(b => 
      !b.follow_up_sent_at && b.status === 'confirmed' && b.consultation_date < todayStr
    );

    const renderQuickViewList = (consultations: typeof consultationBookings, title: string) => (
      <div className="mt-3 space-y-2 border-t pt-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">{title}</p>
        {consultations.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No consultations</p>
        ) : (
          consultations
            .sort((a, b) => a.consultation_time.localeCompare(b.consultation_time))
            .map((booking) => (
              <div key={booking.id} className="flex items-center justify-between text-xs bg-background/50 rounded p-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{booking.consultation_time}</span>
                  <span className="text-muted-foreground">-</span>
                  <span>{booking.student_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href={`https://wa.me/${booking.phone_number?.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-green-100 rounded"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MessageCircle className="h-3 w-3 text-green-600" />
                  </a>
                  {booking.meeting_link && (
                    <a 
                      href={booking.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-blue-100 rounded"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Video className="h-3 w-3 text-blue-600" />
                    </a>
                  )}
                </div>
              </div>
            ))
        )}
      </div>
    );

    const handleSendReminders = async () => {
      setSendingReminders(true);
      try {
        const { data, error } = await supabase.functions.invoke('send-consultation-reminder');
        
        if (error) throw error;
        
        const results = data?.results || [];
        const successful = results.filter((r: any) => r.success).length;
        const failed = results.filter((r: any) => !r.success).length;
        
        if (successful > 0) {
          toast.success(`Sent ${successful} reminder email(s)${failed > 0 ? `, ${failed} failed` : ''}`);
        } else if (data?.message?.includes('0 reminders')) {
          toast.info('No reminders to send at this time (consultations must be 1h or 24h away)');
        } else if (failed > 0) {
          toast.error(`Failed to send ${failed} reminder(s)`);
        } else {
          toast.info('No upcoming consultations require reminders');
        }
      } catch (error: any) {
        console.error('Error sending reminders:', error);
        toast.error('Failed to send reminders: ' + error.message);
      } finally {
        setSendingReminders(false);
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Consultations</h2>
          <Button 
            onClick={handleSendReminders} 
            disabled={sendingReminders}
            variant="outline"
            className="gap-2"
          >
            <Bell className="h-4 w-4" />
            {sendingReminders ? 'Sending...' : 'Send Reminders'}
          </Button>
        </div>
        
        {/* Upcoming Summary Cards - Clickable */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card 
            className={`border-red-200 bg-red-50 dark:bg-red-950/20 cursor-pointer transition-all hover:shadow-md ${expandedQuickView === 'today' ? 'ring-2 ring-red-500' : ''}`}
            onClick={() => setExpandedQuickView(expandedQuickView === 'today' ? null : 'today')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{todayConsultations.length}</p>
                  <p className="text-xs text-muted-foreground">Today</p>
                </div>
              </div>
              {expandedQuickView === 'today' && renderQuickViewList(todayConsultations, "Today's Consultations")}
            </CardContent>
          </Card>
          <Card 
            className={`border-orange-200 bg-orange-50 dark:bg-orange-950/20 cursor-pointer transition-all hover:shadow-md ${expandedQuickView === 'tomorrow' ? 'ring-2 ring-orange-500' : ''}`}
            onClick={() => setExpandedQuickView(expandedQuickView === 'tomorrow' ? null : 'tomorrow')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">{tomorrowConsultations.length}</p>
                  <p className="text-xs text-muted-foreground">Tomorrow</p>
                </div>
              </div>
              {expandedQuickView === 'tomorrow' && renderQuickViewList(tomorrowConsultations, "Tomorrow's Consultations")}
            </CardContent>
          </Card>
          <Card 
            className={`border-blue-200 bg-blue-50 dark:bg-blue-950/20 cursor-pointer transition-all hover:shadow-md ${expandedQuickView === 'week' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setExpandedQuickView(expandedQuickView === 'week' ? null : 'week')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{thisWeekConsultations.length}</p>
                  <p className="text-xs text-muted-foreground">This Week</p>
                </div>
              </div>
              {expandedQuickView === 'week' && renderQuickViewList(thisWeekConsultations, "This Week's Consultations")}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{conversionStats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{conversionStats.converted}</p>
                  <p className="text-xs text-muted-foreground">Converted</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Send className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{pendingFollowUps.length}</p>
                  <p className="text-xs text-muted-foreground">Need Follow-up</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Consultations Table */}
        {thisWeekConsultations.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                Upcoming This Week ({thisWeekConsultations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {thisWeekConsultations
                    .sort((a, b) => {
                      const dateCompare = new Date(a.consultation_date).getTime() - new Date(b.consultation_date).getTime();
                      if (dateCompare !== 0) return dateCompare;
                      // Sort by time within the same day
                      return a.consultation_time.localeCompare(b.consultation_time);
                    })
                    .map((booking) => {
                      const isToday = booking.consultation_date === todayStr;
                      const isTomorrow = booking.consultation_date === tomorrowStr;
                      const rowClass = isToday 
                        ? "bg-red-50 dark:bg-red-950/20" 
                        : isTomorrow 
                          ? "bg-orange-50 dark:bg-orange-950/20" 
                          : "";
                      return (
                        <TableRow key={booking.id} className={rowClass}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {isToday && <Badge variant="outline" className="border-red-500 text-red-600 text-xs">Today</Badge>}
                              {isTomorrow && <Badge variant="outline" className="border-orange-500 text-orange-600 text-xs">Tomorrow</Badge>}
                              {formatConsultationDate(booking.consultation_date)}
                            </div>
                          </TableCell>
                          <TableCell>{booking.consultation_time}</TableCell>
                          <TableCell>{booking.student_name}</TableCell>
                          <TableCell>{booking.parent_name}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <a href={`tel:${booking.phone_number}`} className="text-xs text-primary hover:underline">{booking.phone_number}</a>
                              {booking.email && <a href={`mailto:${booking.email}`} className="text-xs text-muted-foreground hover:underline truncate max-w-[150px]">{booking.email}</a>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {booking.subjects_interest?.slice(0, 2).map((subject: string) => (
                                <Badge key={subject} variant="secondary" className="text-xs">{subject}</Badge>
                              ))}
                              {booking.subjects_interest?.length > 2 && (
                                <Badge variant="outline" className="text-xs">+{booking.subjects_interest.length - 2}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              booking.status === 'confirmed' ? 'bg-green-500' :
                              booking.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-500'
                            }>
                              {booking.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Export CSV Button */}
        {consultationBookings.length > 0 && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const headers = ["Date", "Time", "Student", "Parent", "Phone", "Email", "Grade Level", "Subjects", "Mode", "Status", "Budget", "Challenges", "Notes", "Created At"];
                const rows = consultationBookings.map((b: any) => [
                  b.consultation_date,
                  b.consultation_time,
                  b.student_name,
                  b.parent_name,
                  b.phone_number,
                  b.email || "",
                  b.grade_level,
                  (b.subjects_interest || []).join("; "),
                  b.preferred_mode,
                  b.status,
                  b.budget_range || "",
                  (b.specific_challenges || "").replace(/[\n\r,]/g, " "),
                  (b.additional_notes || "").replace(/[\n\r,]/g, " "),
                  b.created_at ? new Date(b.created_at).toLocaleString() : "",
                ]);
                const csv = [headers, ...rows].map(r => r.map((c: string) => `"${c}"`).join(",")).join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `consultations-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success("CSV downloaded!");
              }}
            >
              <Download className="h-4 w-4 mr-2" /> Export CSV ({consultationBookings.length})
            </Button>
          </div>
        )}

        {consultationBookings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No consultation bookings yet.
            </CardContent>
          </Card>
        ) : (
          consultationBookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {booking.student_name}
                    </CardTitle>
                    <p className="text-muted-foreground mt-1">
                      Parent: {booking.parent_name}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Badge className={
                      booking.status === 'confirmed' ? 'bg-green-500' :
                      booking.status === 'pending' ? 'bg-yellow-500' :
                      booking.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-500'
                    }>
                      {booking.status}
                    </Badge>
                    {booking.converted_to_customer && (
                      <Badge className="bg-emerald-600">Converted</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date, Time, Contact Row */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Date</div>
                      <div className="font-medium">{formatConsultationDate(booking.consultation_date)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Time</div>
                      <div className="font-medium">{booking.consultation_time}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Email</div>
                      <a href={`mailto:${booking.email}`} className="text-primary hover:underline font-medium text-sm truncate block max-w-[180px]">
                        {booking.email}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Phone</div>
                      <div className="font-medium">{booking.phone_number}</div>
                    </div>
                  </div>
                </div>

                {/* Student Info Row */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t">
                  <div className="flex items-start gap-2 text-sm">
                    <GraduationCap className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-xs text-muted-foreground">Grade Level</div>
                      <div className="font-medium">{booking.grade_level}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-xs text-muted-foreground">Subjects of Interest</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {booking.subjects_interest?.map((subject: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Video className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-xs text-muted-foreground">Preferred Mode</div>
                      <div className="font-medium capitalize">{booking.preferred_mode}</div>
                    </div>
                  </div>
                  {booking.meeting_link && (
                    <div className="flex items-start gap-2 text-sm">
                      <ExternalLink className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground">Meeting Link</div>
                        <a href={booking.meeting_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium text-sm">
                          Join Meeting
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Notes from Parent */}
                {booking.additional_notes && (
                  <div className="pt-2 border-t">
                    <div className="text-xs text-muted-foreground mb-1">Additional Notes from Parent</div>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{booking.additional_notes}</p>
                  </div>
                )}

                {/* Admin Notes Section - Multiple Notes */}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Admin Notes ({consultationNotes[booking.id]?.length || 0})
                    </div>
                    {addingNoteToBooking !== booking.id && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 text-xs"
                        onClick={() => {
                          setAddingNoteToBooking(booking.id);
                          setNewNoteContent('');
                          if (!consultationNotes[booking.id]) {
                            fetchConsultationNotes(booking.id);
                          }
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Add Note
                      </Button>
                    )}
                  </div>
                  
                  {/* Add Note Form */}
                  {addingNoteToBooking === booking.id && (
                    <div className="space-y-2 mb-3">
                      <Textarea
                        placeholder="Add internal notes about this consultation (e.g., parent concerns, follow-up items, special requirements)..."
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        className="text-sm min-h-[80px]"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleAddNote(booking.id, newNoteContent)}
                        >
                          <Save className="h-3 w-3 mr-1" /> Save Note
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setAddingNoteToBooking(null);
                            setNewNoteContent('');
                          }}
                        >
                          <X className="h-3 w-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Display Notes List */}
                  {consultationNotes[booking.id]?.length > 0 ? (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {consultationNotes[booking.id].map((note: any) => (
                        <div 
                          key={note.id} 
                          className="text-sm bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-900"
                        >
                          <p>{note.note}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(note.created_at).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : !consultationNotes[booking.id] ? (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="text-xs p-0 h-auto"
                      onClick={() => fetchConsultationNotes(booking.id)}
                    >
                      Load notes
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No admin notes yet</p>
                  )}

                  {/* Legacy note display if exists */}
                  {booking.admin_notes && !consultationNotes[booking.id]?.length && (
                    <div className="mt-2 text-sm bg-muted/50 p-3 rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-1">Legacy Note:</p>
                      <p>{booking.admin_notes}</p>
                    </div>
                  )}
                </div>

                {/* Follow-up Status */}
                {(booking.consultation_outcome || booking.next_action) && (
                  <div className="pt-2 border-t grid sm:grid-cols-2 gap-3">
                    {booking.consultation_outcome && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Consultation Outcome</div>
                        <p className="text-sm">{booking.consultation_outcome}</p>
                      </div>
                    )}
                    {booking.next_action && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Next Action</div>
                        <p className="text-sm">{booking.next_action}</p>
                        {booking.next_action_date && (
                          <p className="text-xs text-muted-foreground mt-1">Due: {new Date(booking.next_action_date).toLocaleDateString()}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap pt-2 border-t">
                  <Button size="sm" variant="outline" onClick={() => openMessageDialog(booking, 'email')}>
                    <Mail className="h-4 w-4 mr-1" /> Email
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleWhatsAppMessage(booking)}>
                    <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openFollowUpDialog(booking)}>
                    <Send className="h-4 w-4 mr-1" /> Follow-up
                  </Button>
                  {!booking.converted_to_customer ? (
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700" 
                      onClick={() => handleMarkAsConverted(booking.id)}
                      title="Mark this parent as converted to a paying customer"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" /> Mark Converted
                    </Button>
                  ) : (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle className="h-3 w-3 mr-1" /> Converted to Customer
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  };

  // Render Bookings Content
  const renderBookingsContent = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Tutoring Sessions</h2>
      {tutoringBookings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No tutoring bookings yet.
          </CardContent>
        </Card>
      ) : (
        tutoringBookings.map((booking) => (
          <Card key={booking.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{booking.subject}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Student: {booking.profiles?.full_name || 'Unknown'}
                  </p>
                </div>
                <Badge className={
                  booking.status === 'confirmed' ? 'bg-green-500' :
                  booking.status === 'pending' ? 'bg-yellow-500' :
                  booking.status === 'completed' ? 'bg-blue-500' : 'bg-gray-500'
                }>
                  {booking.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Date</div>
                    <div className="font-medium">
                      {booking.tutor_availability?.start_time 
                        ? new Date(booking.tutor_availability.start_time).toLocaleDateString() 
                        : 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Amount</div>
                    <div className="font-medium">KES {booking.amount?.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardContent();
      case 'applications':
        return renderApplicationsContent();
      case 'interviews':
        return renderInterviewsContent();
      case 'profiles':
        return renderProfilesContent();
      case 'reviews':
        return renderReviewsContent();
      case 'blog':
        return <BlogManagement />;
      case 'edit-tutors':
        return <AdminTutorProfileEdit />;
      case 'student-hub':
        return <AdminStudentHub />;
      case 'bootcamp-enrollments':
        return (
          <div className="space-y-4">
            <div className="flex justify-end">
              <EmailComposer />
            </div>
            <BootcampEnrollments />
          </div>
        );
      case 'learning-plan-requests':
        return <AdminLearningPlanRequests />;
      case 'learning-plans':
        return <AdminCreateLearningPlan />;
      case 'sent-learning-plans':
        return <AdminLearningPlansList />;
      case 'consultations':
        return renderConsultationsContent();
      case 'class-management':
        return <AdminClassManagement />;
      case 'bookings':
        return renderBookingsContent();
      case 'tutor-signups':
        return <TutorSignupList />;
      case 'december-bootcamp':
        return <AdminIntensivePrograms />;
      case 'reports':
        return <AdminReports />;
      default:
        return renderDashboardContent();
    }
  };

  return (
    <>
      <AdminLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={sidebarCounts}
      >
        {renderContent()}
      </AdminLayout>

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
                  <SelectItem value="confirmation">✅ Consultation Confirmed</SelectItem>
                  <SelectItem value="reminder_24h">📅 24-Hour Reminder</SelectItem>
                  <SelectItem value="reminder_1h">⏰ 1-Hour Reminder</SelectItem>
                  <SelectItem value="post_consultation">📝 Post-Consultation Summary</SelectItem>
                  <SelectItem value="follow_up_3days">🔔 3-Day Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message Content</Label>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Type your message here or select a template above..."
                className="min-h-[300px] font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageDialog(false)}>Cancel</Button>
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
              Send a personalized follow-up email to {selectedBooking?.parent_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Consultation Outcome *</Label>
              <Textarea
                value={followUpData.consultationOutcome}
                onChange={(e) => setFollowUpData({...followUpData, consultationOutcome: e.target.value})}
                placeholder="Summarize what was discussed..."
                rows={3}
              />
            </div>
            <div>
              <Label>Recommended Subjects</Label>
              <Input
                value={followUpData.recommendedSubjects.join(', ')}
                onChange={(e) => setFollowUpData({...followUpData, recommendedSubjects: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                placeholder="Mathematics, English, Science"
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

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialog} onOpenChange={setRescheduleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Consultation</DialogTitle>
            <DialogDescription>
              {rescheduleBooking && `Rescheduling consultation for ${rescheduleBooking.student_name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Date</Label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label>New Time (EAT)</Label>
              <Select value={rescheduleTime} onValueChange={setRescheduleTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="02:00 PM">02:00 PM</SelectItem>
                  <SelectItem value="03:00 PM">03:00 PM</SelectItem>
                  <SelectItem value="04:00 PM">04:00 PM</SelectItem>
                  <SelectItem value="05:00 PM">05:00 PM</SelectItem>
                  <SelectItem value="06:00 PM">06:00 PM</SelectItem>
                  <SelectItem value="07:00 PM">07:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialog(false)}>Cancel</Button>
            <Button onClick={handleRescheduleConsultation}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Helper Components
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
        if (!newWin) {
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = application.cv_url.split('/').pop() || 'cv.pdf';
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
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
                onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : undefined)}
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
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Google Meet Link *</Label>
              <div className="flex gap-2">
                <Input
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
            </div>
          </div>
        </div>

        <Textarea
          placeholder="Admin notes (optional)"
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
            Schedule Interview
          </Button>
          <Button onClick={() => onReview(application.id, "reject", notes)} variant="destructive">
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
  const [saving, setSaving] = useState(false);
  const isPending = application.status === 'interview_scheduled';
  const isPassed = application.status === 'passed' || application.status === 'interview_passed';
  const isFailed = application.status === 'failed' || application.status === 'interview_failed';

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("tutor_applications")
        .update({ interview_notes: notes })
        .eq("id", application.id);
      
      if (error) throw error;
      toast.success("Notes saved!");
    } catch (error: any) {
      toast.error("Failed to save notes: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{application.full_name}</CardTitle>
              {isPassed && <Badge className="bg-green-600">Passed</Badge>}
              {isFailed && <Badge className="bg-red-600">Failed</Badge>}
              {isPending && <Badge className="bg-blue-600">Scheduled</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{application.email}</p>
            <Badge variant="secondary" className="mt-2">
              Interview: {formatFullDateTime(application.interview_scheduled_at)}
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
        </div>

        {application.interview_meet_link && (
          <div>
            <p className="font-semibold text-sm">Google Meet Link</p>
            <a href={application.interview_meet_link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
              {application.interview_meet_link}
            </a>
          </div>
        )}

        {/* Notes section - always visible */}
        <div className="space-y-2">
          <p className="font-semibold text-sm">Interview Notes</p>
          <Textarea
            placeholder="Interview notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
          <Button 
            onClick={handleSaveNotes} 
            variant="outline" 
            size="sm"
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Notes"}
          </Button>
        </div>

        {isPending && (
          <div className="flex gap-2 pt-2 border-t">
            <Button onClick={() => onResult(application.id, true, notes)} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Passed - Send Profile Setup
            </Button>
            <Button onClick={() => onResult(application.id, false, notes)} variant="destructive">
              <XCircle className="w-4 h-4 mr-2" />
              Failed
            </Button>
          </div>
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
                    i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
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
          <Button onClick={() => onModerate(review.id, true, notes)} className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve
          </Button>
          <Button onClick={() => onModerate(review.id, false, notes)} variant="destructive">
            <XCircle className="w-4 h-4 mr-2" />
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminDashboard;

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { CheckCircle2, Calendar, Clock, User, BookOpen, MapPin, Video, Mail, ArrowRight, Home } from "lucide-react";

interface BookingDetails {
  id: string;
  subject: string;
  class_type: string;
  status: string;
  meeting_link: string | null;
  amount: number;
  deposit_paid: number;
  balance_due: number;
  student_name: string;
  student_email: string;
  tutor_name: string;
  tutor_email: string;
  start_time: string;
  end_time: string;
}

const BookingConfirmed = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get("bookingId");
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) {
      toast.error("No booking ID provided");
      navigate("/");
      return;
    }

    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      // Fetch booking with related data
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select(`
          *,
          tutor_availability!inner(start_time, end_time)
        `)
        .eq("id", bookingId)
        .maybeSingle();

      if (bookingError) throw bookingError;
      if (!bookingData) {
        toast.error("Booking not found");
        setLoading(false);
        return;
      }

      // Fetch student details
      const { data: studentData } = await supabase
        .from("profiles")
        .select("full_name, id")
        .eq("id", bookingData.student_id)
        .maybeSingle();

      const { data: studentUser } = await supabase.auth.getUser();

      // Fetch tutor profile - note: tutor_id in bookings table IS the tutor_profile id
      const { data: tutorProfile } = await supabase
        .from("tutor_profiles")
        .select("user_id")
        .eq("id", bookingData.tutor_id)
        .maybeSingle();

      // Fetch tutor user profile
      const { data: tutorData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", tutorProfile?.user_id)
        .maybeSingle();

      setBooking({
        id: bookingData.id,
        subject: bookingData.subject,
        class_type: bookingData.class_type,
        status: bookingData.status,
        meeting_link: bookingData.meeting_link,
        amount: bookingData.amount,
        deposit_paid: bookingData.deposit_paid,
        balance_due: bookingData.balance_due,
        student_name: studentData?.full_name || "Student",
        student_email: studentUser?.user?.email || "",
        tutor_name: tutorData?.full_name || "Tutor",
        tutor_email: "",
        start_time: bookingData.tutor_availability.start_time,
        end_time: bookingData.tutor_availability.end_time,
      });
    } catch (error) {
      console.error("Error fetching booking:", error);
      toast.error("Failed to load booking details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[image:var(--gradient-page)]">
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading booking details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[image:var(--gradient-page)]">
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Booking not found</p>
              <Button onClick={() => navigate("/")} className="mt-4">
                Go Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Booking Confirmed!</h1>
            <p className="text-muted-foreground text-lg">
              Your tutoring session has been successfully booked
            </p>
          </div>

          {/* Main Booking Card */}
          <Card className="mb-6">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Session Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Subject</p>
                    <p className="font-semibold">{booking.subject}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tutor</p>
                    <p className="font-semibold">{booking.tutor_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date & Time</p>
                    <p className="font-semibold">
                      {formatInTimeZone(new Date(booking.start_time), "Africa/Nairobi", "EEEE, MMMM d, yyyy")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatInTimeZone(new Date(booking.start_time), "Africa/Nairobi", "h:mm a")} - {formatInTimeZone(new Date(booking.end_time), "Africa/Nairobi", "h:mm a")} EAT
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-semibold">
                      {Math.round((new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / (1000 * 60))} minutes
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {booking.class_type === "online" ? (
                    <Video className="w-5 h-5 text-muted-foreground mt-0.5" />
                  ) : (
                    <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Session Type</p>
                    <Badge variant={booking.class_type === "online" ? "default" : "secondary"}>
                      {booking.class_type === "online" ? "Online" : "Physical"}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Confirmation Email</p>
                    <p className="font-semibold text-sm">Sent to {booking.student_email}</p>
                  </div>
                </div>
              </div>

              {booking.meeting_link && (
                <>
                  <Separator />
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Video className="w-5 h-5 text-blue-600" />
                      <p className="font-semibold">Google Meet Link</p>
                    </div>
                    <a
                      href={booking.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all text-sm"
                    >
                      {booking.meeting_link}
                    </a>
                    <p className="text-xs text-muted-foreground mt-2">
                      The meeting will be available 10 minutes before your session starts
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card className="mb-6">
            <CardHeader className="bg-amber-50 dark:bg-amber-950">
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-semibold">KES {booking.amount.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>{booking.balance_due > 0 ? 'Deposit Paid' : 'Amount Paid'}</span>
                  <span className="font-semibold">KES {booking.deposit_paid.toFixed(0)}</span>
                </div>
                {booking.balance_due > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold text-red-600">
                      <span>Balance Due</span>
                      <span>KES {booking.balance_due.toFixed(0)}</span>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg mt-4">
                      <p className="text-sm text-red-900 dark:text-red-100">
                        ⚠️ Please pay the remaining balance before your session. You can complete payment from your Student Dashboard.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle>What's Next?</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ol className="space-y-3">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    1
                  </span>
                  <p className="text-sm">
                    Check your email for the detailed booking confirmation and session instructions
                  </p>
                </li>
                {booking.balance_due > 0 && (
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                      2
                    </span>
                    <p className="text-sm">
                      Complete the remaining payment from your Student Dashboard
                    </p>
                  </li>
                )}
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    {booking.balance_due > 0 ? "3" : "2"}
                  </span>
                  <p className="text-sm">
                    {booking.class_type === "online" 
                      ? "Join the Google Meet link 5-10 minutes before your session starts"
                      : "Your tutor will contact you to confirm the meeting location"}
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    {booking.balance_due > 0 ? "4" : "3"}
                  </span>
                  <p className="text-sm">
                    View and manage all your bookings from your Student Dashboard
                  </p>
                </li>
              </ol>

              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <Button onClick={() => navigate("/student/dashboard")} className="flex-1">
                  Go to Dashboard
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button onClick={() => navigate("/tutors")} variant="outline" className="flex-1">
                  Book Another Session
                </Button>
                <Button onClick={() => navigate("/")} variant="ghost">
                  <Home className="mr-2 h-4 w-4" />
                  Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmed;

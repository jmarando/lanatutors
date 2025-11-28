import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, Clock, BookOpen } from "lucide-react";
import Navigation from "@/components/Navigation";

type EnrollmentType = "weekly" | "monthly";

interface GroupClass {
  id: string;
  title: string;
  subject: string;
  curriculum: string;
  grade_level: string;
  description: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  tutor_name?: string;
  tutor_bio?: string;
  tutor_profile_slug?: string;
  tutor_profile_id?: string;
}

export default function GroupClassEnrollment() {
  const { classId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [groupClass, setGroupClass] = useState<GroupClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollmentType, setEnrollmentType] = useState<EnrollmentType>("weekly");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to enroll in group classes",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    fetchGroupClass();
  }, [classId, user]);

  const fetchGroupClass = async () => {
    try {
      const { data, error } = await supabase
        .from("group_classes")
        .select(`
          *,
          group_class_tutor_assignments!inner(
            tutor_id,
            is_primary,
            tutor_profiles!inner(
              id,
              user_id,
              bio,
              profile_slug
            )
          )
        `)
        .eq("id", classId)
        .eq("status", "active")
        .eq("group_class_tutor_assignments.is_primary", true)
        .single();

      if (error) throw error;
      
      // Get tutor name from profiles table
      const tutorProfile = data.group_class_tutor_assignments[0]?.tutor_profiles;
      const tutorUserId = tutorProfile?.user_id;
      if (tutorUserId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", tutorUserId)
          .single();
        
        setGroupClass({
          ...data,
          tutor_name: profile?.full_name || "TBA",
          tutor_bio: tutorProfile?.bio,
          tutor_profile_slug: tutorProfile?.profile_slug,
          tutor_profile_id: tutorProfile?.id
        });
      } else {
        setGroupClass({ ...data, tutor_name: "TBA" });
      }
    } catch (error) {
      console.error("Error fetching group class:", error);
      toast({
        title: "Error",
        description: "Failed to load class details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPricing = () => {
    if (!groupClass) return { sessions: 0, total: 0, perSession: 0, discount: 0 };

    const hourlyRate = groupClass.hourly_rate;
    
    switch (enrollmentType) {
      case "weekly":
        return { sessions: 4, total: 1400, perSession: 350, discount: 12.5 };
      case "monthly":
        return { sessions: 16, total: 5600, perSession: 350, discount: 12.5 };
      default:
        return { sessions: 1, total: hourlyRate, perSession: hourlyRate, discount: 0 };
    }
  };

  const handleEnroll = async () => {
    if (!user || !groupClass) return;

    setProcessing(true);
    try {
      const pricing = getPricing();
      const startsAt = new Date().toISOString().split('T')[0];
      let expiresAt;

      if (enrollmentType === "weekly") {
        expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      } else {
        expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }

      // Get user's phone number
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone_number")
        .eq("id", user.id)
        .single();

      if (!profile?.phone_number) {
        toast({
          title: "Phone number required",
          description: "Please update your profile with a phone number to complete enrollment",
          variant: "destructive",
        });
        navigate("/profile-settings");
        return;
      }

      // Create enrollment record
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("group_class_enrollments")
        .insert({
          group_class_id: groupClass.id,
          student_id: user.id,
          enrollment_type: enrollmentType,
          amount_paid: pricing.total,
          starts_at: startsAt,
          expires_at: expiresAt,
          payment_status: "pending",
          status: "active",
        })
        .select()
        .single();

      if (enrollmentError) throw enrollmentError;

      // Initiate Pesapal payment
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        "initiate-pesapal-payment",
        {
          body: {
            amount: pricing.total,
            currency: "KES",
            phoneNumber: profile.phone_number,
            referenceId: enrollment.id,
            paymentType: "group_class_enrollment",
          },
        }
      );

      if (paymentError) throw paymentError;

      if (paymentData?.redirect_url) {
        window.location.href = paymentData.redirect_url;
      } else {
        throw new Error("No payment redirect URL received");
      }
    } catch (error) {
      console.error("Error processing enrollment:", error);
      toast({
        title: "Enrollment failed",
        description: "There was an error processing your enrollment. Please try again.",
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!groupClass) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-8">
          <p className="text-center text-muted-foreground">Class not found</p>
        </div>
      </div>
    );
  }

  const pricing = getPricing();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate("/group-classes")} className="mb-6">
          ← Back to Classes
        </Button>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Class Details */}
          <Card>
            <CardHeader>
              <CardTitle>{groupClass.title}</CardTitle>
              <CardDescription>
                {groupClass.curriculum} • {groupClass.grade_level}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>{groupClass.subject}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-primary" />
                <span>{groupClass.day_of_week}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-primary" />
                <span>{formatTime(groupClass.start_time)} - {formatTime(groupClass.end_time)} EAT</span>
              </div>
              {groupClass.tutor_name && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-1">Your Tutor</p>
                  <p className="text-sm font-medium text-foreground">{groupClass.tutor_name}</p>
                  {groupClass.tutor_bio && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                      {groupClass.tutor_bio}
                    </p>
                  )}
                  {(groupClass.tutor_profile_slug || groupClass.tutor_profile_id) && (
                    <button
                      onClick={() => navigate(`/tutors/${groupClass.tutor_profile_slug || groupClass.tutor_profile_id}`)}
                      className="text-xs text-primary hover:underline mt-1 inline-block"
                    >
                      View Full Profile →
                    </button>
                  )}
                </div>
              )}
              {groupClass.description && (
                <p className="text-sm text-muted-foreground pt-2 border-t">
                  {groupClass.description}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Enrollment Options */}
          <Card>
            <CardHeader>
              <CardTitle>Select Your Plan</CardTitle>
              <CardDescription>Choose how long you'd like to enroll</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={enrollmentType} onValueChange={(value) => setEnrollmentType(value as EnrollmentType)}>
                <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="weekly" id="weekly" />
                  <Label htmlFor="weekly" className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Weekly Pass</p>
                        <p className="text-xs text-muted-foreground">4 sessions</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">KES 1,400</p>
                        <p className="text-xs text-muted-foreground line-through">KES 1,600</p>
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Monthly Pass</p>
                        <p className="text-xs text-muted-foreground">16 sessions (4/week)</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">KES 5,600</p>
                        <p className="text-xs text-muted-foreground line-through">KES 6,400</p>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sessions:</span>
                  <span className="font-medium">{pricing.sessions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Per session:</span>
                  <span className="font-medium">KES {pricing.perSession}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2">
                  <span>Total:</span>
                  <span>KES {pricing.total}</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleEnroll}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Proceed to Payment"
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    // TODO: Navigate to invoice preview page
                    toast({
                      title: "Coming soon",
                      description: "Invoice preview will be available shortly",
                    });
                  }}
                  disabled={processing}
                >
                  Generate Invoice and Pay
                </Button>
              </div>

              <div className="pt-4 border-t space-y-2">
                <p className="text-xs font-medium text-foreground">What happens next?</p>
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li>• You'll receive a confirmation email with your enrollment details</li>
                  <li>• Access to the class meeting link will be available in your Student Dashboard</li>
                  <li>• You'll get reminder emails before each scheduled session</li>
                  <li>• Your tutor will be notified and will reach out if needed</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

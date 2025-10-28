import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, XCircle, AlertCircle, Star } from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingApplications, setPendingApplications] = useState<any[]>([]);
  const [pendingTutors, setPendingTutors] = useState<any[]>([]);
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);

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
          console.log('Application change detected:', payload);
          fetchPendingApplications();
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
    fetchPendingApplications();
    fetchPendingTutors();
    fetchPendingReviews();
    setLoading(false);
  };

  const fetchPendingApplications = async () => {
    console.log("Fetching pending applications...");
    const { data, error } = await supabase
      .from("tutor_applications")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    console.log("Applications data:", data);
    console.log("Applications error:", error);

    if (error) {
      console.error("Error fetching pending applications:", error);
    } else {
      setPendingApplications(data || []);
    }
  };

  const fetchPendingTutors = async () => {
    const { data, error } = await supabase
      .from("tutor_profiles")
      .select(`
        *,
        profiles!tutor_profiles_user_id_fkey(full_name, phone_number)
      `)
      .eq("verified", false);

    if (error) {
      console.error("Error fetching pending tutors:", error);
      // Fetch without join as fallback
      const { data: tutorData } = await supabase
        .from("tutor_profiles")
        .select("*")
        .eq("verified", false);
      
      if (tutorData) {
        const enriched = await Promise.all(
          tutorData.map(async (tutor) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, phone_number")
              .eq("id", tutor.user_id)
              .single();
            return { ...tutor, profiles: profile };
          })
        );
        setPendingTutors(enriched);
      }
    } else {
      setPendingTutors(data || []);
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
    interviewDate?: string
  ) => {
    const application = pendingApplications.find(app => app.id === applicationId);
    if (!application) return;

    if (action === "schedule_interview") {
      try {
        // Create Google Meet link
        const { data: meetData, error: meetError } = await supabase.functions.invoke('create-google-meet-session', {
          body: {
            summary: `ElimuConnect Interview - ${application.full_name}`,
            description: `30-minute interview conversation with ${application.full_name}`,
            startTime: interviewDate,
            duration: 30,
            attendees: [application.email]
          }
        });

        if (meetError) throw meetError;

        // Update application status
        const { error: updateError } = await supabase
          .from("tutor_applications")
          .update({ 
            status: 'interview_scheduled',
            interview_scheduled_at: interviewDate,
            interview_meet_link: meetData.meetLink,
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
            meetLink: meetData.meetLink,
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
    }
  };

  const handleInterviewResult = async (
    applicationId: string,
    passed: boolean,
    notes?: string
  ) => {
    const application = pendingApplications.find(app => app.id === applicationId);
    if (!application) return;

    try {
      if (passed) {
        // Update to interview_passed and send approval email
        const { error: updateError } = await supabase
          .from("tutor_applications")
          .update({ 
            status: 'interview_passed',
            interview_notes: notes || null,
            updated_at: new Date().toISOString()
          })
          .eq("id", applicationId);

        if (updateError) throw updateError;

        // Send approval email with profile setup link
        await supabase.functions.invoke('send-tutor-approval-email', {
          body: { 
            email: application.email,
            fullName: application.full_name 
          }
        });

        toast.success("Interview passed! Profile setup invitation sent.");
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

      fetchPendingApplications();
    } catch (error: any) {
      console.error("Error updating interview result:", error);
      toast.error("Failed to update interview result");
    }
  };

  const handleTutorApproval = async (tutorId: string, approved: boolean) => {
    const { error } = await supabase
      .from("tutor_profiles")
      .update({ verified: approved })
      .eq("id", tutorId);

    if (error) {
      toast.error("Failed to update tutor status");
      return;
    }

    toast.success(approved ? "Tutor approved!" : "Tutor rejected");
    fetchPendingTutors();
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

  if (loading) {
    return <div className="min-h-screen bg-[image:var(--gradient-page)] flex items-center justify-center">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList>
            <TabsTrigger value="applications" className="relative">
              Initial Applications
              {pendingApplications.filter(a => a.status === 'pending').length > 0 && (
                <Badge className="ml-2 bg-orange-600">
                  {pendingApplications.filter(a => a.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="interviews" className="relative">
              Scheduled Interviews
              {pendingApplications.filter(a => a.status === 'interview_scheduled').length > 0 && (
                <Badge className="ml-2 bg-blue-600">
                  {pendingApplications.filter(a => a.status === 'interview_scheduled').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="profiles" className="relative">
              Profile Reviews
              {pendingTutors.length > 0 && (
                <Badge className="ml-2 bg-purple-600">{pendingTutors.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reviews" className="relative">
              Student Reviews
              {pendingReviews.length > 0 && (
                <Badge className="ml-2 bg-green-600">{pendingReviews.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="space-y-4">
            <div className="bg-muted/50 border rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-2">Step 1: Initial Vetting</h3>
              <p className="text-sm text-muted-foreground">
                Review credentials and decide whether to invite for an expert conversation or reject.
              </p>
            </div>
            {pendingApplications.filter(a => a.status === 'pending').length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No pending initial applications
                </CardContent>
              </Card>
            ) : (
              pendingApplications
                .filter(a => a.status === 'pending')
                .map((application) => (
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
                Scheduled interviews. After the interview, mark as passed or failed.
              </p>
            </div>
            {pendingApplications.filter(a => a.status === 'interview_scheduled').length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No scheduled interviews
                </CardContent>
              </Card>
            ) : (
              pendingApplications
                .filter(a => a.status === 'interview_scheduled')
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
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleTutorApproval(tutor.id, false)}
                          variant="destructive"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="font-semibold">Subjects</p>
                        <p className="text-sm text-muted-foreground">
                          {tutor.subjects?.join(", ") || "None"}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold">Curriculum</p>
                        <p className="text-sm text-muted-foreground">
                          {tutor.curriculum?.join(", ") || "None"}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold">Institution</p>
                        <p className="text-sm text-muted-foreground">
                          {tutor.current_institution || "Not specified"}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold">Experience</p>
                        <p className="text-sm text-muted-foreground">
                          {tutor.experience_years} years
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold">Hourly Rate</p>
                        <p className="text-sm text-muted-foreground">
                          KES {tutor.hourly_rate}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold">Qualifications</p>
                        <p className="text-sm text-muted-foreground">
                          {tutor.qualifications?.join(", ") || "None"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold mb-2">Bio</p>
                      <p className="text-sm text-muted-foreground">{tutor.bio}</p>
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
        </Tabs>
      </div>
    </div>
  );
};

const ApplicationReviewCard = ({ application, onReview }: any) => {
  const [notes, setNotes] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [loadingCv, setLoadingCv] = useState(false);

  const handleViewCv = async () => {
    if (!application.cv_url) return;
    
    setLoadingCv(true);
    try {
      const { data, error } = await supabase.storage
        .from('tutor-cvs')
        .createSignedUrl(application.cv_url, 3600);

      if (error) throw error;
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error: any) {
      console.error("Error generating CV URL:", error);
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
              Applied: {new Date(application.created_at).toLocaleDateString()}
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

        <div className="space-y-2">
          <Label htmlFor={`interview-date-${application.id}`}>Schedule Interview Date & Time</Label>
          <Input
            id={`interview-date-${application.id}`}
            type="datetime-local"
            value={interviewDate}
            onChange={(e) => setInterviewDate(e.target.value)}
            className="max-w-md"
          />
        </div>

        <Textarea
          placeholder="Admin notes (optional - for internal use only)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        <div className="flex gap-2 mt-4">
          <Button
            onClick={() => onReview(application.id, "schedule_interview", notes, interviewDate)}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!interviewDate}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Schedule Interview
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{application.full_name}</CardTitle>
            <p className="text-sm text-muted-foreground">{application.email}</p>
            <p className="text-sm text-muted-foreground">{application.phone_number}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">
                Interview: {new Date(application.interview_scheduled_at).toLocaleString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
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

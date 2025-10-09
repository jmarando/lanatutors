import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle, XCircle, AlertCircle, Star } from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingTutors, setPendingTutors] = useState<any[]>([]);
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

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
    fetchPendingTutors();
    fetchPendingReviews();
    setLoading(false);
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
    return <div className="min-h-screen bg-secondary/20 flex items-center justify-center">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-secondary/20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

        <Tabs defaultValue="tutors" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tutors" className="relative">
              Pending Tutors
              {pendingTutors.length > 0 && (
                <Badge className="ml-2 bg-orange-600">{pendingTutors.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reviews" className="relative">
              Pending Reviews
              {pendingReviews.length > 0 && (
                <Badge className="ml-2 bg-orange-600">{pendingReviews.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tutors" className="space-y-4">
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

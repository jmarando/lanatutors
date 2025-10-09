import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, GraduationCap, Clock, BookOpen, Award, MapPin, Users, CheckCircle2, Heart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BookingCalendar } from "@/components/BookingCalendar";
import tutor1 from "@/assets/tutor-1.jpg";
import tutor2 from "@/assets/tutor-2.jpg";
import tutor3 from "@/assets/tutor-3.jpg";
import tutor4 from "@/assets/tutor-4.jpg";
import tutor5 from "@/assets/tutor-5.jpg";
import tutor6 from "@/assets/tutor-6.jpg";

const TutorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [tutor, setTutor] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    fetchTutorProfile();
    fetchCurrentUser();
    fetchReviews();
  }, [id]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      setCurrentUser({
        id: user.id,
        email: user.email,
        name: profile?.full_name || "Student",
      });
    }
  };

  const fetchTutorProfile = async () => {
    setLoading(true);
    const { data: tutorProfile, error } = await supabase
      .from("tutor_profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching tutor:", error);
      toast.error("Failed to load tutor profile");
      setLoading(false);
      return;
    }

    if (tutorProfile) {
      // Fetch profile separately
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", tutorProfile.user_id)
        .single();

      // Get user email
      const { data: { user: tutorUser } } = await supabase.auth.getUser();
      
      const tutorImages = [tutor1, tutor2, tutor3, tutor4, tutor5, tutor6];
      const randomImage = tutorImages[Math.floor(Math.random() * tutorImages.length)];
      
      setTutor({
        id: tutorProfile.id,
        userId: tutorProfile.user_id,
        name: profile?.full_name || "Tutor",
        email: tutorUser?.email || "",
        subjects: tutorProfile.subjects || [],
        school: tutorProfile.current_institution || "Not specified",
        rating: Number(tutorProfile.rating) || 0,
        reviews: tutorProfile.total_reviews || 0,
        hourlyRate: Number(tutorProfile.hourly_rate) || 0,
        photo: profile?.full_name 
          ? profile.full_name.split(' ').map((n: string) => n[0]).join('') 
          : "T",
        photoUrl: randomImage,
        bio: tutorProfile.bio || "",
        education: Array.isArray(tutorProfile.qualifications) 
          ? tutorProfile.qualifications.join(", ") 
          : "Not specified",
        graduationYear: tutorProfile.graduation_year,
        experience: tutorProfile.experience_years || 0,
        teachingExperience: tutorProfile.teaching_experience || [],
        tutoringExperience: tutorProfile.tutoring_experience || "",
        curriculum: tutorProfile.curriculum || [],
        servicesOffered: tutorProfile.services_offered || [],
        specializations: tutorProfile.specializations || "",
        teachingLocation: tutorProfile.teaching_location || "",
        teachingMode: tutorProfile.teaching_mode || [],
        whyStudentsLove: tutorProfile.why_students_love || [],
      });
    }
    setLoading(false);
  };

  const fetchReviews = async () => {
    const { data: reviewsData } = await supabase
      .from("tutor_reviews")
      .select("*")
      .eq("tutor_id", id)
      .eq("is_approved", true)
      .order("created_at", { ascending: false });

    if (reviewsData) {
      // Fetch student names separately
      const studentIds = reviewsData.map(r => r.student_id);
      const { data: students } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);

      const studentsMap = new Map(students?.map(s => [s.id, s]) || []);
      
      const enrichedReviews = reviewsData.map(review => ({
        ...review,
        profiles: studentsMap.get(review.student_id),
      }));

      setReviews(enrichedReviews);
    }
  };

  const handleBookSession = () => {
    if (!currentUser) {
      toast.error("Please log in to book a session");
      navigate("/login");
      return;
    }
    setIsBookingOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[image:var(--gradient-page)] flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen bg-[image:var(--gradient-page)] flex items-center justify-center">
        <p>Tutor not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header Card */}
        <Card className="mb-6 border-border/50">
          <CardContent className="p-0">
            <div className="p-8 border-b border-border/50">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <Avatar className="w-28 h-28 shrink-0 border-4 border-primary/20">
                  <AvatarImage src={tutor.photoUrl} alt={tutor.name} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground font-semibold">
                    {tutor.photo}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl font-bold mb-2">{tutor.name}</h1>
                  <p className="text-base text-muted-foreground mb-3">
                    {tutor.subjects.join(" • ")}
                  </p>
                  {tutor.teachingLocation && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>{tutor.teachingLocation}</span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {tutor.school}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/30">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 shrink-0 fill-yellow-500 text-yellow-500" />
                  <span className="font-bold text-lg">{tutor.rating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">({tutor.reviews} reviews)</span>
                </div>
                
                <div className="h-8 w-px bg-border" />
                
                <div className="text-2xl font-bold">
                  KES {tutor.hourlyRate.toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground">/hr</span>
                </div>
              </div>

              <Button size="lg" onClick={handleBookSession} className="w-full sm:w-auto">
                Book Session
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Services & Teaching Mode */}
        {(tutor.servicesOffered.length > 0 || tutor.teachingMode.length > 0) && (
          <Card className="mb-6 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg">Services Offered</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {tutor.servicesOffered.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">What I Offer:</h3>
                    <div className="flex flex-wrap gap-2">
                      {tutor.servicesOffered.map((service: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {tutor.teachingMode.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Teaching Format:</h3>
                    <div className="flex flex-wrap gap-2">
                      {tutor.teachingMode.map((mode: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {mode}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Experience Timeline */}
        <Card className="mb-6 border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Teaching Experience</h2>
            </div>
            
            {/* Overall Experience Summary */}
            <div className="mb-6 pb-6 border-b border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold">Total Teaching Experience:</span>
                <span className="text-muted-foreground">
                  {tutor.experience} {tutor.experience === 1 ? 'year' : 'years'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {tutor.curriculum.map((curr: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {curr}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Teaching Experience Timeline */}
            {tutor.teachingExperience.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-sm mb-4">Professional Teaching Positions</h3>
                <div className="space-y-4">
                  {tutor.teachingExperience.map((exp: any, idx: number) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-primary shrink-0" />
                        {idx < tutor.teachingExperience.length - 1 && (
                          <div className="w-px h-full bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between gap-4 mb-1">
                          <h4 className="font-semibold text-sm">{exp.institution}</h4>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {exp.years} {exp.years === 1 ? 'year' : 'years'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{exp.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tutoring Experience */}
            {tutor.tutoringExperience && (
              <div>
                <h3 className="font-semibold text-sm mb-3">Private Tutoring Experience</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tutor.tutoringExperience}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Education */}
        <Card className="mb-6 border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Education</h2>
            </div>
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-sm mb-1">{tutor.education}</p>
                <p className="text-sm text-muted-foreground">{tutor.school}</p>
                {tutor.graduationYear && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Graduated: {tutor.graduationYear}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Why Students Love This Tutor */}
        {tutor.whyStudentsLove.length > 0 && (
          <Card className="mb-6 border-border/50 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-primary fill-primary" />
                <h2 className="font-bold text-lg">Why Students Love {tutor.name.split(' ')[0]}</h2>
              </div>
              <ul className="space-y-3">
                {tutor.whyStudentsLove.map((reason: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground leading-relaxed">{reason}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* About / Bio */}
        <Card className="mb-6 border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">About Me</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {tutor.bio || "No bio provided yet."}
            </p>
          </CardContent>
        </Card>

        {/* Specializations */}
        {tutor.specializations && (
          <Card className="mb-6 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg">Specializations & Topics</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {tutor.specializations}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Star className="w-5 h-5 text-primary fill-primary" />
                <h2 className="font-bold text-lg">Student Reviews ({reviews.length})</h2>
              </div>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="pb-4 border-b border-border/50 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{review.profiles?.full_name || "Student"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating
                                ? "fill-yellow-500 text-yellow-500"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {review.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Booking Dialog */}
        <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Book a Session with {tutor.name}</DialogTitle>
              <DialogDescription>
                Select a date and available time slot
              </DialogDescription>
            </DialogHeader>
            
            {currentUser && (
              <BookingCalendar
                tutorId={tutor.userId}
                tutorName={tutor.name}
                tutorEmail={tutor.email}
                studentEmail={currentUser.email}
                studentName={currentUser.name}
                hourlyRate={tutor.hourlyRate}
                onBookingComplete={() => setIsBookingOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default TutorProfile;

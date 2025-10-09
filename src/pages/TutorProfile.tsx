import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, GraduationCap, Clock, BookOpen, Award } from "lucide-react";
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

  useEffect(() => {
    fetchTutorProfile();
    fetchCurrentUser();
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
        experience: tutorProfile.experience_years || 0,
        curriculum: tutorProfile.curriculum || [],
      });
    }
    setLoading(false);
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
      <div className="min-h-screen bg-secondary/20 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen bg-secondary/20 flex items-center justify-center">
        <p>Tutor not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/20">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header Card */}
        <Card className="mb-6 border-border/50">
          <CardContent className="p-0">
            <div className="p-8 border-b border-border/50">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <Avatar className="w-24 h-24 shrink-0">
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
                  <p className="text-sm text-muted-foreground/80">
                    {tutor.school}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 shrink-0 fill-yellow-500 text-yellow-500" />
                  <span className="font-bold text-lg">{tutor.rating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">({tutor.reviews})</span>
                </div>
                
                <div className="h-8 w-px bg-border" />
                
                <div className="text-2xl font-bold">
                  KES {tutor.hourlyRate.toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground">/hr</span>
                </div>
              </div>

              <Button size="lg" onClick={handleBookSession}>
                Book Session
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Grid */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <Card className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm mb-1">Experience</h3>
                  <p className="text-sm text-muted-foreground">
                    {tutor.experience} {tutor.experience === 1 ? 'year' : 'years'} teaching
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <Award className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm mb-1">Curriculum</h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tutor.curriculum.length > 0 ? (
                      tutor.curriculum.map((curr: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {curr}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Not specified</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* About Section */}
        <Card className="mb-4 border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">About</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {tutor.bio || "No bio provided yet."}
            </p>
          </CardContent>
        </Card>

        {/* Education Section */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Education</h2>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{tutor.education}</p>
              <p className="text-sm">
                <span className="font-medium">Institution:</span>{" "}
                <span className="text-muted-foreground">{tutor.school}</span>
              </p>
            </div>
          </CardContent>
        </Card>

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

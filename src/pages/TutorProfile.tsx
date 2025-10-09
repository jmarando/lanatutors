import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, GraduationCap, Clock, BookOpen, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BookingCalendar } from "@/components/BookingCalendar";

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
        photo: profile?.full_name?.split(' ').map((n: string) => n[0]).join('') || "T",
        bio: tutorProfile.bio || "",
        education: tutorProfile.qualifications?.join(", ") || "Not specified",
        experience: `${tutorProfile.experience_years || 0} years`,
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
      <div className="max-w-5xl mx-auto px-6 py-12">
        <Card className="mb-6">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-8">
              <Avatar className="w-32 h-32 border-4 border-cyan-600">
                <AvatarFallback className="text-3xl bg-gradient-to-br from-cyan-600 to-cyan-700 text-white">
                  {tutor.photo}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{tutor.name}</h1>
                <p className="text-cyan-600 font-medium text-lg mb-3">
                  {tutor.subjects.join(", ")}
                </p>
                
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-xl">{tutor.rating}</span>
                  <span className="text-muted-foreground">({tutor.reviews} reviews)</span>
                </div>

                <div className="text-3xl font-bold text-orange-600 mb-6">
                  KES {tutor.hourlyRate}/hr
                </div>

                <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white" onClick={handleBookSession}>
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Book a Session
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <BookOpen className="w-6 h-6 text-cyan-600" />
                <h2 className="text-2xl font-bold">About</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">{tutor.bio}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <GraduationCap className="w-6 h-6 text-cyan-600" />
                <h2 className="text-2xl font-bold">Education</h2>
              </div>
              <p className="text-muted-foreground mb-4">{tutor.education}</p>
              <p className="text-sm">
                <span className="font-semibold">Institution:</span> {tutor.school}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-6 h-6 text-cyan-600" />
                <h2 className="text-2xl font-bold">Experience</h2>
              </div>
              <p className="text-muted-foreground">{tutor.experience} of teaching experience</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-6 h-6 text-cyan-600" />
                <h2 className="text-2xl font-bold">Availability</h2>
              </div>
              <ul className="space-y-2">
                {tutor.availability.map((slot, index) => (
                  <li key={index} className="text-muted-foreground">• {slot}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

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

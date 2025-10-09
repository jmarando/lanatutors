import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, GraduationCap, Clock, BookOpen, MessageCircle } from "lucide-react";

const TutorProfile = () => {
  const { id } = useParams();

  // Mock data - will be replaced with database query
  const tutor = {
    id: 1,
    name: "Sarah Wanjiru",
    subjects: ["Math", "Physics"],
    school: "University of Nairobi",
    rating: 4.9,
    reviews: 85,
    hourlyRate: 1500,
    photo: "SW",
    bio: "Passionate mathematics and physics tutor with 5+ years of experience helping students achieve their academic goals. I specialize in making complex concepts simple and engaging.",
    education: "Bachelor of Science in Mathematics, University of Nairobi",
    experience: "5 years",
    availability: ["Monday 2PM-6PM", "Wednesday 2PM-6PM", "Friday 2PM-6PM"],
  };

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

                <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white">
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
      </div>
    </div>
  );
};

export default TutorProfile;

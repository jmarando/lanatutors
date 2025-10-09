import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TutorSearch = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedCurriculum, setSelectedCurriculum] = useState("all");
  const [sortBy, setSortBy] = useState("rating");
  const [tutors, setTutors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTutors();
  }, []);

  const fetchTutors = async () => {
    setLoading(true);
    const { data: tutorProfiles, error } = await supabase
      .from("tutor_profiles")
      .select(`
        *,
        profiles!inner(full_name, avatar_url)
      `)
      .eq("verified", true);

    if (error) {
      console.error("Error fetching tutors:", error);
      toast.error("Failed to load tutors");
      setLoading(false);
      return;
    }

    const formattedTutors = (tutorProfiles || []).map((tp: any) => ({
      id: tp.id,
      name: tp.profiles?.full_name || "Tutor",
      subjects: tp.subjects || [],
      curriculum: tp.curriculum || [],
      school: tp.current_institution || "Not specified",
      rating: Number(tp.rating) || 0,
      reviews: tp.total_reviews || 0,
      hourlyRate: Number(tp.hourly_rate) || 0,
      photo: tp.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('') || "T",
    }));

    setTutors(formattedTutors);
    setLoading(false);
  };

  const subjects = ["all", "Math", "Physics", "Chemistry", "Biology", "English", "Kiswahili", "History", "Geography"];

  const filteredTutors = tutors
    .filter(tutor => {
      const matchesSearch = 
        tutor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tutor.subjects.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
        tutor.school.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSubject = selectedSubject === "all" || tutor.subjects.includes(selectedSubject);
      const matchesCurriculum = selectedCurriculum === "all" || tutor.curriculum.includes(selectedCurriculum);
      
      return matchesSearch && matchesSubject && matchesCurriculum;
    })
    .sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "price-low") return a.hourlyRate - b.hourlyRate;
      if (sortBy === "price-high") return b.hourlyRate - a.hourlyRate;
      if (sortBy === "reviews") return b.reviews - a.reviews;
      return 0;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/20 flex items-center justify-center">
        <p>Loading tutors...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-3">Find Your Perfect Tutor</h1>
          <p className="text-muted-foreground text-lg">
            Search our network of expert tutors to find the right one for you.
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-8 max-w-5xl mx-auto flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, subject, school..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          
          <Select value={selectedCurriculum} onValueChange={setSelectedCurriculum}>
            <SelectTrigger className="w-48 h-12">
              <SelectValue placeholder="All Curricula" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Curricula</SelectItem>
              <SelectItem value="CBC">CBC</SelectItem>
              <SelectItem value="IGCSE">IGCSE</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-48 h-12">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map(subject => (
                <SelectItem key={subject} value={subject}>
                  {subject === "all" ? "All Subjects" : subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48 h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Sort by Rating</SelectItem>
              <SelectItem value="reviews">Most Reviews</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tutors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {filteredTutors.map((tutor) => (
            <Card key={tutor.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="w-20 h-20 border-4 border-cyan-600">
                    <AvatarFallback className="text-lg bg-gradient-to-br from-cyan-600 to-cyan-700 text-white">
                      {tutor.photo}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold mb-1">{tutor.name}</h3>
                    <p className="text-cyan-600 font-medium text-sm mb-1">
                      {tutor.subjects.join(", ")}
                    </p>
                    <p className="text-xs text-muted-foreground mb-1">
                      {tutor.curriculum.join(" • ")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tutor.school}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 mb-4">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-lg">{tutor.rating}</span>
                  <span className="text-muted-foreground">({tutor.reviews} reviews)</span>
                </div>

                <div className="text-2xl font-bold text-orange-600 mb-4">
                  KES {tutor.hourlyRate}/hr
                </div>

                <Button 
                  onClick={() => navigate(`/tutors/${tutor.id}`)}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-11"
                >
                  View Profile
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TutorSearch;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Star, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import tutor1 from "@/assets/tutor-1.jpg";
import tutor2 from "@/assets/tutor-2.jpg";
import tutor3 from "@/assets/tutor-3.jpg";
import tutor4 from "@/assets/tutor-4.jpg";
import tutor5 from "@/assets/tutor-5.jpg";
import tutor6 from "@/assets/tutor-6.jpg";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const TutorSearch = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedCurriculum, setSelectedCurriculum] = useState("all");
  const [sortBy, setSortBy] = useState("rating");
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [minRating, setMinRating] = useState(0);
  const [tutors, setTutors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTutors();
  }, []);

  const fetchTutors = async () => {
    setLoading(true);

    try {
      // 1) Fetch tutor profiles (verified)
      const { data: tutorProfiles, error: tutorError } = await supabase
        .from("tutor_profiles")
        .select("*")
        .eq("verified", true);

      if (tutorError) throw tutorError;

      const profilesById = new Map<string, any>();

      // 2) Fetch matching user profiles and index by id
      const userIds = (tutorProfiles || []).map((tp: any) => tp.user_id).filter(Boolean);
      if (userIds.length) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);
        if (profileError) throw profileError;
        (profiles || []).forEach((p: any) => profilesById.set(p.id, p));
      }

      // 3) Merge and format
      const tutorImages = [tutor1, tutor2, tutor3, tutor4, tutor5, tutor6];
      const formattedTutors = (tutorProfiles || []).map((tp: any, index: number) => {
        const prof = profilesById.get(tp.user_id);
        const name = prof?.full_name || "Tutor";
        return {
          id: tp.id,
          name,
          subjects: tp.subjects || [],
          curriculum: tp.curriculum || [],
          school: tp.current_institution || "Not specified",
          rating: Number(tp.rating) || 0,
          reviews: tp.total_reviews || 0,
          hourlyRate: Number(tp.hourly_rate) || 0,
          photo: name.split(' ').map((n: string) => n[0]).join('') || "T",
          photoUrl: tutorImages[index % tutorImages.length],
        };
      });

      setTutors(formattedTutors);
    } catch (err) {
      console.error("Error fetching tutors:", err);
      toast.error("Failed to load tutors");
    } finally {
      setLoading(false);
    }
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
      const matchesPrice = tutor.hourlyRate >= priceRange[0] && tutor.hourlyRate <= priceRange[1];
      const matchesRating = tutor.rating >= minRating;
      
      return matchesSearch && matchesSubject && matchesCurriculum && matchesPrice && matchesRating;
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
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-3">Find Your Tutor</h1>
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
              <SelectItem value="CBC">CBC (Kenyan)</SelectItem>
              <SelectItem value="IGCSE">IGCSE</SelectItem>
              <SelectItem value="IB">IB (International Baccalaureate)</SelectItem>
              <SelectItem value="A-Level">A-Level</SelectItem>
              <SelectItem value="AP">AP (Advanced Placement)</SelectItem>
              <SelectItem value="8-4-4">8-4-4 (Kenyan)</SelectItem>
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

          {/* Advanced Filters Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-12">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Advanced Filters</SheetTitle>
                <SheetDescription>
                  Refine your tutor search with advanced filters
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                {/* Price Range */}
                <div>
                  <Label className="mb-3 block">
                    Price Range: KES {priceRange[0]} - KES {priceRange[1]}/hr
                  </Label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={5000}
                    min={0}
                    step={100}
                    className="mb-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>KES 0</span>
                    <span>KES 5,000</span>
                  </div>
                </div>

                {/* Minimum Rating */}
                <div>
                  <Label className="mb-3 block">Minimum Rating: {minRating}★</Label>
                  <Slider
                    value={[minRating]}
                    onValueChange={(val) => setMinRating(val[0])}
                    max={5}
                    min={0}
                    step={0.5}
                    className="mb-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0★</span>
                    <span>5★</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => {
                    setPriceRange([0, 5000]);
                    setMinRating(0);
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Results Count */}
        <div className="max-w-7xl mx-auto mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredTutors.length} of {tutors.length} tutors
          </p>
        </div>

        {/* Tutors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {filteredTutors.map((tutor) => (
            <Card key={tutor.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50">
              <CardContent className="p-0">
                {/* Header Section */}
                <div className="p-6 pb-4 border-b border-border/50">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16 shrink-0">
                      <AvatarImage src={tutor.photoUrl} alt={tutor.name} />
                      <AvatarFallback className="text-base bg-primary text-primary-foreground font-semibold">
                        {tutor.photo}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold mb-1.5 leading-tight truncate">{tutor.name}</h3>
                      <p className="text-sm text-muted-foreground mb-1 leading-snug line-clamp-1">
                        {tutor.subjects.join(", ")}
                      </p>
                      <p className="text-xs text-muted-foreground/80 leading-snug">
                        {tutor.school}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Details Section */}
                <div className="px-6 py-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium">{tutor.curriculum.join(" • ")}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 shrink-0 fill-yellow-500 text-yellow-500" />
                      <span className="font-semibold text-sm">{tutor.rating.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({tutor.reviews})</span>
                    </div>
                    
                    <div className="text-sm space-y-0.5">
                      <div className="font-bold text-foreground">
                        Online: KES {tutor.hourlyRate.toLocaleString()}<span className="text-xs font-normal">/hr</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        In-Person: KES {Math.round(tutor.hourlyRate * 1.3).toLocaleString()}/hr
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="px-6 pb-6">
                  <Button 
                    onClick={() => navigate(`/tutors/${tutor.id}`)}
                    className="w-full h-10"
                    variant="default"
                  >
                    View Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TutorSearch;

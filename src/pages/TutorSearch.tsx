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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Star, SlidersHorizontal, Calendar as CalendarIcon, Clock } from "lucide-react";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TutorTierBadge, TierExplainer } from "@/components/TutorTierBadge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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
  
  // New availability filters
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("all");
  const [availabilityMap, setAvailabilityMap] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    fetchTutors();
  }, []);

  useEffect(() => {
    if (selectedDate && selectedTimeSlot !== "all") {
      fetchAvailability();
    }
  }, [selectedDate, selectedTimeSlot, tutors]);

  const fetchAvailability = async () => {
    if (!selectedDate || selectedTimeSlot === "all") return;

    try {
      // Parse time slot (e.g., "morning" -> 6-12)
      const timeRanges: Record<string, { start: number; end: number }> = {
        morning: { start: 6, end: 12 },
        afternoon: { start: 12, end: 17 },
        evening: { start: 17, end: 21 },
      };

      const range = timeRanges[selectedTimeSlot];
      if (!range) return;

      const startDate = new Date(selectedDate);
      startDate.setHours(range.start, 0, 0, 0);
      
      const endDate = new Date(selectedDate);
      endDate.setHours(range.end, 0, 0, 0);

      // Fetch availability for all tutors for the selected date/time
      const { data: availability } = await supabase
        .from("tutor_availability")
        .select("tutor_id")
        .gte("start_time", startDate.toISOString())
        .lte("start_time", endDate.toISOString())
        .eq("is_booked", false);

      // Create a map of tutor_id -> has availability
      const newMap = new Map<string, boolean>();
      
      // Get tutor_id to profile_id mapping
      tutors.forEach(tutor => {
        const hasSlots = availability?.some(slot => 
          tutors.find(t => t.id === slot.tutor_id)
        ) || false;
        newMap.set(tutor.id, hasSlots);
      });

      // Actually check properly by fetching tutor profiles
      const { data: tutorProfiles } = await supabase
        .from("tutor_profiles")
        .select("id, user_id")
        .in("id", tutors.map(t => t.id));

      const tutorIdMap = new Map(tutorProfiles?.map(tp => [tp.id, tp.user_id]) || []);
      
      availability?.forEach(slot => {
        const tutorProfileId = tutors.find(t => tutorIdMap.get(t.id) === slot.tutor_id)?.id;
        if (tutorProfileId) {
          newMap.set(tutorProfileId, true);
        }
      });

      setAvailabilityMap(newMap);
    } catch (error) {
      console.error("Error fetching availability:", error);
    }
  };

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
      const tierRates = {
        gold: 2000,
        silver: 1750,
        bronze: 1500,
      };
      
      const formattedTutors = (tutorProfiles || []).map((tp: any, index: number) => {
        const prof = profilesById.get(tp.user_id);
        const name = prof?.full_name || "Tutor";
        const tier = tp.tier || "bronze";
        const hourlyRate = tierRates[tier as keyof typeof tierRates];
        
        return {
          id: tp.id,
          name,
          subjects: tp.subjects || [],
          curriculum: tp.curriculum || [],
          school: tp.current_institution || "Not specified",
          rating: Number(tp.rating) || 0,
          reviews: tp.total_reviews || 0,
          hourlyRate,
          tier,
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

  const timeSlots = [
    { value: "all", label: "Any Time" },
    { value: "morning", label: "Morning (6 AM - 12 PM)" },
    { value: "afternoon", label: "Afternoon (12 PM - 5 PM)" },
    { value: "evening", label: "Evening (5 PM - 9 PM)" },
  ];

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
      
      // Availability filter
      const matchesAvailability = !selectedDate || selectedTimeSlot === "all" || 
        availabilityMap.get(tutor.id) === true;
      
      return matchesSearch && matchesSubject && matchesCurriculum && matchesPrice && matchesRating && matchesAvailability;
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
      <SEO 
        title="Find Verified Tutors in Kenya"
        description="Browse 500+ verified tutors from top Kenyan schools. Filter by subject, curriculum (CBC, IGCSE), rating, and price. Book online or in-person tutoring sessions."
        keywords="find tutors Kenya, hire tutor Nairobi, CBC tutors, IGCSE tutors, verified teachers Kenya"
      />
      
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-3">Find Your Tutor</h1>
            <p className="text-muted-foreground text-lg">
              Search our network of expert tutors to find the right one for you.
            </p>
          </div>
          
          {/* Tier Explainer */}
          <div className="max-w-3xl mx-auto mb-8">
            <TierExplainer />
          </div>
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

          {/* Date Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("h-12 justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Any Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-background" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
                className="pointer-events-auto"
              />
              {selectedDate && (
                <div className="p-3 border-t">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full"
                    onClick={() => {
                      setSelectedDate(undefined);
                      setSelectedTimeSlot("all");
                      setAvailabilityMap(new Map());
                    }}
                  >
                    Clear Date
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Time Slot Filter */}
          <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot}>
            <SelectTrigger className="w-56 h-12">
              <Clock className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background">
              {timeSlots.map(slot => (
                <SelectItem key={slot.value} value={slot.value}>
                  {slot.label}
                </SelectItem>
              ))}
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              Showing {filteredTutors.length} of {tutors.length} tutors
              {selectedDate && selectedTimeSlot !== "all" && (
                <span className="ml-2 text-primary">
                  • Available on {format(selectedDate, "MMM d")} ({timeSlots.find(t => t.value === selectedTimeSlot)?.label.split(' ')[0]})
                </span>
              )}
            </p>
            {(selectedDate || selectedTimeSlot !== "all" || selectedSubject !== "all" || selectedCurriculum !== "all" || minRating > 0) && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setSelectedDate(undefined);
                  setSelectedTimeSlot("all");
                  setSelectedSubject("all");
                  setSelectedCurriculum("all");
                  setMinRating(0);
                  setPriceRange([0, 5000]);
                  setAvailabilityMap(new Map());
                }}
              >
                Clear All Filters
              </Button>
            )}
          </div>
        </div>

        {/* Tutors Grid */}
        {filteredTutors.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl font-semibold mb-2">No tutors found</p>
            <p className="text-muted-foreground mb-6">
              Try adjusting your filters or search criteria
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setSelectedDate(undefined);
                setSelectedTimeSlot("all");
                setSelectedSubject("all");
                setSelectedCurriculum("all");
                setMinRating(0);
                setPriceRange([0, 5000]);
                setAvailabilityMap(new Map());
              }}
            >
              Reset All Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {filteredTutors.map((tutor) => (
            <Card key={tutor.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 bg-card">
              <CardContent className="p-6">
                {/* Avatar and Name Section */}
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="w-20 h-20 shrink-0 ring-2 ring-border/50">
                    <AvatarImage src={tutor.photoUrl} alt={tutor.name} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
                      {tutor.photo}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-xl font-bold leading-tight">{tutor.name}</h3>
                      <TutorTierBadge tier={tutor.tier} size="sm" showTooltip={true} />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1 leading-snug">
                      {tutor.subjects.join(", ")}
                    </p>
                    <p className="text-xs text-muted-foreground/80">
                      {tutor.school}
                    </p>
                  </div>
                </div>

                {/* Stats Section */}
                <div className="flex items-center justify-between py-3 mb-4 border-y border-border/50">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 shrink-0 fill-yellow-500 text-yellow-500" />
                    <span className="font-semibold text-sm">{tutor.rating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">({tutor.reviews})</span>
                  </div>
                  
                  <div className="text-xs text-muted-foreground font-medium">
                    {tutor.curriculum.join(" • ")}
                  </div>
                </div>

                {/* Pricing Section */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Online</span>
                    <span className="text-lg font-bold text-foreground">
                      KES {tutor.hourlyRate.toLocaleString()}
                      <span className="text-xs font-normal text-muted-foreground">/hr</span>
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">In-Person</span>
                    <span className="text-sm font-semibold text-muted-foreground">
                      KES {Math.round(tutor.hourlyRate * 1.3).toLocaleString()}
                      <span className="text-xs font-normal">/hr</span>
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <Button 
                  onClick={() => navigate(`/tutors/${tutor.id}`)}
                  className="w-full"
                  variant="default"
                >
                  View Profile
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        )}
      </div>
    </div>
  );
};

export default TutorSearch;

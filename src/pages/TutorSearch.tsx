import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Star, SlidersHorizontal, Calendar as CalendarIcon, Clock, MapPin, Award, Sparkles, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurriculums, getAllSubjects } from "@/utils/curriculumData";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import tutor1 from "@/assets/tutor-1.jpg";
import tutor2 from "@/assets/tutor-2.jpg";
import tutor3 from "@/assets/tutor-3.jpg";
import tutor4 from "@/assets/tutor-4.jpg";
import tutor5 from "@/assets/tutor-5.jpg";
import tutor6 from "@/assets/tutor-6.jpg";
import calvinProfilePhoto from "@/assets/calvin-profile.png";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
const TutorSearch = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedCurriculum, setSelectedCurriculum] = useState("all");
  const [selectedTeachingLevel, setSelectedTeachingLevel] = useState("all");
  const [sortBy, setSortBy] = useState("rating");
  const [smartMatchOpen, setSmartMatchOpen] = useState(false);
  const [matchStep, setMatchStep] = useState(1);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchPreferences, setMatchPreferences] = useState({
    curriculum: "",
    gradeLevel: "",
    subjects: [] as string[],
    learningStyle: ""
  });
  const [priceRange, setPriceRange] = useState([2000, 6000]);
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
      const timeRanges: Record<string, {
        start: number;
        end: number;
      }> = {
        morning: {
          start: 6,
          end: 12
        },
        afternoon: {
          start: 12,
          end: 17
        },
        evening: {
          start: 17,
          end: 21
        }
      };
      const range = timeRanges[selectedTimeSlot];
      if (!range) return;
      const startDate = new Date(selectedDate);
      startDate.setHours(range.start, 0, 0, 0);
      const endDate = new Date(selectedDate);
      endDate.setHours(range.end, 0, 0, 0);

      // Fetch availability for all tutors for the selected date/time
      const {
        data: availability
      } = await supabase.from("tutor_availability").select("tutor_id").gte("start_time", startDate.toISOString()).lte("start_time", endDate.toISOString()).eq("is_booked", false);

      // Create a map of tutor_id -> has availability
      const newMap = new Map<string, boolean>();

      // Get tutor_id to profile_id mapping
      tutors.forEach(tutor => {
        const hasSlots = availability?.some(slot => tutors.find(t => t.id === slot.tutor_id)) || false;
        newMap.set(tutor.id, hasSlots);
      });

      // Actually check properly by fetching tutor profiles
      const {
        data: tutorProfiles
      } = await supabase.from("tutor_profiles").select("id, user_id").in("id", tutors.map(t => t.id));
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
      const {
        data: tutorProfiles,
        error: tutorError
      } = await supabase.from("tutor_profiles").select("*").eq("verified", true);
      if (tutorError) throw tutorError;
      const profilesById = new Map<string, any>();

      // 2) Fetch matching user profiles and index by id
      const userIds = (tutorProfiles || []).map((tp: any) => tp.user_id).filter(Boolean);
      if (userIds.length) {
        const {
          data: profiles,
          error: profileError
        } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
        if (profileError) throw profileError;
        (profiles || []).forEach((p: any) => profilesById.set(p.id, p));
      }

      // 3) Merge and format
      const tutorImages = [tutor1, tutor2, tutor3, tutor4, tutor5, tutor6];
      const formattedTutors = (tutorProfiles || []).map((tp: any, index: number) => {
        const prof = profilesById.get(tp.user_id);
        const name = prof?.full_name || "Tutor";
        const hourlyRate = Number(tp.hourly_rate) || 2500;

        // Check if this is Calvin
        const isCalvin = name === "Calvins Onuko";
        return {
          id: tp.id,
          name,
          subjects: tp.subjects || [],
          curriculum: tp.curriculum || [],
          teachingLevels: tp.teaching_levels || [],
          school: tp.current_institution || "Not specified",
          displayInstitution: tp.display_institution || false,
          experienceYears: tp.experience_years || 0,
          rating: Number(tp.rating) || 0,
          reviews: tp.total_reviews || 0,
          hourlyRate,
          photo: name.split(' ').map((n: string) => n[0]).join('') || "T",
          photoUrl: isCalvin ? calvinProfilePhoto : tutorImages[index % tutorImages.length],
          isCalvin // Flag to sort Calvin first
        };
      });

      // Sort to put Calvin first
      formattedTutors.sort((a, b) => {
        if (a.isCalvin) return -1;
        if (b.isCalvin) return 1;
        return 0;
      });
      setTutors(formattedTutors);
    } catch (err) {
      console.error("Error fetching tutors:", err);
      toast.error("Failed to load tutors");
    } finally {
      setLoading(false);
    }
  };
  const curriculums = ["all", ...getCurriculums()];
  const allSubjects = ["all", ...getAllSubjects()];
  const teachingLevels = [
    "all",
    "Early Years",
    "Primary",
    "Middle School/Junior Secondary",
    "Secondary/A-Level"
  ];
  const timeSlots = [{
    value: "all",
    label: "Any Time"
  }, {
    value: "morning",
    label: "Morning (6 AM - 12 PM)"
  }, {
    value: "afternoon",
    label: "Afternoon (12 PM - 5 PM)"
  }, {
    value: "evening",
    label: "Evening (5 PM - 9 PM)"
  }];
  const filteredTutors = tutors.filter(tutor => {
    const matchesSearch = tutor.name.toLowerCase().includes(searchQuery.toLowerCase()) || tutor.subjects.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) || tutor.school.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === "all" || tutor.subjects.includes(selectedSubject);
    const matchesCurriculum = selectedCurriculum === "all" || tutor.curriculum.includes(selectedCurriculum);
    const matchesTeachingLevel = selectedTeachingLevel === "all" || tutor.teachingLevels?.includes(selectedTeachingLevel);
    const matchesPrice = tutor.hourlyRate >= priceRange[0] && tutor.hourlyRate <= priceRange[1];
    const matchesRating = tutor.rating >= minRating;

    // Availability filter
    const matchesAvailability = !selectedDate || selectedTimeSlot === "all" || availabilityMap.get(tutor.id) === true;
    return matchesSearch && matchesSubject && matchesCurriculum && matchesTeachingLevel && matchesPrice && matchesRating && matchesAvailability;
  }).sort((a, b) => {
    if (sortBy === "rating") return b.rating - a.rating;
    if (sortBy === "price-low") return a.hourlyRate - b.hourlyRate;
    if (sortBy === "price-high") return b.hourlyRate - a.hourlyRate;
    if (sortBy === "reviews") return b.reviews - a.reviews;
    return 0;
  });
  if (loading) {
    return <div className="min-h-screen bg-secondary/20 flex items-center justify-center">
        <p>Loading tutors...</p>
      </div>;
  }
  return <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <SEO title="Find Verified Tutors in Kenya" description="Browse 500+ verified tutors from top Kenyan schools. Filter by subject, curriculum (CBC, IGCSE), rating, and price. Book online or in-person tutoring sessions." keywords="find tutors Kenya, hire tutor Nairobi, CBC tutors, IGCSE tutors, verified teachers Kenya" />
      
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-3">Find Your Tutor</h1>
          </div>

          {/* Smart Tutor Match CTA */}
          <Card className="max-w-4xl mx-auto mb-8 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary rounded-lg">
                  <Sparkles className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Not sure where to start?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Let our AI analyze your learning needs and instantly match you with the perfect tutor based on your curriculum, subjects, and learning style.
                  </p>
                  <Button onClick={() => setSmartMatchOpen(true)} className="group">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Try Smart Tutor Match
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-8 max-w-5xl mx-auto flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input placeholder="Search by name, subject..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-12" />
          </div>
          
          <Select value={selectedCurriculum} onValueChange={value => {
          setSelectedCurriculum(value);
          // Reset subject when curriculum changes
          if (value !== "all") {
            setSelectedSubject("all");
          }
        }}>
            <SelectTrigger className="w-48 h-12 bg-background z-50">
              <SelectValue placeholder="All Curricula" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {curriculums.map(curriculum => <SelectItem key={curriculum} value={curriculum}>
                  {curriculum === "all" ? "All Curricula" : curriculum}
                </SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-48 h-12 bg-background z-50">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50 max-h-[300px]">
              {allSubjects.map(subject => <SelectItem key={subject} value={subject}>
                  {subject === "all" ? "All Subjects" : subject}
                </SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={selectedTeachingLevel} onValueChange={setSelectedTeachingLevel}>
            <SelectTrigger className="w-48 h-12 bg-background z-50">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {teachingLevels.map(level => <SelectItem key={level} value={level}>
                  {level === "all" ? "All Levels" : level}
                </SelectItem>)}
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
                    Hourly Rate: KES {priceRange[0]} - KES {priceRange[1]}
                  </Label>
                  <Slider value={priceRange} onValueChange={setPriceRange} max={6000} min={2000} step={100} className="mb-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>KES 2,000</span>
                    <span>KES 6,000</span>
                  </div>
                </div>

                {/* Minimum Rating */}
                <div>
                  <Label className="mb-3 block">Minimum Rating: {minRating}★</Label>
                  <Slider value={[minRating]} onValueChange={val => setMinRating(val[0])} max={5} min={0} step={0.5} className="mb-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0★</span>
                    <span>5★</span>
                  </div>
                </div>

                {/* Date Filter */}
                <div>
                  <Label className="mb-3 block">Filter by Availability</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} disabled={date => date < new Date(new Date().setHours(0, 0, 0, 0))} initialFocus />
                      {selectedDate && <div className="p-3 border-t">
                          <Button variant="ghost" size="sm" className="w-full" onClick={() => setSelectedDate(undefined)}>
                            Clear Date
                          </Button>
                        </div>}
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time Slot */}
                <div>
                  <Label className="mb-3 block">Time Slot</Label>
                  <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot}>
                    <SelectTrigger className="w-full">
                      <Clock className="mr-2 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(slot => <SelectItem key={slot.value} value={slot.value}>
                          {slot.label}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <Button variant="outline" className="w-full" onClick={() => {
                setPriceRange([2000, 6000]);
                setMinRating(0);
                setSelectedDate(undefined);
                setSelectedTimeSlot("all");
                setSelectedTeachingLevel("all");
                setAvailabilityMap(new Map());
              }}>
                  Reset All Filters
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
              {selectedDate && selectedTimeSlot !== "all" && <span className="ml-2 text-primary">
                  • Available on {format(selectedDate, "MMM d")} ({timeSlots.find(t => t.value === selectedTimeSlot)?.label.split(' ')[0]})
                </span>}
            </p>
            {(selectedDate || selectedTimeSlot !== "all" || selectedSubject !== "all" || selectedCurriculum !== "all" || selectedTeachingLevel !== "all" || minRating > 0 || priceRange[0] !== 2000 || priceRange[1] !== 6000) && <Button variant="ghost" size="sm" onClick={() => {
            setSelectedDate(undefined);
            setSelectedTimeSlot("all");
            setSelectedSubject("all");
            setSelectedCurriculum("all");
            setSelectedTeachingLevel("all");
            setMinRating(0);
            setPriceRange([2000, 6000]);
            setAvailabilityMap(new Map());
          }}>
                Clear All Filters
              </Button>}
          </div>
        </div>

        {/* Tutors Grid */}
        {filteredTutors.length === 0 ? <div className="text-center py-16">
            <p className="text-xl font-semibold mb-2">No tutors found</p>
            <p className="text-muted-foreground mb-6">
              Try adjusting your filters or search criteria
            </p>
            <Button variant="outline" onClick={() => {
          setSearchQuery("");
          setSelectedDate(undefined);
          setSelectedTimeSlot("all");
          setSelectedSubject("all");
          setSelectedCurriculum("all");
          setMinRating(0);
          setPriceRange([2000, 6000]);
          setAvailabilityMap(new Map());
        }}>
              Reset All Filters
            </Button>
          </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {filteredTutors.map(tutor => <Card key={tutor.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 bg-card">
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
                    <h3 className="text-xl font-bold leading-tight mb-2">{tutor.name}</h3>
                    <p className="text-sm text-muted-foreground mb-1 leading-snug">
                      {tutor.subjects.slice(0, 3).join(", ")}{tutor.subjects.length > 3 ? "..." : ""}
                    </p>
                    {tutor.displayInstitution ? <p className="text-xs text-muted-foreground/80 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {tutor.school}
                      </p> : <p className="text-xs text-muted-foreground/80 flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {tutor.experienceYears}+ years experience
                      </p>}
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
                <Button onClick={() => navigate(`/tutors/${tutor.id}`)} className="w-full" variant="default">
                  View Profile
                </Button>
              </CardContent>
            </Card>)}
        </div>}
      </div>

      {/* Smart Match Interactive Sheet */}
      <Sheet open={smartMatchOpen} onOpenChange={setSmartMatchOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Smart Tutor Match
            </SheetTitle>
            <SheetDescription>
              Answer a few quick questions to find your perfect tutor
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Progress Indicator */}
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    step <= matchStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            {/* Step 1: Curriculum */}
            {matchStep === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-5">
                <div>
                  <h3 className="font-semibold mb-1">What curriculum do you follow?</h3>
                  <p className="text-sm text-muted-foreground">This helps us match you with the right tutors</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {["CBC", "IGCSE", "8-4-4", "IB"].map((curr) => (
                    <Button
                      key={curr}
                      variant={matchPreferences.curriculum === curr ? "default" : "outline"}
                      className="h-20 text-base"
                      onClick={() => {
                        setMatchPreferences({ ...matchPreferences, curriculum: curr });
                        setTimeout(() => setMatchStep(2), 200);
                      }}
                    >
                      {curr}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Grade Level */}
            {matchStep === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-5">
                <div>
                  <h3 className="font-semibold mb-1">What grade are you in?</h3>
                  <p className="text-sm text-muted-foreground">Select your current grade level</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {matchPreferences.curriculum === "CBC" && 
                    ["Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"].map((grade) => (
                      <Button
                        key={grade}
                        variant={matchPreferences.gradeLevel === grade ? "default" : "outline"}
                        onClick={() => {
                          setMatchPreferences({ ...matchPreferences, gradeLevel: grade });
                          setTimeout(() => setMatchStep(3), 200);
                        }}
                      >
                        {grade}
                      </Button>
                    ))
                  }
                  {matchPreferences.curriculum === "IGCSE" && 
                    ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11"].map((grade) => (
                      <Button
                        key={grade}
                        variant={matchPreferences.gradeLevel === grade ? "default" : "outline"}
                        onClick={() => {
                          setMatchPreferences({ ...matchPreferences, gradeLevel: grade });
                          setTimeout(() => setMatchStep(3), 200);
                        }}
                      >
                        {grade}
                      </Button>
                    ))
                  }
                  {(matchPreferences.curriculum === "8-4-4" || matchPreferences.curriculum === "IB") && 
                    ["Form 1", "Form 2", "Form 3", "Form 4"].map((grade) => (
                      <Button
                        key={grade}
                        variant={matchPreferences.gradeLevel === grade ? "default" : "outline"}
                        onClick={() => {
                          setMatchPreferences({ ...matchPreferences, gradeLevel: grade });
                          setTimeout(() => setMatchStep(3), 200);
                        }}
                      >
                        {grade}
                      </Button>
                    ))
                  }
                </div>
                <Button variant="ghost" onClick={() => setMatchStep(1)}>← Back</Button>
              </div>
            )}

            {/* Step 3: Subjects */}
            {matchStep === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-5">
                <div>
                  <h3 className="font-semibold mb-1">Which subjects need help?</h3>
                  <p className="text-sm text-muted-foreground">Select all that apply</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {["Mathematics", "English", "Physics", "Chemistry", "Biology", "Kiswahili", "History", "Geography"].map((subject) => (
                    <Button
                      key={subject}
                      variant={matchPreferences.subjects.includes(subject) ? "default" : "outline"}
                      className="h-auto py-3 justify-start"
                      onClick={() => {
                        const newSubjects = matchPreferences.subjects.includes(subject)
                          ? matchPreferences.subjects.filter(s => s !== subject)
                          : [...matchPreferences.subjects, subject];
                        setMatchPreferences({ ...matchPreferences, subjects: newSubjects });
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {matchPreferences.subjects.includes(subject) && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
                        <span className="text-sm">{subject}</span>
                      </div>
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="ghost" onClick={() => setMatchStep(2)}>← Back</Button>
                  <Button 
                    className="flex-1" 
                    onClick={() => setMatchStep(4)}
                    disabled={matchPreferences.subjects.length === 0}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Learning Style & Apply */}
            {matchStep === 4 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-5">
                <div>
                  <h3 className="font-semibold mb-1">How do you learn best?</h3>
                  <p className="text-sm text-muted-foreground">This helps personalize your matches</p>
                </div>
                <div className="space-y-3">
                  {[
                    { value: "visual", label: "Visual", desc: "Charts, diagrams, videos" },
                    { value: "practical", label: "Hands-on", desc: "Practice problems, experiments" },
                    { value: "discussion", label: "Discussion", desc: "Talking through concepts" },
                    { value: "structured", label: "Structured", desc: "Step-by-step guidance" }
                  ].map((style) => (
                    <Button
                      key={style.value}
                      variant={matchPreferences.learningStyle === style.value ? "default" : "outline"}
                      className="w-full h-auto py-4 justify-start"
                      onClick={async () => {
                        setMatchPreferences({ ...matchPreferences, learningStyle: style.value });
                        setMatchLoading(true);
                        
                        try {
                          // Apply filters immediately without AI call for now
                          setSelectedCurriculum(matchPreferences.curriculum);
                          
                          // Filter to first selected subject
                          if (matchPreferences.subjects.length > 0) {
                            setSelectedSubject(matchPreferences.subjects[0]);
                          }

                          toast.success(`Showing tutors for ${matchPreferences.curriculum} - ${matchPreferences.subjects.join(", ")}`);
                          setSmartMatchOpen(false);
                          
                          // Reset for next time
                          setTimeout(() => {
                            setMatchStep(1);
                            setMatchPreferences({
                              curriculum: "",
                              gradeLevel: "",
                              subjects: [],
                              learningStyle: ""
                            });
                          }, 500);
                        } catch (error) {
                          console.error("Smart match error:", error);
                          toast.error("Something went wrong. Please try manual filters.");
                        } finally {
                          setMatchLoading(false);
                        }
                      }}
                      disabled={matchLoading}
                    >
                      <div className="text-left flex-1">
                        <div className="font-semibold flex items-center gap-2">
                          {matchPreferences.learningStyle === style.value && <CheckCircle className="w-4 h-4" />}
                          {style.label}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{style.desc}</div>
                      </div>
                      {matchLoading && matchPreferences.learningStyle === style.value && (
                        <Loader2 className="w-4 h-4 ml-2 animate-spin flex-shrink-0" />
                      )}
                    </Button>
                  ))}
                </div>
                <Button variant="ghost" onClick={() => setMatchStep(3)}>← Back</Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>;
};
export default TutorSearch;
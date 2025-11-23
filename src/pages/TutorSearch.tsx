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
import { CURRICULUM_DATA, getCurriculums, getAllSubjects, getLevelsForCurriculum, getSubjectsForCurriculumLevel } from "@/utils/curriculumData";
import { NAIROBI_LOCATIONS } from "@/utils/locationData";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import tutor1 from "@/assets/tutor-1.jpg";
import tutor2 from "@/assets/tutor-2.jpg";
import tutor3 from "@/assets/tutor-3.jpg";
import tutor4 from "@/assets/tutor-4.jpg";
import tutor5 from "@/assets/tutor-5.jpg";
import tutor6 from "@/assets/tutor-6.jpg";
import calvinProfilePhoto from "@/assets/calvin-profile.png";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
const TutorSearch = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedCurriculum, setSelectedCurriculum] = useState("all");
  const [selectedTeachingLevel, setSelectedTeachingLevel] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [tutors, setTutors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Safety: ensure any legacy references to `sortBy` won't crash the page
  const [sortBy, setSortBy] = useState<string>("relevance");

  useEffect(() => {
    fetchTutors();
  }, []);
  const fetchTutors = async () => {
    setLoading(true);
    try {
      // 1) Fetch tutor profiles (verified)
      const {
        data: tutorProfiles,
        error: tutorError
      } = await supabase.from("tutor_profiles").select("*, profile_slug").eq("verified", true);
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

      // 3) Fetch pricing tiers for all tutors to get their rate ranges
      const tutorProfileIds = (tutorProfiles || []).map((tp: any) => tp.id);
      const { data: pricingTiers } = await supabase
        .from("tutor_pricing_tiers")
        .select("*")
        .in("tutor_id", tutorProfileIds);

      const tiersByTutor = new Map<string, any[]>();
      (pricingTiers || []).forEach((tier: any) => {
        if (!tiersByTutor.has(tier.tutor_id)) {
          tiersByTutor.set(tier.tutor_id, []);
        }
        tiersByTutor.get(tier.tutor_id)!.push(tier);
      });

      // 4) Merge and format
      const tutorImages = [tutor1, tutor2, tutor3, tutor4, tutor5, tutor6];
      const formattedTutors = (tutorProfiles || []).map((tp: any, index: number) => {
        const prof = profilesById.get(tp.user_id);
        const name = prof?.full_name || "Tutor";
        
        // Get pricing tiers for this tutor
        const tiers = tiersByTutor.get(tp.id) || [];
        const standardTier = tiers.find(t => t.tier_name.toLowerCase() === 'standard');
        const advancedTier = tiers.find(t => t.tier_name.toLowerCase() === 'advanced');
        
        // Use standard tier as base rate, fallback to legacy hourly_rate
        const hourlyRate = standardTier 
          ? Number(standardTier.online_hourly_rate) 
          : Number(tp.hourly_rate) || 2500;
        const hourlyRateMax = advancedTier 
          ? Number(advancedTier.online_hourly_rate) 
          : hourlyRate;

        // Only show real uploaded avatars, no AI fallback photos
        const uploadedAvatar = prof?.avatar_url;
        
        return {
          id: tp.id,
          name,
          photo: name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
          photoUrl: uploadedAvatar || null, // Only use real avatar, no fallback
          profileSlug: tp.profile_slug, // Add profile slug
          subjects: tp.subjects || [],
          curriculum: tp.curriculum || [],
          teachingLevels: tp.teaching_levels || [],
          teachingLocation: tp.teaching_location || "",
          teachingMode: tp.teaching_mode || [],
          school: tp.current_institution || "Not specified",
          displayInstitution: tp.display_institution || false,
          experienceYears: tp.experience_years || 0,
          rating: Number(tp.rating) || 0,
          reviews: tp.total_reviews || 0,
          hourlyRate,
          hourlyRateMax,
          hasTiers: tiers.length > 0,
          gender: tp.gender || null,
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
  const curriculums = ["all", ...getCurriculums()];

  // Dynamic level options based on selected curriculum
  const levelOptions = selectedCurriculum !== "all" ? getLevelsForCurriculum(selectedCurriculum) : [];
  const visibleLevelOptions = selectedCurriculum === "all"
    ? [
        { value: "Early Years", label: "Early Years" },
        { value: "Primary", label: "Primary" },
        { value: "Middle School/Junior Secondary", label: "Middle School/Junior Secondary" },
        { value: "Secondary/A-Level", label: "Secondary/A-Level" },
      ]
    : levelOptions;

  // Subjects derived from curriculum + level (fallback to all subjects so it's not restrictive)
  const subjectOptions: string[] = (() => {
    if (selectedCurriculum !== "all" && selectedTeachingLevel !== "all") {
      return getSubjectsForCurriculumLevel(selectedCurriculum, selectedTeachingLevel) || [];
    }
    if (selectedCurriculum !== "all") {
      const levels = CURRICULUM_DATA[selectedCurriculum] || [];
      const set = new Set<string>();
      levels.forEach(l => l.subjects.forEach(s => set.add(s)));
      return Array.from(set).sort();
    }
    return getAllSubjects();
  })();
  const subjectChoices = ["all", ...subjectOptions];

  // Map detailed level names to broad categories used in tutor profiles to avoid over-filtering
  const mapLevelToBroad = (curriculum: string, level: string) => {
    const l = level.toLowerCase();
    if (/form\s*[1-4]|igcse|a-?levels?|high\s*school|diploma|dp/.test(l)) return "Secondary/A-Level";
    if (/junior|key\s*stage\s*3|middle\s*school|myp/.test(l)) return "Middle School/Junior Secondary";
    if (/early\s*years|pre-?primary|pp1|pp2/.test(l)) return "Early Years";
    if (/lower\s*primary|upper\s*primary|elementary|key\s*stage\s*[12]|pyp|grade\s*[1-6]/.test(l)) return "Primary";
    return level; // fallback to exact
  };

  const filteredTutors = tutors.filter((tutor) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      tutor.name.toLowerCase().includes(q) ||
      tutor.subjects.some((s: string) => s.toLowerCase().includes(q)) ||
      (tutor.school || "").toLowerCase().includes(q) ||
      (tutor.teachingLocation || "").toLowerCase().includes(q);

    const matchesSubject =
      selectedSubject === "all" ||
      tutor.subjects.some((s: string) =>
        s.toLowerCase().includes(selectedSubject.toLowerCase()) ||
        selectedSubject.toLowerCase().includes(s.toLowerCase())
      );

    const matchesCurriculum =
      selectedCurriculum === "all" ||
      (tutor.curriculum?.includes(selectedCurriculum)) ||
      (tutor.teachingLevels?.some((lvl: string) =>
        lvl.toLowerCase().includes(selectedCurriculum.toLowerCase())
      ));

    const selectedBroad = mapLevelToBroad(selectedCurriculum, selectedTeachingLevel).toLowerCase();
    const matchesTeachingLevel =
      selectedTeachingLevel === "all" ||
      (tutor.teachingLevels?.some((lvl: string) => {
        const l = lvl.toLowerCase();
        return (
          l === selectedTeachingLevel.toLowerCase() ||
          l.includes(selectedTeachingLevel.toLowerCase()) ||
          (selectedCurriculum !== "all" && l.includes(`${selectedCurriculum.toLowerCase()} - ${selectedTeachingLevel.toLowerCase()}`)) ||
          mapLevelToBroad(selectedCurriculum, lvl).toLowerCase() === selectedBroad
        );
      }) ?? false);

    const matchesLocation = 
      selectedLocation === "all" ||
      selectedLocation === "online" && tutor.teachingMode?.includes("Online") ||
      selectedLocation === "in-person" && tutor.teachingMode?.includes("In-Person") ||
      (tutor.teachingLocation || "").toLowerCase().includes(selectedLocation.toLowerCase());


    return matchesSearch && matchesSubject && matchesCurriculum && matchesTeachingLevel && matchesLocation;
  });
  if (loading) {
    return <div className="min-h-screen bg-secondary/20 flex items-center justify-center">
        <p>Loading tutors...</p>
      </div>;
  }
  return <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <SEO title="Find Verified Tutors in Kenya" description="Browse 500+ verified tutors from top Kenyan schools. Filter by subject, curriculum (CBC, IGCSE, American), rating, and price. Book online or in-person tutoring sessions." keywords="find tutors Kenya, hire tutor Nairobi, CBC tutors, IGCSE tutors, American curriculum tutors, verified teachers Kenya" />
      
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-3">Find Your Tutor</h1>
            <p className="text-lg text-muted-foreground mb-6">Browse verified tutors or explore our specialized revision packages</p>
            
            {/* Call-to-Action for Holiday Packages */}
            <div className="max-w-2xl mx-auto">
              <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-left">
                      <h3 className="font-semibold text-lg mb-1">🎓 December Revision Packages</h3>
                      <p className="text-sm text-muted-foreground">Intensive exam prep for candidate years</p>
                    </div>
                    <Button onClick={() => navigate('/holiday-packages')} className="shrink-0">
                      View Packages
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-8 max-w-5xl mx-auto flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input placeholder="Search by name, subject, location..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-12" />
          </div>
          
          <Select value={selectedCurriculum} onValueChange={value => {
          setSelectedCurriculum(value);
          // Reset level and subject when curriculum changes
          setSelectedTeachingLevel("all");
          setSelectedSubject("all");
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

          <Select value={selectedTeachingLevel} onValueChange={(val) => { setSelectedTeachingLevel(val); setSelectedSubject("all"); }}>
            <SelectTrigger className="w-48 h-12 bg-background z-50">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="all">All Levels</SelectItem>
              {visibleLevelOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-48 h-12 bg-background z-50">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50 max-h-[300px]">
              {subjectChoices.map(subject => (
                <SelectItem key={subject} value={subject}>
                  {subject === "all" ? "All Subjects" : subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-48 h-12 bg-background z-50">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50 max-h-[300px]">
              <SelectItem value="all">All Locations</SelectItem>
              <SelectItem value="online">Online Only</SelectItem>
              <SelectItem value="in-person">In-Person</SelectItem>
              {NAIROBI_LOCATIONS.map(location => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>


        </div>

        {/* Results Count */}
        <div className="max-w-7xl mx-auto mb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              Showing {filteredTutors.length} of {tutors.length} tutors
            </p>
            {(selectedSubject !== "all" || selectedCurriculum !== "all" || selectedTeachingLevel !== "all" || selectedLocation !== "all" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSubject("all");
                  setSelectedCurriculum("all");
                  setSelectedTeachingLevel("all");
                  setSelectedLocation("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
        {filteredTutors.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl font-semibold mb-2">No tutors found</p>
            <p className="text-muted-foreground mb-6">Try adjusting your filters or search criteria</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setSelectedSubject("all");
                setSelectedCurriculum("all");
                setSelectedTeachingLevel("all");
                setSelectedLocation("all");
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {filteredTutors.map((tutor) => (
              <Card key={tutor.id} className="overflow-hidden border-border/50 bg-card">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="w-16 h-16 border-2 border-black ring-2 ring-black/10">
                      <AvatarImage src={tutor.photoUrl || undefined} alt={tutor.name} />
                      <AvatarFallback className="bg-muted text-foreground font-semibold">{tutor.photo}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{tutor.name}</h3>
                      <p className="text-sm text-muted-foreground">{tutor.school}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Subjects: {tutor.subjects.slice(0, 3).join(", ")}
                        {tutor.subjects.length > 3 ? "…" : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (selectedCurriculum !== "all") params.set("curriculum", selectedCurriculum);
                      if (selectedTeachingLevel !== "all") params.set("level", selectedTeachingLevel);
                      const qs = params.toString();
                      // Use slug if available, otherwise fall back to ID
                      const profilePath = tutor.profileSlug || tutor.id;
                      navigate(`/tutors/${profilePath}${qs ? `?${qs}` : ""}`);
                    }}
                    className="w-full"
                  >
                    View Profile
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>;
};
export default TutorSearch;
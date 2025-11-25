import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, GraduationCap, Clock, BookOpen, Award, MapPin, Users, CheckCircle2, Heart, Sparkles, Video, Calendar, ArrowLeft, School, Building2, Home } from "lucide-react";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { BookingCalendar } from "@/components/BookingCalendar";
import { PackageSelector } from "@/components/PackageSelector";
import { HolidayPackageBanner } from "@/components/HolidayPackageBanner";
import { CustomPackageBuilder } from "@/components/CustomPackageBuilder";
import { LearningPlanRequest } from "@/components/LearningPlanRequest";
import { cn } from "@/lib/utils";

import tutor1 from "@/assets/tutor-1.jpg";
import tutor2 from "@/assets/tutor-2.jpg";
import tutor3 from "@/assets/tutor-3.jpg";
import tutor4 from "@/assets/tutor-4.jpg";
import tutor5 from "@/assets/tutor-5.jpg";
import tutor6 from "@/assets/tutor-6.jpg";
import calvinProfilePhoto from "@/assets/calvin-profile.png";

const TutorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isPackagePurchaseOpen, setIsPackagePurchaseOpen] = useState(false);
  const [isCustomPackageOpen, setIsCustomPackageOpen] = useState(false);
  const [isLearningPlanOpen, setIsLearningPlanOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [packagePaymentOption, setPackagePaymentOption] = useState<'full' | 'deposit'>('full');
  const [bookingType, setBookingType] = useState<'paid' | 'trial' | 'free' | 'single' | 'double'>('paid');
  const [tutor, setTutor] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [pricingTiers, setPricingTiers] = useState<any[]>([]);
  const [showHolidayBanner, setShowHolidayBanner] = useState(false);

  useEffect(() => {
    fetchTutorProfile();
    fetchCurrentUser();
    checkHolidayPackageAvailability();
  }, [id]);

  // Fetch data that depends on tutor.id after tutor is loaded
  useEffect(() => {
    if (tutor?.id) {
      fetchReviews();
      fetchPackages();
      fetchPricingTiers();
    }
  }, [tutor?.id]);

  // Auto-open booking dialog when returning from login via redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openBooking') === '1') {
      const type = (params.get('bookingType') as 'paid' | 'trial' | 'free' | 'single' | 'double') || 'paid';
      setBookingType(type);
      setIsBookingOpen(true);
    }
  }, []);

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
    
    let tutorProfile;
    let error;
    
    const { data: profileBySlug, error: slugError } = await supabase
      .from("tutor_profiles")
      .select("*")
      .eq("profile_slug", id)
      .eq("verified", true)
      .single();

    if (profileBySlug) {
      tutorProfile = profileBySlug;
    } else {
      const { data: profileById, error: idError } = await supabase
        .from("tutor_profiles")
        .select("*")
        .eq("id", id)
        .eq("verified", true)
        .single();
      tutorProfile = profileById;
      error = idError;
    }

    if (error && !tutorProfile) {
      toast.error("Tutor profile not found");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", tutorProfile.user_id)
      .single();

    // Only use real uploaded avatar, no AI fallback photos
    const photoUrl = profile?.avatar_url || null;

    setTutor({
      id: tutorProfile.id,
      name: profile?.full_name || "Tutor",
      photo: profile?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "T",
      photoUrl,
      email: tutorProfile.email,
      subjects: tutorProfile.subjects || [],
      bio: tutorProfile.bio || "",
      hourlyRate: tutorProfile.hourly_rate,
      experience: tutorProfile.experience_years || 0,
      rating: tutorProfile.rating || 0,
      reviews: tutorProfile.total_reviews || 0,
      education: tutorProfile.qualifications || [],
      graduationYear: tutorProfile.graduation_year,
      school: tutorProfile.current_institution || "Not specified",
      curriculum: tutorProfile.curriculum || [],
      teachingMode: tutorProfile.teaching_mode || [],
      teachingLevels: tutorProfile.teaching_levels || [],
      teachingLocation: tutorProfile.teaching_location || "",
      servicesOffered: tutorProfile.services_offered || [],
      whyStudentsLove: tutorProfile.why_students_love || [],
      teachingExperience: tutorProfile.teaching_experience || [],
      verified: tutorProfile.verified,
    });

    setLoading(false);
  };

  const fetchReviews = async () => {
    if (!tutor?.id) return;
    
    const { data: reviewsData } = await supabase
      .from("tutor_reviews")
      .select("*")
      .eq("tutor_id", tutor.id)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(10);

    if (reviewsData) {
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

  const fetchPackages = async () => {
    if (!tutor?.id) return;
    
    const { data: packagesData } = await supabase
      .from("package_offers")
      .select("*")
      .eq("tutor_id", tutor.id)
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("session_count");

    if (packagesData) {
      // Deduplicate packages based on name and session_count
      const uniquePackages = packagesData.filter((pkg, index, self) =>
        index === self.findIndex((p) => 
          p.name === pkg.name && p.session_count === pkg.session_count
        )
      );
      setPackages(uniquePackages);
    }
  };

  const fetchPricingTiers = async () => {
    if (!tutor?.id) return;
    
    const { data: tiersData } = await supabase
      .from("tutor_pricing_tiers")
      .select("*")
      .eq("tutor_id", tutor.id)
      .order("tier_name");

    if (tiersData) {
      setPricingTiers(tiersData);
    }
  };

  const checkHolidayPackageAvailability = async () => {
    // Check if we're in December holiday period and if there are holiday packages
    const now = new Date();
    const { data: holidayPackages } = await supabase
      .from("holiday_packages")
      .select("*")
      .eq("is_active", true)
      .lte("starts_at", now.toISOString())
      .gte("ends_at", now.toISOString());
    
    setShowHolidayBanner(holidayPackages && holidayPackages.length > 0);
  };

  const getCurrentRate = () => {
    return Number(tutor?.hourlyRate) || 0;
  };

  const handleBookingTypeSelect = async (type: 'paid' | 'trial' | 'free' | 'single' | 'double') => {
    if (type === 'free') {
      navigate('/book-consultation');
      return;
    }
    
    // Check authentication first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const urlWithIntent = `${window.location.pathname}?openBooking=1&bookingType=${type}`;
      showToast({
        title: "Please Sign In",
        description: "You need to sign in to book a session",
        variant: "destructive",
      });
      navigate(`/login?redirect=${encodeURIComponent(urlWithIntent)}`);
      return;
    }

    // If already authenticated, set up user profile
    if (!currentUser) {
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
    
    setBookingType(type);
    const urlWithIntent = `${window.location.pathname}?openBooking=1&bookingType=${type}`;
    window.history.replaceState(null, '', urlWithIntent);
    setIsBookingOpen(true);
  };

  const { toast: showToast } = useToast();

  const handlePackageSelect = async (pkg: any) => {
    setSelectedPackage(pkg);
    
    if (!currentUser) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast({
          title: "Please Sign In",
          description: "You need to sign in to purchase a package",
          variant: "destructive",
        });
        navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      
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
    
    setIsPackagePurchaseOpen(true);
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

  const tutorSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": tutor.name,
    "jobTitle": "Tutor",
    "worksFor": {
      "@type": "Organization",
      "name": tutor.school
    },
    "knowsAbout": tutor.subjects,
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": tutor.rating,
      "reviewCount": tutor.reviews
    }
  };

  const currentRate = getCurrentRate();

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <SEO 
        title={`${tutor.name} - ${tutor.subjects.join(", ")} Tutor`}
        description={`Book tutoring sessions with ${tutor.name}, an experienced ${tutor.subjects.join(", ")} tutor from ${tutor.school}. ${tutor.rating} star rating with ${tutor.reviews} reviews. KES ${tutor.hourlyRate}/hour.`}
        keywords={`${tutor.subjects.join(", ")}, Kenya tutor, ${tutor.school}, online tutoring`}
        structuredData={tutorSchema}
      />
      
      <div className="max-w-7xl mx-auto px-6 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate('/tutors')}
          className="mb-6 hover:bg-accent"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to All Tutors
        </Button>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN - Tutor Information (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <Card className="border-border/50">
              <CardContent className="p-8">
                <div className="flex flex-col sm:flex-row gap-6 items-start mb-6">
                  <Avatar className="w-28 h-28 shrink-0 border-[3px] border-black ring-4 ring-black/10">
                    <AvatarImage src={tutor.photoUrl} alt={tutor.name} />
                    <AvatarFallback className="text-2xl bg-muted text-foreground font-semibold">
                      {tutor.photo}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h1 className="text-3xl font-bold mb-2">{tutor.name}</h1>
                    <p className="text-base text-muted-foreground mb-4">
                      {tutor.subjects.join(" • ")}
                    </p>
                    
                    <div className="space-y-2">
                      {tutor.education && tutor.education.length > 0 && (
                        <div className="flex items-start gap-2 text-sm">
                          <GraduationCap className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                          <div className="space-y-0.5">
                            {tutor.education.map((qual: string, index: number) => (
                              <div key={index} className="text-muted-foreground">
                                {qual}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {tutor.school && tutor.school !== "Not specified" && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{tutor.school}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Award className="w-4 h-4" />
                        <span>{tutor.experience}+ years teaching experience</span>
                      </div>
                      
                      {tutor.curriculum && tutor.curriculum.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <BookOpen className="w-4 h-4" />
                          <span>{tutor.curriculum.join(", ")}</span>
                        </div>
                      )}
                      
                      {tutor.teachingMode && tutor.teachingMode.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Video className="w-4 h-4" />
                          <span>{tutor.teachingMode.join(" & ")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Holiday Package Banner */}
            {showHolidayBanner && (
              <HolidayPackageBanner 
                onViewPackages={() => navigate('/holiday-packages')}
              />
            )}

            {/* About Me */}
            {tutor.bio && (
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Heart className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-lg">About Me</h2>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{tutor.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Education */}
            {Array.isArray(tutor.teachingExperience) && tutor.teachingExperience.filter((exp: any) =>
              exp && (exp.degree || exp.field || exp.graduationYear) && !exp.role
            ).length > 0 && (
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-lg">Education</h2>
                  </div>
                  <div className="space-y-3">
                    {tutor.teachingExperience
                      .filter((exp: any) => exp && (exp.degree || exp.field || exp.graduationYear) && !exp.role)
                      .map((entry: any, index: number) => (
                        <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <School className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground">
                              {entry.degree || "Degree"}
                            </p>
                            {entry.field && (
                              <p className="text-sm text-muted-foreground">
                                {entry.field}
                              </p>
                            )}
                            {(entry.institution || entry.graduationYear) && (
                              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                {entry.institution && (
                                  <>
                                    <Building2 className="w-4 h-4" />
                                    <span>{entry.institution}</span>
                                  </>
                                )}
                                {entry.graduationYear && (
                                  <span className="ml-auto">• {entry.graduationYear}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}


            {/* Qualifications */}
            {tutor.education && tutor.education.length > 0 && (
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Award className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-lg">Qualifications & Certifications</h2>
                  </div>
                  <div className="space-y-3">
                    {tutor.education.map((qual: string, index: number) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{qual}</p>
                        </div>
                      </div>
                    ))}
                    {tutor.graduationYear && tutor.graduationYear > 1900 && (
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Graduated: {tutor.graduationYear}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Why Students Love Me */}
            {tutor.whyStudentsLove && tutor.whyStudentsLove.length > 0 && (
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-lg">Why Students Love My Teaching</h2>
                  </div>
                  <ul className="space-y-2">
                    {tutor.whyStudentsLove.map((reason: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-muted-foreground">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Services Offered - Only show if has services */}
            {tutor.servicesOffered && tutor.servicesOffered.length > 0 && (
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-lg">Services Offered</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tutor.servicesOffered.map((service: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {service}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Teaching Experience */}
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Clock className="w-5 h-5 text-primary" />
                  <h2 className="font-bold text-lg">Teaching Experience</h2>
                </div>
                
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

                {tutor.teachingExperience && tutor.teachingExperience.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm mb-4">Professional Teaching Positions</h3>
                    <div className="space-y-6 relative">
                      {/* Vertical timeline line */}
                      <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-border" />
                      
                      {tutor.teachingExperience.map((exp: any, idx: number) => {
                        // Determine institution type icon
                        const institutionType = exp.type?.toLowerCase() || 'school';
                        const InstitutionIcon = 
                          institutionType === 'tutoring center' || institutionType === 'tutoring' ? Building2 :
                          institutionType === 'private' || institutionType === 'home' ? Home :
                          School;
                        
                        return (
                          <div key={idx} className="flex gap-4 relative">
                            {/* Timeline node with icon */}
                            <div className="relative z-10 shrink-0">
                              <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                                <InstitutionIcon className="w-5 h-5 text-primary" />
                              </div>
                            </div>
                            
                            {/* Content card */}
                            <div className="flex-1 pb-2">
                              <Card className="border-border/50 hover:border-primary/30 transition-colors">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between gap-4 mb-2">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-base">{exp.institution}</h4>
                                      {exp.type && (
                                        <Badge variant="outline" className="text-[10px] mt-1">
                                          {exp.type}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full shrink-0">
                                      <Clock className="w-3 h-3 text-primary" />
                                      <span className="text-xs font-semibold text-primary">
                                        {exp.years} {exp.years === 1 ? 'year' : 'years'}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {exp.subjects && (
                                    <div className="flex items-start gap-2 mt-3">
                                      <BookOpen className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                                      <p className="text-sm text-muted-foreground">
                                        {exp.subjects}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {exp.description && (
                                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                                      {exp.description}
                                    </p>
                                  )}
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Teaching Levels */}
            {tutor.teachingLevels && tutor.teachingLevels.length > 0 && (
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-lg">Teaching Levels</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tutor.teachingLevels.map((level: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {level}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}


            {/* Reviews */}
            {reviews.length > 0 && (
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Star className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-lg">Student Reviews</h2>
                  </div>
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b border-border/50 last:border-0 pb-4 last:pb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "w-4 h-4",
                                  i < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground/30"
                                )}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium">
                            {review.profiles?.full_name || "Anonymous"}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT COLUMN - Booking Section (1/3 width, sticky) */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              <Card className="border-primary/30 shadow-lg">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <h3 className="font-bold text-2xl mb-2">Book a Session</h3>
                    <p className="text-muted-foreground text-sm">Choose your preferred option</p>
                  </div>

                  {/* Booking Options */}
                  <div className="space-y-3">
                    {/* Direct Session Booking */}
                    <div className="space-y-2">
                      <Button 
                        className="w-full group hover:shadow-md transition-all"
                        size="lg"
                        onClick={() => handleBookingTypeSelect('single')}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Single Session
                          </span>
                          <span className="font-bold ml-2">KES {currentRate.toLocaleString()}</span>
                        </div>
                      </Button>

                      <Button 
                        variant="outline" 
                        className="w-full group hover:bg-accent/50 transition-all h-auto py-3"
                        size="lg"
                        onClick={() => handleBookingTypeSelect('double')}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex flex-col items-start gap-1">
                            <span className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4" />
                              Double Session
                            </span>
                            <Badge variant="secondary" className="text-[10px]">Save 5%</Badge>
                          </div>
                          <span className="font-semibold ml-2">KES {Math.round(currentRate * 2 * 0.95).toLocaleString()}</span>
                        </div>
                      </Button>
                    </div>

                    <Separator className="my-4" />

                    {/* Custom Package Builder */}
                    <Button 
                      variant="outline"
                      className="w-full bg-gradient-to-r from-primary/5 to-primary/10 border-primary/30 hover:bg-primary/20 h-auto py-4"
                      size="lg"
                      onClick={async () => {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) {
                          showToast({
                            title: "Please Sign In",
                            description: "You need to sign in to create a package",
                            variant: "destructive",
                          });
                          navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
                          return;
                        }
                        setIsCustomPackageOpen(true);
                      }}
                    >
                      <div className="flex flex-col items-center gap-1 w-full">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5" />
                          <span className="font-semibold">Create Custom Package</span>
                        </div>
                        <span className="text-[10px] opacity-70">Choose sessions & subject yourself</span>
                      </div>
                    </Button>

                    {/* Learning Plan Request */}
                    <Button 
                      variant="outline"
                      className="w-full bg-gradient-to-r from-secondary/5 to-secondary/10 border-secondary/30 hover:bg-secondary/20 h-auto py-4"
                      size="lg"
                      onClick={async () => {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) {
                          showToast({
                            title: "Please Sign In",
                            description: "You need to sign in to request a learning plan",
                            variant: "destructive",
                          });
                          navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
                          return;
                        }
                        setIsLearningPlanOpen(true);
                      }}
                    >
                      <div className="flex flex-col items-center gap-1 w-full">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          <span className="font-semibold">Request Learning Plan</span>
                        </div>
                        <span className="text-[10px] opacity-70">Let {tutor.name} design a plan for you</span>
                      </div>
                    </Button>

                    <Separator className="my-4" />

                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-3">Not sure yet?</p>
                      <Button 
                        variant="secondary"
                        className="w-full bg-gradient-to-r from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70"
                        size="lg"
                        onClick={() => handleBookingTypeSelect('free')}
                      >
                        <div className="flex flex-col items-center gap-1 py-1">
                          <div className="flex items-center gap-2">
                            <Video className="w-4 h-4" />
                            <span>Free Consultation</span>
                          </div>
                          <span className="text-[10px] opacity-80">30-minute Video Call</span>
                        </div>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Package Offers - Make More Prominent */}
              {packages.length > 0 && (
                <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5">
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-3">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-lg">Save with Packages</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Need a custom package? 
                        <a href="/book-consultation" className="text-primary hover:underline ml-1">
                          Talk to an expert →
                        </a>
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="text-sm font-medium mb-3">Available Packages</div>
                      <PackageSelector
                        tutorId={tutor.id}
                        onSelectPackage={handlePackageSelect}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* What's Included - Moved to Bottom */}
              <Card className="border-border/50">
                <CardContent className="p-5">
                  <h4 className="font-semibold text-sm mb-3">What's Included</h4>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>Personalized 1-on-1 instruction</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>Custom learning materials</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>Progress tracking & feedback</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>Flexible rescheduling</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Dialog */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {bookingType === 'trial' ? 'Book Your Free Trial Session' : 'Book a Session'}
            </DialogTitle>
            <DialogDescription>
              {bookingType === 'trial'
                ? 'Schedule a complimentary 30-minute trial session with ' + tutor.name
                : 'Select a date and time for your session with ' + tutor.name}
            </DialogDescription>
          </DialogHeader>
          
          <BookingCalendar
            tutorId={tutor.id}
            tutorName={tutor.name}
            tutorEmail={tutor.email}
            studentEmail={currentUser?.email || ""}
            studentName={currentUser?.name || ""}
            hourlyRate={currentRate}
            onBookingComplete={() => {
              setIsBookingOpen(false);
              toast.success("Booking confirmed!");
            }}
            classType="online"
            isTrialSession={bookingType === 'trial'}
          />
        </DialogContent>
      </Dialog>

      {/* Package Purchase Dialog */}
      <Dialog open={isPackagePurchaseOpen} onOpenChange={setIsPackagePurchaseOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase Package</DialogTitle>
            <DialogDescription>
              Secure your sessions with {tutor.name} at a discounted rate
            </DialogDescription>
          </DialogHeader>
          
          {selectedPackage && (
            <div className="space-y-6 py-4">
              {/* How It Works Section */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    How Your Session Bundle Works
                  </h4>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span><strong>Use at your own pace:</strong> Book sessions whenever it suits your schedule over the next {selectedPackage.validity_days} days</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span><strong>Track your sessions:</strong> View your remaining sessions anytime in your student dashboard</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span><strong>Flexible booking:</strong> Schedule one session at a time or plan multiple sessions in advance</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span><strong>No pressure:</strong> There's no obligation to use all sessions at once - spread them out as needed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Option Selector */}
              <Card className="bg-muted/30 border-border/50">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Payment Option</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setPackagePaymentOption('full')}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all text-left",
                          packagePaymentOption === 'full'
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        )}
                      >
                        <div className="text-sm font-medium">Full Payment</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Pay KES {Math.round(selectedPackage.total_price).toLocaleString()} now
                        </div>
                      </button>
                      <button
                        onClick={() => setPackagePaymentOption('deposit')}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all text-left",
                          packagePaymentOption === 'deposit'
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        )}
                      >
                        <div className="text-sm font-medium">30% Deposit</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Pay KES {Math.round(selectedPackage.total_price * 0.3).toLocaleString()} now
                        </div>
                      </button>
                    </div>
      {/* Custom Package Dialog */}
      <Dialog open={isCustomPackageOpen} onOpenChange={setIsCustomPackageOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Your Custom Package</DialogTitle>
            <DialogDescription>
              Build a personalized session package with {tutor.name}
            </DialogDescription>
          </DialogHeader>
          
          <CustomPackageBuilder
            tutorId={tutor.id}
            tutorName={tutor.name}
            tutorEmail={tutor.email}
            tutorSubjects={tutor.subjects}
            hourlyRate={currentRate}
            onClose={() => setIsCustomPackageOpen(false)}
            onPurchaseSuccess={() => {
              setIsCustomPackageOpen(false);
              toast.success("Package created! Redirecting to payment...");
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Learning Plan Request Dialog */}
      <Dialog open={isLearningPlanOpen} onOpenChange={setIsLearningPlanOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request a Personalized Learning Plan</DialogTitle>
            <DialogDescription>
              Let {tutor.name} create a custom learning plan tailored to your child's needs
            </DialogDescription>
          </DialogHeader>
          
          <LearningPlanRequest
            tutorId={tutor.id}
            tutorName={tutor.name}
            tutorEmail={tutor.email}
            tutorSubjects={tutor.subjects}
            onClose={() => setIsLearningPlanOpen(false)}
            onSubmitSuccess={() => {
              setIsLearningPlanOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Package:</span>
                      <span className="font-semibold">{selectedPackage.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Sessions:</span>
                      <span className="font-semibold">{selectedPackage.session_count} sessions</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Valid for:</span>
                      <span className="font-semibold">{selectedPackage.validity_days} days</span>
                    </div>
                    <Separator />
                    {packagePaymentOption === 'deposit' ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total Price:</span>
                          <span className="font-medium">KES {Math.round(selectedPackage.total_price).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Deposit (30%):</span>
                          <span className="font-medium">KES {Math.round(selectedPackage.total_price * 0.3).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="font-semibold">Balance Due:</span>
                          <div className="text-right">
                            <p className="text-lg font-bold text-amber-600">
                              KES {Math.round(selectedPackage.total_price * 0.7).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Payable later
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between items-baseline">
                        <span className="font-semibold">Total Price:</span>
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            KES {Math.round(selectedPackage.total_price).toLocaleString()}
                          </p>
                          <p className="text-xs text-green-600">
                            You save {selectedPackage.discount_percentage}%
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Button className="w-full" size="lg">
                Proceed to Payment
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                Secure payment via PesaPal. After payment, you can start booking your sessions immediately from your dashboard.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TutorProfile;

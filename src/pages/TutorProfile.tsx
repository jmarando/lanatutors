import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, GraduationCap, Clock, BookOpen, Award, MapPin, Users, CheckCircle2, Heart, Sparkles, Video, Calendar, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { BookingCalendar } from "@/components/BookingCalendar";
import { PackageSelector } from "@/components/PackageSelector";
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
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [bookingType, setBookingType] = useState<'paid' | 'trial' | 'free'>('paid');
  const [tutor, setTutor] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [pricingTiers, setPricingTiers] = useState<any[]>([]);
  const [selectedTier, setSelectedTier] = useState<'standard' | 'advanced'>('standard');

  useEffect(() => {
    fetchTutorProfile();
    fetchCurrentUser();
    fetchReviews();
    fetchPackages();
    fetchPricingTiers();
  }, [id]);

  // Auto-select tier based on search context
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const curriculum = params.get('curriculum');
    
    if (curriculum && pricingTiers.length > 0) {
      const advancedCurricula = ['IGCSE', 'IB', 'A-Level', 'Cambridge IGCSE', 'International Baccalaureate'];
      const isAdvanced = advancedCurricula.some(c => curriculum.includes(c));
      
      if (isAdvanced) {
        setSelectedTier('advanced');
      } else {
        setSelectedTier('standard');
      }
    }
  }, [pricingTiers]);

  // Auto-open booking dialog when returning from login via redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openBooking') === '1') {
      const type = (params.get('bookingType') as 'paid' | 'trial' | 'free') || 'paid';
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

    const photoMapping: { [key: string]: string } = {
      "Lana": tutor1,
      "James": tutor2,
      "Sarah": tutor3,
      "Michael": tutor4,
      "Emily": tutor5,
      "David": tutor6,
      "Calvin": calvinProfilePhoto,
    };

    const firstName = profile?.full_name?.split(" ")[0] || "Tutor";
    const photoUrl = photoMapping[firstName] || tutor1;

    setTutor({
      id: tutorProfile.id,
      name: profile?.full_name || "Tutor",
      photo: profile?.full_name?.split(" ").map((n: string) => n[0]).join("") || "T",
      photoUrl,
      email: tutorProfile.email,
      subjects: tutorProfile.subjects || [],
      bio: tutorProfile.bio || "",
      hourlyRate: tutorProfile.hourly_rate,
      experience: tutorProfile.experience_years || 0,
      rating: tutorProfile.rating || 0,
      reviews: tutorProfile.total_reviews || 0,
      education: tutorProfile.qualifications || [],
      school: tutorProfile.current_institution || "Not specified",
      curriculum: tutorProfile.curriculum || [],
      teachingMode: tutorProfile.teaching_mode || [],
      servicesOffered: tutorProfile.services_offered || [],
      whyStudentsLove: tutorProfile.why_students_love || [],
      teachingExperience: tutorProfile.teaching_experience || [],
      verified: tutorProfile.verified,
    });

    setLoading(false);
  };

  const fetchReviews = async () => {
    const { data: reviewsData } = await supabase
      .from("tutor_reviews")
      .select("*")
      .eq("tutor_id", id)
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
    const { data: packagesData } = await supabase
      .from("package_offers")
      .select("*")
      .eq("tutor_id", id)
      .eq("is_active", true)
      .order("session_count");

    if (packagesData) {
      setPackages(packagesData);
    }
  };

  const fetchPricingTiers = async () => {
    const { data: tiersData } = await supabase
      .from("tutor_pricing_tiers")
      .select("*")
      .eq("tutor_id", id)
      .order("tier_name");

    if (tiersData) {
      setPricingTiers(tiersData);
    }
  };

  const getCurrentRate = () => {
    if (pricingTiers.length === 0) return Number(tutor?.hourlyRate) || 0;
    
    const tier = pricingTiers.find(t => t.tier_name.toLowerCase() === selectedTier);
    return tier ? Number(tier.online_hourly_rate) : Number(tutor?.hourlyRate) || 0;
  };

  const handleBookingTypeSelect = async (type: 'paid' | 'trial' | 'free') => {
    if (type === 'free') {
      navigate('/book-consultation');
      return;
    }
    
    setBookingType(type);

    const urlWithIntent = `${window.location.pathname}?openBooking=1&bookingType=${type}`;
    window.history.replaceState(null, '', urlWithIntent);
    
    if (!currentUser) {
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
    }
    
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
                  <Avatar className="w-28 h-28 shrink-0 border-4 border-primary/20">
                    <AvatarImage src={tutor.photoUrl} alt={tutor.name} />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground font-semibold">
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

                <div className="flex items-center gap-4 pt-6 border-t border-border/50">
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{tutor.rating}</span>
                    <span className="text-sm text-muted-foreground ml-1">
                      ({tutor.reviews} {tutor.reviews === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

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

            {/* Services Offered */}
            {(tutor.servicesOffered.length > 0 || tutor.teachingMode.length > 0) && (
              <Card className="border-border/50">
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
                            {exp.subjects && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {exp.subjects}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

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

                  {/* Tier Selector */}
                  {pricingTiers.length > 0 && (
                    <div className="mb-6">
                      <label className="text-sm font-medium mb-2 block">Curriculum Level</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setSelectedTier('standard')}
                          className={cn(
                            "p-3 rounded-lg border-2 text-left transition-all",
                            selectedTier === 'standard'
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <div className="font-semibold text-sm">Standard</div>
                          <div className="text-xs text-muted-foreground">
                            8-4-4, CBC, etc.
                          </div>
                        </button>
                        <button
                          onClick={() => setSelectedTier('advanced')}
                          className={cn(
                            "p-3 rounded-lg border-2 text-left transition-all",
                            selectedTier === 'advanced'
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <div className="font-semibold text-sm">Advanced</div>
                          <div className="text-xs text-muted-foreground">
                            IGCSE, IB, A-Level
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="bg-primary/10 rounded-lg p-4 mb-6 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Starting from</p>
                    <p className="text-3xl font-bold text-primary">
                      KES {currentRate.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">per hour (online)</p>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={() => handleBookingTypeSelect('paid')}
                      className="w-full h-auto py-4"
                      size="lg"
                    >
                      <div className="text-left w-full">
                        <div className="font-semibold mb-1">Book Paid Session</div>
                        <div className="text-xs opacity-90">Single or double lesson</div>
                      </div>
                    </Button>

                    <Button
                      onClick={() => handleBookingTypeSelect('trial')}
                      variant="outline"
                      className="w-full h-auto py-4"
                      size="lg"
                    >
                      <div className="text-left w-full">
                        <div className="font-semibold mb-1">Book Trial Session</div>
                        <div className="text-xs text-muted-foreground">30 mins • Free</div>
                      </div>
                    </Button>

                    <Button
                      onClick={() => handleBookingTypeSelect('free')}
                      variant="secondary"
                      className="w-full h-auto py-4"
                      size="lg"
                    >
                      <div className="text-left w-full">
                        <div className="font-semibold mb-1">Free Consultation</div>
                        <div className="text-xs text-muted-foreground">Get expert advice</div>
                      </div>
                    </Button>
                  </div>

                  <Separator className="my-6" />

                  <div className="space-y-2">
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
                  </div>
                </CardContent>
              </Card>

              {/* Package Offers */}
              {packages.length > 0 && (
                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Save with Packages</h3>
                    </div>
                    <PackageSelector
                      tutorId={tutor.id}
                      onSelectPackage={handlePackageSelect}
                    />
                  </CardContent>
                </Card>
              )}
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
                  </div>
                </CardContent>
              </Card>

              <Button className="w-full" size="lg">
                Proceed to Payment
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TutorProfile;

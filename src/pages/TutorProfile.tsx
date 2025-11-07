import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, GraduationCap, Clock, BookOpen, Award, MapPin, Users, CheckCircle2, Heart, Sparkles, Video } from "lucide-react";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { BookingCalendar } from "@/components/BookingCalendar";
import { PackageSelector } from "@/components/PackageSelector";

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

  useEffect(() => {
    fetchTutorProfile();
    fetchCurrentUser();
    fetchReviews();
    fetchPackages();
  }, [id]);

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
    
    // Try to fetch by slug first, then fall back to ID
    let tutorProfile;
    let error;
    
    // Try by slug
    const { data: profileBySlug, error: slugError } = await supabase
      .from("tutor_profiles")
      .select("*")
      .eq("profile_slug", id)
      .maybeSingle();
    
    if (profileBySlug) {
      tutorProfile = profileBySlug;
    } else {
      // Fall back to ID
      const { data: profileById, error: idError } = await supabase
        .from("tutor_profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      tutorProfile = profileById;
      error = idError;
    }

    if (error || !tutorProfile) {
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
      
      // Check if this is Calvin's profile
      const isCalvin = profile?.full_name === "Calvins Onuko";
      
      setTutor({
        id: tutorProfile.id,
        userId: tutorProfile.user_id,
        name: profile?.full_name || "Tutor",
        email: tutorUser?.email || "",
        subjects: tutorProfile.subjects || [],
        school: tutorProfile.current_institution || "Not specified",
        displayInstitution: tutorProfile.display_institution || false,
        rating: Number(tutorProfile.rating) || 0,
        reviews: tutorProfile.total_reviews || 0,
        hourlyRate: Number(tutorProfile.hourly_rate) || 0,
        photo: profile?.full_name 
          ? profile.full_name.split(' ').map((n: string) => n[0]).join('') 
          : "T",
        photoUrl: isCalvin ? calvinProfilePhoto : randomImage,
        bio: tutorProfile.bio || "",
        education: Array.isArray(tutorProfile.qualifications) 
          ? tutorProfile.qualifications 
          : [],
        graduationYear: tutorProfile.graduation_year,
        experience: tutorProfile.experience_years || 0,
        teachingExperience: tutorProfile.teaching_experience || [],
        tutoringExperience: tutorProfile.tutoring_experience || "",
        curriculum: tutorProfile.curriculum || [],
        servicesOffered: tutorProfile.services_offered || [],
        specializations: tutorProfile.specializations || "",
        teachingLocation: tutorProfile.teaching_location || "",
        teachingMode: tutorProfile.teaching_mode || [],
        whyStudentsLove: tutorProfile.why_students_love || [],
      });
    }
    setLoading(false);
  };

  const fetchReviews = async () => {
    const { data: reviewsData } = await supabase
      .from("tutor_reviews")
      .select("*")
      .eq("tutor_id", id)
      .eq("is_approved", true)
      .order("created_at", { ascending: false });

    if (reviewsData) {
      // Fetch student names separately
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

  const handleBookingTypeSelect = async (type: 'paid' | 'trial' | 'free') => {
    if (type === 'free') {
      // Redirect to consultation booking page
      navigate('/book-consultation');
      return;
    }
    
    // For paid and trial sessions, open calendar directly
    setBookingType(type);

    // Persist intent in URL so we can resume after login
    const urlWithIntent = `${window.location.pathname}?openBooking=1&bookingType=${type}`;
    window.history.replaceState(null, '', urlWithIntent);
    
    // Try to fetch current user if available, but don't require it
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
    
    // Check if user is logged in
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
      "@type": "EducationalOrganization",
      "name": tutor.school
    },
    "knowsAbout": tutor.subjects,
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": tutor.rating,
      "reviewCount": tutor.reviews
    },
    "offers": {
      "@type": "Offer",
      "price": tutor.hourlyRate,
      "priceCurrency": "KES",
      "availability": "https://schema.org/InStock"
    }
  };

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <SEO 
        title={`${tutor.name} - ${tutor.subjects.join(", ")} Tutor`}
        description={`Book tutoring sessions with ${tutor.name}, an experienced ${tutor.subjects.join(", ")} tutor from ${tutor.school}. ${tutor.rating} star rating with ${tutor.reviews} reviews. KES ${tutor.hourlyRate}/hour.`}
        keywords={`${tutor.subjects.join(", ")}, Kenya tutor, ${tutor.school}, online tutoring`}
        structuredData={tutorSchema}
      />
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header Card */}
        <Card className="mb-6 border-border/50">
          <CardContent className="p-0">
            <div className="p-8 border-b border-border/50">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <Avatar className="w-28 h-28 shrink-0 border-4 border-primary/20">
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
                  
                  {/* Enhanced Tutor Details */}
                  <div className="space-y-2">
                    {/* Academic Qualifications */}
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
                    
                    {/* Current School/Institution */}
                    {tutor.school && tutor.school !== "Not specified" && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{tutor.school}</span>
                      </div>
                    )}
                    
                    {/* Teaching Experience */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Award className="w-4 h-4" />
                      <span>{tutor.experience}+ years teaching experience</span>
                    </div>
                    
                    {/* Curriculum */}
                    {tutor.curriculum && tutor.curriculum.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="w-4 h-4" />
                        <span>{tutor.curriculum.join(", ")}</span>
                      </div>
                    )}
                    
                    {/* Teaching Mode */}
                    {tutor.teachingMode && tutor.teachingMode.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Video className="w-4 h-4" />
                        <span>{tutor.teachingMode.join(" & ")}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 flex flex-col gap-6 bg-muted/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 shrink-0 fill-yellow-500 text-yellow-500" />
                    <span className="font-bold text-lg">{tutor.rating.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">({tutor.reviews} reviews)</span>
                  </div>
                  
                  <div className="h-8 w-px bg-border hidden sm:block" />
                  
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <div className="text-xl font-bold">
                        KES {tutor.hourlyRate.toLocaleString()}
                        <span className="text-sm font-normal text-muted-foreground">/hr</span>
                      </div>
                      <span className="text-xs text-muted-foreground">online</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-lg font-semibold text-muted-foreground">
                        KES {(tutor.hourlyRate * 1.5).toLocaleString()}
                        <span className="text-xs font-normal">/hr</span>
                      </div>
                      <span className="text-xs text-muted-foreground">in-person</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Options */}
              <div>
                <h3 className="font-bold text-base mb-3">Choose Your Booking Option</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Book a single session or save more with a package deal. All packages valid for {packages[0]?.validity_days || 90} days.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {/* Single Session Option */}
                  <div className="bg-background rounded-lg p-3 border-2 border-primary/30 hover:border-primary/60 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-sm">Single Session</h4>
                        <p className="text-xs text-muted-foreground">1-2 hours</p>
                      </div>
                    </div>
                    <div className="space-y-1 mb-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Online:</span>
                        <span className="font-medium">KES {tutor.hourlyRate.toLocaleString()}/hr</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">In-person:</span>
                        <span className="font-medium">KES {(tutor.hourlyRate * 1.5).toLocaleString()}/hr</span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleBookingTypeSelect('paid')}
                    >
                      Book Now
                    </Button>
                  </div>

                  {/* Package Deals */}
                  {packages.length > 0 && packages.map((pkg: any) => {
                    const pricePerSession = pkg.total_price / pkg.session_count;
                    const originalPrice = pricePerSession / (1 - pkg.discount_percentage / 100) * pkg.session_count;
                    const savings = originalPrice - pkg.total_price;
                    
                    return (
                      <div key={pkg.id} className="bg-background rounded-lg p-3 border-2 border-green-600/30 hover:border-green-600/60 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-sm">{pkg.name}</h4>
                            <p className="text-xs text-muted-foreground">{pkg.session_count} sessions</p>
                          </div>
                          <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                            {pkg.discount_percentage}% off
                          </Badge>
                        </div>
                        <div className="space-y-1 mb-3">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Per session:</span>
                            <span className="font-medium">KES {Math.round(pricePerSession).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-baseline pt-1.5 border-t border-border/50">
                            <div>
                              <p className="text-xs text-muted-foreground line-through">
                                KES {Math.round(originalPrice).toLocaleString()}
                              </p>
                              <p className="text-lg font-bold text-green-600">
                                KES {Math.round(pkg.total_price).toLocaleString()}
                              </p>
                            </div>
                            <p className="text-xs text-green-600 font-medium">
                              Save {Math.round(savings).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full bg-green-600 hover:bg-green-700"
                          onClick={() => handlePackageSelect(pkg)}
                        >
                          Purchase Package
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services & Teaching Mode */}
        {(tutor.servicesOffered.length > 0 || tutor.teachingMode.length > 0) && (
          <Card className="mb-6 border-border/50">
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
                {tutor.teachingMode.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Teaching Format:</h3>
                    <div className="flex flex-wrap gap-2">
                      {tutor.teachingMode.map((mode: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {mode}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Experience Timeline */}
        <Card className="mb-6 border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Teaching Experience</h2>
            </div>
            
            {/* Overall Experience Summary */}
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

            {/* Teaching Experience Timeline */}
            {tutor.teachingExperience.length > 0 && (
              <div className="mb-6">
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
                        <p className="text-sm text-muted-foreground">{exp.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tutoring Experience */}
            {tutor.tutoringExperience && (
              <div>
                <h3 className="font-semibold text-sm mb-3">Private Tutoring Experience</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tutor.tutoringExperience}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Education */}
        <Card className="mb-6 border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Education</h2>
            </div>
            <div className="space-y-3">
              {Array.isArray(tutor.education) && tutor.education.length > 0 ? (
                <ul className="space-y-2">
                  {tutor.education.map((qual: string, idx: number) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-primary font-bold shrink-0">•</span>
                      <span className="text-sm leading-relaxed">{qual}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div>
                  <p className="font-semibold text-sm mb-1">{tutor.education}</p>
                  <p className="text-sm text-muted-foreground">{tutor.school}</p>
                  {tutor.graduationYear && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Graduated: {tutor.graduationYear}
                    </p>
                  )}
                </div>
              )}
            </div>
            {!Array.isArray(tutor.education) && (
              <p className="text-xs text-muted-foreground mt-3">{tutor.school}</p>
            )}
          </CardContent>
        </Card>

        {/* Why Students Love This Tutor */}
        {tutor.whyStudentsLove.length > 0 && (
          <Card className="mb-6 border-border/50 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-primary fill-primary" />
                <h2 className="font-bold text-lg">Why Students Love {tutor.name.split(' ')[0]}</h2>
              </div>
              <ul className="space-y-3">
                {tutor.whyStudentsLove.map((reason: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground leading-relaxed">{reason}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}


        {/* About / Bio */}
        <Card className="mb-6 border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">About Me</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {tutor.bio || "No bio provided yet."}
            </p>
          </CardContent>
        </Card>

        {/* Specializations */}
        {tutor.specializations && (
          <Card className="mb-6 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg">Specializations & Topics</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {tutor.specializations}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Star className="w-5 h-5 text-primary fill-primary" />
                <h2 className="font-bold text-lg">Student Reviews ({reviews.length})</h2>
              </div>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="pb-4 border-b border-border/50 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{review.profiles?.full_name || "Student"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating
                                ? "fill-yellow-500 text-yellow-500"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {review.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Booking Dialog */}
        <Dialog open={isBookingOpen} onOpenChange={(open) => { setIsBookingOpen(open); if (!open) window.history.replaceState(null, '', window.location.pathname); }}>
          <DialogContent className="max-w-5xl max-h-[95vh] p-0 overflow-hidden flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>
                {bookingType === 'trial' ? 'Book Trial Lesson (50% Off)' : bookingType === 'free' ? 'Book Free Consultation' : `Book a Session with ${tutor.name}`}
              </DialogTitle>
              <DialogDescription>
                {bookingType === 'free' 
                  ? `Get to know ${tutor.name} with a complimentary 30-minute chemistry session to check compatibility`
                  : bookingType === 'trial'
                  ? `Special trial rate: KES ${Math.floor(tutor.hourlyRate * 0.5).toLocaleString()} per hour (50% off regular price)`
                  : 'Select a date and available time slot'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="overflow-y-auto flex-1 px-6 pb-6">
              {currentUser ? (
                <BookingCalendar
                  tutorId={tutor.userId}
                  tutorName={tutor.name}
                  tutorEmail={tutor.email}
                  studentEmail={currentUser.email}
                  studentName={currentUser.name}
                  hourlyRate={bookingType === 'trial' ? Math.floor(tutor.hourlyRate * 0.5) : bookingType === 'free' ? 0 : tutor.hourlyRate}
                  tutorSubjects={tutor.subjects}
                  tutorLocations={tutor.teachingLocation ? tutor.teachingLocation.split(',').map((l: string) => l.trim()).filter(Boolean) : []}
                  isTrialSession={bookingType === 'free' || bookingType === 'trial'}
                  onBookingComplete={() => setIsBookingOpen(false)}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-6">Please sign in to book a session</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={() => {
                      // Ensure URL contains resume params
                      const params = new URLSearchParams(window.location.search);
                      if (params.get('openBooking') !== '1') {
                        window.history.replaceState(null, '', `${window.location.pathname}?openBooking=1&bookingType=${bookingType}`);
                      }
                      const redirect = `${window.location.pathname}${window.location.search}`;
                      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
                    }}>Sign In</Button>
                    <Button variant="outline" onClick={() => {
                      // Ensure URL contains resume params
                      const params = new URLSearchParams(window.location.search);
                      if (params.get('openBooking') !== '1') {
                        window.history.replaceState(null, '', `${window.location.pathname}?openBooking=1&bookingType=${bookingType}`);
                      }
                      const redirect = `${window.location.pathname}${window.location.search}`;
                      navigate(`/student-signup?redirect=${encodeURIComponent(redirect)}`);
                    }}>Sign Up</Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Package Purchase Dialog */}
        <Dialog open={isPackagePurchaseOpen} onOpenChange={setIsPackagePurchaseOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Purchase {selectedPackage?.name}</DialogTitle>
              <DialogDescription>
                You're about to purchase a package of {selectedPackage?.session_count} sessions. After purchase, you'll be able to book individual sessions from your package credit.
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
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Price per session:</span>
                        <span className="font-semibold">
                          KES {Math.round(selectedPackage.total_price / selectedPackage.session_count).toLocaleString()}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-baseline">
                        <span className="font-semibold">Total Package Price:</span>
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            KES {Math.round(selectedPackage.total_price).toLocaleString()}
                          </p>
                          <p className="text-xs text-green-600">
                            You save {selectedPackage.discount_percentage}%
                          </p>
                        </div>
                      </div>
                      <Separator />
                      <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">Pay Today (30% Deposit):</span>
                          <p className="text-xl font-bold text-blue-600">
                            KES {Math.round(selectedPackage.total_price * 0.3).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Remaining balance: KES {Math.round(selectedPackage.total_price * 0.7).toLocaleString()} (pay later)
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    How It Works
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="text-blue-600 font-bold">1.</span>
                      <span>Pay 30% deposit today to secure your package</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-blue-600 font-bold">2.</span>
                      <span>Book individual sessions one at a time when it suits you</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-blue-600 font-bold">3.</span>
                      <span>Each booking uses 1 session from your package credit</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-blue-600 font-bold">4.</span>
                      <span>Pay the remaining 70% balance anytime from your dashboard</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-blue-600 font-bold">5.</span>
                      <span>Use all {selectedPackage.session_count} sessions within {selectedPackage.validity_days} days</span>
                    </li>
                  </ul>
                </div>

                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={async () => {
                    try {
                      console.log('Starting package purchase process...');
                      
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) {
                        showToast({
                          title: "Please Sign In",
                          description: "You need to be signed in to purchase",
                          variant: "destructive",
                        });
                        return;
                      }

                      console.log('User authenticated:', user.id);
                      console.log('Package details:', selectedPackage);
                      console.log('Tutor ID:', id);

                      // Calculate deposit (30% of total)
                      const depositAmount = Math.round(selectedPackage.total_price * 0.3);
                      const remainingBalance = selectedPackage.total_price - depositAmount;

                      console.log('Deposit amount:', depositAmount);
                      console.log('Remaining balance:', remainingBalance);

                      // Create package purchase
                      const expiresAt = new Date();
                      expiresAt.setDate(expiresAt.getDate() + selectedPackage.validity_days);

                      console.log('Creating package purchase...');
                      const { data: purchase, error } = await supabase
                        .from('package_purchases')
                        .insert({
                          student_id: user.id,
                          tutor_id: id,
                          package_offer_id: selectedPackage.id,
                          total_sessions: selectedPackage.session_count,
                          sessions_remaining: selectedPackage.session_count,
                          total_amount: selectedPackage.total_price,
                          amount_paid: depositAmount,
                          expires_at: expiresAt.toISOString(),
                          payment_status: 'partial',
                        })
                        .select()
                        .single();

                      if (error) {
                        console.error('Package purchase insert error:', error);
                        throw error;
                      }

                      console.log('Package purchase created:', purchase);

                      // Initiate payment for deposit
                      console.log('Initiating Pesapal payment for deposit...');
                      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('initiate-pesapal-payment', {
                        body: {
                          amount: depositAmount,
                          description: `${selectedPackage.name} - Deposit (30%) for ${selectedPackage.session_count} sessions with ${tutor.name}`,
                          paymentType: 'package_deposit',
                          referenceId: purchase.id,
                          callbackUrl: window.location.origin + '/payment-callback',
                        },
                      });

                      if (paymentError) {
                        console.error('Pesapal payment error:', paymentError);
                        throw paymentError;
                      }

                      console.log('Payment initiated:', paymentData);

                      // Redirect to payment
                      if (paymentData && (paymentData as any).redirect_url) {
                        console.log('Redirecting to Pesapal:', (paymentData as any).redirect_url);
                        window.location.href = (paymentData as any).redirect_url as string;
                      } else {
                        const msg = (paymentData as any)?.error || 'Payment could not be initiated. Please try again later.';
                        throw new Error(msg);
                      }

                    } catch (error: any) {
                      console.error('Package purchase error:', error);
                      showToast({
                        title: "Purchase Failed",
                        description: error.message || "Failed to initiate package purchase. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Pay 30% Deposit (KES {Math.round(selectedPackage.total_price * 0.3).toLocaleString()})
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default TutorProfile;

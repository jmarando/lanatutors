import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, 
  Calendar, 
  Video, 
  ShieldCheck, 
  Clock, 
  Lock, 
  Smartphone,
  Star,
  GraduationCap,
  Users,
  Award,
  Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { HolidayPackageBanner } from "@/components/HolidayPackageBanner";
import { useNavigate } from "react-router-dom";
import heroVideo from "@/assets/hero-video.mp4";
import heroImage from "@/assets/hero-image.jpg";

interface FeaturedTutor {
  id: string;
  name: string;
  subjects: string;
  school: string | null;
  rating: number;
  reviews: number;
  hourlyRate: number;
  photo: string;
  photoUrl: string | null;
  profileSlug: string | null;
  bio: string | null;
  experienceYears: number;
}

const Home = () => {
  const navigate = useNavigate();
  const [featuredTutors, setFeaturedTutors] = useState<FeaturedTutor[]>([]);
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "Lana Tutors",
    "description": "Your Trusted Tutoring Partner - Quality online tutoring from verified Kenyan teachers. Join from anywhere in the world.",
    "url": window.location.origin,
    "logo": `${window.location.origin}/favicon.ico`,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "First Floor, Arbor House, Arboretum Drive",
      "addressLocality": "Nairobi",
      "addressCountry": "KE"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+254-725252542",
      "contactType": "customer service",
      "email": "info@lanatutors.africa"
    },
    "sameAs": [],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "10000"
    }
  };

  const stats = [
    { icon: Users, value: "50+", label: "Verified Tutors" },
    { icon: GraduationCap, value: "500+", label: "Happy Students" },
    { icon: Award, value: "All Curricula", label: "CBC, IGCSE, American & 8-4-4" }
  ];

  const steps = [
    {
      icon: Search,
      title: "1. Browse & Compare Tutors",
      description: "Search our database of 500+ verified tutors from top Kenyan schools. Learn online from anywhere in the world. Filter by subject, experience level, rating, and hourly rate. View detailed profiles including qualifications, teaching style, student reviews, and availability."
    },
    {
      icon: Calendar,
      title: "2. Schedule Your Session",
      description: "Select a tutor and choose from their available time slots. Book one-time sessions or set up recurring lessons. Receive instant confirmation and automatic calendar invites with Google Meet links."
    },
    {
      icon: Video,
      title: "3. Attend & Learn",
      description: "Join your live video session via Google Meet - no downloads required. Get personalized 1-on-1 attention tailored to your learning pace. Access shared whiteboards, screen sharing, and interactive learning materials."
    },
    {
      icon: Award,
      title: "4. Track Progress",
      description: "After each session, receive session notes and homework assignments. Rate your tutor and provide feedback. Monitor your improvement with progress reports and achieve your academic goals."
    }
  ];

  const benefits = [
    {
      icon: ShieldCheck,
      title: "Verified Expert Tutors",
      description: "Every tutor is a verified teacher from top Kenyan schools including Alliance, Starehe, Kenya High, and more. Learn online from anywhere - Kenya, East Africa, or the diaspora. We verify teaching credentials and conduct background checks. Only the top 15% of applicants are accepted."
    },
    {
      icon: Clock,
      title: "Learn on Your Schedule",
      description: "Access tutoring 7 days a week from 6 AM to 10 PM. Book sessions as little as 2 hours in advance or schedule recurring weekly lessons. Reschedule or cancel up to 24 hours before your session with no penalty. Perfect for busy students balancing school, sports, and activities."
    },
    {
      icon: Lock,
      title: "Safe & Flexible Learning",
      description: "Choose between online sessions from home or in-person tutoring. Parents can monitor sessions and ensure student safety. Online sessions use secure video calls. In-person sessions feature thoroughly vetted tutors. Quality education delivered your way."
    },
    {
      icon: Smartphone,
      title: "Flexible Payment Options",
      description: "Pay using M-Pesa or card payments. Transparent pricing with no hidden fees. Our deposit system ensures commitment while keeping barriers low. Get instant payment confirmation and digital receipts. Your financial information stays secure."
    },
    {
      icon: GraduationCap,
      title: "Personalized Learning",
      description: "Get 1-on-1 attention customized to your learning style and pace. Tutors adapt to your specific needs, whether you're catching up, keeping pace, or advancing ahead. Focus on exactly what you need help with - no wasted time on topics you already understand."
    },
    {
      icon: Users,
      title: "Proven Results",
      description: "Students who use Lana see an average grade improvement of 2 levels within 3 months. 94% of students report increased confidence in their subjects. Our tutors have helped over 10,000 students excel in KCPE and KCSE examinations."
    }
  ];

  useEffect(() => {
    const fetchFeaturedTutors = async () => {
      const { data: tutorProfiles, error } = await supabase
        .from("tutor_profiles")
        .select(`
          id,
          user_id,
          subjects,
          current_institution,
          rating,
          total_reviews,
          hourly_rate,
          profile_slug,
          bio,
          experience_years
        `)
        .eq("verified", true)
        .not("bio", "is", null)
        .not("current_institution", "is", null)
        .not("hourly_rate", "is", null)
        .neq("user_id", "9de6bfdd-4282-4ce0-9c2a-661feae63970") // Exclude Kefa
        .gte("experience_years", 5) // At least 5 years experience
        .order("experience_years", { ascending: false })
        .order("rating", { ascending: false })
        .limit(3);

      if (error) {
        console.error("Error fetching tutors:", error);
        return;
      }

      if (!tutorProfiles || tutorProfiles.length === 0) return;

      // Fetch names and avatars from profiles table
      const userIds = tutorProfiles.map(t => t.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const tutorsWithNames: FeaturedTutor[] = tutorProfiles.map(tutor => {
        const profile = profiles?.find(p => p.id === tutor.user_id);
        const fullName = profile?.full_name || "Tutor";
        const initials = fullName
          .split(" ")
          .map(n => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        return {
          id: tutor.id,
          name: fullName,
          subjects: tutor.subjects?.slice(0, 3).join(", ") || "Various Subjects",
          school: tutor.current_institution,
          rating: tutor.rating || 0,
          reviews: tutor.total_reviews || 0,
          hourlyRate: tutor.hourly_rate || 0,
          photo: initials,
          photoUrl: profile?.avatar_url || null,
          profileSlug: tutor.profile_slug,
          bio: tutor.bio,
          experienceYears: tutor.experience_years || 0
        };
      });

      setFeaturedTutors(tutorsWithNames);
    };

    fetchFeaturedTutors();
  }, []);

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <SEO 
        title="Your Trusted Tutoring Partner"
        description="Connect with verified teachers from top Kenyan schools for safe, convenient one-on-one tutoring. Master KCSE, KCPE, CBC, IGCSE, and American curriculum from home with Lana Tutors."
        structuredData={organizationSchema}
      />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/85 to-background"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-relaxed">
                <span className="block whitespace-nowrap">Expert Tutoring.</span>
                <span className="block whitespace-nowrap text-primary">Safe. Verified. Trusted.</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Learn from verified tutors from Kenya's top schools. Choose between online or in-person sessions. Rigorously vetted educators. Seamless payments via M-Pesa or Card. All CBC, IGCSE, American, and 8-4-4 subjects covered.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/book-consultation">
                  <Button size="lg" className="h-14 px-8 text-lg hover-scale">
                    Book Free Consultation
                  </Button>
                </Link>
                <Link to="/tutors">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg hover-scale group">
                    <Sparkles className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                    Find a Tutor
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg shadow-2xl">
              <video 
                src={heroVideo} 
                autoPlay 
                loop 
                muted 
                playsInline
                className="w-full h-auto object-cover scale-150"
                style={{ transformOrigin: 'center 30%' }}
                aria-label="Lana online tutoring demo video"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* Holiday Package Banner */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        <HolidayPackageBanner onViewPackages={() => navigate("/holiday-packages")} />
      </section>

      {/* Stats Section */}
      <section className="border-y bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="space-y-2">
                  <Icon className="w-10 h-10 mx-auto text-primary mb-2" />
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Our Services</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tutoring solutions tailored to your learning needs
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "After School Tuition",
                description: "Regular sessions to reinforce classroom learning and build strong fundamentals",
              },
              {
                title: "Homework Assistance",
                description: "Expert guidance to help students complete assignments with confidence",
              },
              {
                title: "Exam Revision & Prep",
                description: "Intensive preparation for KPSEA, KJSEA, KCSE, IGCSE, and other major examinations",
              },
              {
                title: "Holiday Tuition",
                description: "Catch-up programs and advanced learning during school breaks",
              },
              {
                title: "Homeschooling Support",
                description: "Flexible home-based learning with expert tutors and tailored academic guidance",
              },
              {
                title: "Diaspora Learning",
                description: "Parents abroad — get access to trusted Kenyan tutors at home rates. Same quality. Same care. Anywhere in the world.",
              },
            ].map((service, index) => (
              <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                <p className="text-sm text-muted-foreground">{service.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Holiday Packages CTA */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-primary via-primary/95 to-accent text-primary-foreground border-0 overflow-hidden relative">
            <CardContent className="p-10 text-center relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium mb-4">
                <Sparkles className="w-4 h-4" />
                Limited Time Offer
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-3">🎓 December Revision Packages</h2>
              <p className="text-lg mb-6 opacity-90 max-w-2xl mx-auto">
                Intensive exam preparation for candidate years. Save up to 25% on revision bundles for IGCSE, CBC & 8-4-4
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to="/holiday-packages">
                  <Button size="lg" variant="secondary" className="text-lg px-8 shadow-lg">
                    View Packages
                  </Button>
                </Link>
                <Link to="/book-consultation">
                  <Button size="lg" variant="outline" className="text-lg px-8 shadow-lg bg-white/10 hover:bg-white/20 text-white border-white/30">
                    Book Free Consultation
                  </Button>
                </Link>
              </div>
              <p className="text-sm mt-4 opacity-75">
                Valid December 2025 - January 2026 • All Subjects • Expert Tutors
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Book a Consultation",
                description: "Schedule a free 30-minute consultation with a Lana consultant to discuss your learning goals",
              },
              {
                step: "2",
                title: "Get Matched",
                description: "We'll match you with the perfect tutor based on your needs, curriculum, and learning style",
              },
              {
                step: "3",
                title: "Start Learning",
                description: "Choose online or in-person sessions, pay securely, and begin your learning journey",
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">What Parents & Students Say</h2>
            <p className="text-lg text-muted-foreground">
              Real feedback from our Lana community
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Jane Wanjiru",
                role: "Parent",
                rating: 5,
                comment: "My daughter's grades improved from C to A- in just 3 months! The tutors are professional and really care about the students.",
              },
              {
                name: "David Omondi",
                role: "Form 3 Student",
                rating: 5,
                comment: "I love that I can choose online classes. It's so convenient and I don't have to travel. My tutor makes Math actually fun!",
              },
              {
                name: "Mary Kamau",
                role: "Parent",
                rating: 5,
                comment: "Safe, verified tutors from top schools. The M-Pesa payment is seamless. Best decision for my son's education!",
              },
            ].map((review, index) => (
              <Card key={index} className="p-6">
                <div className="flex gap-1 mb-3">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">"{review.comment}"</p>
                <div className="border-t pt-4">
                  <p className="font-semibold text-sm">{review.name}</p>
                  <p className="text-xs text-muted-foreground">{review.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Tutors */}
      <section className="bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-3">Featured Tutors</h2>
          <p className="text-center text-muted-foreground mb-10">Meet some of our top-rated educators</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredTutors.map((tutor) => (
              <Card key={tutor.id} className="card-hover cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center mb-4">
                    <Avatar className="w-20 h-20 mb-3 border-2 border-black ring-2 ring-black/10">
                      <AvatarImage src={tutor.photoUrl || undefined} alt={tutor.name} />
                      <AvatarFallback className="text-xl bg-muted text-foreground font-semibold">
                        {tutor.photo}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-lg font-bold mb-1">{tutor.name}</h3>
                    <Badge variant="secondary" className="mb-2 text-xs">{tutor.subjects}</Badge>
                    {tutor.school && (
                      <p className="text-xs text-muted-foreground mb-2">{tutor.school}</p>
                    )}
                    {tutor.bio && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {tutor.bio}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-sm">{tutor.rating.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({tutor.reviews})</span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {tutor.experienceYears}+ years experience
                    </div>
                    <div className="text-xl font-bold text-primary mb-3">
                      KES {tutor.hourlyRate.toLocaleString()}/hr
                    </div>
                  </div>
                  <Link to={`/tutors/${tutor.profileSlug || tutor.id}`}>
                    <Button className="w-full" variant="outline" size="sm">View Profile</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">About Lana</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Lana connects Kenyan students with the country's best educators from top institutions. Our mission is to make quality education accessible, safe, and convenient for every student, whether they prefer learning online or in-person.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card key={index} className="border">
                  <CardContent className="p-6">
                    <Icon className="w-10 h-10 text-primary mb-3" />
                    <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section for Students */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Student FAQs</h2>
            <p className="text-lg text-muted-foreground">
              Common questions from parents and students
            </p>
          </div>
          <div className="space-y-4">
            {[
              {
                q: "How do I book a session?",
                a: "Browse our tutor profiles, select a tutor that matches your needs, and choose from their available time slots. You can book single sessions or create custom packages."
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept M-Pesa and card payments. All payments are processed securely through our platform with instant confirmation."
              },
              {
                q: "Can I get a refund if I'm not satisfied?",
                a: "Yes, we offer a satisfaction guarantee. If you're not happy with your first session, contact us within 24 hours for a full refund."
              },
              {
                q: "Are the tutors verified?",
                a: "Absolutely. Every tutor undergoes a rigorous verification process including background checks, credential verification, and teaching assessments. Only the top 15% of applicants are accepted."
              },
              {
                q: "Can I switch tutors?",
                a: "Yes, you can switch tutors at any time. Simply browse our tutor profiles and book with a different educator that better fits your needs."
              },
              {
                q: "What if I need to cancel or reschedule?",
                a: "You can cancel or reschedule up to 24 hours before your session with no penalty. Cancellations within 24 hours may forfeit the session fee."
              }
            ].map((faq, index) => (
              <Card key={index} className="p-6 hover:shadow-md transition-shadow">
                <h3 className="font-bold text-lg mb-2">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section for Tutors */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Tutor FAQs</h2>
            <p className="text-lg text-muted-foreground">
              Everything tutors need to know
            </p>
          </div>
          <div className="space-y-4">
            {[
              {
                q: "How much can I earn as a tutor?",
                a: "Tutors keep 70% of their session fees with monthly payouts. Rates vary by subject, curriculum, and experience level, with most tutors earning between KES 1,000 to KES 3,000 per hour."
              },
              {
                q: "How do I get paid?",
                a: "Payments are processed monthly within the first 5 business days. We pay directly to your M-Pesa or bank account. You'll receive a detailed payment statement each month."
              },
              {
                q: "What are the requirements to become a tutor?",
                a: "You must be a verified teacher from a recognized Kenyan school, have relevant teaching credentials, pass our background check, and demonstrate strong subject knowledge through our assessment process."
              },
              {
                q: "Can I set my own schedule?",
                a: "Yes! You have complete control over your availability. Set your own hours and decide which time slots to make available for bookings."
              },
              {
                q: "What subjects can I teach?",
                a: "We support all CBC, IGCSE, American, and 8-4-4 curriculum subjects. You can teach multiple subjects and set different rates for each."
              },
              {
                q: "How does the booking process work?",
                a: "Students browse your profile and book directly from your available slots. You'll receive instant notifications via email when a session is booked. Meeting links are generated automatically."
              }
            ].map((faq, index) => (
              <Card key={index} className="p-6 hover:shadow-md transition-shadow">
                <h3 className="font-bold text-lg mb-2">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <Card className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground border-0">
            <CardContent className="p-10 text-center">
              <h2 className="text-3xl font-bold mb-3">Ready to Excel in Your Studies?</h2>
              <p className="text-lg mb-6 opacity-90">Join thousands of students learning with Lana</p>
              <Link to="/tutors">
                <Button size="lg" variant="secondary" className="text-lg px-8 shadow-lg">
                  Find Your Tutor Now
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-secondary">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-6 h-6 text-primary" />
                <span className="text-xl font-bold">Lana</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>First Floor, Arbor House,</p>
                <p>Arboretum Drive, Nairobi</p>
                <p>(+254) 725252542</p>
                <p>info@lanatutors.africa</p>
              </div>
              <div className="flex gap-4 mt-4">
                <a href="https://web.facebook.com/lanatutors" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="https://x.com/lanatutors" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a href="https://www.linkedin.com/company/lanatutors" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-4">For Students</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/tutors">Find Tutors</Link></li>
                <li><Link to="/login">My Dashboard</Link></li>
                <li><Link to="#">How It Works</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">For Tutors</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/login">Tutor Dashboard</Link></li>
                <li><Link to="/become-a-tutor">Become a Tutor</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#about" className="hover:text-primary transition-colors">About Us</a></li>
                <li><a href="https://wa.me/254725252542" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Contact Us</a></li>
                <li><Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© 2025 Lana. All rights reserved. Built for Kenyan education.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
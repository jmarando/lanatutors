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
  Award
} from "lucide-react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import heroVideo from "@/assets/hero-video.mp4";

const Home = () => {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "ElimuConnect",
    "description": "Quality online tutoring for Kenyan students with verified teachers from top schools",
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
      "email": "info@elimuconnect.co.ke"
    },
    "sameAs": [],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "10000"
    }
  };

  const stats = [
    { icon: Users, value: "500+", label: "Verified Tutors" },
    { icon: GraduationCap, value: "10,000+", label: "Happy Students" },
    { icon: Star, value: "4.9★", label: "Average Rating" }
  ];

  const steps = [
    {
      icon: Search,
      title: "1. Browse & Compare Tutors",
      description: "Search our database of 500+ verified tutors from Kenya's top schools. Filter by subject, experience level, rating, and hourly rate. View detailed profiles including qualifications, teaching style, student reviews, and availability."
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
      description: "Every tutor on ElimuConnect comes from recognized Kenyan schools including Alliance, Starehe, Kenya High, and more. We verify teaching credentials, academic qualifications, and conduct background checks. Only the top 15% of applicants are accepted to ensure quality education."
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
      description: "Students who use ElimuConnect see an average grade improvement of 2 levels within 3 months. 94% of students report increased confidence in their subjects. Our tutors have helped over 10,000 students excel in KCPE and KCSE examinations."
    }
  ];

  const featuredTutors = [
    {
      id: 1,
      name: "Ms. Aisha Hassan",
      subjects: "Math, Physics, Chemistry",
      school: "Alliance High School",
      rating: 4.9,
      reviews: 127,
      hourlyRate: 2200,
      photo: "AH"
    },
    {
      id: 2,
      name: "Mr. David Kamau",
      subjects: "English, Literature",
      school: "Starehe Boys Centre",
      rating: 4.8,
      reviews: 94,
      hourlyRate: 2000,
      photo: "DK"
    },
    {
      id: 3,
      name: "Ms. Grace Wanjiru",
      subjects: "Biology, Chemistry",
      school: "Kenya High School",
      rating: 5.0,
      reviews: 156,
      hourlyRate: 2400,
      photo: "GW"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Quality Online Tutoring for Kenyan Students"
        description="Connect with verified teachers from top Kenyan schools for safe, convenient one-on-one tutoring. Master KCSE, KCPE, and CBC curriculum from home with ElimuConnect."
        structuredData={organizationSchema}
      />
      
      {/* Hero Section - Centered with Subtle Background */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Subtle parallax video background */}
        <div className="absolute inset-0 opacity-10">
          <video 
            src={heroVideo} 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover"
            aria-label="Background video"
          >
            Your browser does not support the video tag.
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        </div>
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10 py-20">
          <div className="animate-fade-in space-y-8">
            <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
              Expert Tutoring.<br />
              <span className="text-primary">Safe. Verified. Kenyan.</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-light">
              Learn from verified tutors from Kenya's top schools. Choose between online or in-person sessions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/book-consultation">
                <Button size="lg" className="h-16 px-12 text-lg hover-scale">
                  Book Free Consultation
                </Button>
              </Link>
              <Link to="/tutors">
                <Button size="lg" variant="outline" className="h-16 px-12 text-lg hover-scale">
                  Find Tutors
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Single Row with Large Numbers */}
      <section className="py-20 border-y">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 text-center">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="space-y-4 animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                  <Icon className="w-12 h-12 mx-auto text-primary opacity-60" strokeWidth={1.5} />
                  <div className="text-6xl md:text-7xl font-bold tracking-tight">{stat.value}</div>
                  <div className="text-sm uppercase tracking-widest text-muted-foreground font-light">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Services Section - Clean Icon Grid */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20 animate-fade-in">
            <h2 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">Our Services</h2>
            <p className="text-xl text-muted-foreground font-light">
              Comprehensive tutoring solutions
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              {
                icon: GraduationCap,
                title: "After School Tuition",
                description: "Regular sessions to reinforce classroom learning",
              },
              {
                icon: Clock,
                title: "Homework Assistance",
                description: "Expert guidance for assignments",
              },
              {
                icon: Award,
                title: "Exam Revision & Prep",
                description: "Intensive preparation for major exams",
              },
              {
                icon: Calendar,
                title: "Holiday Tuition",
                description: "Catch-up programs during breaks",
              },
            ].map((service, index) => {
              const Icon = service.icon;
              return (
                <div 
                  key={index} 
                  className="text-center group cursor-pointer animate-fade-in" 
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-2">
                    <div className="w-20 h-20 mx-auto rounded-full border-2 border-border flex items-center justify-center group-hover:border-primary group-hover:bg-primary/5 transition-all">
                      <Icon className="w-9 h-9 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-3">{service.title}</h3>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed">{service.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works - Horizontal Scroll Cards */}
      <section className="py-32 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 animate-fade-in">
            <h2 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">How It Works</h2>
            <p className="text-xl text-muted-foreground font-light">
              Three simple steps to start learning
            </p>
          </div>
          
          {/* Horizontal scroll on mobile, grid on desktop */}
          <div className="overflow-x-auto md:overflow-visible -mx-6 px-6 md:mx-0 md:px-0">
            <div className="flex md:grid md:grid-cols-3 gap-8 min-w-max md:min-w-0">
              {[
                {
                  step: "1",
                  title: "Book a Consultation",
                  description: "Schedule a free 30-minute consultation with an ElimuConnect consultant to discuss your learning goals",
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
                <Card 
                  key={index} 
                  className="w-80 md:w-auto p-10 hover-scale transition-all animate-fade-in border-2 hover:border-primary" 
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  <div className="text-8xl font-bold text-primary/10 mb-6">{item.step}</div>
                  <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed font-light">{item.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Reviews - Centered Testimonial */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-16 animate-fade-in">
            <h2 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">What Parents & Students Say</h2>
            <p className="text-xl text-muted-foreground font-light">
              Real feedback from our community
            </p>
          </div>
          
          <div className="space-y-16">
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
              <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 0.2}s` }}>
                <div className="flex gap-2 justify-center mb-6">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-2xl md:text-3xl font-light text-foreground mb-8 leading-relaxed max-w-3xl mx-auto">
                  "{review.comment}"
                </p>
                <div className="pt-6 border-t inline-block">
                  <p className="font-bold text-lg">{review.name}</p>
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mt-1">{review.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Tutors - Overlapping Cards with Depth */}
      <section className="py-32 px-6 border-y">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">Featured Tutors</h2>
            <p className="text-xl text-muted-foreground font-light">Meet some of our top-rated educators</p>
          </div>
          
          {/* Desktop: Overlapping stack */}
          <div className="hidden md:flex justify-center items-center gap-8">
            {featuredTutors.map((tutor, index) => (
              <Card 
                key={tutor.id} 
                className="w-80 p-8 hover-scale transition-all cursor-pointer border-2 hover:border-primary hover:shadow-2xl animate-fade-in"
                style={{ 
                  animationDelay: `${index * 0.15}s`,
                  transform: `translateY(${index * 10}px) scale(${1 - index * 0.05})`
                }}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <Avatar className="w-24 h-24">
                    <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                      {tutor.photo}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold mb-1">{tutor.name}</h3>
                    <Badge variant="secondary" className="mb-2">{tutor.subjects}</Badge>
                    <p className="text-sm text-muted-foreground">{tutor.school}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-primary text-primary" />
                    <span className="font-bold">{tutor.rating.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">({tutor.reviews})</span>
                  </div>
                  <div className="text-3xl font-bold text-primary">
                    KES {tutor.hourlyRate.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/hr</span>
                  </div>
                  <Link to="/tutors" className="w-full">
                    <Button className="w-full" variant="outline">View Profile</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          {/* Mobile: Regular grid */}
          <div className="grid md:hidden gap-6">
            {featuredTutors.map((tutor) => (
              <Card key={tutor.id} className="p-6 hover:shadow-lg transition-all">
                <div className="flex flex-col items-center text-center space-y-4">
                  <Avatar className="w-20 h-20">
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {tutor.photo}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-bold mb-1">{tutor.name}</h3>
                    <Badge variant="secondary" className="mb-2 text-xs">{tutor.subjects}</Badge>
                    <p className="text-xs text-muted-foreground">{tutor.school}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    <span className="font-semibold text-sm">{tutor.rating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">({tutor.reviews})</span>
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    KES {tutor.hourlyRate.toLocaleString()}<span className="text-sm font-normal">/hr</span>
                  </div>
                  <Link to="/tutors" className="w-full">
                    <Button className="w-full" variant="outline" size="sm">View Profile</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">About ElimuConnect</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              ElimuConnect connects Kenyan students with the country's best educators from top institutions. Our mission is to make quality education accessible, safe, and convenient for every student, whether they prefer learning online or in-person.
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

      {/* CTA Section */}
      <section className="bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <Card className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground border-0">
            <CardContent className="p-10 text-center">
              <h2 className="text-3xl font-bold mb-3">Ready to Excel in Your Studies?</h2>
              <p className="text-lg mb-6 opacity-90">Join thousands of students learning with ElimuConnect</p>
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
                <span className="text-xl font-bold">ElimuConnect</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>First Floor, Arbor House,</p>
                <p>Arboretum Drive, Nairobi</p>
                <p>(+254) 725252542</p>
                <p>info@elimuconnect.co.ke</p>
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
                <li><Link to="#">Help Center</Link></li>
                <li><Link to="#">Contact Us</Link></li>
                <li><Link to="#">Safety Guidelines</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© 2025 ElimuConnect. All rights reserved. Built for Kenyan education.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
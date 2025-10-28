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
    <div className="min-h-screen bg-[image:var(--gradient-page)] overflow-hidden">
      <SEO 
        title="Quality Online Tutoring for Kenyan Students"
        description="Connect with verified teachers from top Kenyan schools for safe, convenient one-on-one tutoring. Master KCSE, KCPE, and CBC curriculum from home with ElimuConnect."
        structuredData={organizationSchema}
      />
      
      {/* Hero Section with Floating Stats */}
      <section className="relative min-h-[90vh] flex items-center">
        {/* Animated gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 animate-pulse" style={{ animationDuration: '8s' }} />
        
        <div className="max-w-7xl mx-auto px-6 py-12 md:py-20 relative z-10 w-full">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                <span className="block">Expert Tutoring.</span>
                <span className="block bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Safe. Verified. Kenyan.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                Learn from verified tutors from Kenya's top schools. Choose between online or in-person sessions. Rigorously vetted educators. Seamless payments via M-Pesa or Card. All CBC and IGCSE subjects covered.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/book-consultation">
                  <Button size="lg" className="h-14 px-8 text-lg hover-scale shadow-lg">
                    Book Free Consultation
                  </Button>
                </Link>
                <Link to="/tutors">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg hover-scale">
                    Find Tutors
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur-2xl opacity-50" />
              <video 
                src={heroVideo} 
                autoPlay 
                loop 
                muted 
                playsInline
                className="rounded-2xl shadow-2xl w-full h-auto object-cover relative z-10 border border-border/50"
                aria-label="ElimuConnect online tutoring demo video"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          {/* Floating Glassmorphism Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div 
                  key={index} 
                  className="backdrop-blur-lg bg-background/60 border border-border/50 rounded-2xl p-6 shadow-xl hover-scale hover:shadow-2xl transition-all"
                >
                  <Icon className="w-10 h-10 text-primary mb-3" />
                  <div className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bento Grid Services Section */}
      <section className="py-20 px-6 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Our Services</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tutoring solutions tailored to your learning needs
            </p>
          </div>
          {/* Asymmetric Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-3 gap-4 auto-rows-fr">
            {/* Large Card - After School */}
            <Card className="md:col-span-2 md:row-span-2 p-8 hover-scale hover:shadow-2xl transition-all bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
              <GraduationCap className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-2xl font-bold mb-3">After School Tuition</h3>
              <p className="text-muted-foreground leading-relaxed">
                Regular sessions to reinforce classroom learning and build strong fundamentals. Our expert tutors provide personalized attention to help students excel in their studies.
              </p>
            </Card>

            {/* Small Card - Homework */}
            <Card className="md:col-span-2 md:row-span-1 p-6 hover-scale hover:shadow-xl transition-all">
              <div className="flex items-start gap-4">
                <Clock className="w-10 h-10 text-primary flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Homework Assistance</h3>
                  <p className="text-sm text-muted-foreground">Expert guidance to help students complete assignments with confidence</p>
                </div>
              </div>
            </Card>

            {/* Medium Card - Exam Prep */}
            <Card className="md:col-span-2 md:row-span-2 p-8 hover-scale hover:shadow-2xl transition-all bg-gradient-to-br from-secondary/5 to-transparent border-secondary/20">
              <Award className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-2xl font-bold mb-3">Exam Revision & Prep</h3>
              <p className="text-muted-foreground leading-relaxed">
                Intensive preparation for KCSE, IGCSE, and other major examinations. Proven strategies and practice materials to boost your exam performance.
              </p>
            </Card>

            {/* Small Card - Holiday */}
            <Card className="md:col-span-2 md:row-span-1 p-6 hover-scale hover:shadow-xl transition-all">
              <div className="flex items-start gap-4">
                <Calendar className="w-10 h-10 text-primary flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Holiday Tuition</h3>
                  <p className="text-sm text-muted-foreground">Catch-up programs and advanced learning during school breaks</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section - Between Services and How It Works */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground border-0">
            <CardContent className="p-10 text-center">
              <h2 className="text-3xl font-bold mb-3">Ready to Get Started?</h2>
              <p className="text-lg mb-6 opacity-90">
                Book a free 30-minute consultation or browse our verified tutors
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to="/book-consultation">
                  <Button size="lg" variant="secondary" className="text-lg px-8 shadow-lg">
                    Book Free Consultation
                  </Button>
                </Link>
                <Link to="/tutors">
                  <Button size="lg" variant="outline" className="text-lg px-8 shadow-lg bg-white/10 hover:bg-white/20 text-white border-white/30">
                    Browse Tutors
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Horizontal Timeline - How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </div>
          
          {/* Desktop Timeline */}
          <div className="hidden md:block relative">
            {/* Connecting Line */}
            <div className="absolute top-16 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary to-primary/30" />
            
            <div className="grid grid-cols-3 gap-8 relative">
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
                <div key={index} className="text-center animate-fade-in" style={{ animationDelay: `${index * 0.2}s` }}>
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-4xl font-bold mx-auto mb-6 shadow-2xl hover-scale relative z-10 border-4 border-background">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Timeline */}
          <div className="md:hidden space-y-8">
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
              <div key={index} className="flex gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-2xl font-bold flex-shrink-0 shadow-lg">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Masonry Reviews Section */}
      <section className="py-20 px-6 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">What Parents & Students Say</h2>
            <p className="text-lg text-muted-foreground">
              Real feedback from our ElimuConnect community
            </p>
          </div>
          {/* Masonry-style grid with varying heights */}
          <div className="grid md:grid-cols-3 gap-6 auto-rows-auto">
            {[
              {
                name: "Jane Wanjiru",
                role: "Parent",
                rating: 5,
                comment: "My daughter's grades improved from C to A- in just 3 months! The tutors are professional and really care about the students.",
                size: "large"
              },
              {
                name: "David Omondi",
                role: "Form 3 Student",
                rating: 5,
                comment: "I love that I can choose online classes. It's so convenient and I don't have to travel. My tutor makes Math actually fun!",
                size: "medium"
              },
              {
                name: "Mary Kamau",
                role: "Parent",
                rating: 5,
                comment: "Safe, verified tutors from top schools. The M-Pesa payment is seamless. Best decision for my son's education!",
                size: "medium"
              },
            ].map((review, index) => (
              <Card 
                key={index} 
                className={`p-6 hover-scale hover:shadow-2xl transition-all ${
                  review.size === 'large' 
                    ? 'md:row-span-2 bg-gradient-to-br from-primary/5 to-transparent border-primary/20' 
                    : ''
                }`}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className={`text-muted-foreground mb-6 leading-relaxed ${
                  review.size === 'large' ? 'text-lg' : 'text-sm'
                }`}>
                  "{review.comment}"
                </p>
                <div className="border-t pt-4">
                  <p className={`font-semibold ${review.size === 'large' ? 'text-base' : 'text-sm'}`}>
                    {review.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{review.role}</p>
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
                    <Avatar className="w-16 h-16 mb-3">
                      <AvatarFallback className="text-xl bg-primary/10 text-primary">
                        {tutor.photo}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-lg font-bold mb-1">{tutor.name}</h3>
                    <Badge variant="secondary" className="mb-2 text-xs">{tutor.subjects}</Badge>
                    <p className="text-xs text-muted-foreground mb-2">{tutor.school}</p>
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-sm">{tutor.rating.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({tutor.reviews})</span>
                    </div>
                    <div className="text-xl font-bold text-primary mb-3">
                      KES {tutor.hourlyRate.toLocaleString()}/hr
                    </div>
                  </div>
                  <Link to="/tutors">
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
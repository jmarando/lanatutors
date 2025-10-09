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
import heroVideo from "@/assets/hero-video.mp4";

const Home = () => {
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
      title: "Safe & Convenient Online Learning",
      description: "No travel required - learn from the comfort of home. Parents can monitor sessions and ensure student safety. All sessions are conducted through secure Google Meet video calls. No stranger in your home, no commute in traffic, just quality education delivered safely online."
    },
    {
      icon: Smartphone,
      title: "Simple M-Pesa Payments",
      description: "Pay easily using M-Pesa, Kenya's most trusted mobile money platform. No credit cards or bank accounts needed. Transparent pricing with no hidden fees. Get instant payment confirmation and digital receipts. Your financial information stays secure with M-Pesa's industry-leading security."
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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-background">
        <div className="max-w-7xl mx-auto px-6 py-12 md:py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Safe, Quality Online Tutoring with{" "}
                <span className="text-primary">ElimuConnect</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Learn from verified tutors from Kenya's top schools, from the safety and comfort of your home. No stranger visits. Rigorous tutor vetting. Seamless M-Pesa payments. All CBC and IGCSE subjects covered.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/tutors">
                  <Button size="lg" className="text-lg px-8 shadow-lg">
                    Find a Tutor
                  </Button>
                </Link>
                <Link to="/student-signup">
                  <Button size="lg" variant="secondary" className="text-lg px-8 shadow-lg">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <video 
                src={heroVideo} 
                autoPlay 
                loop 
                muted 
                playsInline
                className="rounded-lg shadow-2xl w-full h-auto object-cover"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
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

      {/* How It Works */}
      <section id="how-it-works" className="bg-background">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-3">
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              );
            })}
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

      {/* Why Choose Us / About */}
      <section id="about" className="bg-background">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose ElimuConnect</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <p className="text-sm text-muted-foreground">
                Quality online tutoring for Kenyan students
              </p>
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
                <li><Link to="#">Requirements</Link></li>
                <li><Link to="/tutor-signup" className="text-primary hover:underline">Become a Tutor →</Link></li>
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
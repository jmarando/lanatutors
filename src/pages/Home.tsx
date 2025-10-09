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
import heroImage from "@/assets/hero-image.jpg";

const Home = () => {
  const stats = [
    { icon: Users, value: "500+", label: "Verified Tutors" },
    { icon: GraduationCap, value: "10,000+", label: "Happy Students" },
    { icon: Star, value: "4.9★", label: "Average Rating" }
  ];

  const steps = [
    {
      icon: Search,
      title: "Find Your Tutor",
      description: "Browse verified tutors by subject, experience, and ratings"
    },
    {
      icon: Calendar,
      title: "Book a Session",
      description: "Choose a convenient time slot that fits your schedule"
    },
    {
      icon: Video,
      title: "Learn Online",
      description: "Join your session via Google Meet from anywhere"
    }
  ];

  const benefits = [
    {
      icon: ShieldCheck,
      title: "Verified Tutors",
      description: "All tutors are from recognized Kenyan schools with verified credentials"
    },
    {
      icon: Clock,
      title: "Flexible Scheduling",
      description: "Book sessions at times that work for you, 7 days a week"
    },
    {
      icon: Lock,
      title: "Safe & Secure",
      description: "Online sessions eliminate safety concerns of in-home tutoring"
    },
    {
      icon: Smartphone,
      title: "M-Pesa Payments",
      description: "Easy, secure payments via M-Pesa - Kenya's trusted mobile money"
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
      {/* Navigation */}
      <nav className="border-b bg-background sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Award className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold">ElimuConnect</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/tutors" className="text-sm font-medium hover:text-primary transition-colors">
              Find Tutors
            </Link>
            <a href="#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">
              How It Works
            </a>
            <a href="#about" className="text-sm font-medium hover:text-primary transition-colors">
              About Us
            </a>
            <Link to="/login">
              <Button variant="outline" size="sm">Sign In</Button>
            </Link>
            <Link to="/login">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-background">
        <div className="max-w-7xl mx-auto px-6 py-12 md:py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Unlock Your Potential with{" "}
                <span className="text-primary">ElimuConnect</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Find expert, verified tutors for any subject. Personalized one-on-one learning, tailored to your schedule.
              </p>
              <Link to="/tutors">
                <Button size="lg" className="text-lg px-8 shadow-lg">
                  Find a Tutor
                </Button>
              </Link>
            </div>
            <div className="relative">
              <img 
                src={heroImage} 
                alt="Students learning with tutors" 
                className="rounded-lg shadow-2xl w-full h-auto object-cover"
              />
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                      <span className="font-semibold text-sm">{tutor.rating}</span>
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
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
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      {/* Hero Section */}
      <section>
        <div className="max-w-7xl mx-auto px-6 py-12 md:py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                <span className="block whitespace-nowrap">Expert Tutoring.</span>
                <span className="block whitespace-nowrap text-primary">Safe. Verified. Kenyan.</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Learn from verified tutors from Kenya's top schools. Choose between online or in-person sessions. Rigorously vetted educators. Seamless payments via M-Pesa or Card. All CBC and IGCSE subjects covered.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/book-consultation">
                  <Button size="lg" className="h-14 px-8 text-lg">
                    Book Free Consultation
                  </Button>
                </Link>
                <Link to="/tutors">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
                    Find Tutors
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

      {/* Services Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Our Services</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tutoring solutions tailored to your learning needs
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                description: "Intensive preparation for KCSE, IGCSE, and other major examinations",
              },
              {
                title: "Holiday Tuition",
                description: "Catch-up programs and advanced learning during school breaks",
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
              Real feedback from our ElimuConnect community
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
              <p className="text-sm text-muted-foreground">
                Quality tutoring for Kenyan students - online and in-person
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
                <li><Link to="/become-a-tutor">Become a Tutor</Link></li>
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
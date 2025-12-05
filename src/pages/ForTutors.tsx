import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap, 
  ShieldCheck, 
  DollarSign, 
  Clock, 
  Users,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Video,
  TrendingUp
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

const ForTutors = () => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkTutorStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Check if user has tutor role
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('role', 'tutor')
            .maybeSingle();
          
          if (roles) {
            // User is a tutor, redirect to dashboard
            navigate('/tutor/dashboard');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking tutor status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkTutorStatus();
  }, [navigate]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const benefits = [
    {
      icon: DollarSign,
      title: "Competitive Earnings",
      description: "Earn competitive rates teaching students across Kenya. Set your own rates and get paid weekly.",
    },
    {
      icon: Clock,
      title: "Flexible Schedule",
      description: "Work on your own time. Choose when you're available and how many students you want to teach.",
    },
    {
      icon: Users,
      title: "Growing Student Base",
      description: "Access to 10,000+ students actively seeking qualified tutors. We handle marketing and student matching.",
    },
    {
      icon: Video,
      title: "Online & In-Person Options",
      description: "Teach from anywhere via video calls or offer in-person sessions in your area. Your choice.",
    },
    {
      icon: TrendingUp,
      title: "Professional Growth",
      description: "Develop your teaching skills, build your reputation, and advance your career in education.",
    },
    {
      icon: ShieldCheck,
      title: "Secure Platform",
      description: "Safe payment processing, student verification, and professional support whenever you need it.",
    },
  ];

  const selectionProcess = [
    {
      step: "1",
      title: "Submit Application",
      description: "Complete our online application with your qualifications, teaching experience, and areas of expertise.",
      requirements: [
        "Teaching certificate or degree in education",
        "Proof of teaching experience",
        "National ID verification",
        "Academic transcripts"
      ]
    },
    {
      step: "2",
      title: "Document Verification",
      description: "Our team verifies your credentials, academic background, and professional qualifications.",
      requirements: [
        "Background check",
        "Credential verification",
        "Reference checks",
        "Teaching license validation"
      ]
    },
    {
      step: "3",
      title: "Teaching Assessment",
      description: "Demonstrate your teaching skills through a live session with our evaluation team.",
      requirements: [
        "Sample lesson delivery",
        "Subject expertise test",
        "Communication skills evaluation",
        "Teaching methodology review"
      ]
    },
    {
      step: "4",
      title: "Platform Onboarding",
      description: "Get trained on our platform, set up your profile, and start accepting students.",
      requirements: [
        "Platform training",
        "Profile setup assistance",
        "Payment setup",
        "First student matching"
      ]
    }
  ];

  const stats = [
    { value: "70%", label: "Earnings Split" },
    { value: "15%", label: "Acceptance Rate" },
    { value: "Monthly", label: "Payment Frequency" },
    { value: "Flexible", label: "Schedule" }
  ];

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <SEO 
        title="Become a Tutor - Teach & Earn with Lana"
        description="Join Kenya's premier online tutoring platform. Earn KES 2,000-3,500/hour teaching students from top schools. Flexible schedule, secure payments, growing student base."
      />
      
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-4" variant="secondary">
              <GraduationCap className="w-4 h-4 mr-2" />
              For Educators
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Share Your Knowledge.<br />
              <span className="text-primary">Transform Lives. Earn More.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Join Kenya's selective tutoring platform with a 15% acceptance rate. 
              Teach students from top schools across Kenya, set your own schedule, and earn 70% of session fees 
              with monthly payouts within the first 5 business days.
            </p>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-8 max-w-3xl mx-auto">
              <div className="grid md:grid-cols-3 gap-6 text-sm">
                <div>
                  <div className="font-bold text-primary mb-1">Earnings Split</div>
                  <div className="text-muted-foreground">You keep 70% of every session fee, paid monthly</div>
                </div>
                <div>
                  <div className="font-bold text-primary mb-1">Flexible Hours</div>
                  <div className="text-muted-foreground">Set availability 6 AM - 10 PM EAT, manage your calendar</div>
                </div>
                <div>
                  <div className="font-bold text-primary mb-1">Professional Standards</div>
                  <div className="text-muted-foreground">Punctuality, professionalism, and progress tracking required</div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/become-a-tutor">
                <Button size="lg" className="h-14 px-8 text-lg">
                  Apply to Become a Tutor
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/tutor/dashboard">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
                  Tutor Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="space-y-2">
                <div className="text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Earnings Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-4">Transparent Earnings</h2>
            <p className="text-lg text-muted-foreground">
              Set your own competitive rates based on your experience and qualifications
            </p>
          </div>
          <Card className="p-8">
            <div className="text-center">
              <DollarSign className="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-4">You Control Your Rates</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Our tutors typically earn competitive hourly rates. You set your own pricing based on your experience, qualifications, and the subjects you teach. We provide transparency and fair compensation for quality teaching.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Why Teach with Lana?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join a platform that values quality education and supports your growth as an educator
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                  <Icon className="w-12 h-12 text-primary mb-4" />
                  <h3 className="text-xl font-bold mb-3">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Selection Process Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Our Selection Process</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We accept only the top 15% of applicants to ensure the highest quality education for our students
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {selectionProcess.map((process, index) => (
              <Card key={index} className="p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold flex-shrink-0">
                    {process.step}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">{process.title}</h3>
                    <p className="text-muted-foreground mb-4">{process.description}</p>
                  </div>
                </div>
                <div className="space-y-2 pl-16">
                  {process.requirements.map((req, reqIndex) => (
                    <div key={reqIndex} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm">{req}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 md:p-12">
            <div className="text-center mb-8">
              <BookOpen className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-3">Tutor Requirements</h2>
              <p className="text-muted-foreground">
                To maintain our high standards, all tutors must meet these criteria
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-lg mb-4">Academic Qualifications</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Teaching certificate or degree in education</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Strong academic record (B+ and above)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Subject matter expertise in teaching area</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-4">Experience & Skills</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Minimum 2 years teaching experience</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Excellent communication skills</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Reliable internet connection (for online sessions)</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground border-0">
            <CardContent className="p-10 text-center">
              <h2 className="text-3xl font-bold mb-3">Ready to Start Teaching?</h2>
              <p className="text-lg mb-6 opacity-90">
                Join Kenya's most trusted tutoring platform and make a real impact in students' lives
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to="/become-a-tutor">
                  <Button size="lg" variant="secondary" className="text-lg px-8 shadow-lg">
                    Apply Now
                  </Button>
                </Link>
                <Link to="/tutor/dashboard">
                  <Button size="lg" variant="outline" className="text-lg px-8 shadow-lg bg-white/10 hover:bg-white/20 text-white border-white/30">
                    Access Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default ForTutors;

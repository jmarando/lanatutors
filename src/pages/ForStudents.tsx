import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  ShieldCheck, 
  Clock, 
  Video, 
  GraduationCap,
  Star,
  CheckCircle2,
  ArrowRight,
  Target,
  Award,
  Users
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

const ForStudents = () => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkStudentStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Check if user has student role
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('role', 'student')
            .maybeSingle();
          
          if (roles) {
            // User is a student, redirect to dashboard
            navigate('/student-dashboard');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking student status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkStudentStatus();
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
      icon: ShieldCheck,
      title: "Verified Expert Tutors",
      description: "Learn from qualified teachers from Kenya's top schools. All tutors are background-checked and credential-verified.",
    },
    {
      icon: Clock,
      title: "Flexible Scheduling",
      description: "Book sessions that fit your schedule. Early morning, evening, or weekend - tutors available 7 days a week.",
    },
    {
      icon: Video,
      title: "Online & In-Person",
      description: "Choose how you want to learn. Attend sessions from home via video call or meet your tutor in person.",
    },
    {
      icon: Target,
      title: "Personalized Learning",
      description: "Get 1-on-1 attention tailored to your learning style, pace, and specific needs. No more one-size-fits-all.",
    },
    {
      icon: Award,
      title: "Proven Results",
      description: "Students see average grade improvement of 2 levels within 3 months. 94% report increased confidence.",
    },
    {
      icon: GraduationCap,
      title: "All Subjects Covered",
      description: "CBC, IGCSE, American, KCSE, KCPE - we have expert tutors for Mathematics, Sciences, Languages, and all core subjects.",
    },
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Book Free Consultation",
      description: "Schedule a 30-minute call with our education consultant to discuss your goals and learning needs.",
      icon: BookOpen,
    },
    {
      step: "2",
      title: "Get Matched with Perfect Tutor",
      description: "We'll match you with a qualified tutor based on your subject, curriculum, grade level, and learning style.",
      icon: Users,
    },
    {
      step: "3",
      title: "Start Learning & Excel",
      description: "Attend your sessions, track your progress, and watch your grades improve. Cancel or reschedule anytime.",
      icon: Star,
    },
  ];

  const subjects = [
    "Mathematics",
    "English & Literature",
    "Physics",
    "Chemistry",
    "Biology",
    "Kiswahili",
    "History",
    "Geography",
    "Business Studies",
    "Computer Science",
    "French",
    "CRE/IRE"
  ];

  const services = [
    {
      title: "After School Tuition",
      description: "Regular sessions to reinforce classroom learning and build strong fundamentals",
    },
    {
      title: "Homework Assistance",
      description: "Expert guidance to complete assignments with confidence and understanding",
    },
    {
      title: "Exam Revision & Prep",
      description: "Intensive preparation for KCSE, IGCSE, and other major examinations",
    },
    {
      title: "Holiday Tuition",
      description: "Catch-up programs and advanced learning during school breaks",
    },
  ];

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <SEO 
        title="For Students - Quality Online Tutoring in Kenya"
        description="Connect with verified tutors from top Kenyan schools. Get personalized 1-on-1 tutoring for KCSE, KCPE, CBC, IGCSE, and American curriculum. Flexible online and in-person sessions."
      />
      
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-4" variant="secondary">
              <GraduationCap className="w-4 h-4 mr-2" />
              For Students
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Excel in Your Studies.<br />
              <span className="text-primary">Learn from the Best.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Connect with verified teachers from Kenya's top schools for safe, personalized 
              one-on-one tutoring. Master KCSE, KCPE, and CBC curriculum from the comfort of home.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/student/dashboard">
                <Button size="lg" className="h-14 px-8 text-lg">
                  Go to Student Dashboard
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/book-consultation">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
                  Book Free Consultation
                </Button>
              </Link>
              <Link to="/tutors">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
                  Browse Tutors
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">50+</div>
              <div className="text-sm text-muted-foreground">Verified Tutors</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">500+</div>
              <div className="text-sm text-muted-foreground">Happy Students</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">All Curricula</div>
              <div className="text-sm text-muted-foreground">CBC, IGCSE, American & 8-4-4</div>
            </div>
          </div>
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
            {howItWorks.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {item.step}
                  </div>
                  <Icon className="w-10 h-10 mx-auto mb-4 text-primary" />
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Why Choose Lana?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The most trusted tutoring platform in Kenya
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

      {/* Services Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Our Services</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tutoring solutions for every learning need
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                <p className="text-sm text-muted-foreground">{service.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Subjects Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Subjects We Cover</h2>
            <p className="text-lg text-muted-foreground">
              Expert tutors available for all major subjects
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {subjects.map((subject, index) => (
              <Card key={index} className="p-4 text-center hover:shadow-md transition-shadow">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="font-medium">{subject}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Student Success Stories</h2>
            <p className="text-lg text-muted-foreground">
              Real results from real students
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "David Omondi",
                grade: "Form 3",
                rating: 5,
                comment: "I love that I can choose online classes. It's so convenient and I don't have to travel. My tutor makes Math actually fun!",
              },
              {
                name: "Sarah Wanjiku",
                grade: "Form 4",
                rating: 5,
                comment: "My Chemistry grades went from D+ to B in just 2 months! The one-on-one attention really helps me understand concepts better.",
              },
              {
                name: "Brian Kimani",
                grade: "Grade 8 CBC",
                rating: 5,
                comment: "The tutors are patient and explain things clearly. I'm now confident in all my subjects and looking forward to exams!",
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
                  <p className="text-xs text-muted-foreground">{review.grade}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground border-0">
            <CardContent className="p-10 text-center">
              <h2 className="text-3xl font-bold mb-3">Ready to Excel in Your Studies?</h2>
              <p className="text-lg mb-6 opacity-90">
                Book a free consultation today and get matched with the perfect tutor
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
    </div>
  );
};

export default ForStudents;

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Calendar, 
  Video, 
  CheckCircle2,
  Clock,
  MessageCircle,
  TrendingUp,
  Users,
  MapPin,
  PhoneCall,
  BookOpen,
  Award
} from "lucide-react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";

const HowItWorks = () => {
  const steps = [
    {
      icon: PhoneCall,
      title: "1. Book Free Consultation",
      description: "Start with a complimentary consultation to understand your learning needs and goals.",
      details: [
        "Discuss your student's learning challenges and objectives",
        "Get personalized tutor recommendations",
        "Understand our teaching approach and methodology",
        "Ask questions about online or in-person sessions"
      ]
    },
    {
      icon: Search,
      title: "2. Find Your Perfect Tutor",
      description: "Browse verified tutors from Kenya's top schools who specialize in your subject areas.",
      details: [
        "Filter by subject, curriculum (CBC, IGCSE, American, 8-4-4), and level",
        "View detailed profiles with qualifications and teaching experience",
        "Check tutor availability and teaching locations",
        "Choose between online or in-person sessions"
      ]
    },
    {
      icon: Calendar,
      title: "3. Book Your Sessions",
      description: "Select time slots that work for you and complete secure payment via M-Pesa or card.",
      details: [
        "Choose single sessions or multi-session packages",
        "Book one-time lessons or set up recurring weekly classes",
        "Get instant confirmation via SMS and email",
        "Receive Google Meet link or in-person meeting location"
      ]
    },
    {
      icon: Video,
      title: "4. Attend & Learn",
      description: "Join your tutoring sessions online via Google Meet or meet your tutor in person.",
      details: [
        "Online: Join from browser - no downloads required",
        "In-Person: Meet at agreed locations across Nairobi",
        "Interactive 1-on-1 learning with digital whiteboards",
        "Access Google Classroom for materials and assignments"
      ]
    }
  ];

  const paymentSteps = [
    {
      number: "1",
      title: "Select Your Sessions",
      description: "Choose how many hours you'd like to book with your tutor"
    },
    {
      number: "2",
      title: "Pay Securely",
      description: "Pay via M-Pesa or card - enter your phone number and approve the prompt"
    },
    {
      number: "3",
      title: "Start Learning",
      description: "Receive instant confirmation with Google Meet link and class details"
    }
  ];

  const features = [
    {
      icon: CheckCircle2,
      title: "Verified Tutors",
      text: "All tutors verified from recognized Kenyan schools with background checks"
    },
    {
      icon: MapPin,
      title: "Flexible Location",
      text: "Choose online video sessions or in-person tutoring across Nairobi"
    },
    {
      icon: Clock,
      title: "Your Schedule",
      text: "Book sessions at times that work for you - flexible and convenient"
    },
    {
      icon: MessageCircle,
      title: "Free Consultation",
      text: "Start with a complimentary consultation to find the perfect tutor match"
    },
    {
      icon: TrendingUp,
      title: "Track Progress",
      text: "Monitor improvement with session summaries and progress reports"
    },
    {
      icon: BookOpen,
      title: "All Curricula",
      text: "Support for CBC, IGCSE, American, 8-4-4, and international curricula"
    }
  ];

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <SEO 
        title="How It Works - Online & In-Person Tutoring Kenya"
        description="Learn how to get started with Lana Tutors. Book a free consultation, find verified tutors, schedule sessions, and start learning. Simple M-Pesa payment."
        keywords="how online tutoring works, book tutor Kenya, tutoring process, M-Pesa tutor payment, online learning Kenya"
      />
      
      {/* Hero Section */}
      <section>
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            How Lana Tutors Works
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Finding the perfect tutor is simple. Book a free consultation, browse expert tutors, and start learning online or in-person.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/book-consultation">
              <Button size="lg" className="text-lg px-8">
                Book Free Consultation
              </Button>
            </Link>
            <Link to="/tutors">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Browse Tutors
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Steps */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="space-y-16">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isEven = index % 2 === 0;
            
            return (
              <div key={index} className={`grid md:grid-cols-2 gap-8 items-center ${!isEven ? 'md:grid-flow-dense' : ''}`}>
                <div className={isEven ? 'md:order-1' : 'md:order-2'}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold">{step.title}</h2>
                  </div>
                  <p className="text-lg text-muted-foreground mb-6">
                    {step.description}
                  </p>
                  <ul className="space-y-3">
                    {step.details.map((detail, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Card className={`${isEven ? 'md:order-2' : 'md:order-1'} bg-secondary/50`}>
                  <CardContent className="p-8 flex items-center justify-center min-h-[300px]">
                    <Icon className="w-32 h-32 text-primary/20" />
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </section>

      {/* Payment Process */}
      <section className="bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-4">Simple & Secure Payment</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Book and pay in minutes using M-Pesa or credit/debit card. All payments are secure and instant.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {paymentSteps.map((step, index) => (
              <Card key={index}>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">Why Choose Lana Tutors</h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Trusted by hundreds of students and parents across Kenya for quality tutoring
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <Icon className="w-10 h-10 text-primary mx-auto mb-3" />
                  <h3 className="font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.text}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Learning?</h2>
          <p className="text-xl mb-8 opacity-90">
            Book a free consultation today and discover how we can help your student excel
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/book-consultation">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Book Free Consultation
              </Button>
            </Link>
            <Link to="/tutors">
              <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent hover:bg-white/10 border-white text-white">
                Find Your Tutor
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-sm opacity-75">
            No credit card required • Free Consultation • Flexible Scheduling
          </p>
        </div>
      </section>
    </div>
  );
};

export default HowItWorks;

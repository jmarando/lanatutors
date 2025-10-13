import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Calendar, 
  Video, 
  Award,
  CheckCircle2,
  Clock,
  MessageCircle,
  TrendingUp,
  Users,
  MapPin,
  PhoneCall
} from "lucide-react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";

const HowItWorks = () => {
  const steps = [
    {
      icon: PhoneCall,
      title: "1. Book Free Consultation",
      description: "Start with a complimentary 30-minute consultation with our education experts to understand your needs and goals.",
      details: [
        "Discuss your student's learning challenges and objectives",
        "Get personalized tutor recommendations",
        "Understand our teaching approach and methodology",
        "Ask questions about online or in-person sessions"
      ]
    },
    {
      icon: Search,
      title: "2. Get Matched with Perfect Tutor",
      description: "We'll connect you with verified tutors from Kenya's top schools who specialize in your subject areas.",
      details: [
        "Access 500+ tutors from Alliance, Starehe, Kenya High, and more",
        "View detailed profiles with qualifications and experience",
        "Read verified reviews from other students and parents",
        "Choose between online or in-person sessions"
      ]
    },
    {
      icon: Calendar,
      title: "3. Schedule Your Sessions",
      description: "Book one-time or recurring sessions at times that work for you. Choose online video calls or in-person tutoring.",
      details: [
        "Flexible scheduling - online sessions 7 days a week, 6 AM to 10 PM",
        "In-person sessions at agreed locations in Nairobi and major towns",
        "Instant booking confirmation via SMS and email",
        "Set up weekly or bi-weekly recurring lessons"
      ]
    },
    {
      icon: Video,
      title: "4. Attend & Learn",
      description: "Join online sessions via Google Meet or meet your tutor in person. Get personalized 1-on-1 attention.",
      details: [
        "Online: No downloads required - works in your browser",
        "In-Person: Safe, verified tutors at convenient locations",
        "Interactive learning with whiteboards and materials",
        "Flexible learning mode - switch between online and in-person"
      ]
    },
    {
      icon: Award,
      title: "5. Track Progress & Improve",
      description: "Monitor your improvement with session summaries, assignments, and progress reports.",
      details: [
        "AI-generated session summaries after each class",
        "Homework assignments and practice materials",
        "Track performance improvements over time",
        "Rate and review your tutor to help the community"
      ]
    }
  ];

  const paymentSteps = [
    {
      number: "1",
      title: "Select Session Duration",
      description: "Choose 1 hour, 2 hours, or custom duration based on your needs"
    },
    {
      number: "2",
      title: "Pay via M-Pesa",
      description: "Enter your phone number and approve the payment prompt on your phone"
    },
    {
      number: "3",
      title: "Instant Confirmation",
      description: "Receive booking confirmation and Google Meet link immediately"
    }
  ];

  const features = [
    {
      icon: CheckCircle2,
      title: "Quality Guaranteed",
      text: "All tutors verified from recognized Kenyan schools with thorough background checks"
    },
    {
      icon: MapPin,
      title: "Online & In-Person",
      text: "Choose the learning mode that works best - online video or face-to-face sessions"
    },
    {
      icon: Clock,
      title: "Flexible Scheduling",
      text: "Online sessions available 7 days a week, 6 AM to 10 PM. In-person by arrangement"
    },
    {
      icon: MessageCircle,
      title: "Free Consultation",
      text: "Start with a complimentary consultation to find the perfect tutor match"
    },
    {
      icon: TrendingUp,
      title: "Proven Results",
      text: "Students see average grade improvement of 2 levels within 3 months"
    },
    {
      icon: Users,
      title: "Expert Support",
      text: "Dedicated support team to help you every step of your learning journey"
    }
  ];

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <SEO 
        title="How It Works - Online Tutoring Process"
        description="Learn how to get started with ElimuConnect. Book a free consultation, browse verified tutors, schedule sessions, and start learning. Simple online booking and M-Pesa payment."
        keywords="how online tutoring works, book tutor Kenya, tutoring process, M-Pesa tutor payment"
      />
      
      {/* Hero Section */}
      <section>
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            How ElimuConnect Works
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Getting started is simple. Book a free consultation, get matched with expert tutors, and choose between convenient online or in-person sessions.
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
          <h2 className="text-3xl font-bold text-center mb-12">Simple M-Pesa Payment</h2>
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
          <p className="text-center text-muted-foreground mt-8">
            No credit cards needed. Pay securely with M-Pesa - Kenya's most trusted mobile money platform.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">What Makes Us Different</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="text-center">
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
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
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
                Browse Tutors
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-sm opacity-75">
            No credit card required • Online & In-Person Sessions Available
          </p>
        </div>
      </section>
    </div>
  );
};

export default HowItWorks;

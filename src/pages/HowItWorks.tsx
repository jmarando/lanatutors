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
  TrendingUp
} from "lucide-react";
import { Link } from "react-router-dom";

const HowItWorks = () => {
  const steps = [
    {
      icon: Search,
      title: "1. Browse & Compare Tutors",
      description: "Search our database of 500+ verified tutors from Kenya's top schools. Filter by subject, experience level, rating, and hourly rate.",
      details: [
        "View detailed tutor profiles with qualifications and teaching experience",
        "Read reviews from other students and parents",
        "Compare hourly rates and availability",
        "Filter by subject expertise and school background"
      ]
    },
    {
      icon: Calendar,
      title: "2. Schedule Your Session",
      description: "Select a tutor and choose from their available time slots. Book one-time sessions or set up recurring lessons.",
      details: [
        "Instant booking confirmation via SMS and email",
        "Automatic calendar invites with Google Meet links",
        "Flexible scheduling - book up to 2 hours in advance",
        "Set up recurring weekly or bi-weekly sessions"
      ]
    },
    {
      icon: Video,
      title: "3. Attend & Learn",
      description: "Join your live video session via Google Meet. Get personalized 1-on-1 attention tailored to your learning pace.",
      details: [
        "No software downloads required - works in your browser",
        "Interactive whiteboard and screen sharing",
        "Record sessions for later review (with tutor permission)",
        "Safe, monitored online environment"
      ]
    },
    {
      icon: Award,
      title: "4. Track Progress",
      description: "After each session, receive notes and assignments. Rate your tutor and monitor your improvement.",
      details: [
        "AI-generated session summaries after each class",
        "Homework assignments and practice materials",
        "Progress tracking and performance reports",
        "Rate and review your tutor to help others"
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
      text: "All tutors are verified and come from recognized Kenyan schools"
    },
    {
      icon: Clock,
      title: "Flexible Scheduling",
      text: "Book sessions 7 days a week from 6 AM to 10 PM"
    },
    {
      icon: MessageCircle,
      title: "Direct Communication",
      text: "Message your tutor before booking to discuss your learning needs"
    },
    {
      icon: TrendingUp,
      title: "Proven Results",
      text: "Students see average grade improvement of 2 levels within 3 months"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/10 to-background">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            How ElimuConnect Works
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Getting started with online tutoring is simple. Follow these four easy steps to unlock your academic potential.
          </p>
          <Link to="/tutors">
            <Button size="lg" className="text-lg px-8">
              Find a Tutor Now
            </Button>
          </Link>
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
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            Join thousands of students already learning with ElimuConnect
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/tutors">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Browse Tutors
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent hover:bg-white/10 border-white text-white">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorks;

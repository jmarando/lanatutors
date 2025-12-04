import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  Users, 
  Award,
  Target,
  Heart,
  Sparkles,
  GraduationCap,
  TrendingUp,
  Lock,
  Clock,
  PhoneCall,
  Search,
  Calendar,
  Video,
  CheckCircle2,
  MapPin,
  MessageCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";

const AboutUs = () => {
  const mission = [
    {
      icon: Target,
      title: "Our Mission",
      description: "To democratize quality education globally by connecting students worldwide with verified Kenyan expert tutors through an accessible, affordable online platform."
    },
    {
      icon: Heart,
      title: "Our Vision",
      description: "A world where every student, regardless of location or background, has access to personalized, high-quality education from verified Kenyan tutors."
    },
    {
      icon: Sparkles,
      title: "Our Values",
      description: "Quality, accessibility, safety, and results. We believe in verified tutors, transparent pricing, secure learning environments, and measurable academic improvement."
    }
  ];

  const stats = [
    { icon: Users, value: "50+", label: "Verified Tutors", sublabel: "From Kenya's top schools" },
    { icon: GraduationCap, value: "500+", label: "Happy Students", sublabel: "Across all counties" },
    { icon: Award, value: "All Curricula", label: "CBC, IGCSE, American & 8-4-4", sublabel: "Comprehensive coverage" }
  ];

  const story = {
    problem: "Students worldwide struggle to access quality tutoring from verified teachers. Traditional in-person tutoring is expensive, requires travel, and has limited availability.",
    solution: "Lana bridges this gap by bringing Kenya's best tutors online. Our platform makes quality education accessible to any student with an internet connection - whether you're in Kenya, East Africa, or the diaspora - at affordable rates, with flexible scheduling.",
    impact: "Since launch, we've connected thousands of students globally with expert Kenyan tutors, helping them improve grades, build confidence, and achieve their academic goals. We're democratizing education worldwide, one session at a time."
  };

  const howItWorksSteps = [
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
        "Access verified tutors from Kenya's top schools",
        "View detailed profiles with qualifications and experience",
        "Read verified reviews from students and parents worldwide",
        "Learn online from anywhere or choose in-person sessions in Kenya"
      ]
    },
    {
      icon: Calendar,
      title: "3. Schedule Your Sessions",
      description: "Book one-time or recurring sessions at times that work for you. Choose online video calls or in-person tutoring.",
      details: [
        "Flexible scheduling - online sessions 7 days a week, 6 AM to 10 PM EAT",
        "Join from anywhere in the world or book in-person sessions in Nairobi",
        "Instant booking confirmation via SMS and email",
        "Set up weekly or bi-weekly recurring lessons"
      ]
    },
    {
      icon: Video,
      title: "4. Attend & Learn",
      description: "Join online sessions via Google Meet or meet your tutor in person. Get personalized 1-on-1 attention.",
      details: [
        "Online: No downloads required - works in your browser from anywhere",
        "In-Person: Available for students in Kenya at convenient locations",
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

  const whyChooseUs = [
    {
      icon: ShieldCheck,
      title: "Verified Expert Tutors",
      description: "Every tutor is a verified teacher from Kenya's top schools. Students worldwide can access these expert tutors online. We verify teaching credentials, academic qualifications, and conduct thorough background checks. Only the top 15% of applicants are accepted.",
      highlights: [
        "Background-checked educators",
        "From top-tier Kenyan schools",
        "Proven teaching experience",
        "Continuous quality monitoring"
      ]
    },
    {
      icon: Lock,
      title: "Safe & Secure Platform",
      description: "Your safety is our priority. All sessions are conducted through secure Google Meet video calls. Parents can monitor sessions, and we maintain strict safety protocols to ensure a protected learning environment.",
      highlights: [
        "Secure video conferencing",
        "Parent monitoring options",
        "Privacy-protected profiles",
        "Safe payment processing"
      ]
    },
    {
      icon: Clock,
      title: "Flexible & Convenient",
      description: "Learn on your schedule with tutoring available 7 days a week from 6 AM to 10 PM. Book sessions as little as 2 hours in advance or schedule recurring lessons. No travel required - learn from the comfort of home.",
      highlights: [
        "Book anytime, anywhere",
        "No commute required",
        "Reschedule with 24hrs notice",
        "One-time or recurring sessions"
      ]
    },
    {
      icon: Award,
      title: "Proven Academic Results",
      description: "Our students see real, measurable improvement. With 50+ verified tutors teaching 500+ happy students across all curricula (CBC, IGCSE, American & 8-4-4), we deliver consistent academic excellence.",
      highlights: [
        "50+ verified tutors from top schools",
        "500+ students achieving their goals",
        "All curricula covered",
        "Proven track record of success"
      ]
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
      text: "Choose how you learn - online video sessions or face-to-face tutoring"
    },
    {
      icon: Clock,
      title: "Flexible Scheduling",
      text: "Book sessions 7 days a week from 6 AM to 10 PM to fit your schedule"
    },
    {
      icon: MessageCircle,
      title: "Easy Communication",
      text: "Stay in touch with tutors and track progress through our platform"
    }
  ];

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <SEO
        title="About Us - Our Mission to Democratize Quality Education Globally"
        description="Learn about Lana's mission to make quality tutoring from verified Kenyan teachers accessible to students worldwide. Discover how we work, our values, and why thousands of families globally trust us."
      />

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            About <span className="text-primary">Lana</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            We're on a mission to democratize quality education globally by connecting students worldwide 
            with verified expert tutors from the country's top schools.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center space-y-2">
                  <Icon className="w-10 h-10 mx-auto text-primary mb-2" />
                  <div className="text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm font-semibold">{stat.label}</div>
                  <div className="text-xs text-muted-foreground">{stat.sublabel}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mission, Vision, Values */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {mission.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card key={index} className="text-center p-8 hover:shadow-lg transition-shadow">
                  <Icon className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Our Story</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8">
              <h3 className="text-xl font-bold mb-4 text-destructive">The Problem</h3>
              <p className="text-muted-foreground leading-relaxed">{story.problem}</p>
            </Card>
            <Card className="p-8">
              <h3 className="text-xl font-bold mb-4 text-primary">Our Solution</h3>
              <p className="text-muted-foreground leading-relaxed">{story.solution}</p>
            </Card>
            <Card className="p-8">
              <h3 className="text-xl font-bold mb-4 text-green-600">The Impact</h3>
              <p className="text-muted-foreground leading-relaxed">{story.impact}</p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Getting started with Lana is simple and straightforward
            </p>
          </div>
          <div className="space-y-8">
            {howItWorksSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={index} className="p-8 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                      <p className="text-muted-foreground mb-4">{step.description}</p>
                      <ul className="grid md:grid-cols-2 gap-2">
                        {step.details.map((detail, detailIndex) => (
                          <li key={detailIndex} className="flex items-start gap-2">
                            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow">
                  <Icon className="w-10 h-10 mx-auto mb-4 text-primary" />
                  <h3 className="font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.text}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Why Choose Lana?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Connect with verified Kenyan tutors from anywhere in the world
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {whyChooseUs.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card key={index} className="p-8 hover:shadow-lg transition-shadow">
                  <Icon className="w-12 h-12 text-primary mb-4" />
                  <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed">{item.description}</p>
                  <ul className="space-y-2">
                    {item.highlights.map((highlight, hIndex) => (
                      <li key={hIndex} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section for Students */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Student FAQs</h2>
            <p className="text-lg text-muted-foreground">
              Common questions from parents and students
            </p>
          </div>
          <div className="space-y-4">
            {[
              {
                q: "How do I book a session?",
                a: "Browse our tutor profiles, select a tutor that matches your needs, and choose from their available time slots. You can book single sessions or create custom packages."
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept M-Pesa and card payments. All payments are processed securely through our platform with instant confirmation."
              },
              {
                q: "Can I get a refund if I'm not satisfied?",
                a: "Yes, we offer a satisfaction guarantee. If you're not happy with your first session, contact us within 24 hours for a full refund."
              },
              {
                q: "Are the tutors verified?",
                a: "Absolutely. Every tutor undergoes a rigorous verification process including background checks, credential verification, and teaching assessments. Only the top 15% of applicants are accepted."
              },
              {
                q: "Can I switch tutors?",
                a: "Yes, you can switch tutors at any time. Simply browse our tutor profiles and book with a different educator that better fits your needs."
              },
              {
                q: "What if I need to cancel or reschedule?",
                a: "You can cancel or reschedule up to 24 hours before your session with no penalty. Cancellations within 24 hours may forfeit the session fee."
              }
            ].map((faq, index) => (
              <Card key={index} className="p-6 hover:shadow-md transition-shadow">
                <h3 className="font-bold text-lg mb-2">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section for Tutors */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Tutor FAQs</h2>
            <p className="text-lg text-muted-foreground">
              Everything tutors need to know
            </p>
          </div>
          <div className="space-y-4">
            {[
              {
                q: "How much can I earn as a tutor?",
                a: "Tutors keep 70% of their session fees with monthly payouts. Rates vary by subject, curriculum, and experience level, with most tutors earning between KES 1,000 to KES 3,000 per hour."
              },
              {
                q: "How do I get paid?",
                a: "Payments are processed monthly within the first 5 business days. We pay directly to your M-Pesa or bank account. You'll receive a detailed payment statement each month."
              },
              {
                q: "What are the requirements to become a tutor?",
                a: "You must be a verified teacher from a recognized Kenyan school, have relevant teaching credentials, pass our background check, and demonstrate strong subject knowledge through our assessment process."
              },
              {
                q: "Can I set my own schedule?",
                a: "Yes! You have complete control over your availability. Set your own hours and decide which time slots to make available for bookings."
              },
              {
                q: "What subjects can I teach?",
                a: "We support all CBC, IGCSE, American, and 8-4-4 curriculum subjects. You can teach multiple subjects and set different rates for each."
              },
              {
                q: "How does the booking process work?",
                a: "Students browse your profile and book directly from your available slots. You'll receive instant notifications via email when a session is booked. Meeting links are generated automatically."
              }
            ].map((faq, index) => (
              <Card key={index} className="p-6 hover:shadow-md transition-shadow">
                <h3 className="font-bold text-lg mb-2">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
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
              <h2 className="text-3xl font-bold mb-3">Ready to Get Started?</h2>
              <p className="text-lg mb-6 opacity-90">
                Join thousands of families who trust Lana for quality tutoring
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

export default AboutUs;

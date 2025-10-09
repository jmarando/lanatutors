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
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";

const AboutUs = () => {
  const mission = [
    {
      icon: Target,
      title: "Our Mission",
      description: "To democratize quality education across Kenya by connecting students with verified expert tutors through an accessible, affordable online platform."
    },
    {
      icon: Heart,
      title: "Our Vision",
      description: "A Kenya where every student, regardless of location or background, has access to personalized, high-quality education that helps them reach their full potential."
    },
    {
      icon: Sparkles,
      title: "Our Values",
      description: "Quality, accessibility, safety, and results. We believe in verified tutors, transparent pricing, secure learning environments, and measurable academic improvement."
    }
  ];

  const stats = [
    { icon: Users, value: "500+", label: "Verified Tutors", sublabel: "From Kenya's top schools" },
    { icon: GraduationCap, value: "10,000+", label: "Happy Students", sublabel: "Across all counties" },
    { icon: Award, value: "4.9★", label: "Average Rating", sublabel: "From student reviews" },
    { icon: TrendingUp, value: "94%", label: "Success Rate", sublabel: "Students improve grades" }
  ];

  const whyChooseUs = [
    {
      icon: ShieldCheck,
      title: "Verified Expert Tutors",
      description: "Every tutor comes from recognized Kenyan schools including Alliance, Starehe, Kenya High, and more. We verify teaching credentials, academic qualifications, and conduct thorough background checks. Only the top 15% of applicants are accepted.",
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
      description: "Our students see real, measurable improvement. On average, students using ElimuConnect improve their grades by 2 levels within 3 months. We've helped over 10,000 students excel in KCPE and KCSE examinations.",
      highlights: [
        "2-level average grade improvement",
        "94% report increased confidence",
        "Personalized learning approach",
        "Progress tracking & reports"
      ]
    }
  ];

  const story = {
    problem: "Many Kenyan students struggle to access quality tutoring. Traditional in-person tutoring is expensive, requires travel, and has limited availability. Top tutors are concentrated in major cities, leaving students in rural areas without options.",
    solution: "ElimuConnect bridges this gap by bringing Kenya's best tutors online. Our platform makes quality education accessible to any student with an internet connection, at affordable rates, with flexible scheduling.",
    impact: "Since launch, we've connected thousands of students with expert tutors, helping them improve grades, build confidence, and achieve their academic goals. We're democratizing education across Kenya, one session at a time."
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/10 to-background">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            About ElimuConnect
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Empowering Kenyan students through accessible, high-quality online tutoring from verified expert educators.
          </p>
        </div>
      </section>

      {/* Mission, Vision, Values */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {mission.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card key={index} className="border-2">
                <CardContent className="p-6 text-center">
                  <Icon className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">Our Impact in Numbers</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <Icon className="w-10 h-10 mx-auto text-primary mb-3" />
                  <div className="text-4xl font-bold mb-1">{stat.value}</div>
                  <div className="font-semibold mb-1">{stat.label}</div>
                  <div className="text-sm text-muted-foreground">{stat.sublabel}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Our Story</h2>
        <div className="max-w-4xl mx-auto space-y-8">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="text-primary">The Problem</span>
              </h3>
              <p className="text-muted-foreground">{story.problem}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="text-primary">Our Solution</span>
              </h3>
              <p className="text-muted-foreground">{story.solution}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="text-primary">The Impact</span>
              </h3>
              <p className="text-muted-foreground">{story.impact}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose ElimuConnect</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {whyChooseUs.map((reason, index) => {
              const Icon = reason.icon;
              return (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <Icon className="w-10 h-10 text-primary flex-shrink-0" />
                      <div>
                        <h3 className="text-xl font-bold mb-2">{reason.title}</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {reason.description}
                        </p>
                        <ul className="space-y-2">
                          {reason.highlights.map((highlight, idx) => (
                            <li key={idx} className="text-sm flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                              {highlight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Join the ElimuConnect Community</h2>
          <p className="text-xl mb-8 opacity-90">
            Start your journey to academic excellence today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/tutors">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Find a Tutor
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent hover:bg-white/10 border-white text-white">
                Sign Up Now
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;

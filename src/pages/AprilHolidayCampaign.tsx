import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  Calendar,
  CheckCircle2,
  GraduationCap,
  Users,
  Target,
  TrendingUp,
  BookOpen,
  Star,
  Clock,
  ArrowRight
} from "lucide-react";
import { PriceDisplay } from "@/components/PriceDisplay";

const AprilHolidayCampaign = () => {
  const curricula = ["CBC", "8-4-4", "IGCSE", "IB"];

  const packages = [
    {
      title: "Catch-Up Package",
      sessions: 5,
      description: "Targeted revision for 1-2 weak subjects. Perfect for students who need focused attention on specific gaps.",
      features: [
        "5 sessions (1 hr each)",
        "1-2 subjects",
        "Personalised revision plan",
        "Progress report after completion",
      ],
    },
    {
      title: "Standard Revision",
      sessions: 10,
      popular: true,
      description: "Comprehensive revision across multiple subjects. Build confidence and close gaps from last term.",
      features: [
        "10 sessions (1 hr each)",
        "Up to 3 subjects",
        "Personalised revision plan",
        "Weekly progress reports",
        "Practice worksheets & past papers",
      ],
    },
    {
      title: "Intensive Prep",
      sessions: 15,
      description: "Full holiday programme for students preparing for exams or transitioning to a new level.",
      features: [
        "15 sessions (1 hr each)",
        "Up to 4 subjects",
        "Personalised revision plan",
        "Weekly progress reports",
        "Practice worksheets & past papers",
        "Free assessment call included",
      ],
    },
  ];

  const results = [
    { stat: "95%", label: "of students improve their grades within one term" },
    { stat: "200+", label: "students already learning with Lana Tutors" },
    { stat: "50+", label: "vetted, experienced tutors across all curricula" },
  ];

  const testimonials = [
    {
      name: "Sarah M.",
      role: "Parent, Nairobi",
      quote: "My son went from a C+ to a B+ in Maths after just one holiday of revision with his Lana tutor. The personalised approach really works.",
    },
    {
      name: "James K.",
      role: "Form 3 Student",
      quote: "I used to dread Physics but my tutor made it click. I actually look forward to sessions now.",
    },
    {
      name: "Grace W.",
      role: "Parent, Diaspora (UK)",
      quote: "Even from abroad, I can give my daughter access to quality Kenyan tutors. The online sessions are seamless.",
    },
  ];

  return (
    <>
      <SEO
        title="April Holiday Revision Packages | Lana Tutors"
        description="Don't let the April holiday slip by. Expert 1-on-1 tutoring for CBC, 8-4-4, IGCSE & IB. Personalised revision plans from KES 1,500/hr. Book your free assessment call today."
        keywords="april holiday tutoring, holiday revision Kenya, online tutor Nairobi, CBC revision, IGCSE tutor Kenya, april holiday classes, exam preparation"
      />

      <div className="min-h-screen bg-background pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-background" />
          <div className="relative container mx-auto px-4 py-16 md:py-24 max-w-6xl">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Calendar className="w-4 h-4" />
                April Holiday 2026
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Make This Holiday{" "}
                <span className="text-primary">Count</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-4 max-w-3xl mx-auto">
                Is your child ready for next term? Don't let the April holiday slip by — our expert tutors create personalised revision plans that target weak areas and build confidence.
              </p>
              <p className="text-lg text-muted-foreground mb-8">
                1-on-1 online tutoring. CBC, 8-4-4, IGCSE & IB. From{" "}
                <span className="font-semibold text-foreground">
                  <PriceDisplay amountKES={1500} />/hr
                </span>
              </p>
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <Link to="/book-consultation">
                  <Button size="lg" className="h-14 px-8 text-lg">
                    Book a Free Assessment
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/tutors">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
                    Find Your Tutor
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {curricula.map((c) => (
                  <Badge key={c} variant="secondary" className="text-sm px-3 py-1">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* The Problem / Pain Point */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Don't Let the Holiday Go to Waste
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto">
              2 weeks. That's all it takes to close the gaps from last term. Our tutors work with your child 1-on-1 to revise, practise, and build real understanding — not just cram.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="text-center p-6">
                <Target className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Target Weak Areas</h3>
                <p className="text-sm text-muted-foreground">
                  Personalised revision plans that focus on exactly where your child needs help
                </p>
              </Card>
              <Card className="text-center p-6">
                <TrendingUp className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Build Confidence</h3>
                <p className="text-sm text-muted-foreground">
                  Go into Term 2 prepared, not panicking. Start ahead, not behind
                </p>
              </Card>
              <Card className="text-center p-6">
                <BookOpen className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Real Understanding</h3>
                <p className="text-sm text-muted-foreground">
                  Not just cramming — your child will actually understand the material
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Revision Packages */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                April Holiday Revision Packages
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Flexible packages to suit every student's needs. All sessions are 1-on-1 with a vetted, experienced tutor.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {packages.map((pkg) => (
                <Card
                  key={pkg.title}
                  className={`relative ${pkg.popular ? "border-primary border-2 shadow-lg" : ""}`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-4 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-xl">{pkg.title}</CardTitle>
                    <CardDescription className="text-sm">{pkg.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <span className="text-3xl font-bold text-primary">{pkg.sessions}</span>
                      <span className="text-muted-foreground ml-1">sessions</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        From <PriceDisplay amountKES={1500 * pkg.sessions} />
                      </p>
                    </div>
                    <ul className="space-y-2">
                      {pkg.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link to="/book-consultation" className="block">
                      <Button className="w-full" variant={pkg.popular ? "default" : "outline"}>
                        Book Now
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Why Lana Tutors */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Expert Tutors. Real Results.
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Every Lana tutor is vetted, interviewed, and matched to your child's curriculum and learning style. Whether it's Maths, Sciences, or Languages — we've got the right tutor for your child.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <GraduationCap className="w-10 h-10 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Vetted Tutors</h3>
                <p className="text-sm text-muted-foreground">
                  Background-checked, interviewed, and verified educators from top schools
                </p>
              </Card>
              <Card className="p-6">
                <Users className="w-10 h-10 text-primary mb-3" />
                <h3 className="font-semibold mb-2">1-on-1 Attention</h3>
                <p className="text-sm text-muted-foreground">
                  No group classes — your child gets the tutor's full, undivided attention
                </p>
              </Card>
              <Card className="p-6">
                <Clock className="w-10 h-10 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Flexible Scheduling</h3>
                <p className="text-sm text-muted-foreground">
                  Book sessions at times that work for your family. Online and convenient
                </p>
              </Card>
              <Card className="p-6">
                <Target className="w-10 h-10 text-primary mb-3" />
                <h3 className="font-semibold mb-2">All Curricula</h3>
                <p className="text-sm text-muted-foreground">
                  CBC, 8-4-4, IGCSE & IB — tutors who know the curriculum inside out
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Results Stats */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Results That Speak for Themselves
              </h2>
              <p className="text-lg text-muted-foreground">
                That's not luck — it's what happens when you pair a student with the right tutor.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {results.map((r) => (
                <div key={r.stat} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold text-primary mb-2">{r.stat}</div>
                  <p className="text-muted-foreground">{r.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold text-center mb-10">What Parents Say</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((t) => (
                <Card key={t.name} className="p-6">
                  <div className="flex gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed italic">
                    "{t.quote}"
                  </p>
                  <div className="border-t pt-3">
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-10">How to Get Started</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Book a Free Assessment",
                  description: "Schedule a free call with a Lana consultant. We'll discuss your child's needs, curriculum, and learning goals.",
                },
                {
                  step: "2",
                  title: "Get Matched with a Tutor",
                  description: "We match your child with a vetted tutor who understands their curriculum and knows how to make it click.",
                },
                {
                  step: "3",
                  title: "Start Revising",
                  description: "Your child begins personalised 1-on-1 sessions online. Track progress and see real results.",
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 px-4 bg-primary/5">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Give Your Child a Head Start for Term 2
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              You already know they need the extra help. This holiday, give them a tutor who actually understands the curriculum and knows how to make it click. Real tutors. Real progress. Real results.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/book-consultation">
                <Button size="lg" className="h-14 px-8 text-lg">
                  Book Your Free Assessment Call
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Or call us directly: (+254) 117 512316
            </p>
          </div>
        </section>
      </div>
    </>
  );
};

export default AprilHolidayCampaign;

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import {
  ShieldCheck,
  Star,
  Globe,
  GraduationCap,
  Clock,
  CheckCircle,
  Users,
  BookOpen,
} from "lucide-react";

const TutorsInKenya = () => {
  const canonical = "https://lanatutors.africa/tutors-in-kenya";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Online Tutors in Kenya",
    serviceType: "Online Tutoring",
    provider: {
      "@type": "EducationalOrganization",
      name: "Lana Tutors",
      url: "https://lanatutors.africa",
    },
    areaServed: [
      { "@type": "Country", name: "Kenya" },
      { "@type": "Country", name: "United States" },
      { "@type": "Country", name: "United Kingdom" },
    ],
    description:
      "Verified online tutors in Kenya for CBC, 8-4-4, IGCSE, and IB students. One-on-one lessons taught by qualified Kenyan teachers.",
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How much do online tutors in Kenya cost?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Rates start from KES 1,500 per hour for primary subjects and go up to KES 3,500 per hour for senior secondary, IGCSE, and IB subjects. Discounts apply when you book lesson packages of 5 or 10 sessions.",
        },
      },
      {
        "@type": "Question",
        name: "Are Lana tutors in Kenya verified?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Every tutor on Lana is interviewed, ID-verified, and assessed on subject knowledge, teaching ability, and communication before being accepted onto the platform.",
        },
      },
      {
        "@type": "Question",
        name: "Can Kenyan parents in the diaspora hire tutors from Kenya?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Absolutely. Lana Tutors is built for diaspora families. We support multiple currencies, dual time zone scheduling, and Kenyan tutors who teach the CBC, KCSE, IGCSE, and IB curricula your child follows.",
        },
      },
      {
        "@type": "Question",
        name: "Which curricula do tutors in Kenya teach?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Our tutors cover the Kenyan CBC, the 8-4-4 system (KCPE/KCSE), IGCSE (Cambridge British), and the IB curriculum from primary through to senior secondary level.",
        },
      },
    ],
  };

  const subjects = [
    { name: "Mathematics", slug: "mathematics" },
    { name: "Chemistry", slug: "chemistry" },
    { name: "Physics", slug: "physics" },
    { name: "Biology", slug: "biology" },
    { name: "English", slug: "english" },
  ];

  const curricula = [
    {
      title: "CBC Tutors",
      desc: "Competency-Based Curriculum tutors for Pre-Primary, Lower Primary, Upper Primary, and Junior School learners.",
    },
    {
      title: "KCSE / 8-4-4 Tutors",
      desc: "Form 1–4 tutors specialising in KCSE preparation across all major examinable subjects.",
    },
    {
      title: "IGCSE / British Curriculum Tutors",
      desc: "Cambridge IGCSE and A-Level tutors for KS1 through senior secondary.",
    },
    {
      title: "IB Curriculum Tutors",
      desc: "MYP and DP tutors for IB Diploma students, including TOK and Extended Essay support.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Online Tutors in Kenya — Verified Kenyan Teachers"
        description="Hire verified online tutors in Kenya for CBC, KCSE, IGCSE and IB. One-on-one lessons with qualified Kenyan teachers. Book a free assessment call today."
        keywords="tutors in kenya, online tutors kenya, kenyan tutors, cbc tutors, kcse tutors, igcse tutors kenya, ib tutors nairobi, online tutoring kenya"
        canonical={canonical}
        structuredData={structuredData}
      />
      {/* Second JSON-LD via inline script tag isn't supported here; FAQ embedded below in head via Helmet would need wrapper. Skipping double schema for simplicity. */}

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-background py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <Badge className="mb-4">Trusted by Kenyan families worldwide</Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Online Tutors in Kenya
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Verified Kenyan teachers offering one-on-one online tutoring for{" "}
            <strong>CBC, KCSE (8-4-4), IGCSE and IB</strong> students — at home in
            Nairobi or anywhere in the diaspora.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg">
              <Link to="/tutors">Browse Tutors</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/book-consultation">Book Free Assessment Call</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="py-10 border-y bg-card">
        <div className="container mx-auto px-4 max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: ShieldCheck, label: "ID & background verified" },
            { icon: GraduationCap, label: "Qualified Kenyan teachers" },
            { icon: Star, label: "Rated by real parents" },
            { icon: Globe, label: "Diaspora-friendly time zones" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <Icon className="h-8 w-8 text-primary" />
              <p className="text-sm font-medium">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Kenyan tutors */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">
            Why hire a tutor from Kenya?
          </h2>
          <p className="text-muted-foreground text-center max-w-3xl mx-auto mb-10">
            Kenyan teachers know the curriculum your child sits, the exams they
            face, and the cultural context behind them. Whether your family is in
            Nairobi, London, Houston, or Dubai — Lana connects you to the right
            Kenyan tutor.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: BookOpen,
                title: "Curriculum experts",
                body:
                  "Tutors who actually teach CBC, KCSE, IGCSE and IB in Kenyan classrooms — not generalists.",
              },
              {
                icon: Users,
                title: "One-on-one focus",
                body:
                  "Every lesson is private, personalised, and matched to your child's learning gaps.",
              },
              {
                icon: Clock,
                title: "Flexible scheduling",
                body:
                  "Evening and weekend slots that work for both Nairobi and diaspora time zones.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <Card key={title}>
                <CardContent className="p-6 space-y-3">
                  <Icon className="h-8 w-8 text-primary" />
                  <h3 className="font-semibold text-lg">{title}</h3>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Curricula */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center">
            Tutors for every Kenyan curriculum
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {curricula.map((c) => (
              <Card key={c.title}>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-xl mb-2">{c.title}</h3>
                  <p className="text-muted-foreground">{c.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button asChild size="lg">
              <Link to="/tutors">See all tutors</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Subjects */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center">
            Popular subjects taught by Kenyan tutors
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {subjects.map((s) => (
              <Link
                key={s.slug}
                to={`/subjects/${s.slug}`}
                className="block"
              >
                <Card className="hover:border-primary transition">
                  <CardContent className="p-6 text-center">
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      View tutors
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center">
            How it works
          </h2>
          <ol className="space-y-6">
            {[
              "Book a free 30-minute assessment call so we understand your child's level and goals.",
              "We match you with verified Kenyan tutors who teach the right curriculum and subject.",
              "Pick a time that works in your time zone and pay securely in your local currency.",
              "Meet your tutor on Google Meet — track progress in your parent dashboard.",
            ].map((step, i) => (
              <li key={i} className="flex gap-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  {i + 1}
                </div>
                <p className="pt-2 text-muted-foreground">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {faqSchema.mainEntity.map((q: any) => (
              <Card key={q.name}>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2 flex gap-2 items-start">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    {q.name}
                  </h3>
                  <p className="text-muted-foreground pl-7">
                    {q.acceptedAnswer.text}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to find your child's tutor?
          </h2>
          <p className="mb-8 text-primary-foreground/90">
            Book a free assessment call and get matched with a verified Kenyan
            tutor within 48 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" variant="secondary">
              <Link to="/book-consultation">Book Free Assessment Call</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
            >
              <Link to="/tutors">Browse Tutors</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TutorsInKenya;

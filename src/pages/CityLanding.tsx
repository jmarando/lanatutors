import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { NAIROBI_LOCATIONS } from "@/utils/locationData";
import { CheckCircle, ShieldCheck, MapPin, GraduationCap, Smartphone, Video } from "lucide-react";

type Faq = { q: string; a: string };

type City = {
  path: string;
  name: string;
  seoTitle: string;
  description: string;
  keywords: string;
  badge: string;
  heading: string;
  intro: string;
  serviceType: string;
  modeLabel: string;
  inPersonTitle: string;
  inPerson: string;
  online: string;
  areas?: readonly string[];
  families: string[];
  extraFaqs: Faq[];
  ctaHeading: string;
  ctaText: string;
};

// Each city route has its own title, copy and canonical URL, like the diaspora pages.
// Only Nairobi names in-person areas (the booking form's list). In Mombasa and Kisumu an
// in-person lesson depends on a tutor living nearby, so their copy never promises more.
const CITIES: Record<string, City> = {
  "/tutors-in-nairobi": {
    path: "/tutors-in-nairobi",
    name: "Nairobi",
    seoTitle: "Home Tutors in Nairobi — CBC, KCSE & IGCSE",
    description:
      "Verified teachers who come to your home in Westlands, Kilimani, Karen, Runda, Kiambu and beyond, or teach online. Free call with a learning coordinator.",
    keywords:
      "home tutors nairobi, home tuition nairobi, private tutors nairobi, tutors in nairobi, cbc tutors nairobi, igcse tutors nairobi, ib tutors nairobi",
    badge: "Home and online lessons",
    heading: "Home Tutors in Nairobi",
    intro:
      "Lana's verified teachers come to your home in Westlands, Kilimani, Karen, Kasarani, Ruaka, Kitengela and other parts of Nairobi. Book lessons after school or at weekends for CBC, KCSE, IGCSE, A-Level, IB or the American curriculum, and switch to online in the weeks when that's easier.",
    serviceType: "Home and online tutoring in Nairobi",
    modeLabel: "Lessons at home or online",
    inPersonTitle: "At home",
    inPerson:
      "Your tutor comes to your home at a time you agree. Choose your area when you book and your learning coordinator matches you with a tutor who covers it.",
    online:
      "Lessons run on Google Meet with a shared whiteboard, and there's nothing to install. You pick online or at home each time you book, so the two are easy to mix.",
    areas: NAIROBI_LOCATIONS,
    families: [
      "Parents who'd rather the tutor came to them than face another drive across Nairobi",
      "CBC learners in primary and junior school who need steady weekly support",
      "IGCSE, A-Level and IB students at Nairobi's international schools",
      "Families following the American curriculum",
      "KCSE candidates working through past papers",
      "Students who concentrate better with a teacher in the room",
    ],
    extraFaqs: [
      {
        q: "Do your tutors come to our home in Nairobi?",
        a: "Yes. In-person lessons in Nairobi take place at your home, at a time you agree with the tutor.",
      },
      {
        q: "Which parts of Nairobi do you cover?",
        a: "Home lessons are available across Nairobi and nearby towns, including Westlands, Kilimani, Lavington, Karen, Runda, South B and C, Kasarani, Embakasi, Ruaka, Ruiru, Kitengela, Syokimau, Rongai, Juja and Thika. If you live somewhere else, ask on your free call.",
      },
      {
        q: "Can we mix home and online lessons?",
        a: "Yes. You choose online or at home each time you book, so a weekend lesson can be at home and a midweek one online with the same tutor.",
      },
    ],
    ctaHeading: "Find a home tutor in Nairobi",
    ctaText:
      "Book a free 20-minute assessment call. A learning coordinator will match your child with a verified tutor who comes to your home or teaches online.",
  },
  "/tutors-in-mombasa": {
    path: "/tutors-in-mombasa",
    name: "Mombasa",
    seoTitle: "Private Tutors in Mombasa, In Person or Online",
    description:
      "Verified Kenyan teachers for CBC, KCSE, IGCSE and IB in Mombasa, in person where a tutor is nearby or online. Book a free call with a learning coordinator.",
    keywords:
      "tutors in mombasa, private tutors mombasa, online tutors mombasa, cbc tutors mombasa, kcse tutors mombasa, igcse tutors mombasa",
    badge: "For families in Mombasa",
    heading: "Private Tutors in Mombasa",
    intro:
      "Whether you live in Nyali, Bamburi, Kizingo or Likoni, Lana can match your child with a verified Kenyan teacher for CBC, KCSE, IGCSE, A-Level or IB. Lessons happen in person when a tutor is near you, or one-on-one over Google Meet from anywhere on the coast.",
    serviceType: "In-person and online tutoring in Mombasa",
    modeLabel: "In person or online",
    inPersonTitle: "In person",
    inPerson:
      "Tell your learning coordinator where you live on the free call. When a tutor is close enough to reach you, lessons happen face to face at a time you agree.",
    online:
      "Every Lana tutor also teaches over Google Meet, so your child can learn from verified teachers anywhere in Kenya, not only those based in Mombasa.",
    families: [
      "CBC learners in primary and junior school who need a steady weekly tutor",
      "KCSE candidates who want structured past-paper practice",
      "IGCSE, A-Level and IB students who need a specialist for one subject",
      "Families who want face-to-face lessons when a tutor is close by, and online ones when not",
      "Parents who want a teacher who knows the exact syllabus their child sits",
      "Students switching curriculum, for example from CBC to IGCSE",
    ],
    extraFaqs: [
      {
        q: "Can a tutor teach my child in person in Mombasa?",
        a: "Yes, when a tutor is near enough to reach you. Tell your learning coordinator where you live on the free call and they'll check who is nearby. If no one is, your child can start with online lessons.",
      },
      {
        q: "Can my child learn online from Mombasa?",
        a: "Yes. Lessons run one-on-one over Google Meet, so your child can learn from Nyali, Bamburi, Mtwapa or anywhere else with a stable internet connection.",
      },
    ],
    ctaHeading: "Find a tutor in Mombasa",
    ctaText:
      "Book a free 20-minute assessment call. A learning coordinator will match your child with a verified tutor, in person if one is near you or online.",
  },
  "/tutors-in-kisumu": {
    path: "/tutors-in-kisumu",
    name: "Kisumu",
    seoTitle: "Private Tutors in Kisumu, In Person or Online",
    description:
      "Verified teachers for CBC, KCSE, IGCSE and A-Level in Kisumu, face to face when a tutor is near you or online. Free call with a learning coordinator.",
    keywords:
      "tutors in kisumu, private tutors kisumu, online tutors kisumu, cbc tutors kisumu, kcse tutors kisumu, igcse tutors kisumu",
    badge: "For families in Kisumu",
    heading: "Private Tutors in Kisumu",
    intro:
      "Lana can match families anywhere in Kisumu, from Milimani and Lolwe to Mamboleo and Riat, with verified Kenyan teachers for CBC, KCSE, IGCSE, A-Level and IB. Lessons are face to face when a tutor is close by, and one-on-one over Google Meet wherever you are.",
    serviceType: "In-person and online tutoring in Kisumu",
    modeLabel: "In person or online",
    inPersonTitle: "In person",
    inPerson:
      "Where a tutor lives close enough to reach you, lessons can be face to face. Your learning coordinator checks this on the free call and agrees times with you.",
    online:
      "Online lessons open up Lana's full list of Kenyan tutors, which helps most when your child needs a specialist for IGCSE, A-Level or IB.",
    families: [
      "CBC learners from lower primary to junior school",
      "Secondary students who want a specialist for Mathematics, Physics, Chemistry or Biology",
      "KCSE candidates revising with past papers and marking schemes",
      "IGCSE, A-Level and IB students who need a teacher who knows their syllabus",
      "Families happy to mix face-to-face lessons with online ones",
      "Learners catching up after time away from school",
    ],
    extraFaqs: [
      {
        q: "Can my child have in-person lessons in Kisumu?",
        a: "Yes, when a tutor is close enough to reach you. Your learning coordinator checks on the free call, and if no one is nearby your child can learn online instead.",
      },
      {
        q: "What do we need for online lessons?",
        a: "A laptop or tablet and a stable internet connection. Lessons run on Google Meet, and on a laptop they open in the browser with nothing to install.",
      },
    ],
    ctaHeading: "Find a tutor in Kisumu",
    ctaText:
      "Book a free 20-minute assessment call and a learning coordinator will recommend a verified tutor for your child, face to face or online.",
  },
};

const SHARED_FAQS: Faq[] = [
  { q: "How does the free assessment call work?", a: "It's a 20-minute call with a learning coordinator. They ask about your child's curriculum, level and goals, then recommend a tutor and explain how lessons and pricing work." },
  { q: "Which curricula do your tutors teach?", a: "CBC, KCSE (8-4-4), IGCSE, A-Level, IB and the American curriculum. Every student is matched with a tutor who specialises in the exact curriculum and level they sit." },
  { q: "How do you vet tutors?", a: "Every Lana tutor is a verified teacher. We check teaching credentials and run background checks, and only about the top 15% of applicants are accepted." },
  { q: "When can lessons happen?", a: "Tutors teach seven days a week, from 6 AM to 10 PM. Book a single lesson or a weekly slot, and reschedule up to 24 hours before a lesson at no cost." },
  { q: "How much do lessons cost?", a: "It depends on the curriculum, the level and whether lessons are in person or online. Book a free assessment call and a learning coordinator will recommend a tutor and walk you through pricing." },
];

const CURRICULA = ["CBC", "KCSE (8-4-4)", "IGCSE", "A-Levels", "IB", "American"];

const CityLanding = () => {
  const { pathname } = useLocation();
  const city = CITIES[pathname.toLowerCase().replace(/\/+$/, "")] ?? CITIES["/tutors-in-nairobi"];
  const canonical = `https://lanatutors.africa${city.path}`;
  const faqs = [...city.extraFaqs, ...SHARED_FAQS];

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: city.serviceType,
    provider: {
      "@type": "EducationalOrganization",
      name: "Lana Tutors",
      url: "https://lanatutors.africa",
    },
    areaServed: { "@type": "City", name: city.name },
    description: city.description,
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={city.seoTitle}
        description={city.description}
        keywords={city.keywords}
        canonical={canonical}
        structuredData={serviceSchema}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-background py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <Badge className="mb-4">{city.badge}</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            {city.heading}
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto">
            {city.intro}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg">
              <Link to="/book-consultation">Book a Free Assessment Call</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/tutors">Browse Tutors</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-10 border-y bg-card">
        <div className="container mx-auto px-4 max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: ShieldCheck, label: "Background-checked tutors" },
            { icon: MapPin, label: city.modeLabel },
            { icon: GraduationCap, label: "CBC to IB" },
            { icon: Smartphone, label: "Pay by M-Pesa or card" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <Icon className="h-7 w-7 text-primary" />
              <p className="text-sm font-medium">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How lessons work */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl font-bold mb-8 text-center">How lessons work in {city.name}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: MapPin, title: city.inPersonTitle, text: city.inPerson },
              { icon: Video, title: "Online", text: city.online },
            ].map(({ icon: Icon, title, text }) => (
              <Card key={title}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Icon className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-semibold">{title}</h3>
                  </div>
                  <p className="text-muted-foreground">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {city.areas && (
            <div className="mt-12 text-center">
              <h3 className="text-2xl font-semibold mb-3">Areas covered for in-person lessons</h3>
              <p className="text-muted-foreground mb-6 max-w-3xl mx-auto">
                In-person lessons are available in these areas. If you live elsewhere in or near {city.name}, ask on your free call.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {city.areas.map((area) => (
                  <span key={area} className="bg-card border rounded-full px-4 py-2 text-sm">
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Who we help */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl font-bold mb-8 text-center">Who we help</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {city.families.map((t) => (
              <Card key={t}>
                <CardContent className="p-5 flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{t}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Curricula */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl font-bold mb-8 text-center">Curricula covered</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {CURRICULA.map((c) => (
              <div key={c} className="bg-card border rounded-lg p-4 text-center font-medium">
                {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">Questions from {city.name} parents</h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <Card key={f.q}>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">{f.q}</h3>
                  <p className="text-muted-foreground">{f.a}</p>
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
          <h2 className="text-3xl font-bold mb-4">{city.ctaHeading}</h2>
          <p className="mb-8 text-primary-foreground/90">{city.ctaText}</p>
          <Button asChild size="lg" variant="secondary">
            <Link to="/book-consultation">Book Free Assessment Call</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default CityLanding;

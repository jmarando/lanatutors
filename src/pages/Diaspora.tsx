import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { CheckCircle, Globe, ShieldCheck, GraduationCap, Clock } from "lucide-react";

type Faq = { q: string; a: string };

type Market = {
  path: string;
  seoTitle: string;
  description: string;
  badge: string;
  heading: string;
  intro: string;
  serviceType: string;
  areaServed: string[];
  extraFaqs: Faq[];
};

const ALL_AREAS = ["United Kingdom", "United States", "Canada", "Australia", "United Arab Emirates", "Qatar", "South Africa"];

// Each diaspora route has its own title, copy and canonical URL, so search engines
// index it as a page of its own instead of folding it into /diaspora.
const MARKETS: Record<string, Market> = {
  "/diaspora": {
    path: "/diaspora",
    seoTitle: "Online Tutors for Kenyan Families Abroad",
    description:
      "Verified Kenyan teachers for children in the UK, US, Canada, Australia and the UAE. One-on-one online KCSE, CBC, IGCSE and IB. Pay in USD, GBP or EUR.",
    badge: "For Kenyans & Africans abroad",
    heading: "Online Tutors for Kenyan Families Abroad",
    intro:
      "Kenyan and African families in the UK, US, Canada, Australia and the UAE trust Lana to connect their children with verified Kenyan teachers — for KCSE, CBC, IGCSE, IB and American curricula, taught one-on-one online.",
    serviceType: "Online tutoring for Kenyan families abroad",
    areaServed: ALL_AREAS,
    extraFaqs: [],
  },
  "/tutors-for-african-students-abroad": {
    path: "/tutors-for-african-students-abroad",
    seoTitle: "Online Tutors for African Students Abroad",
    description:
      "Verified Kenyan teachers for African students in the UK, US, Canada, Australia and the UAE. One-on-one IGCSE, A-Level, IB and KCSE lessons online.",
    badge: "For African students abroad",
    heading: "Online Tutors for African Students Abroad",
    intro:
      "African families abroad come to Lana for teachers their children relate to. Verified Kenyan tutors teach IGCSE, A-Levels, IB, KCSE and CBC one-on-one online, at hours that suit the UK, Europe and the Gulf.",
    serviceType: "Online tutoring for African students abroad",
    areaServed: ALL_AREAS,
    extraFaqs: [],
  },
  "/kenyan-tutors-uk": {
    path: "/kenyan-tutors-uk",
    seoTitle: "Kenyan Tutors in the UK — KCSE, IGCSE, A-Level",
    description:
      "Verified Kenyan teachers for children in the UK: KCSE and CBC to keep up with home, plus IGCSE and A-Level. Online after school, UK time. Pay in GBP.",
    badge: "For Kenyan families in the UK",
    heading: "Kenyan Tutors for Families in the UK",
    intro:
      "Kenyan families across the UK trust Lana to keep their children connected to Kenyan teaching. Verified tutors teach KCSE and CBC alongside IGCSE and A-Levels, one-on-one online, with after-school slots in UK time and billing in GBP.",
    serviceType: "Online tutoring for Kenyan families in the United Kingdom",
    areaServed: ["United Kingdom"],
    extraFaqs: [
      {
        q: "What time are lessons in the UK?",
        a: "Tutors teach from 6 AM to 10 PM East Africa Time. That is 3 AM to 7 PM in the UK in winter (GMT) and 4 AM to 8 PM in summer (BST), so after-school and weekend slots are available.",
      },
    ],
  },
  "/kenyan-tutors-usa": {
    path: "/kenyan-tutors-usa",
    seoTitle: "Kenyan Tutors in the USA — KCSE, IGCSE & IB",
    description:
      "Verified Kenyan teachers for children in the US. One-on-one online KCSE, CBC, IGCSE and IB lessons, matched to your child's curriculum and paid in USD.",
    badge: "For Kenyan families in the USA",
    heading: "Kenyan Tutors for Families in the USA",
    intro:
      "Kenyan families across the US trust Lana to connect their children with verified Kenyan teachers. Tutors teach KCSE, CBC, IGCSE and IB one-on-one online, matched to the curriculum your child follows, with billing in USD.",
    serviceType: "Online tutoring for Kenyan families in the United States",
    areaServed: ["United States"],
    extraFaqs: [],
  },
};

const SHARED_FAQS: Faq[] = [
  { q: "Do you offer tutoring for Kenyan students living abroad?", a: "Yes. Lana connects Kenyan diaspora families in the UK, US, Canada, Australia, UAE and beyond with verified Kenyan tutors for online one-on-one lessons across KCSE, CBC, IGCSE, IB and American curricula." },
  { q: "How do timezones work?", a: "Tutors offer flexible hours from 6 AM to 10 PM East Africa Time (EAT) — that covers comfortable evening or weekend slots for families in the UK, Europe, the Middle East, North America and Australia." },
  { q: "Can I pay in USD, GBP or EUR?", a: "Yes. We bill in USD, GBP, EUR, KES, TZS and UGX. Pricing is shown in your local currency at checkout and processed securely via Pesapal." },
  { q: "Will my child be taught the curriculum they sit at school?", a: "Yes. We match every student to a tutor who specialises in their exact curriculum — whether that's CBC, KCSE 8-4-4, IGCSE (Cambridge), IB or American — at the right level." },
];

const Diaspora = () => {
  const { pathname } = useLocation();
  const market = MARKETS[pathname.replace(/\/+$/, "")] ?? MARKETS["/diaspora"];
  const canonical = `https://lanatutors.africa${market.path}`;

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: market.serviceType,
    provider: {
      "@type": "EducationalOrganization",
      name: "Lana Tutors",
      url: "https://lanatutors.africa",
    },
    areaServed: market.areaServed,
    description: market.description,
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [...market.extraFaqs, ...SHARED_FAQS].map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={market.seoTitle}
        description={market.description}
        keywords="tutoring for african students abroad, online tutoring for african students, kenyan tutors uk, kcse tutors worldwide, kenyan tutors diaspora, online tutors for kenyans abroad"
        canonical={canonical}
        structuredData={orgSchema}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-background py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <Badge className="mb-4">{market.badge}</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            {market.heading}
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto">
            {market.intro}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg">
              <Link to="/tutors">Browse Tutors</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/book-consultation">Book a Free Assessment Call</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            Billing in USD · GBP · EUR · KES · Lessons from 6 AM – 10 PM EAT
          </p>
        </div>
      </section>

      {/* Trust */}
      <section className="py-10 border-y bg-card">
        <div className="container mx-auto px-4 max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: ShieldCheck, label: "Verified Kenyan tutors" },
            { icon: Globe, label: "Diaspora-friendly hours" },
            { icon: GraduationCap, label: "All major curricula" },
            { icon: Clock, label: "Matched in 48 hours" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <Icon className="h-7 w-7 text-primary" />
              <p className="text-sm font-medium">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who we serve */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl font-bold mb-8 text-center">Families we work with</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              "Kenyans in the UK preparing for KCSE or wanting to keep CBC strong",
              "Families in the US sitting IGCSE or AP-aligned subjects",
              "Diaspora in the UAE &amp; Qatar following the Cambridge or American track",
              "Kenyan students in Canada &amp; Australia revising for IB or A-Levels",
              "Returning families re-entering the Kenyan school system",
              "Parents who simply want a Kenyan teacher their child relates to",
            ].map((t) => (
              <Card key={t}>
                <CardContent className="p-5 flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm" dangerouslySetInnerHTML={{ __html: t }} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Curricula */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl font-bold mb-8 text-center">Curricula covered</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {["CBC", "KCSE (8-4-4)", "IGCSE", "A-Levels", "IB"].map((c) => (
              <div key={c} className="bg-card border rounded-lg p-4 text-center font-medium">
                {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">FAQs from diaspora families</h2>
          <div className="space-y-4">
            {faqSchema.mainEntity.map((f: any) => (
              <Card key={f.name}>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">{f.name}</h3>
                  <p className="text-muted-foreground">{f.acceptedAnswer.text}</p>
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
          <h2 className="text-3xl font-bold mb-4">Get matched with a Kenyan tutor</h2>
          <p className="mb-8 text-primary-foreground/90">
            Book a free assessment call. We'll match your child with the right verified Kenyan tutor within 48 hours, in your timezone.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link to="/book-consultation">Book Free Assessment Call</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Diaspora;

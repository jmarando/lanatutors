import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { CheckCircle, Globe, ShieldCheck, GraduationCap, Clock } from "lucide-react";

const Diaspora = () => {
  const canonical = "https://lanatutors.africa/diaspora";

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Online tutoring for African students abroad",
    provider: {
      "@type": "EducationalOrganization",
      name: "Lana Tutors",
      url: "https://lanatutors.africa",
    },
    areaServed: ["United Kingdom", "United States", "Canada", "Australia", "United Arab Emirates", "Qatar", "South Africa"],
    description:
      "Online tutoring with verified Kenyan teachers for African and Kenyan diaspora families. KCSE, CBC, IGCSE, IB and American curricula.",
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "Do you offer tutoring for Kenyan students living abroad?", acceptedAnswer: { "@type": "Answer", text: "Yes. Lana connects Kenyan diaspora families in the UK, US, Canada, Australia, UAE and beyond with verified Kenyan tutors for online one-on-one lessons across KCSE, CBC, IGCSE, IB and American curricula." } },
      { "@type": "Question", name: "How do timezones work?", acceptedAnswer: { "@type": "Answer", text: "Tutors offer flexible hours from 6 AM to 10 PM East Africa Time (EAT) — that covers comfortable evening or weekend slots for families in the UK, Europe, the Middle East, North America and Australia." } },
      { "@type": "Question", name: "Can I pay in USD, GBP or EUR?", acceptedAnswer: { "@type": "Answer", text: "Yes. We bill in USD, GBP, EUR, KES, TZS and UGX. Pricing is shown in your local currency at checkout and processed securely via Pesapal." } },
      { "@type": "Question", name: "Will my child be taught the curriculum they sit at school?", acceptedAnswer: { "@type": "Answer", text: "Yes. We match every student to a tutor who specialises in their exact curriculum — whether that's CBC, KCSE 8-4-4, IGCSE (Cambridge), IB or American — at the right level." } },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Online Tutors for Kenyans &amp; Africans Abroad"
        description="Online tutoring for Kenyan and African diaspora families in the UK, US, Canada, Australia and the UAE. Verified Kenyan teachers for KCSE, CBC, IGCSE, IB and American curricula."
        keywords="tutoring for african students abroad, online tutoring for african students, kenyan tutors uk, kcse tutors worldwide, kenyan tutors diaspora, online tutors for kenyans abroad"
        canonical={canonical}
        structuredData={orgSchema}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-background py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <Badge className="mb-4">For Kenyans &amp; Africans abroad</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Online Tutors for African Students Abroad
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto">
            Kenyan and African families in the UK, US, Canada, Australia and the UAE trust Lana to connect their children with verified Kenyan teachers — for KCSE, CBC, IGCSE, IB and American curricula, taught one-on-one online.
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

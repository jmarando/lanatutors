import { useParams, Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { CheckCircle, GraduationCap, Star, ShieldCheck } from "lucide-react";

interface SubjectContent {
  slug: string;
  name: string;
  title: string;
  description: string;
  intro: string;
  curricula: string[];
  topics: string[];
  faqs: { q: string; a: string }[];
}

const SUBJECTS: Record<string, SubjectContent> = {
  mathematics: {
    slug: "mathematics",
    name: "Mathematics",
    title: "Mathematics Tutors in Kenya — CBC, KCSE, IGCSE & IB",
    description:
      "Verified Kenyan mathematics tutors for CBC, KCSE, IGCSE and IB students. Online one-on-one lessons from qualified maths teachers.",
    intro:
      "Whether your child is preparing for KCSE Paper 1 and 2, sitting IGCSE Mathematics (0580), tackling IB Maths AA/AI, or building number fluency in CBC — Lana matches you with verified Kenyan maths tutors who teach the curriculum your child sits.",
    curricula: ["CBC Mathematics", "KCSE Mathematics (8-4-4)", "IGCSE Mathematics 0580 / 0607", "IB Mathematics AA & AI"],
    topics: [
      "Algebra & equations",
      "Geometry & trigonometry",
      "Calculus (differentiation & integration)",
      "Statistics & probability",
      "Number & operations",
      "Vectors & matrices",
      "Past paper practice",
      "Exam technique & timing",
    ],
    faqs: [
      {
        q: "How much do maths tutors in Kenya cost?",
        a: "Mathematics tutoring on Lana starts from KES 1,500 per hour for primary CBC and goes up to KES 3,500 per hour for IB Higher Level Mathematics.",
      },
      {
        q: "Can my tutor help with KCSE past papers?",
        a: "Yes. Most of our maths tutors are KCSE markers or experienced classroom teachers who run structured past-paper sessions and exam-technique drills.",
      },
      {
        q: "Do you have IB Mathematics AA and AI tutors?",
        a: "Yes. We have specialists for both Analysis & Approaches and Applications & Interpretation, at SL and HL.",
      },
    ],
  },
  chemistry: {
    slug: "chemistry",
    name: "Chemistry",
    title: "Chemistry Tutors in Kenya — KCSE, IGCSE & IB Chemistry",
    description:
      "Online chemistry tutors in Kenya for KCSE, IGCSE 0620, and IB Chemistry. Verified Kenyan teachers offering one-on-one lessons.",
    intro:
      "From mole calculations and organic mechanisms to electrochemistry and equilibria — our Kenyan chemistry tutors break down the toughest topics with worked examples and exam-style practice.",
    curricula: ["KCSE Chemistry (8-4-4)", "IGCSE Chemistry 0620", "IB Chemistry SL & HL"],
    topics: [
      "Atomic structure & bonding",
      "Stoichiometry & moles",
      "Acids, bases & salts",
      "Organic chemistry",
      "Electrochemistry",
      "Equilibria & kinetics",
      "Practical & ATP preparation",
      "Past paper practice",
    ],
    faqs: [
      {
        q: "Can chemistry tutors help with KCSE Paper 3 (practical)?",
        a: "Yes — many of our tutors are practising school chemistry teachers who walk students through Paper 3 procedures, observations, and calculations.",
      },
      {
        q: "Do you offer IB Chemistry IA support?",
        a: "Yes. Our IB chemistry tutors support Internal Assessment design, data analysis, and write-up.",
      },
    ],
  },
  physics: {
    slug: "physics",
    name: "Physics",
    title: "Physics Tutors in Kenya — KCSE, IGCSE & IB Physics",
    description:
      "Find verified Kenyan physics tutors for KCSE, IGCSE 0625, and IB Physics. Online one-on-one tutoring with qualified teachers.",
    intro:
      "Physics rewards strong fundamentals and structured problem solving. Our Kenyan physics tutors build both — mechanics, electricity, waves, modern physics — with curriculum-specific past-paper drills.",
    curricula: ["KCSE Physics (8-4-4)", "IGCSE Physics 0625", "IB Physics SL & HL"],
    topics: [
      "Mechanics & motion",
      "Electricity & magnetism",
      "Waves & optics",
      "Thermodynamics",
      "Modern & nuclear physics",
      "Practical skills",
      "Numerical problem solving",
      "Past paper practice",
    ],
    faqs: [
      {
        q: "Are tutors familiar with KCSE Physics Paper 3 practicals?",
        a: "Yes. Tutors are experienced KCSE teachers who guide students through Paper 3 setups, readings, and graph work.",
      },
    ],
  },
  biology: {
    slug: "biology",
    name: "Biology",
    title: "Biology Tutors in Kenya — KCSE, IGCSE & IB Biology",
    description:
      "Online biology tutors in Kenya for KCSE, IGCSE 0610, and IB Biology. Verified Kenyan teachers, one-on-one lessons.",
    intro:
      "From cell biology and genetics to ecology and human physiology — our Kenyan biology tutors help students understand mechanisms, master terminology, and write exam answers that score full marks.",
    curricula: ["KCSE Biology (8-4-4)", "IGCSE Biology 0610", "IB Biology SL & HL"],
    topics: [
      "Cell biology",
      "Genetics & evolution",
      "Human physiology",
      "Plant biology",
      "Ecology & ecosystems",
      "Classification",
      "Practical & ATP preparation",
      "Past paper practice",
    ],
    faqs: [
      {
        q: "Can tutors help with diagrams and biological drawings?",
        a: "Yes — exam-quality biological drawings and labelling are part of how our tutors prepare students for KCSE and IGCSE practicals.",
      },
    ],
  },
  english: {
    slug: "english",
    name: "English",
    title: "English Tutors in Kenya — KCSE, IGCSE & IB English",
    description:
      "Verified Kenyan English tutors for KCSE, IGCSE First Language English, and IB English. Online one-on-one lessons.",
    intro:
      "Whether the focus is comprehension, composition, set books, or analytical essays — our Kenyan English tutors strengthen reading, writing, and exam-response skills across every major curriculum.",
    curricula: [
      "KCSE English (8-4-4)",
      "IGCSE First Language English 0500",
      "IGCSE English as a Second Language 0510",
      "IB English A & B",
    ],
    topics: [
      "Comprehension & summary",
      "Composition & creative writing",
      "Functional writing",
      "Grammar & usage",
      "Set books & literature",
      "Poetry analysis",
      "Essay structure",
      "Past paper practice",
    ],
    faqs: [
      {
        q: "Do tutors cover the current KCSE set books?",
        a: "Yes. Our English literature tutors prepare students on the current KCSE set books with theme analysis, character study, and essay practice.",
      },
    ],
  },
};

const SubjectLanding = () => {
  const { subject } = useParams<{ subject: string }>();
  const data = subject ? SUBJECTS[subject.toLowerCase()] : undefined;

  if (!data) {
    return <Navigate to="/tutors" replace />;
  }

  const canonical = `https://lanatutors.africa/subjects/${data.slug}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: `${data.name} Tutoring`,
    description: data.description,
    provider: {
      "@type": "EducationalOrganization",
      name: "Lana Tutors",
      url: "https://lanatutors.africa",
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={data.title}
        description={data.description}
        keywords={`${data.name.toLowerCase()} tutors kenya, online ${data.name.toLowerCase()} tutor, kcse ${data.name.toLowerCase()} tutor, igcse ${data.name.toLowerCase()} tutor, ib ${data.name.toLowerCase()} tutor`}
        canonical={canonical}
        structuredData={structuredData}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-background py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <Badge className="mb-4">Verified Kenyan tutors</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            {data.name} Tutors in Kenya
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto">
            {data.intro}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg">
              <Link to={`/tutors?subject=${encodeURIComponent(data.name)}`}>
                Browse {data.name} Tutors
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/book-consultation">Free Assessment Call</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-10 border-y bg-card">
        <div className="container mx-auto px-4 max-w-5xl grid grid-cols-3 gap-6 text-center">
          {[
            { icon: ShieldCheck, label: "Verified tutors" },
            { icon: GraduationCap, label: "Curriculum specialists" },
            { icon: Star, label: "Parent-rated" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <Icon className="h-7 w-7 text-primary" />
              <p className="text-sm font-medium">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Curricula */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl font-bold mb-8 text-center">
            Curricula we cover
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {data.curricula.map((c) => (
              <Card key={c}>
                <CardContent className="p-5 flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="font-medium">{c}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Topics */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl font-bold mb-8 text-center">
            What our {data.name.toLowerCase()} tutors cover
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.topics.map((t) => (
              <div
                key={t}
                className="bg-card border rounded-lg p-4 text-center text-sm font-medium"
              >
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">
            {data.name} tutoring — FAQs
          </h2>
          <div className="space-y-4">
            {data.faqs.map((f) => (
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
          <h2 className="text-3xl font-bold mb-4">
            Get matched with a {data.name.toLowerCase()} tutor
          </h2>
          <p className="mb-8 text-primary-foreground/90">
            Book a free assessment call and we'll match your child with the
            right verified Kenyan tutor within 48 hours.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link to="/book-consultation">Book Free Assessment Call</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default SubjectLanding;

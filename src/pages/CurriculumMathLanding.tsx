import { useParams, Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { CheckCircle, GraduationCap, Star, ShieldCheck } from "lucide-react";

interface CurriculumMath {
  slug: string;
  path: string;
  curriculum: string;
  title: string;
  description: string;
  answer: string; // answer-first paragraph for AI / featured snippets
  intro: string;
  levels: string[];
  topics: string[];
  papers: string[];
  faqs: { q: string; a: string }[];
}

const DATA: Record<string, CurriculumMath> = {
  "kcse-mathematics-tutors": {
    slug: "kcse-mathematics-tutors",
    path: "/kcse-mathematics-tutors",
    curriculum: "KCSE",
    title: "KCSE Mathematics Tutors in Kenya — Paper 1 & Paper 2 Prep",
    description:
      "Verified KCSE Mathematics tutors in Kenya. One-on-one Paper 1 & Paper 2 preparation with experienced KCSE markers and classroom teachers.",
    answer:
      "Lana Tutors matches Kenyan students with verified KCSE Mathematics tutors — most of whom are practising classroom teachers or KCSE markers. Lessons run online over Google Meet or in-person in Nairobi, with structured Paper 1 and Paper 2 preparation, past-paper drills, and personalised marking. Rates start from KES 1,800 per hour.",
    intro:
      "KCSE Mathematics rewards mastery of fundamentals plus disciplined exam technique. Our KCSE Maths tutors cover Form 1–4 in depth, run timed Paper 1 and Paper 2 practice, and walk students through past-paper marking schemes.",
    levels: ["Form 1", "Form 2", "Form 3", "Form 4 (KCSE candidates)"],
    topics: [
      "Algebra & equations", "Quadratic expressions", "Trigonometry", "Three-dimensional geometry",
      "Calculus (differentiation & integration)", "Statistics", "Probability", "Vectors", "Matrices & transformations",
      "Linear programming", "Loci", "Past paper drills",
    ],
    papers: [
      "Paper 1 — Pure maths, short structured questions (2.5 hrs)",
      "Paper 2 — Longer applications, calculus, statistics (2.5 hrs)",
    ],
    faqs: [
      { q: "How much do KCSE Mathematics tutors cost?", a: "KCSE Mathematics tutoring on Lana starts from KES 1,800/hr for Form 1–2 and KES 2,200–2,800/hr for Form 3–4 KCSE candidates." },
      { q: "Are tutors KCSE markers?", a: "Many are. We prioritise tutors who have marked KCSE Mathematics or teach the subject in Kenyan secondary schools." },
      { q: "Can my child get Paper 1 & Paper 2 mock practice?", a: "Yes. Tutors run timed Paper 1 and Paper 2 mocks with full marking-scheme feedback." },
      { q: "Do you offer KCSE Mathematics holiday intensives?", a: "Yes — small-group KCSE Maths intensives run during April, August and December school holidays." },
    ],
  },
  "igcse-mathematics-tutors": {
    slug: "igcse-mathematics-tutors",
    path: "/igcse-mathematics-tutors",
    curriculum: "IGCSE",
    title: "IGCSE Mathematics Tutors — 0580 & 0607 (Online, Worldwide)",
    description:
      "Verified IGCSE Mathematics tutors for Cambridge 0580 (Extended/Core) and 0607 International Mathematics. Online one-on-one lessons.",
    answer:
      "Lana Tutors connects IGCSE students with verified mathematics tutors specialising in Cambridge 0580 (Core and Extended) and 0607 International Mathematics. Lessons are delivered online over Google Meet by Kenyan teachers with international-school experience. Rates start from KES 2,200 per hour (≈ USD 17 / GBP 13).",
    intro:
      "IGCSE Mathematics 0580 splits into Core (grades C–G) and Extended (A*–E). Our tutors place your child on the right tier, then run structured topic teaching, past-paper practice on Papers 1–4, and dedicated work on the harder Extended-only topics.",
    levels: ["Year 10", "Year 11 (IGCSE candidates)"],
    topics: [
      "Number & algebra", "Mensuration", "Coordinate geometry", "Trigonometry",
      "Vectors & transformations", "Probability & statistics", "Functions",
      "Differentiation (Extended only)", "Past paper practice (0580 & 0607)",
    ],
    papers: [
      "0580 Paper 1 / 3 — Core / Extended short questions",
      "0580 Paper 2 / 4 — Core / Extended structured questions",
      "0607 — International Mathematics (calculator + non-calculator)",
    ],
    faqs: [
      { q: "Do you tutor both 0580 Core and Extended?", a: "Yes — and we'll help you decide which tier is right for your child based on a diagnostic." },
      { q: "Can tutors help with IGCSE Mathematics 0607?", a: "Yes. We have specialists for Cambridge 0607 International Mathematics at Core and Extended." },
      { q: "Are lessons online?", a: "Yes — IGCSE lessons run online via Google Meet so diaspora and international families can join from any timezone." },
    ],
  },
  "ib-mathematics-tutors": {
    slug: "ib-mathematics-tutors",
    path: "/ib-mathematics-tutors",
    curriculum: "IB",
    title: "IB Mathematics Tutors — AA & AI, SL & HL (Online)",
    description:
      "IB Mathematics tutors for Analysis & Approaches (AA) and Applications & Interpretation (AI), SL and HL. One-on-one online lessons.",
    answer:
      "Lana Tutors provides IB Mathematics tutors across both Analysis & Approaches (AA) and Applications & Interpretation (AI), at Standard Level and Higher Level. Tutors support IB content teaching, Internal Assessment (IA) design and write-up, and timed Paper 1, 2, and 3 (HL) practice. Online one-on-one lessons from KES 2,800 per hour (≈ USD 22).",
    intro:
      "IB Maths splits into AA (more pure, calculus-heavy) and AI (more applied, statistics-heavy), each at SL and HL. Our IB Maths tutors are familiar with both routes, GDC use, and the IA — the 20% of the grade most often left to the last minute.",
    levels: ["DP1", "DP2", "IB Maths SL", "IB Maths HL"],
    topics: [
      "Number & algebra", "Functions", "Geometry & trigonometry", "Statistics & probability",
      "Calculus (AA-focused)", "Modelling (AI-focused)", "Graphing calculator (GDC) skills",
      "Internal Assessment (IA) support", "Past paper practice (P1, P2, P3 HL)",
    ],
    papers: [
      "Paper 1 — No GDC (AA) / GDC allowed (AI)",
      "Paper 2 — GDC required",
      "Paper 3 — HL only, problem-solving",
      "Internal Assessment (IA) — 20% of final grade",
    ],
    faqs: [
      { q: "Do you tutor both AA and AI?", a: "Yes. We have specialists for Analysis & Approaches and for Applications & Interpretation, at SL and HL." },
      { q: "Can tutors help with the IB Maths IA?", a: "Yes — IA topic choice, data collection, mathematical processes, and write-up against the IB criteria." },
      { q: "Do tutors use a GDC (graphing calculator)?", a: "Yes. Tutors work with TI-84 Plus CE and TI-Nspire CX models commonly used in IB schools." },
    ],
  },
  "cbc-mathematics-tutors": {
    slug: "cbc-mathematics-tutors",
    path: "/cbc-mathematics-tutors",
    curriculum: "CBC",
    title: "CBC Mathematics Tutors in Kenya — Grade 1 to Grade 9",
    description:
      "Verified Kenyan CBC Mathematics tutors for Grade 1–9. Online and in-person one-on-one lessons aligned with the KICD CBC curriculum.",
    answer:
      "Lana Tutors offers verified CBC Mathematics tutors for Grade 1 through Grade 9, aligned with the KICD CBC curriculum. Lessons are project-based and competency-focused, delivered online over Google Meet or in-person in Nairobi. Rates start from KES 1,500 per hour for Lower Primary.",
    intro:
      "CBC Mathematics is competency-based — your child is assessed on what they can do, not just what they remember. Our CBC Maths tutors build numeracy from Lower Primary through to Junior Secondary, using projects, real-world tasks and KICD-aligned activities.",
    levels: ["Lower Primary (Grade 1–3)", "Upper Primary (Grade 4–6)", "Junior Secondary (Grade 7–9)"],
    topics: [
      "Numbers & operations", "Measurement", "Geometry", "Algebra (JSS)",
      "Data handling & statistics", "Money & financial literacy", "Problem solving", "End-of-term assessments",
    ],
    papers: [
      "Formative assessments (school-based)",
      "Grade 6 KPSEA preparation",
      "Grade 9 KJSEA preparation",
    ],
    faqs: [
      { q: "Are tutors familiar with the KICD CBC syllabus?", a: "Yes. Our CBC tutors teach to the KICD-designed CBC curriculum and use CBC textbooks and learner activities." },
      { q: "Can my child get KPSEA (Grade 6) or KJSEA (Grade 9) prep?", a: "Yes. We run focused KPSEA and KJSEA preparation in the final term before the assessment." },
      { q: "Are lessons in-person or online?", a: "Both — online via Google Meet, or in-person in Nairobi for younger learners who do better face-to-face." },
    ],
  },
};

const CurriculumMathLanding = ({ slugOverride }: { slugOverride?: string }) => {
  const params = useParams<{ slug?: string }>();
  const slug = slugOverride || params.slug;
  const data = slug ? DATA[slug] : undefined;

  if (!data) return <Navigate to="/subjects/mathematics" replace />;

  const canonical = `https://lanatutors.africa${data.path}`;

  const courseSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: `${data.curriculum} Mathematics Tutoring`,
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

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://lanatutors.africa/" },
      { "@type": "ListItem", position: 2, name: "Mathematics", item: "https://lanatutors.africa/subjects/mathematics" },
      { "@type": "ListItem", position: 3, name: `${data.curriculum} Mathematics`, item: canonical },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={data.title}
        description={data.description}
        keywords={`${data.curriculum.toLowerCase()} mathematics tutor, ${data.curriculum.toLowerCase()} maths tutor kenya, ${data.curriculum.toLowerCase()} math tuition, online ${data.curriculum.toLowerCase()} maths tutor`}
        canonical={canonical}
        structuredData={courseSchema}
      />

      {/* Answer-first hero (AI / featured-snippet bait) */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-background py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <Badge className="mb-4">{data.curriculum} • Mathematics</Badge>
          <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            {data.curriculum} Mathematics Tutors
          </h1>
          <p className="text-lg md:text-xl text-foreground/90 mb-6 leading-relaxed font-medium">
            {data.answer}
          </p>
          <p className="text-base text-muted-foreground mb-8 max-w-3xl">
            {data.intro}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg">
              <Link to={`/tutors?subject=Mathematics&curriculum=${encodeURIComponent(data.curriculum)}`}>
                Browse {data.curriculum} Maths Tutors
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/book-consultation">Free Assessment Call</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-10 border-y bg-card">
        <div className="container mx-auto px-4 max-w-5xl grid grid-cols-3 gap-6 text-center">
          {[
            { icon: ShieldCheck, label: "Verified Kenyan tutors" },
            { icon: GraduationCap, label: `${data.curriculum} specialists` },
            { icon: Star, label: "Parent-rated" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <Icon className="h-7 w-7 text-primary" />
              <p className="text-sm font-medium">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl font-bold mb-8 text-center">Levels we cover</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {data.levels.map((l) => (
              <Card key={l}>
                <CardContent className="p-5 flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="font-medium">{l}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl font-bold mb-8 text-center">Topics covered</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.topics.map((t) => (
              <div key={t} className="bg-card border rounded-lg p-4 text-center text-sm font-medium">
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">Exam structure</h2>
          <div className="space-y-3">
            {data.papers.map((p) => (
              <Card key={p}>
                <CardContent className="p-5 flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p>{p}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">FAQs</h2>
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
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
        </div>
      </section>

      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-4">
            Get matched with a {data.curriculum} maths tutor
          </h2>
          <p className="mb-8 text-primary-foreground/90">
            Book a free 30-minute assessment call. We'll diagnose where your child is and match them to the right verified tutor within 48 hours.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link to="/book-consultation">Book Free Assessment Call</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default CurriculumMathLanding;

import { useParams, Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { RelatedLinks } from "@/components/RelatedLinks";
import { MATHS_CURRICULUM_LINKS, PLACE_LINKS, SUBJECT_LINKS, type SiteLinkGroup } from "@/data/siteLinks";
import { CheckCircle, GraduationCap, Star, ShieldCheck, PhoneCall, UserCheck, Video, Wallet } from "lucide-react";

interface SubjectContent {
  slug: string;
  name: string;
  title: string;
  description: string;
  /** The meta keywords, when the default (which names KCSE, IGCSE and IB) does not fit the subject. */
  keywords?: string;
  intro: string;
  /** Two short paragraphs on how tutors help, written for this subject. */
  overview: string[];
  curricula: string[];
  topics: string[];
  faqs: { q: string; a: string }[];
}

const SUBJECTS: Record<string, SubjectContent> = {
  mathematics: {
    slug: "mathematics",
    name: "Mathematics",
    title: "Mathematics Tutors in Kenya — KCSE, IGCSE & IB",
    description:
      "Verified Kenyan maths tutors for CBC, KCSE, IGCSE and IB, including KCSE markers. One-on-one online lessons. Free call with a learning coordinator.",
    intro:
      "Whether your child is preparing for KCSE Paper 1 and 2, sitting IGCSE Mathematics (0580), tackling IB Maths AA/AI, or building number fluency in CBC — Lana matches you with verified Kenyan maths tutors who teach the curriculum your child sits.",
    overview: [
      "Maths is the subject families ask us about most, from Grade 4 learners building number sense to Form 4 candidates aiming for an A. Our tutors start by finding the gaps behind a weak mark, which are often fractions, algebra or reading a word problem rather than the topic on this week's test.",
      "In exam years, lessons follow the paper your child will sit: KCSE Mathematics Paper 1 and Paper 2, Cambridge IGCSE Mathematics (0580) or International Mathematics (0607), or IB Mathematics: Analysis and Approaches or Applications and Interpretation. CBC learners (the curriculum is now also called CBE) get help with the strands for their grade, and Senior School students with Core or Essential Mathematics.",
    ],
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
        a: "It depends on the curriculum and level, from primary CBC to IB Higher Level. Book a free assessment call and a learning coordinator will recommend a tutor and walk you through pricing.",
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
    title: "Chemistry Tutors in Kenya — KCSE, IGCSE & IB",
    description:
      "Online chemistry tutors in Kenya for KCSE, IGCSE 0620, and IB Chemistry. Verified Kenyan teachers offering one-on-one lessons.",
    intro:
      "From mole calculations and organic mechanisms to electrochemistry and equilibria — our Kenyan chemistry tutors break down the toughest topics with worked examples and exam-style practice.",
    overview: [
      "Chemistry marks usually turn on a few skills: writing and balancing equations, mole calculations, and explaining observations in the right terms. Our chemistry tutors teach these directly and practise them on exam-style questions until they become routine.",
      "KCSE candidates prepare for the two theory papers and the Paper 3 practical, including observations, inferences and titration calculations. IGCSE students follow Chemistry (0620), and IB students Chemistry SL or HL with support for the Internal Assessment. Junior School learners meet chemistry inside Integrated Science, and Senior School students in the STEM pathway take it as a subject of its own.",
    ],
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
    title: "Physics Tutors in Kenya — KCSE, IGCSE & IB",
    description:
      "Find verified Kenyan physics tutors for KCSE, IGCSE 0625, and IB Physics. Online one-on-one tutoring with qualified teachers.",
    intro:
      "Physics rewards strong fundamentals and structured problem solving. Our Kenyan physics tutors build both — mechanics, electricity, waves, modern physics — with curriculum-specific past-paper drills.",
    overview: [
      "Physics asks students to turn a situation into a law, an equation and units, and then into a number they can trust. Our physics tutors work through that process step by step, so students know which idea applies and why, instead of hunting for a formula that fits.",
      "KCSE candidates prepare for the two theory papers and the Paper 3 practical, with practice on taking readings, recording them in tables and drawing graphs. IGCSE students follow Physics (0625) and IB students Physics SL or HL. Junior School learners cover physics topics within Integrated Science before taking physics in the Senior School STEM pathway.",
    ],
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
    title: "Biology Tutors in Kenya — KCSE, IGCSE & IB",
    description:
      "Online biology tutors in Kenya for KCSE, IGCSE 0610, and IB Biology. Verified Kenyan teachers, one-on-one lessons.",
    intro:
      "From cell biology and genetics to ecology and human physiology — our Kenyan biology tutors help students understand mechanisms, master terminology, and write exam answers that score full marks.",
    overview: [
      "Biology is heavy on terms and processes, and marks go to precise wording: osmosis rather than 'water moving', a labelled drawing rather than a rough sketch. Our biology tutors help students learn the vocabulary, link each structure to its function and answer in the form examiners reward.",
      "KCSE candidates prepare for the two theory papers and the Paper 3 practical, including biological drawings and food tests. IGCSE students follow Biology (0610) and IB students Biology SL or HL. Junior School learners cover biology topics within Integrated Science.",
    ],
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
    title: "English Tutors in Kenya — KCSE, IGCSE & IB",
    description:
      "Verified Kenyan English tutors for KCSE, IGCSE First Language English, and IB English. Online one-on-one lessons.",
    intro:
      "Whether the focus is comprehension, composition, set books, or analytical essays — our Kenyan English tutors strengthen reading, writing, and exam-response skills across every major curriculum.",
    overview: [
      "Strong English lifts every other subject, because science and humanities questions are read and answered in English. Our English tutors work on reading comprehension, grammar and writing that is clear, organised and correctly punctuated.",
      "KCSE candidates prepare for all three English papers, including essays on the set texts. IGCSE students prepare for First Language English (0500) or English as a Second Language (0510), and IB students for English A or English B. Younger CBC learners build reading fluency, vocabulary and composition skills.",
    ],
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
  kiswahili: {
    slug: "kiswahili",
    name: "Kiswahili",
    title: "Kiswahili Tutors in Kenya — KCSE, CBC & IB",
    description:
      "Verified Kenyan Kiswahili tutors for KCSE, CBC, IGCSE and IB. Online one-on-one Kiswahili lessons with qualified teachers.",
    intro:
      "From insha and ufahamu to fasihi simulizi and isimu jamii — our native Kiswahili tutors strengthen reading, writing, and exam responses across CBC, KCSE and IB Kiswahili.",
    overview: [
      "Kiswahili is a compulsory subject for most Kenyan learners, and many who speak it every day still lose marks on insha structure, sarufi and fasihi. Our tutors are native speakers, and most are practising Kiswahili teachers.",
      "For KCSE, lessons cover all three papers, Insha (Karatasi ya Kwanza), Lugha (Karatasi ya Pili) and Fasihi (Karatasi ya Tatu), including the current set books. CBC learners work on kusoma, kuandika and sarufi for their grade, and IB students on Kiswahili A or B.",
    ],
    curricula: ["CBC Kiswahili", "KCSE Kiswahili (8-4-4)", "IB Kiswahili A & B"],
    topics: ["Ufahamu", "Insha", "Sarufi", "Fasihi (Riwaya, Tamthilia, Ushairi)", "Isimu jamii", "Methali & Misemo", "Mazungumzo", "Past paper practice"],
    faqs: [
      { q: "Do tutors cover the current KCSE set books (fasihi)?", a: "Yes. Our Kiswahili tutors prepare students on the current KCSE set texts with uchambuzi wa wahusika, dhamira na maudhui." },
      { q: "Are tutors native Kiswahili speakers?", a: "Yes — all our Kiswahili tutors are native speakers and most are practising classroom Kiswahili teachers in Kenya." },
    ],
  },
  "business-studies": {
    slug: "business-studies",
    name: "Business Studies",
    title: "KCSE & IGCSE Business Studies Tutors in Kenya",
    description:
      "Online Business Studies tutors in Kenya for KCSE and IGCSE Business. Verified Kenyan teachers, one-on-one lessons.",
    intro:
      "From business environment and forms of ownership to accounting, finance, and marketing — our Business Studies tutors break down theory with Kenyan case studies and exam-style practice.",
    overview: [
      "Business Studies rewards students who can apply an idea to a real case: why a sole trader might take a loan, or how a business decides where to locate. Our tutors use Kenyan examples, from M-Pesa agents to supermarkets, to make the theory concrete.",
      "KCSE candidates prepare for both papers, with practice on the question styles and what the marking schemes look for, and IGCSE students follow Business Studies (0450). The same foundations carry into A-Level Business and beyond.",
    ],
    curricula: ["KCSE Business Studies (8-4-4)", "IGCSE Business Studies 0450", "A-Level Business"],
    topics: ["Business environment", "Forms of business ownership", "Production", "Marketing", "Finance & accounting", "Office practice", "Government & business", "Past paper practice"],
    faqs: [
      { q: "Do tutors cover the KCSE Business Studies syllabus in full?", a: "Yes — Form 1 through Form 4, with focus on KCSE Paper 1 and Paper 2 patterns and marking schemes." },
    ],
  },
  "computer-studies": {
    slug: "computer-studies",
    name: "Computer Studies",
    title: "Computer Studies & ICT Tutors in Kenya",
    description:
      "Verified Kenyan Computer Studies and ICT tutors for KCSE, IGCSE and CBC. Online one-on-one lessons.",
    intro:
      "From programming and data processing to networking, spreadsheets and databases — our Computer Studies tutors prepare students for KCSE Computer Studies, IGCSE ICT 0417 and CBC Computer Science.",
    overview: [
      "Computer Studies mixes theory, from how data is represented to how networks work, with practical skills in spreadsheets, databases and programming. Our tutors teach both, at the keyboard where that helps, so students can explain an idea and also use it.",
      "KCSE candidates prepare for the theory and practical papers and get guidance on the project. IGCSE students follow Computer Science (0478) or ICT (0417), and CBC learners get help with the computer science topics for their grade.",
    ],
    curricula: ["KCSE Computer Studies (8-4-4)", "IGCSE ICT 0417", "IGCSE Computer Science 0478", "CBC Computer Science"],
    topics: ["Programming (Pascal, Python)", "Spreadsheets", "Databases", "Word processing", "Networking & internet", "System security", "Data representation", "Past paper practice"],
    faqs: [
      { q: "Do tutors help with the KCSE Computer Studies project?", a: "Yes. Our tutors guide students through the project from design to documentation and presentation." },
    ],
  },
  geography: {
    slug: "geography",
    name: "Geography",
    title: "Geography Tutors in Kenya — KCSE, IGCSE & IB",
    description:
      "Online Geography tutors in Kenya for KCSE, IGCSE 0460, and IB Geography. Verified Kenyan teachers offering one-on-one lessons.",
    intro:
      "From map work and statistical methods to climate, agriculture, industry and population — our Geography tutors strengthen content and exam technique for KCSE, IGCSE and IB Geography.",
    overview: [
      "Geography covers both the physical world, such as weather, landforms and soils, and the human one: farming, industry, population and settlement. Our tutors connect the two with Kenyan and East African examples, which is also what examiners ask for.",
      "KCSE candidates prepare for both papers, including map reading, statistical methods and fieldwork questions. IGCSE students follow Geography (0460), and IB students Geography SL or HL, including the fieldwork Internal Assessment.",
    ],
    curricula: ["KCSE Geography (8-4-4)", "IGCSE Geography 0460", "IB Geography SL & HL"],
    topics: ["Map work", "Statistical methods", "Climate & weather", "Agriculture", "Mining & industry", "Population & settlement", "Field work", "Past paper practice"],
    faqs: [
      { q: "Can tutors help with KCSE Geography field work?", a: "Yes. Our tutors prepare students for KCSE field work questions, including planning, data collection, and reporting." },
    ],
  },
  history: {
    slug: "history",
    name: "History",
    title: "History Tutors in Kenya — KCSE, IGCSE & IB",
    description:
      "Verified Kenyan History tutors for KCSE History & Government, IGCSE and IB History. Online one-on-one lessons.",
    intro:
      "From the development of African societies to constitutional history and international relations — our History tutors prepare students for KCSE History & Government, IGCSE History 0470 and IB History.",
    overview: [
      "History is a subject of arguments backed by evidence. Our tutors help students learn the events and dates, and also explain causes and consequences, weigh sources and write answers that are structured and to the point.",
      "KCSE candidates prepare for both History and Government papers, which together cover Kenyan, African and world history and the study of government. IGCSE students follow History (0470) and IB students History SL or HL.",
    ],
    curricula: ["KCSE History & Government (8-4-4)", "IGCSE History 0470", "IB History SL & HL"],
    topics: ["African history", "Kenyan history & government", "World wars", "Cold War", "International relations", "Constitutional development", "Source-based questions", "Past paper practice"],
    faqs: [
      { q: "Are tutors familiar with the KCSE History and Government papers?", a: "Yes. Our History tutors train students on both KCSE papers, from short answers to planning and writing the longer essay questions." },
    ],
  },
  "integrated-science": {
    slug: "integrated-science",
    name: "Integrated Science",
    title: "Integrated Science Tutors — CBC Grades 7 to 9",
    description:
      "Verified Kenyan tutors for CBC (CBE) Junior School Integrated Science, Grades 7 to 9. One-on-one lessons online or at home in Nairobi.",
    keywords:
      "integrated science tutor kenya, junior school science tutor, grade 7 science tutor, grade 8 science tutor, grade 9 science tutor, cbc integrated science, cbe integrated science, kjsea science revision",
    intro:
      "Integrated Science brings biology, chemistry and physics together for Junior School learners in Grades 7, 8 and 9. Our tutors help your child understand the ideas, carry out and explain investigations, and prepare for school tests and the Grade 9 national assessment.",
    overview: [
      "Junior School is where many learners first meet science as a set of separate ideas: cells and the human body, mixtures and how to separate them, forces, energy and electricity. Our tutors build those foundations carefully, because the Senior School STEM pathway builds directly on them.",
      "Lessons follow your child's grade and textbook, with practice on the kind of questions used in school tests and the Kenya Junior School Education Assessment (KJSEA). Tutors also help with practical work and write-ups: what was done, what was observed and why.",
    ],
    curricula: [
      "CBC (CBE) Grade 7 Integrated Science",
      "CBC (CBE) Grade 8 Integrated Science",
      "CBC (CBE) Grade 9 Integrated Science",
      "Revision for the Grade 9 assessment (KJSEA)",
    ],
    topics: [
      "Scientific investigation",
      "Cells & living things",
      "The human body",
      "Mixtures & separation",
      "Acids, bases & indicators",
      "Force, motion & energy",
      "Electricity",
      "Practical write-ups",
    ],
    faqs: [
      {
        q: "Which grades take Integrated Science?",
        a: "In the CBC, now also called CBE, Integrated Science is a Junior School learning area taken in Grades 7, 8 and 9. In Senior School, students in the STEM pathway go on to study biology, chemistry and physics.",
      },
      {
        q: "Can a tutor help my child prepare for the Grade 9 assessment?",
        a: "Yes. Tutors revise the Grade 7 to 9 content and practise the kinds of questions used in school tests and the Kenya Junior School Education Assessment (KJSEA).",
      },
    ],
  },
};

// The same for every subject; only claims the rest of the site already makes.
const LESSON_STEPS = [
  {
    icon: PhoneCall,
    title: "Free assessment call",
    text: "A 20-minute call with a learning coordinator about your child's level, curriculum and goals.",
  },
  {
    icon: UserCheck,
    title: "A verified tutor",
    text: "We match most families within 48 hours with a teacher who knows the syllabus your child sits.",
  },
  {
    icon: Video,
    title: "Online or at home",
    text: "One-on-one over Google Meet from anywhere, or in person at home in Nairobi. Lessons run between 6 AM and 10 PM East Africa Time.",
  },
  {
    icon: Wallet,
    title: "Simple payment",
    text: "Pay by M-Pesa or card. Families abroad can pay in USD, GBP or EUR.",
  },
];

const relatedGroups = (slug: string): SiteLinkGroup[] => [
  ...(slug === "mathematics" ? [{ title: "Maths by curriculum", links: MATHS_CURRICULUM_LINKS }] : []),
  { title: "More subjects", links: SUBJECT_LINKS },
  { title: "Tutors near you", links: PLACE_LINKS },
];

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
        keywords={
          data.keywords ??
          `${data.name.toLowerCase()} tutors kenya, online ${data.name.toLowerCase()} tutor, kcse ${data.name.toLowerCase()} tutor, igcse ${data.name.toLowerCase()} tutor, ib ${data.name.toLowerCase()} tutor`
        }
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

      {/* Overview */}
      <section className="pt-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold mb-6 text-center">
            How our {data.name.toLowerCase()} tutors help
          </h2>
          <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
            {data.overview.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
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

      {/* How lessons work */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl font-bold mb-8 text-center">How lessons work</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {LESSON_STEPS.map(({ icon: Icon, title, text }) => (
              <Card key={title}>
                <CardContent className="p-5">
                  <Icon className="h-6 w-6 text-primary mb-3" />
                  <h3 className="font-semibold mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-muted/30">
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

      <RelatedLinks
        heading="Explore related tutoring"
        groups={relatedGroups(data.slug)}
        currentPath={`/subjects/${data.slug}`}
      />

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

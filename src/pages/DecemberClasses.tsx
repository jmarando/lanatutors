import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/utils/analytics";
import {
  MIN_STUDENTS_TO_OPEN,
  formatProgramRange,
  formatSlot,
  groupByGrade,
  pickProgram,
  reserveMessage,
  type HolidayClass,
  type HolidayProgram,
} from "@/utils/holidayClasses";
import { whatsappLink } from "@/utils/whatsapp";

// The December holiday classes: small online group classes that open once enough families reserve a seat. The program,
// its dates and its classes come from the database (intensive_programs and intensive_classes), so a new December is a
// new seed and not a new page. The page shows no prices (public pages carry none) and takes no payment: "Reserve a seat"
// opens WhatsApp, where Lana asks for the child's name, grade and subjects and the team notes the seat. The rules the
// page relies on (which program, how dates and slots read, the messages) are in src/utils/holidayClasses.ts, with tests.

type Loaded =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; program: HolidayProgram | null; classes: HolidayClass[] };

const STEPS = [
  {
    title: "Reserve a seat",
    text: "It is free and takes a minute on WhatsApp. Tell us your child's name, grade and the subjects they want.",
  },
  {
    title: "We confirm the class",
    text: `A class runs once at least ${MIN_STUDENTS_TO_OPEN} students have reserved, so the groups stay small. We message you to say which classes are running.`,
  },
  {
    title: "Pay and join",
    text: "You pay only for a class that is running. Once your payment is confirmed, you get the class link.",
  },
];

const FAQS = [
  {
    q: "Does it cost anything to reserve a seat?",
    a: "No. Reserving is free. We send the fee and the payment details only when we confirm that your class is running.",
  },
  {
    q: `What happens if a class does not reach ${MIN_STUDENTS_TO_OPEN} students?`,
    a: "It does not run, and nothing is charged. We offer a free 20-minute assessment call with a learning coordinator instead, to look at one-to-one options.",
  },
  {
    q: "How do the lessons work?",
    a: "Lessons are online. Each subject has 10 lessons of 75 minutes, Monday to Friday over two weeks, in the morning (Nairobi time). Classes are small groups.",
  },
  {
    q: "Who teaches the classes?",
    a: "Verified Lana tutors. We assign the tutor for each class once it is confirmed.",
  },
];

type ReserveProps = {
  label: string;
  message: string;
  ariaLabel?: string;
  variant?: "default" | "secondary" | "outline";
  size?: "default" | "lg";
};

const Reserve = ({ label, message, ariaLabel, variant = "default", size = "default" }: ReserveProps) => (
  <Button asChild variant={variant} size={size}>
    <a
      href={whatsappLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      onClick={() => analytics.whatsappChatClick()}
    >
      {label}
    </a>
  </Button>
);

// Today in Nairobi as YYYY-MM-DD: the day a program is compared against, wherever the visitor is.
const nairobiToday = (): string => {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

const DecemberClasses = () => {
  const [state, setState] = useState<Loaded>({ status: "loading" });

  // Runs in the browser only, after the page has hydrated, so the prerendered HTML and the first render agree.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: programs, error } = await supabase
          .from("intensive_programs")
          .select("id, name, description, start_date, end_date")
          .eq("is_active", true);
        if (error) throw error;
        const program = pickProgram(programs ?? [], nairobiToday());
        if (!program) {
          if (!cancelled) setState({ status: "ready", program: null, classes: [] });
          return;
        }
        const { data: classes, error: classError } = await supabase
          .from("intensive_classes")
          .select("id, subject, curriculum, grade_levels, time_slot, max_students")
          .eq("program_id", program.id)
          .eq("status", "active");
        if (classError) throw classError;
        if (!cancelled) setState({ status: "ready", program, classes: classes ?? [] });
      } catch (error) {
        console.error("December classes: could not load the program", error);
        if (!cancelled) setState({ status: "failed" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const program = state.status === "ready" ? state.program : null;
  const groups = state.status === "ready" ? groupByGrade(state.classes) : [];
  const range = program ? formatProgramRange(program.start_date, program.end_date) : "";

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="December Holiday Classes: Form 3 and Grade 8"
        description="Small online classes for Form 3 and Grade 8 this December: Mathematics, Science and English. Reserve a seat for free; a class runs once 6 students reserve."
        keywords="december holiday classes kenya, holiday classes form 3, grade 8 holiday classes, kcse holiday revision, online holiday classes nairobi"
        canonical="https://lanatutors.africa/december-classes"
      />

      <section className="bg-gradient-to-br from-primary/10 via-background to-background py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">December holiday classes</h1>
          <p className="text-xl md:text-2xl font-medium mb-5">{range || "Two weeks in December, Monday to Friday"}</p>
          <p className="text-lg text-muted-foreground max-w-2xl mb-8">
            Small online classes for students going into their final exam year: Form 3 and Grade 8. Ten lessons of 75 minutes
            per subject, in the morning (Nairobi time).
          </p>
          <Reserve label="Reserve a seat on WhatsApp" message={reserveMessage()} size="lg" />
          <p className="mt-3 text-sm text-muted-foreground">Reserving is free. You pay only when your class is confirmed.</p>
        </div>
      </section>

      <section className="py-14">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold mb-8">How a seat works</h2>
          <ol className="grid gap-8 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span aria-hidden="true" className="block text-4xl font-bold text-primary mb-2">
                  {index + 1}
                </span>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-14 bg-muted/30" aria-labelledby="classes-heading">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 id="classes-heading" className="text-3xl font-bold mb-3">
            Choose your classes
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            Classes run one after another with short breaks, so a child can take more than one subject in a morning.
          </p>

          {state.status === "loading" && (
            <p role="status" className="text-muted-foreground">
              Loading the classes…
            </p>
          )}

          {state.status === "failed" && (
            <Card className="p-6">
              <p className="font-semibold mb-1">The class list did not load</p>
              <p className="text-muted-foreground mb-4">Message us on WhatsApp and we will send you the classes and the times.</p>
              <Reserve label="Message us on WhatsApp" message={reserveMessage()} />
            </Card>
          )}

          {state.status === "ready" && groups.length === 0 && (
            <Card className="p-6">
              <p className="font-semibold mb-1">The class list is being finalised</p>
              <p className="text-muted-foreground mb-4">
                Reserve a seat on WhatsApp and we will confirm which classes are running.
              </p>
              <Reserve label="Reserve a seat on WhatsApp" message={reserveMessage()} />
            </Card>
          )}

          {groups.map((group) => (
            <div key={group.grade} className="mb-10 last:mb-0">
              <h3 className="text-2xl font-semibold">{group.grade}</h3>
              {group.exam && <p className="text-muted-foreground mb-4">Heading for {group.exam}</p>}
              <Card>
                <ul className="divide-y">
                  {group.classes.map((c) => (
                    <li key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6">
                      <p className="font-medium tabular-nums sm:w-44">{formatSlot(c.time_slot)}</p>
                      <div className="flex-1">
                        <p className="text-lg font-semibold">{c.subject}</p>
                        <p className="text-sm text-muted-foreground">
                          Up to {c.max_students} students. Opens when {MIN_STUDENTS_TO_OPEN} reserve.
                        </p>
                      </div>
                      <Reserve
                        label="Reserve a seat"
                        ariaLabel={`Reserve a seat in ${group.grade} ${c.subject}`}
                        message={reserveMessage({ grade: group.grade, subject: c.subject })}
                        variant="outline"
                      />
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          ))}
        </div>
      </section>

      <section className="py-14">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold mb-8">Questions from parents</h2>
          <dl className="space-y-6">
            {FAQS.map((faq) => (
              <div key={faq.q}>
                <dt className="font-semibold mb-1">{faq.q}</dt>
                <dd className="text-muted-foreground">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="py-14 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-3">Hold a seat for your child</h2>
          <p className="mb-8 text-primary-foreground/90">Reserving is free, and nothing is paid until your class is confirmed.</p>
          <Reserve label="Reserve a seat on WhatsApp" message={reserveMessage()} variant="secondary" size="lg" />
        </div>
      </section>
    </div>
  );
};

export default DecemberClasses;

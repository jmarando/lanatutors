// What Lana says without asking the AI. Plain strings and pure functions, with no Deno or network
// calls, so they can be tested without Deno (see supabase/functions/_tests).

export const BOOKING_URL = "https://lanatutors.africa/book-consultation";
export const TUTOR_SIGNUP_URL = "https://lanatutors.africa/become-a-tutor";

// Sent when the AI cannot answer. It doesn't know who is writing, so it asks, and gives a parent and a
// tutor each their own next step.
export const BACKUP_REPLY = [
  "Hi, thanks for reaching out to Lana Tutors. Are you a parent or student looking for a tutor, or a tutor or teacher who would like to join us?",
  "",
  "If you're looking for a tutor, tell us your child's grade or year, the curriculum and the subjects they need help with. Our Learning Coordinator will then call you back, or you can book a free 20-minute assessment call here:",
  BOOKING_URL,
  "",
  "If you'd like to teach with us, please register here:",
  TUTOR_SIGNUP_URL,
].join("\n");

// Sent when someone has only sent attachments. Lana can't open voice notes, photos or files.
export const ATTACHMENT_NOTICE =
  "Thanks for your message. I can't open voice notes, photos or files here, so could you type what you need?";

export type PrefillIntent = "tutor_apply" | "assessment_call" | "learning_plan" | "callback" | "learn_more" | "december_classes";

// What people send when they start a chat from a button instead of typing. The first four, and "december_classes", are the options in
// src/components/WhatsAppChatButton.tsx (a test checks they stay in sync). "learn_more" comes from outside the
// repo, probably a business listing or ad link, and is the most common starter.
const PREFILLED: Record<PrefillIntent, string> = {
  tutor_apply: "Hi Lana Tutors! I'd like to apply to become a tutor.",
  assessment_call: "Hi Lana Tutors! I'd like to book a 20-minute assessment call.",
  learning_plan: "Hi Lana Tutors! I'd like a custom learning plan for my child.",
  callback: "Hi Lana Tutors! Please have a learning coordinator call me back.",
  learn_more: "Hi Lana Tutors! I'd like to learn more about your tutoring services.",
  december_classes: "Hi Lana Tutors! I'd like to reserve a seat in the December holiday classes.",
};

const ASSESSMENT_CALL_REPLY = [
  "Hi there,",
  "",
  "Thank you for reaching out to Lana Tutors! We'd be happy to set up your assessment call.",
  "",
  "Since we may be in different time zones, could you let us know:",
  "",
  "1. Which time zone or country you're in",
  "2. What days and times work best for you",
  "",
  "We look forward to speaking with you.",
].join("\n");

// The team's own wording, taken from the replies they send in the WhatsApp inbox today.
const TEAM_REPLIES: Record<PrefillIntent, string> = {
  tutor_apply: [
    "Hi,",
    "",
    "Thank you for your interest in joining Lana Tutors as a tutor!",
    "",
    "We’d be happy to have you onboard. Please complete your tutor registration using the link below:",
    "",
    TUTOR_SIGNUP_URL,
    "",
    "Once you submit your details, our team will review your application and get back to you with the next steps.",
    "",
    "We look forward to having you join the Lana Tutors community!",
  ].join("\n"),
  // The team answers a learning-plan request the same way as an assessment-call request.
  assessment_call: ASSESSMENT_CALL_REPLY,
  learning_plan: ASSESSMENT_CALL_REPLY,
  // The "December holiday classes" button, and the December page's buttons. It states only what holds whichever two
  // weeks are chosen: no dates, cut-off or price, since none is settled and public pages show no prices. The team notes
  // the seat on the family's timeline, so the reply asks for what they need to do that.
  december_classes: [
    "Hi, thank you for your interest in our December holiday classes.",
    "",
    "We are opening a few small online classes for students going into their final exam year: Form 3 and Grade 8, in Mathematics, Science and English. They run Monday to Friday in the morning (Nairobi time) for two weeks, 10 lessons of 75 minutes per subject.",
    "",
    "Reserving a seat is free, and nothing is paid until we confirm that your class is running. A class runs once at least 6 students have reserved, so the groups stay small.",
    "",
    "To note your seat, please tell us:",
    "",
    "1. Your child's name and grade",
    "2. Which subjects you would like: Mathematics, Science, English",
    "",
    "Our Learning Coordinator will then confirm your seat.",
  ].join("\n"),
  callback:
    "Hi! Absolutely. We’d be happy to arrange a call with our Learning Coordinator. Since we may be in different time zones, could you please share your preferred time for the call so we can coordinate accordingly?",
  // The button text is generic, so tutors write it too: the team's welcome gets one line for them.
  learn_more: [
    "Hello and welcome to Lana Tutors.",
    "",
    "Thank you for reaching out to us.",
    "",
    "We provide personalised online and face-to-face tutoring for learners following the CBC, IGCSE, A-Level, IB, American, AP, and SAT curricula. Our verified tutors from Kenya's top schools are dedicated to helping students build confidence, improve their grades, and achieve their academic goals.",
    "",
    `You can also book a FREE consultation at ${BOOKING_URL}, and our team will guide you through the next steps.`,
    "",
    "We look forward to being part of your child's learning journey!",
    "",
    "If you are a tutor or teacher who would like to join us, please register here:",
    TUTOR_SIGNUP_URL,
  ].join("\n"),
};

// What the "Call me back" button in the chat answers with: the reply the team already sends to the website's call-back
// button.
export const CALLBACK_REPLY = TEAM_REPLIES.callback;

// Ignores case, punctuation and curly apostrophes, since WhatsApp and phone keyboards change them. It
// matches the whole message only: someone who adds their own details gets the AI, not a ready-made reply.
const normalize = (text: string) =>
  text.toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();

// The December page's buttons name the class ("... a seat in Form 3 Mathematics for the December holiday classes."), so
// they cannot be matched whole. They are matched by their shape, and only with a short class name: a parent who writes
// more than that gets the AI. reserveMessage in src/utils/holidayClasses.ts builds them (a test keeps the two in step).
const DECEMBER_CLASS_REQUEST = /^hi lana tutors i'd like to reserve a seat in [a-z0-9' ]{3,60} for the december holiday classes$/;

export function matchPrefill(text: string): { intent: PrefillIntent; reply: string } | null {
  const key = normalize(text);
  const intent: PrefillIntent | undefined =
    (Object.keys(PREFILLED) as PrefillIntent[]).find((i) => normalize(PREFILLED[i]) === key) ??
    (DECEMBER_CLASS_REQUEST.test(key) ? "december_classes" : undefined);
  return intent ? { intent, reply: TEAM_REPLIES[intent] } : null;
}

// A message that is only a hello, in English or Swahili. The real question usually follows within seconds, so
// Lana waits longer before answering one.
const GREETING =
  /^(?:hi+|hey+|hello+|helo|hallo|greetings|greatings|good (?:morning|afternoon|evening|day)|morning|evening|habari(?: yako| yenu)?|jambo|hujambo|mambo|sasa|niaje|salaam?|salamu)(?: (?:there|lana|lana tutors|team|sir|madam|maam))?$/;

export function isGreeting(text: string): boolean {
  return GREETING.test(normalize(text));
}

// Prize and loan scams that reach the number. Deliberately narrow: a wrong guess means a parent gets no
// reply, so it only matches what scams say and a parent has no reason to write.
const SPAM_PATTERNS = [
  /\bcash\s*gift\b/i,
  /\bclaim\s+(your|the|this)\s+(prize|gift|reward|bonus|money)\b/i,
  /\byou(?:'ve|\s+have)?\s+(?:won|been\s+selected)\b/i,
  /\b(?:lottery|jackpot)\b/i,
  /\b(?:quick|instant|fast)\s+loans?\b/i,
  /\b(?:forex|bitcoin|crypto(?:currency)?)\b.*\b(?:invest|profit|returns|trading)\b/i,
];

export function looksLikeSpam(text: string): boolean {
  return SPAM_PATTERNS.some((pattern) => pattern.test(text));
}

// The day after the December classes end (UTC midnight). Until then the AI is told about them, and the website's chat
// button offers them (src/components/WhatsAppChatButton.tsx has the same date; a test checks the two match). Change it
// when the dates are set.
export const DECEMBER_CLASSES_UNTIL = "2026-12-19";

// No dates, fee or link on purpose: the dates and the fee are not settled, and the page may not be live yet.
const DECEMBER_CLASSES_NOTE = [
  "DECEMBER HOLIDAY CLASSES (only while these classes are being sold)",
  "We are opening a few small online group classes for students going into their final exam year: Form 3 and Grade 8, in Mathematics, Science and English. They run Monday to Friday in the mornings, Nairobi time, for two weeks: 10 lessons of 75 minutes per subject.",
  "Reserving a seat is free, and nothing is paid until the team confirms that a class is running. A class runs once at least 6 students have reserved, so the groups stay small. The team confirms the dates, the fee and how to pay when it confirms the class: never quote a price, and do not state exact dates.",
  "If someone asks about these classes or wants a seat, do not follow the assessment-call steps above and do not offer the booking link. Ask for the child's name, their grade and the subjects they want (Mathematics, Science, English). Once you have them, call escalate_to_team with a reason that starts \"December classes seat:\" followed by the child's name, grade and subjects, then reply that we have noted the seat and the Learning Coordinator will confirm which classes are running. If they ask for a grade or subject that is not listed, say the Learning Coordinator will check and note their interest, and still call escalate_to_team.",
].join("\n");

// What is added to the AI's prompt at `now`: the December classes until they end, otherwise nothing.
export function seasonalNotes(now: Date): string {
  return now.getTime() < Date.parse(DECEMBER_CLASSES_UNTIL) ? `\n\n${DECEMBER_CLASSES_NOTE}` : "";
}

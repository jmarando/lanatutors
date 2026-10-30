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

export type PrefillIntent = "tutor_apply" | "assessment_call" | "learning_plan" | "callback" | "learn_more";

// What people send when they start a chat from a button instead of typing. The first four are the options in
// src/components/WhatsAppChatButton.tsx (a test checks they stay in sync). "learn_more" comes from outside the
// repo, probably a business listing or ad link, and is the most common starter.
const PREFILLED: Record<PrefillIntent, string> = {
  tutor_apply: "Hi Lana Tutors! I'd like to apply to become a tutor.",
  assessment_call: "Hi Lana Tutors! I'd like to book a 20-minute assessment call.",
  learning_plan: "Hi Lana Tutors! I'd like a custom learning plan for my child.",
  callback: "Hi Lana Tutors! Please have a learning coordinator call me back.",
  learn_more: "Hi Lana Tutors! I'd like to learn more about your tutoring services.",
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

// Ignores case, punctuation and curly apostrophes, since WhatsApp and phone keyboards change them. It
// matches the whole message only: someone who adds their own details gets the AI, not a ready-made reply.
const normalize = (text: string) =>
  text.toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();

export function matchPrefill(text: string): { intent: PrefillIntent; reply: string } | null {
  const key = normalize(text);
  const intent = (Object.keys(PREFILLED) as PrefillIntent[]).find((i) => normalize(PREFILLED[i]) === key);
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

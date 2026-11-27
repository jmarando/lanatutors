// Links to every public page. The site footer (src/components/SiteFooter.tsx) shows all of them on every page, and the
// page templates reuse the groups for their "related" links, so crawlers that read the raw HTML reach every page.
// supabase/functions/_tests/site-links.test.mjs checks that every page in public/sitemap.xml is listed here.

export interface SiteLink {
  to: string;
  label: string;
}

export interface SiteLinkGroup {
  title: string;
  links: SiteLink[];
}

export const SUBJECT_LINKS: SiteLink[] = [
  { to: "/subjects/mathematics", label: "Mathematics tutors" },
  { to: "/subjects/english", label: "English tutors" },
  { to: "/subjects/kiswahili", label: "Kiswahili tutors" },
  { to: "/subjects/chemistry", label: "Chemistry tutors" },
  { to: "/subjects/physics", label: "Physics tutors" },
  { to: "/subjects/biology", label: "Biology tutors" },
  { to: "/subjects/integrated-science", label: "Integrated Science tutors" },
  { to: "/subjects/business-studies", label: "Business Studies tutors" },
  { to: "/subjects/computer-studies", label: "Computer Studies tutors" },
  { to: "/subjects/geography", label: "Geography tutors" },
  { to: "/subjects/history", label: "History tutors" },
];

export const MATHS_CURRICULUM_LINKS: SiteLink[] = [
  { to: "/cbc-mathematics-tutors", label: "CBC (CBE) maths tutors" },
  { to: "/kcse-mathematics-tutors", label: "KCSE maths tutors" },
  { to: "/igcse-mathematics-tutors", label: "IGCSE maths tutors" },
  { to: "/ib-mathematics-tutors", label: "IB maths tutors" },
];

export const PLACE_LINKS: SiteLink[] = [
  { to: "/tutors-in-kenya", label: "Online tutors in Kenya" },
  { to: "/tutors-in-nairobi", label: "Home tutors in Nairobi" },
  { to: "/tutors-in-mombasa", label: "Tutors in Mombasa" },
  { to: "/tutors-in-kisumu", label: "Tutors in Kisumu" },
];

export const ABROAD_LINKS: SiteLink[] = [
  { to: "/diaspora", label: "Kenyan families abroad" },
  { to: "/kenyan-tutors-uk", label: "Kenyan tutors in the UK" },
  { to: "/kenyan-tutors-usa", label: "Kenyan tutors in the USA" },
  { to: "/tutors-for-african-students-abroad", label: "African students abroad" },
];

export const FOOTER_GROUPS: SiteLinkGroup[] = [
  {
    title: "Find a tutor",
    links: [
      { to: "/tutors", label: "Browse tutors" },
      ...PLACE_LINKS,
      { to: "/group-classes", label: "Group classes" },
      { to: "/december-classes", label: "December holiday classes" },
    ],
  },
  { title: "Subjects", links: SUBJECT_LINKS },
  { title: "Maths by curriculum", links: MATHS_CURRICULUM_LINKS },
  { title: "Families abroad", links: ABROAD_LINKS },
  {
    title: "Lana Tutors",
    links: [
      { to: "/how-it-works", label: "How it works" },
      { to: "/book-consultation", label: "Free assessment call" },
      { to: "/request-learning-plan", label: "Request a learning plan" },
      { to: "/for-students", label: "For students and parents" },
      { to: "/about", label: "About us" },
      { to: "/blog", label: "Blog" },
      { to: "/for-tutors", label: "For tutors" },
      { to: "/become-a-tutor", label: "Become a tutor" },
      { to: "/privacy-policy", label: "Privacy policy" },
    ],
  },
];

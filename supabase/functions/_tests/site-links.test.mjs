// Run with `npm run test:edge`. Every public page must be reachable through links that crawlers read in the raw HTML:
// pages that only the sitemap listed were never crawled by Google. Also the content and small fixes that go with it.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const SITE = "https://lanatutors.africa";

const [sitemap, siteLinks, app, home, subjects, llms, prerender, entry, blogPost, blog, tutorSearch] = await Promise.all(
  [
    "public/sitemap.xml",
    "src/data/siteLinks.ts",
    "src/App.tsx",
    "src/pages/Home.tsx",
    "src/pages/SubjectLanding.tsx",
    "public/llms.txt",
    "scripts/prerender.mjs",
    "src/entry-prerender.tsx",
    "src/pages/BlogPost.tsx",
    "src/pages/Blog.tsx",
    "src/pages/TutorSearch.tsx",
  ].map((path) => read(path).catch(() => "")),
);

const sitemapPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].replace(SITE, "") || "/");
// The homepage is the logo link, and the blog lists its own posts.
const linkedPaths = sitemapPaths.filter((path) => path !== "/" && !path.startsWith("/blog/"));
const footerPaths = [...siteLinks.matchAll(/to:\s*"([^"]+)"/g)].map((match) => match[1]);
const subjectSlugs = [...subjects.matchAll(/^ {2}"?([a-z-]+)"?: \{\n {4}slug:/gm)].map((match) => match[1]);
const appRoutes = [...app.matchAll(/path="([^"]+)"/g)].map((match) => match[1]);

test("every page in the sitemap is linked from the site footer", () => {
  assert.ok(linkedPaths.length > 30, `${linkedPaths.length} sitemap pages`);
  assert.deepEqual(linkedPaths.filter((path) => !footerPaths.includes(path)), []);
});

test("every footer link goes to a page the app has", () => {
  assert.ok(footerPaths.length > 0, "the footer has links");
  for (const path of footerPaths) {
    const subject = path.match(/^\/subjects\/([a-z-]+)$/)?.[1];
    assert.ok(subject ? subjectSlugs.includes(subject) : appRoutes.includes(path), path);
  }
});

test("the footer renders on every public page from the app layout, not inside the homepage", () => {
  assert.match(app, /<SiteFooter \/>/);
  assert.doesNotMatch(home, /<footer/);
});

test("subject, maths curriculum, city, Kenya and abroad pages link to related pages in their content", async () => {
  for (const name of ["SubjectLanding", "CurriculumMathLanding", "CityLanding", "Diaspora", "TutorsInKenya"]) {
    assert.match(await read(`src/pages/${name}.tsx`), /<RelatedLinks\b/, name);
  }
});

test("the encoded booking address visitors land on opens the booking page", () => {
  assert.match(app, /path="\/Ym9vay1jb2" element=\{<Navigate to="\/book-consultation" replace \/>\}/);
});

test("llms.txt lists every page in the sitemap and only says what the site says", () => {
  for (const path of linkedPaths) assert.ok(llms.includes(`](${path})`), path);
  // The site quotes no hourly price for one-on-one lessons, so neither does llms.txt.
  assert.doesNotMatch(llms, /3,500/);
  // In person: Nairobi home visits; Mombasa and Kisumu only when a tutor is nearby.
  for (const line of llms.split("\n").filter((text) => /Mombasa|Kisumu/.test(text) && /in.person/i.test(text))) {
    assert.match(line, /nearby/, line);
  }
});

test("blog posts, the blog list and the tutor list reach crawlers with their content, from data loaded at build time", () => {
  assert.match(entry, /export async function loadPrerenderData/);
  assert.match(prerender, /__LANA_DATA__/);
  for (const [name, text] of [["BlogPost", blogPost], ["Blog", blog], ["TutorSearch", tutorSearch]]) {
    assert.match(text, /prerenderData\(/, name);
  }
});

test("tutor cards show a school only when the tutor chose to display it", async () => {
  const tutors = await read("src/lib/publicTutors.ts").catch(() => "");
  assert.match(tutors, /display_institution \? /);
  assert.doesNotMatch(tutorSearch, /"Not specified"/);
});

test("every subject page has a longer overview, and all share a section on how lessons work", () => {
  assert.ok(subjectSlugs.length >= 10, `${subjectSlugs.length} subjects`);
  assert.equal([...subjects.matchAll(/^ {4}overview: \[/gm)].length, subjectSlugs.length);
  assert.match(subjects, /How lessons work/);
});

test("Integrated Science, which Junior School families need, has its own subject page in the sitemap", () => {
  assert.ok(subjectSlugs.includes("integrated-science"));
  assert.ok(sitemapPaths.includes("/subjects/integrated-science"));
});

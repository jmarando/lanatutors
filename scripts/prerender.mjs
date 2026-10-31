// Post-build step: `npm run build` is `vite build && node scripts/prerender.mjs`.
//
// Lovable's host serves a file from dist/ when one exists for the requested path, and
// dist/index.html (HTTP 200) for every other path. This script renders each URL in
// public/sitemap.xml with the real app (src/entry-prerender.tsx) and writes it to
// dist/<path>/index.html and dist/<path>.html, so the raw HTML of /tutors, /diaspora and the rest
// carries that page's own title, description, canonical, Open Graph tags and body. That HTML is
// what WhatsApp and Facebook link previews and crawlers that don't run JavaScript read. In the
// browser, src/main.tsx hydrates this markup. Anything that updates state before hydration ends
// must do it in a transition (see src/contexts/AuthContext.tsx), or React re-renders the page.
//
// Add a page to public/sitemap.xml and the next publish prerenders it. A page is skipped, and keeps
// the plain SPA shell, if it throws while rendering in Node (for example by reading `window` during
// render) or renders without its own <title> and canonical (for example when its <SEO> waits for
// Supabase data). This step never fails the build: on any other error, dist/ stays as
// `vite build` wrote it.

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SITE_URL = "https://lanatutors.africa";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const ssrDir = path.join(root, "dist-ssr");
const ROOT_DIV = '<div id="root"></div>';

// Template tags that each page's <SEO> provides itself. Everything else in <head> is kept.
const TEMPLATE_SEO_TAGS = [
  /<title>[\s\S]*?<\/title>\s*/gi,
  /<meta\b[^>]*\b(?:name|property)="(?:description|keywords|og:[^"]*|twitter:[^"]*)"[^>]*>\s*/gi,
  /<link\b[^>]*\brel="canonical"[^>]*>\s*/gi,
];

// dist/index.html is the homepage and also the file served for every URL without its own
// prerendered page (tutor profiles, dashboards, unknown URLs). So it carries no canonical or og:url,
// and this guard hides its homepage markup on any other path; src/main.tsx then clears it.
const FALLBACK_GUARD = `<script>if (location.pathname !== "/") document.documentElement.setAttribute("data-spa-fallback", "");</script>
<style>[data-spa-fallback] #root { display: none; }</style>
`;

const firstLine = (error) => String(error?.message ?? error).split("\n")[0];

function sitemapPaths(xml) {
  const paths = new Set();
  for (const [, loc] of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    let url;
    try {
      url = new URL(loc);
    } catch {
      continue;
    }
    if (url.origin !== SITE_URL) continue;
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    if (/^\/[a-z0-9\-/]*$/i.test(pathname)) paths.add(pathname);
  }
  return [...paths];
}

function canonicalOf(head) {
  const tag = head.match(/<link\b[^>]*\brel="canonical"[^>]*>/i)?.[0];
  return tag?.match(/\bhref="([^"]*)"/i)?.[1];
}

function withoutUrlTags(head) {
  return head
    .replace(/<link\b[^>]*\brel="canonical"[^>]*>\n?/gi, "")
    .replace(/<meta\b[^>]*\bproperty="og:url"[^>]*>\n?/gi, "");
}

function pageHtml(template, head, body, extraHead = "") {
  let html = template;
  for (const pattern of TEMPLATE_SEO_TAGS) html = html.replace(pattern, "");
  // Replacer functions, so a "$" in page content isn't read as a replacement pattern.
  html = html.replace("</head>", () => `${extraHead}${head}\n</head>`);
  return html.replace(ROOT_DIV, () => `<div id="root">${body}</div>`);
}

async function prerender() {
  const template = await readFile(path.join(distDir, "index.html"), "utf8");
  if (!template.includes(ROOT_DIV)) throw new Error(`dist/index.html has no ${ROOT_DIV}`);
  const sitemap = await readFile(path.join(distDir, "sitemap.xml"), "utf8");
  const paths = sitemapPaths(sitemap);

  const [{ build }, { default: react }] = await Promise.all([
    import("vite"),
    import("@vitejs/plugin-react-swc"),
  ]);
  await build({
    root,
    configFile: false,
    logLevel: "warn",
    publicDir: false,
    plugins: [react()],
    resolve: { alias: { "@": path.join(root, "src") } },
    // Bundle dependencies too: several (react-helmet-async, for one) are CommonJS, whose named
    // exports Node's ESM loader can't import directly.
    ssr: { noExternal: true },
    build: {
      ssr: "src/entry-prerender.tsx",
      outDir: ssrDir,
      emptyOutDir: true,
      rollupOptions: { output: { entryFileNames: "entry-prerender.js" } },
    },
  });
  const { render } = await import(pathToFileURL(path.join(ssrDir, "entry-prerender.js")).href);

  const written = [];
  const skipped = [];
  for (const pathname of paths) {
    let page;
    try {
      page = await render(pathname);
    } catch (error) {
      skipped.push(`${pathname}: render failed: ${firstLine(error)}`);
      continue;
    }
    const canonical = canonicalOf(page.head);
    if (!/<title\b/i.test(page.head) || !canonical) {
      skipped.push(`${pathname}: no <title> and canonical from <SEO>`);
      continue;
    }
    if (canonical !== `${SITE_URL}${pathname === "/" ? "/" : pathname}`) {
      console.log(`prerender: note: ${pathname} has canonical ${canonical}`);
    }

    if (pathname === "/") {
      await writeFile(
        path.join(distDir, "index.html"),
        pageHtml(template, withoutUrlTags(page.head), page.html, FALLBACK_GUARD),
      );
    } else {
      const html = pageHtml(template, page.head, page.html);
      const dir = path.join(distDir, pathname);
      await mkdir(dir, { recursive: true });
      // Write both forms, as hosts resolve an extensionless /tutors to either one.
      await writeFile(path.join(dir, "index.html"), html);
      await writeFile(`${dir}.html`, html);
    }
    written.push(pathname);
  }

  console.log(`prerender: wrote ${written.length} of ${paths.length} sitemap pages`);
  for (const line of skipped) console.log(`prerender: skipped ${line}`);
}

process.env.NODE_ENV ??= "production";
try {
  await prerender();
} catch (error) {
  console.warn(`prerender: skipped, the site publishes as a plain SPA: ${error?.stack ?? error}`);
} finally {
  await rm(ssrDir, { recursive: true, force: true }).catch(() => {});
}
// Supabase's client and other modules can leave timers running; don't let them hold the build open.
process.exit(0);

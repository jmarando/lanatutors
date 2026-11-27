// Build-time only. scripts/prerender.mjs bundles this file for Node and calls render() once per
// public URL to write static HTML. The browser app never imports it.
import { Writable } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { HelmetProvider, type HelmetServerState } from "react-helmet-async";
import { AppContent, AppProviders } from "./App";
import type { PrerenderBlogPost, PrerenderData } from "./lib/prerenderData";
import { toPublicTutors, type PublicTutorRow } from "./lib/publicTutors";

const RENDER_TIMEOUT_MS = 15_000;
const DATA_TIMEOUT_MS = 10_000;

/**
 * Public data that some pages render from the database (blog posts, the blog list, the tutor list), read once with
 * the site's public key, the same reads a logged-out visitor's browser makes. scripts/prerender.mjs sets the result
 * as globalThis.__LANA_DATA__ before rendering (see src/lib/prerenderData.ts). A part that fails to load is left out,
 * and its pages render as they would without it.
 */
export async function loadPrerenderData(): Promise<PrerenderData> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return {};

  const read = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      ...init,
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(DATA_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`${path.split("?")[0]}: HTTP ${response.status}`);
    return response.json();
  };

  const [posts, tutors] = await Promise.allSettled([
    read(
      "blog_posts?select=id,title,slug,content,excerpt,author_name,featured_image_url,published_at" +
        "&published=eq.true&order=published_at.desc",
    ),
    read("rpc/get_public_tutor_profiles", { method: "POST", body: "{}" }),
  ]);

  const data: PrerenderData = {};
  if (posts.status === "fulfilled" && Array.isArray(posts.value)) {
    const list = posts.value as PrerenderBlogPost[];
    data.blogPosts = Object.fromEntries(list.map((post) => [post.slug, post]));
    data.blogList = list.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      author_name: post.author_name,
      featured_image_url: post.featured_image_url,
      published_at: post.published_at,
    }));
  } else if (posts.status === "rejected") {
    console.log(`prerender: no blog posts: ${posts.reason}`);
  }
  if (tutors.status === "fulfilled" && Array.isArray(tutors.value)) {
    data.tutors = toPublicTutors(tutors.value as PublicTutorRow[]);
  } else if (tutors.status === "rejected") {
    console.log(`prerender: no tutors: ${tutors.reason}`);
  }
  return data;
}

export interface PrerenderedPage {
  /** Markup for inside <div id="root">. */
  html: string;
  /** The page's own <title>, meta, canonical and JSON-LD tags, as set by react-helmet-async. */
  head: string;
}

export function render(url: string): Promise<PrerenderedPage> {
  const helmetContext: { helmet?: HelmetServerState } = {};

  return new Promise((resolve, reject) => {
    // Started first so that every path below can clear it. It only fires 15s later, by which time
    // `stream` and `fail` exist.
    const timer = setTimeout(() => {
      stream.abort();
      fail(new Error(`timed out after ${RENDER_TIMEOUT_MS / 1000}s`));
    }, RENDER_TIMEOUT_MS);
    let html = "";
    const sink = new Writable({
      write(chunk, _encoding, callback) {
        html += chunk.toString();
        callback();
      },
    });
    sink.on("finish", () => {
      clearTimeout(timer);
      const { helmet } = helmetContext;
      const head = helmet
        ? [helmet.title, helmet.meta, helmet.link, helmet.script].map((tags) => tags.toString()).join("\n")
        : "";
      resolve({ html, head });
    });

    const fail = (error: unknown) => {
      clearTimeout(timer);
      reject(error);
    };

    const stream = renderToPipeableStream(
      <HelmetProvider context={helmetContext}>
        <AppProviders>
          <StaticRouter location={url}>
            <AppContent />
          </StaticRouter>
        </AppProviders>
      </HelmetProvider>,
      {
        // Wait for the lazy route chunk and every other Suspense boundary, so the HTML is the
        // finished page rather than the loading spinner.
        onAllReady() {
          stream.pipe(sink);
        },
        onShellError: fail,
        // An error inside a Suspense boundary would still stream the fallback; treat the page as failed.
        onError: fail,
      },
    );
  });
}

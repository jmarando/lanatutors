import type { PublicTutor } from "@/lib/publicTutors";

// Data the build-time prerender (scripts/prerender.mjs) loads once, through loadPrerenderData in
// src/entry-prerender.tsx, so pages that read the database can be written out with their content. Each such page also
// carries the part it used as window.__LANA_DATA__, so the browser's first render matches the HTML it hydrates. Pages
// still fetch fresh data after that.

export interface PrerenderBlogListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  author_name: string | null;
  featured_image_url: string | null;
  published_at: string | null;
}

export interface PrerenderBlogPost extends PrerenderBlogListItem {
  content: string;
}

export interface PrerenderData {
  blogPosts?: Record<string, PrerenderBlogPost>;
  blogList?: PrerenderBlogListItem[];
  tutors?: PublicTutor[];
}

export function prerenderData<K extends keyof PrerenderData>(key: K): PrerenderData[K] | undefined {
  return (globalThis as { __LANA_DATA__?: PrerenderData }).__LANA_DATA__?.[key];
}

// Build-time only. scripts/prerender.mjs bundles this file for Node and calls render() once per
// public URL to write static HTML. The browser app never imports it.
import { Writable } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { HelmetProvider, type HelmetServerState } from "react-helmet-async";
import { AppContent, AppProviders } from "./App";

const RENDER_TIMEOUT_MS = 15_000;

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

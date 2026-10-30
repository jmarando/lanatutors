import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { initMetaPixel } from "./utils/metaPixel";

initMetaPixel();

const container = document.getElementById("root")!;
// dist/index.html holds the prerendered homepage but is also served for URLs that have no
// prerendered page of their own (scripts/prerender.mjs). There, an inline script in its <head>
// has hidden #root; drop the homepage markup before the app renders.
if (document.documentElement.hasAttribute("data-spa-fallback")) {
  container.replaceChildren();
  document.documentElement.removeAttribute("data-spa-fallback");
}

const app = (
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

if (container.hasChildNodes()) {
  hydrateRoot(container, app, {
    onRecoverableError: (error) => console.error("[hydration]", error),
  });
} else {
  createRoot(container).render(app);
}

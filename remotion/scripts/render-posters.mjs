/**
 * Render April Holiday campaign posters as PNG still images.
 *
 * Usage: node scripts/render-posters.mjs
 * Output: /mnt/documents/april-posters/
 */
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = "/mnt/documents/april-posters";

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const posters = [
  { id: "april-poster-1-feed", filename: "poster-1-april-revision-packages-1080x1080.png" },
  { id: "april-poster-2-story", filename: "poster-2-dont-let-holiday-waste-1080x1920.png" },
  { id: "april-poster-3-display", filename: "poster-3-april-revision-google-1200x628.png" },
  { id: "april-poster-4-feed", filename: "poster-4-make-holiday-count-1080x1080.png" },
  { id: "april-poster-5-story", filename: "poster-5-results-speak-1080x1920.png" },
  { id: "april-poster-6-feed", filename: "poster-6-expert-tutors-results-1080x1080.png" },
];

console.log("Bundling Remotion project...");

const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/poster-index.ts"),
  webpackOverride: (config) => config,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

console.log(`\nRendering ${posters.length} posters to ${outputDir}/\n`);

for (const poster of posters) {
  console.log(`  Rendering: ${poster.filename}...`);

  const composition = await selectComposition({
    serveUrl: bundled,
    id: poster.id,
    puppeteerInstance: browser,
  });

  await renderStill({
    composition,
    serveUrl: bundled,
    output: path.join(outputDir, poster.filename),
    puppeteerInstance: browser,
    imageFormat: "png",
  });

  console.log(`  Done: ${poster.filename}`);
}

await browser.close({ silent: false });

console.log(`\nAll ${posters.length} posters rendered to ${outputDir}/`);
console.log("\nFiles:");
for (const poster of posters) {
  console.log(`  ${poster.filename}`);
}

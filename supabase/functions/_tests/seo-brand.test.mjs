// Run with `npm run test:edge`. What search engines, link previews and emails show as Lana's logo, and the small crawl
// rules that go with it. Link previews once showed a book design that was never the brand's logo (ChatGPT picked it up),
// so these keep every declared image on our own site, present, the right size and in step.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const root = new URL("../../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const bytes = (path) => readFile(new URL(path, root));
const exists = (path) => existsSync(fileURLToPath(new URL(path, root)));
const md5 = (data) => createHash("md5").update(data).digest("hex");
const SITE = "https://lanatutors.africa";
const SHARE = "/lana-tutors-share.png";
const LOGO = "/lana-tutors-logo-square.png";

const [indexHtml, seo, home, login, groups, sitemap, prerender, guide, planEmail] = await Promise.all(
  [
    "index.html",
    "src/components/SEO.tsx",
    "src/pages/Home.tsx",
    "src/pages/Login.tsx",
    "src/pages/GroupClassMarketplace.tsx",
    "public/sitemap.xml",
    "scripts/prerender.mjs",
    "src/pages/TutorGuidePrintable.tsx",
    "supabase/functions/send-learning-plan-email/index.ts",
  ].map(read),
);

// Width and height from a PNG's header.
const pngSize = async (path) => {
  const data = await bytes(path);
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
};

// The [r, g, b, a] pixels of an 8-bit RGB or RGBA PNG without interlacing, which is what the logo files are.
const pngPixels = async (path) => {
  const data = await bytes(path);
  const [width, height] = await pngSize(path);
  const [depth, colorType, interlace] = [data[24], data[25], data[28]];
  assert.ok(depth === 8 && (colorType === 2 || colorType === 6) && interlace === 0, `${path}: not a plain RGB(A) PNG`);
  const chunks = [];
  for (let at = 8; at < data.length; at += 12 + data.readUInt32BE(at)) {
    if (data.toString("latin1", at + 4, at + 8) === "IDAT") chunks.push(data.subarray(at + 8, at + 8 + data.readUInt32BE(at)));
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const size = colorType === 6 ? 4 : 3;
  const stride = width * size;
  const out = Buffer.alloc(stride * height);
  // Undo each row's PNG filter (none, left, up, average or Paeth).
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const left = x >= size ? out[y * stride + x - size] : 0;
      const up = y > 0 ? out[(y - 1) * stride + x] : 0;
      const corner = x >= size && y > 0 ? out[(y - 1) * stride + x - size] : 0;
      const estimate = left + up - corner;
      const [dl, du, dc] = [left, up, corner].map((value) => Math.abs(estimate - value));
      const paeth = dl <= du && dl <= dc ? left : du <= dc ? up : corner;
      const predicted = [0, left, up, (left + up) >> 1, paeth][filter];
      out[y * stride + x] = (raw[y * (stride + 1) + 1 + x] + predicted) & 255;
    }
  }
  return Array.from({ length: width * height }, (_, i) => {
    const [r, g, b, a = 255] = out.subarray(i * size, (i + 1) * size);
    return { x: i % width, y: Math.floor(i / width), r, g, b, a };
  });
};
const share = (part, whole) => part.length / whole.length;

test("the share image and the square logo show lettering and the orange ribbon on white, not a block of colour", async () => {
  for (const path of [`public${SHARE}`, `public${LOGO}`]) {
    const pixels = await pngPixels(path);
    const white = (p) => Math.min(p.r, p.g, p.b) > 235;
    // The smallest rectangle holding everything drawn.
    let [left, top, right, bottom] = [Infinity, Infinity, 0, 0];
    for (const { x, y } of pixels.filter((p) => !white(p))) {
      [left, top] = [Math.min(left, x), Math.min(top, y)];
      [right, bottom] = [Math.max(right, x), Math.max(bottom, y)];
    }
    const inside = pixels.filter((p) => p.x >= left && p.x <= right && p.y >= top && p.y <= bottom);
    assert.ok(white(pixels[0]), `${path}: white background`);
    assert.ok(share(inside.filter(white), inside) > 0.35, `${path}: white shows between the letters`);
    assert.ok(share(pixels.filter((p) => Math.max(p.r, p.g, p.b) < 60), pixels) > 0.01, `${path}: dark lettering`);
    assert.ok(share(pixels.filter((p) => p.r > 180 && p.g < 120 && p.b < 90), pixels) > 0.005, `${path}: orange ribbon`);
  }
});

test("the white logo for dark and orange backgrounds is transparent around the lettering", async () => {
  const pixels = await pngPixels("public/lana-logo-white.png");
  const solid = pixels.filter((p) => p.a > 200);
  assert.equal(pixels[0].a, 0, "transparent corner");
  assert.ok(solid.every((p) => Math.min(p.r, p.g, p.b) > 240), "only white is drawn");
  assert.ok(share(solid, pixels) > 0.1 && share(solid, pixels) < 0.6, `drawn share ${share(solid, pixels).toFixed(2)}`);
});

test("link previews show the share image from our own site", async () => {
  assert.match(seo, new RegExp(`ogImage = "${SHARE}"`));
  for (const tag of ["og:image", "twitter:image"]) {
    assert.ok(indexHtml.includes(`${tag}" content="${SITE}${SHARE}"`), tag);
  }
  assert.deepEqual(await pngSize(`public${SHARE}`), [1200, 630]);
  // Anyone who already has the old address (a cached preview, an AI answer) gets the same image.
  assert.equal(md5(await bytes("public/og-image.png")), md5(await bytes(`public${SHARE}`)));
});

test("search engines are told one logo, on our site, square and at least 112 pixels each way", async () => {
  const declared = [...indexHtml.matchAll(/"logo":\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(declared, [`${SITE}${LOGO}`]);
  assert.ok(home.includes("\"logo\": `${SITE_URL}/lana-tutors-logo-square.png`"), "the homepage names the same logo");
  const [width, height] = await pngSize(`public${LOGO}`);
  assert.ok(width === height && width >= 112, `${width}x${height}`);
});

test("no page loads a logo from Lovable's storage", () => {
  for (const [name, text] of [["index.html", indexHtml], ["SEO.tsx", seo], ["Home.tsx", home]]) {
    assert.doesNotMatch(text, /storage\.googleapis\.com\/gpt-engineer/, name);
  }
});

test("every image address on lanatutors.africa that pages and emails use is a file we ship", () => {
  const urls = [indexHtml, home, planEmail].flatMap((text) =>
    [...text.matchAll(/https:\/\/lanatutors\.africa(\/[\w\-./]+\.(?:png|jpe?g|svg|webp))/g)].map((match) => match[1]),
  );
  assert.ok(urls.includes("/lana-logo-white.png"), "the learning plan email's logo is among them");
  for (const url of new Set(urls)) assert.ok(exists(`public${url}`), url);
});

test("the printable tutor guide shows the white brand logo, and the book design is gone", () => {
  assert.match(guide, /<img src="\/lana-logo-white\.png" alt="Lana Tutors" className="cover-logo" \/>/);
  // That filter painted an opaque image into a white box; the white logo needs none.
  assert.doesNotMatch(guide, /brightness\(0\) invert\(1\)/);
  // A page background in the on-screen rules would paint over the cover, hiding the white logo and title.
  const onScreen = guide.slice(guide.indexOf("@media screen"));
  assert.doesNotMatch(onScreen, /\.page \{[^}]*background/);
  assert.equal(exists("src/assets/lana-tutors-logo-hd.png"), false);
});

test("sign-in and sign-up stay out of the sitemap; sign-in is noindex; sign-up keeps its own raw HTML", () => {
  assert.doesNotMatch(sitemap, /lanatutors\.africa\/(login|student-signup)</);
  assert.match(login, /<SEO[^>]*\bnoindex\b[^>]*\/>/);
  assert.ok(seo.includes('{noindex && <meta name="robots" content="noindex" />}'));
  assert.match(prerender, /"\/student-signup"/);
});

test("the group classes page has a descriptive title that fits in search results", () => {
  const title = groups.match(/<SEO\s+title="([^"]+)"/)?.[1] ?? "";
  assert.notEqual(title, "Group Classes");
  assert.ok(`${title} | Lana Tutors`.length <= 60, title);
});

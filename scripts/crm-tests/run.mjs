// Runs the CRM unit tests: bundles each *.test.ts next to this file with the repo's esbuild, then
// runs the bundles with node's built-in test runner. No new dependencies.
//
//   node scripts/crm-tests/run.mjs        (or: npm run test:crm)
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const tests = readdirSync(here)
  .filter((name) => name.endsWith(".test.ts"))
  .map((name) => join(here, name));

if (tests.length === 0) {
  console.error("No *.test.ts files found next to run.mjs");
  process.exit(2);
}

const out = mkdtempSync(join(tmpdir(), "crm-tests-"));
try {
  await build({
    entryPoints: tests,
    bundle: true,
    platform: "node",
    format: "esm",
    outdir: out,
    outExtension: { ".js": ".mjs" },
    logLevel: "error",
  });
  const bundles = readdirSync(out).map((name) => join(out, name));
  const result = spawnSync(process.execPath, ["--test", ...bundles], { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(out, { recursive: true, force: true });
}

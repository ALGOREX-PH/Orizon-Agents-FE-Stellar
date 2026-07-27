#!/usr/bin/env node
/**
 * First-load JS budget guard.
 *
 * Sums the on-disk (uncompressed) size of every script chunk each app route
 * loads on first paint, per .next/app-build-manifest.json, and fails the
 * build when any route exceeds the budget. Keeps bundle regressions (e.g. a
 * heavy dependency slipping into a layout) from landing silently.
 *
 * Run after `next build`:  node scripts/check-bundle-size.mjs
 */
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Uncompressed budget per route. The heaviest route today is ~400 KB on disk
// (~125 KB gzipped); 480 KB leaves headroom for features while still catching
// a mistake the size of an eagerly-imported wallet kit or SDK.
const BUDGET_KB = 480;

const root = new URL("..", import.meta.url).pathname;
const manifest = JSON.parse(
  readFileSync(join(root, ".next", "app-build-manifest.json"), "utf8"),
);

let failed = false;
const rows = [];
for (const [route, files] of Object.entries(manifest.pages)) {
  const scripts = [...new Set(files)].filter((f) => f.endsWith(".js"));
  let bytes = 0;
  for (const file of scripts) {
    bytes += statSync(join(root, ".next", file)).size;
  }
  const kb = Math.round(bytes / 1024);
  const over = kb > BUDGET_KB;
  if (over) failed = true;
  rows.push({ route, kb, over });
}

rows.sort((a, b) => b.kb - a.kb);
for (const { route, kb, over } of rows) {
  console.log(
    `${over ? "FAIL" : "  ok"}  ${String(kb).padStart(5)} KB  ${route}`,
  );
}

if (failed) {
  console.error(
    `\nBundle budget exceeded (${BUDGET_KB} KB uncompressed first-load JS per route).`,
  );
  process.exit(1);
}
console.log(`\nAll routes within the ${BUDGET_KB} KB first-load budget.`);

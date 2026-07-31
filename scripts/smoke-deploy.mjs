#!/usr/bin/env node
/**
 * Post-deploy smoke test against a *deployed* origin.
 *
 * This exists because of a real outage: a stale `NEXT_PUBLIC_API_BASE` made the
 * Next.js rewrite target `//api/...`, so every backend call from the production
 * console 404'd. Nothing caught it — unit tests pass, the build is green, the
 * marketing pages render fine, and the backend answered its own health check
 * happily when probed directly. The only way to see it is to call the API
 * *through the deployed frontend*, which is exactly what this does.
 *
 * Usage:
 *   node scripts/smoke-deploy.mjs [origin]
 *   SMOKE_ORIGIN=https://orizons.xyz npm run smoke
 *
 * The backend sleeps on Render's free tier, so the first request may take up to
 * a minute; the warmup below absorbs that before any assertion runs.
 */

const ORIGIN = (
  process.argv[2] ||
  process.env.SMOKE_ORIGIN ||
  "https://orizons.xyz"
).replace(/\/+$/, "");

const WARMUP_TIMEOUT_MS = 90_000;
const CHECK_TIMEOUT_MS = 30_000;

/** @type {{path: string, expect: (body: unknown) => string | null}[]} */
const CHECKS = [
  {
    // Cheapest possible proof that the proxy reaches a live backend. If this
    // 404s while the origin serves HTML fine, the rewrite target is wrong.
    path: "/api/health",
    expect: (body) =>
      body?.status === "ok"
        ? null
        : `expected status "ok", got ${body?.status}`,
  },
  {
    path: "/api/agents",
    expect: (body) => {
      if (!Array.isArray(body)) return "expected an array";
      if (body.length === 0) return "expected at least one agent";
      const bad = body.find(
        (a) => typeof a?.id !== "string" || typeof a?.price !== "number",
      );
      return bad ? `agent missing id/price: ${JSON.stringify(bad)}` : null;
    },
  },
  {
    path: "/api/flow/default",
    expect: (body) =>
      Array.isArray(body?.nodes) && body.nodes.length > 0
        ? null
        : "expected a non-empty nodes array",
  },
  {
    path: "/api/metrics/overview",
    expect: (body) =>
      typeof body?.agents_online === "number" && Array.isArray(body?.throughput)
        ? null
        : "expected agents_online + throughput",
  },
  {
    path: "/api/stellar/network",
    expect: (body) => {
      if (typeof body?.network_passphrase !== "string")
        return "expected network_passphrase";
      const want = process.env.SMOKE_EXPECT_NETWORK;
      if (want && body.network !== want)
        return `expected network ${want}, got ${body.network}`;
      return null;
    },
  },
  {
    path: "/api/tasks",
    expect: (body) => (Array.isArray(body) ? null : "expected an array"),
  },
];

/**
 * @param {string} path
 * @param {number} timeoutMs
 */
async function fetchJson(path, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(`${ORIGIN}${path}`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }
    return { res, body, text, ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log(`smoke: ${ORIGIN}`);

  // Absorb a cold start before timing anything, and fail fast if the origin
  // itself is unreachable.
  try {
    const { res, ms } = await fetchJson("/api/health", WARMUP_TIMEOUT_MS);
    console.log(`  warmup /api/health → ${res.status} in ${ms}ms`);
  } catch (err) {
    console.error(
      `  warmup failed: ${err instanceof Error ? err.message : err}`,
    );
    process.exitCode = 1;
    return;
  }

  const failures = [];
  for (const check of CHECKS) {
    try {
      const { res, body, text, ms } = await fetchJson(
        check.path,
        CHECK_TIMEOUT_MS,
      );
      if (!res.ok) {
        failures.push(
          `${check.path} → HTTP ${res.status}: ${text.slice(0, 200)}`,
        );
        console.log(`  ✗ ${check.path} → ${res.status} (${ms}ms)`);
        continue;
      }
      const problem = check.expect(body);
      if (problem) {
        failures.push(`${check.path} → ${problem}`);
        console.log(`  ✗ ${check.path} → ${problem} (${ms}ms)`);
        continue;
      }
      console.log(`  ✓ ${check.path} → ${res.status} (${ms}ms)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failures.push(`${check.path} → ${msg}`);
      console.log(`  ✗ ${check.path} → ${msg}`);
    }
  }

  if (failures.length > 0) {
    console.error(
      `\n${failures.length}/${CHECKS.length} checks failed against ${ORIGIN}:`,
    );
    for (const f of failures) console.error(`  - ${f}`);
    console.error(
      "\nIf every /api/* check failed with 404, the proxy target is wrong:" +
        "\ncheck NEXT_PUBLIC_API_BASE — it must be a bare origin with no trailing" +
        "\nslash and no /api suffix (see lib/api-base.mjs).",
    );
    process.exitCode = 1;
    return;
  }

  console.log(`\nall ${CHECKS.length} checks passed against ${ORIGIN}`);
}

await main();

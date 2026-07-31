/**
 * Resolution + normalization for the backend origin that `next.config.mjs`
 * proxies `/api/*` to.
 *
 * This lives in `.mjs` (not `.ts`) so the Next config can import it directly —
 * Next 14 evaluates `next.config.mjs` before any TypeScript transform exists.
 *
 * Why normalization matters: the rewrite destination is built as
 * `${API_BASE}/api/:path*`. If the configured value carries a trailing slash
 * or already ends in `/api`, the backend receives `//api/agents` or
 * `/api/api/agents` and answers 404 for *every* request — a total, silent
 * outage that still returns backend-shaped error bodies, so it looks like the
 * API is up. Normalizing here makes the proxy immune to both spellings.
 */

const DEFAULT_PRODUCTION_BASE = "https://orizon-agents-be-stellar.onrender.com";
const DEFAULT_LOCAL_BASE = "http://localhost:8000";

/**
 * Strips the parts of a configured base that would corrupt the rewrite target,
 * and rejects values that can never work so the build fails loudly instead of
 * shipping a console where every fetch 404s.
 *
 * @param {string | undefined} raw configured value, may be blank/undefined
 * @param {string} fallback origin to use when `raw` is absent or blank
 * @returns {string} an absolute origin with no trailing slash and no `/api` suffix
 */
export function normalizeApiBase(raw, fallback) {
  const candidate =
    typeof raw === "string" && raw.trim() ? raw.trim() : fallback;

  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_API_BASE must be an absolute URL (e.g. https://api.example.com); received ${JSON.stringify(candidate)}`,
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(
      `NEXT_PUBLIC_API_BASE must use http or https; received protocol ${JSON.stringify(url.protocol)}`,
    );
  }

  // A query string or fragment on the base silently breaks the rewrite target
  // (the appended path would land after them), so refuse it outright.
  if (url.search || url.hash) {
    throw new Error(
      `NEXT_PUBLIC_API_BASE must not contain a query string or fragment; received ${JSON.stringify(candidate)}`,
    );
  }

  // `/` → ``, `/api/` → ``, `/gateway/api` → `/gateway`. The `/api` segment is
  // dropped because the rewrite appends its own.
  let path = url.pathname.replace(/\/+$/, "");
  if (path.endsWith("/api")) path = path.slice(0, -"/api".length);

  return `${url.origin}${path}`;
}

/**
 * Reads the configured base from an environment bag and normalizes it. On
 * Vercel a missing value falls back to the production backend so a forgotten
 * env var can never point the proxy at localhost.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {string}
 */
export function resolveApiBase(env) {
  const fallback = env.VERCEL ? DEFAULT_PRODUCTION_BASE : DEFAULT_LOCAL_BASE;
  return normalizeApiBase(env.NEXT_PUBLIC_API_BASE, fallback);
}

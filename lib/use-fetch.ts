"use client";
/**
 * Minimal one-shot data-fetching hook shared by dashboard pages.
 *
 * Runs `fn` on mount (and whenever `deps` change), tracking data / error /
 * loading. Unmount-safe: a torn-down effect never applies its result.
 * `reload` is a stable callback that re-runs the fetch on demand.
 *
 * When `deps` change, `data` and `error` reset to null so consumers never
 * render the previous record against the new deps; pass
 * `{ keepPreviousData: true }` to keep the old value visible while the
 * refetch is in flight. `reload()` always keeps the current data.
 *
 * A *transient* failure (see `isTransientFetchError`) is retried
 * automatically with exponential backoff — `maxRetries` (3) extra attempts
 * spaced `retryBaseMs` (2s) × 2ⁿ apart. Without this a single failure was
 * permanent: the backend sleeps on Render's free tier and takes 30-60s to
 * wake, so the first visit timed out and stayed broken until the user
 * reloaded the page. Pending retries are cancelled on unmount and on a deps
 * change; `reload()` starts a fresh budget.
 *
 * `{ revalidateOnFocus: true }` refetches via `reload()` when the tab
 * regains focus/visibility and the last success is older than `staleAfterMs`.
 */

import { useCallback, useEffect, useRef, useState } from "react";

/** Extra attempts after the initial one. 4 requests total per mount. */
const DEFAULT_MAX_RETRIES = 3;
/** First retry delay; doubles per attempt (2s → 4s → 8s). */
const DEFAULT_RETRY_BASE_MS = 2_000;
/** Ceiling for the computed backoff, before any Retry-After hint. */
const MAX_BACKOFF_MS = 30_000;
/** Hard ceiling for any single retry delay, hint included. */
const MAX_RETRY_DELAY_MS = 120_000;

/**
 * Is a rejection worth retrying automatically?
 *
 * Transient = the request never got a real answer, or the backend said "not
 * right now": the client-side deadline in lib/api.ts (formatted
 * `GET /agents → timeout after 60s`), a browser network failure, HTTP 5xx,
 * 408 or 429. Everything else is an answer that will not change on its own —
 * 400/401/403/404, a rejected response guard (`malformed response from …`),
 * a bug in `fn` — and retrying it only burns the backend's rate-limit budget
 * (120 req/min). A 404 in particular means a missing resource, not an
 * outage; focus revalidation and the page's retry button recover those.
 */
export function isTransientFetchError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (/timeout after/i.test(message)) return true;
  // lib/api.ts formats HTTP failures as "GET /path → 503[ — detail]".
  const status = Number(/→\s*(\d{3})\b/.exec(message)?.[1]);
  if (status) return status >= 500 || status === 408 || status === 429;
  // Browser network failures: "Failed to fetch" (Chrome), "NetworkError when
  // attempting to fetch resource." (Firefox), "Load failed" (Safari) — all
  // TypeErrors, but the message check also covers wrapped re-throws.
  return (
    error instanceof TypeError ||
    /failed to fetch|network\s?error|network request failed|load failed/i.test(
      message,
    )
  );
}

/**
 * Retry-After the backend asked for, in ms, or null when it said nothing.
 *
 * lib/api.ts throws plain `Error`s that carry only the status text, so this
 * is duck-typed: any rejection growing a `retryAfterMs` (ms) or `retryAfter`
 * (seconds, mirroring the HTTP header) field is honoured automatically, with
 * no change to the API layer.
 */
export function retryAfterHintMs(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const { retryAfterMs, retryAfter } = error as Record<string, unknown>;
  const ms =
    typeof retryAfterMs === "number"
      ? retryAfterMs
      : typeof retryAfter === "number"
        ? retryAfter * 1_000
        : null;
  return ms !== null && Number.isFinite(ms) && ms > 0 ? ms : null;
}

/** Delay before retry `attempt` (0-based), honouring a Retry-After hint. */
function retryDelayMs(attempt: number, baseMs: number, error: unknown): number {
  const backoff = Math.min(baseMs * 2 ** attempt, MAX_BACKOFF_MS);
  const hint = retryAfterHintMs(error);
  return Math.min(
    hint === null ? backoff : Math.max(backoff, hint),
    MAX_RETRY_DELAY_MS,
  );
}

export type UseFetchResult<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
  /**
   * True while the hook is recovering on its own — from the moment a retry
   * is scheduled until it succeeds or the budget runs out. Lets a page say
   * "reconnecting…" instead of presenting a dead end.
   */
  retrying: boolean;
};

export type UseFetchOptions = {
  /** Keep the last resolved `data` while a deps-change refetch is in flight. */
  keepPreviousData?: boolean;
  /**
   * Refetch when the tab becomes visible again (visibilitychange → visible,
   * window focus) and the last successful fetch is older than `staleAfterMs`.
   * Uses `reload()`, which keeps the current data — no flash. Off by default.
   * Only kicks in after a first success: before that there is nothing stale
   * to refresh (the mount fetch, or the page's error UI, covers it).
   */
  revalidateOnFocus?: boolean;
  /** Age (ms) after which a focus revalidation refetches. Default 60_000. */
  staleAfterMs?: number;
  /**
   * Automatic retries after a transient failure. Default 3; 0 disables them.
   * Deliberately small — each attempt can itself sit on the 60s GET deadline,
   * so 3 retries already cover ~4 minutes of a cold backend without adding
   * meaningful load.
   */
  maxRetries?: number;
  /** First retry delay in ms; doubles per attempt. Default 2_000. */
  retryBaseMs?: number;
};

export function useFetch<T>(
  fn: () => Promise<T>,
  deps: unknown[],
  opts?: UseFetchOptions,
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [nonce, setNonce] = useState(0);

  // Always call the latest `fn` without forcing callers to memoize it.
  // Synced in an effect — not during render — so render stays side-effect
  // free (concurrent renders may be thrown away). Declared before the fetch
  // effect below so it runs first after each commit.
  const fnRef = useRef(fn);
  const optsRef = useRef(opts);
  useEffect(() => {
    fnRef.current = fn;
    optsRef.current = opts;
  });

  // Deps the fetch effect last ran with — lets a real deps change be told
  // apart from a `reload()` nonce bump (reload keeps the current data).
  const prevDepsRef = useRef<unknown[] | null>(null);

  // When the last fetch succeeded — drives the focus-revalidation staleness
  // check. Null until the first success.
  const lastSuccessRef = useRef<number | null>(null);

  // Mirrors `retrying` so the effect can skip no-op state updates.
  const retryingRef = useRef(false);
  const markRetrying = (value: boolean) => {
    if (retryingRef.current === value) return;
    retryingRef.current = value;
    setRetrying(value);
  };

  useEffect(() => {
    let alive = true;
    let attempt = 0; // retries spent on this effect run
    let timer: ReturnType<typeof setTimeout> | null = null;

    const prev = prevDepsRef.current;
    const depsChanged =
      prev !== null &&
      (prev.length !== deps.length ||
        deps.some((d, i) => !Object.is(d, prev[i])));
    prevDepsRef.current = deps;
    if (depsChanged && !opts?.keepPreviousData) {
      setData(null);
      setError(null);
    }
    markRetrying(false);

    const run = () => {
      setLoading(true);
      fnRef
        .current()
        .then((d) => {
          if (!alive) return;
          lastSuccessRef.current = Date.now();
          setData(d);
          setError(null);
          markRetrying(false);
        })
        .catch((e) => {
          if (!alive) return;
          setError(e instanceof Error ? e.message : String(e));
          const budget = optsRef.current?.maxRetries ?? DEFAULT_MAX_RETRIES;
          if (attempt >= budget || !isTransientFetchError(e)) {
            markRetrying(false);
            return;
          }
          const delay = retryDelayMs(
            attempt,
            optsRef.current?.retryBaseMs ?? DEFAULT_RETRY_BASE_MS,
            e,
          );
          attempt += 1;
          markRetrying(true);
          timer = setTimeout(() => {
            timer = null;
            if (alive) run();
          }, delay);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    };
    run();

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const revalidateOnFocus = opts?.revalidateOnFocus ?? false;
  const staleAfterMs = opts?.staleAfterMs ?? 60_000;
  useEffect(() => {
    if (!revalidateOnFocus) return;
    const maybeReload = () => {
      if (document.hidden) return;
      const last = lastSuccessRef.current;
      if (last === null || Date.now() - last < staleAfterMs) return;
      reload();
    };
    window.addEventListener("focus", maybeReload);
    document.addEventListener("visibilitychange", maybeReload);
    return () => {
      window.removeEventListener("focus", maybeReload);
      document.removeEventListener("visibilitychange", maybeReload);
    };
  }, [revalidateOnFocus, staleAfterMs, reload]);

  return { data, error, loading, reload, retrying };
}

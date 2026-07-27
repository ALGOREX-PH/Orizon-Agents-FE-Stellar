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
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type UseFetchResult<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
};

export type UseFetchOptions = {
  /** Keep the last resolved `data` while a deps-change refetch is in flight. */
  keepPreviousData?: boolean;
};

export function useFetch<T>(
  fn: () => Promise<T>,
  deps: unknown[],
  opts?: UseFetchOptions,
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  // Always call the latest `fn` without forcing callers to memoize it.
  // Synced in an effect — not during render — so render stays side-effect
  // free (concurrent renders may be thrown away). Declared before the fetch
  // effect below so it runs first after each commit.
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  // Deps the fetch effect last ran with — lets a real deps change be told
  // apart from a `reload()` nonce bump (reload keeps the current data).
  const prevDepsRef = useRef<unknown[] | null>(null);

  useEffect(() => {
    let alive = true;
    const prev = prevDepsRef.current;
    const depsChanged =
      prev !== null &&
      (prev.length !== deps.length || deps.some((d, i) => !Object.is(d, prev[i])));
    prevDepsRef.current = deps;
    if (depsChanged && !opts?.keepPreviousData) {
      setData(null);
      setError(null);
    }
    setLoading(true);
    fnRef.current()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, error, loading, reload };
}

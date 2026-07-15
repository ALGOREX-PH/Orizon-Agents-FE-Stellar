"use client";
/**
 * Minimal one-shot data-fetching hook shared by dashboard pages.
 *
 * Runs `fn` on mount (and whenever `deps` change), tracking data / error /
 * loading. Unmount-safe: a torn-down effect never applies its result.
 * `reload` is a stable callback that re-runs the fetch on demand.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type UseFetchResult<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
};

export function useFetch<T>(
  fn: () => Promise<T>,
  deps: unknown[],
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  // Always call the latest `fn` without forcing callers to memoize it.
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let alive = true;
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

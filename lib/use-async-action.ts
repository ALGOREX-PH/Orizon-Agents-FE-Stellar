"use client";
/**
 * Shared state machine for user-triggered async actions (button-driven
 * fetches / mutations). Replaces the hand-rolled {data, busy, err} +
 * try/catch/finally blocks scattered across the PDAX panels.
 *
 * - `run(...args)` invokes the latest `fn`, tracking `pending` and storing
 *   the resolved value in `data`. It resolves to the value on success and
 *   `undefined` on failure (the error is captured in `error`).
 * - Errors are normalized with `toMessage` so users never see the literal
 *   "Error: " prefix that `String(e)` produces.
 * - `data` is retained across failures and re-runs; call `reset()` first
 *   when the UI should drop stale results while a new run is in flight.
 */

import { useCallback, useRef, useState } from "react";

/** Normalize a thrown value into a user-facing message. */
export function toMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export type UseAsyncActionResult<Args extends unknown[], T> = {
  run: (...args: Args) => Promise<T | undefined>;
  data: T | null;
  error: string | null;
  pending: boolean;
  reset: () => void;
};

export function useAsyncAction<Args extends unknown[], T>(
  fn: (...args: Args) => Promise<T>,
): UseAsyncActionResult<Args, T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Always call the latest `fn` without forcing callers to memoize it.
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async (...args: Args): Promise<T | undefined> => {
    setError(null);
    setPending(true);
    try {
      const result = await fnRef.current(...args);
      setData(result);
      return result;
    } catch (e) {
      setError(toMessage(e));
      return undefined;
    } finally {
      setPending(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { run, data, error, pending, reset };
}

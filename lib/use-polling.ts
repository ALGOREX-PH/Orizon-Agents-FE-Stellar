"use client";
/**
 * Shared polling hook for dashboard pages that refresh on a cadence.
 *
 * - Runs `fn` immediately, then re-schedules after each completion.
 * - Pauses while the tab is hidden and resumes (with an immediate run)
 *   on `visibilitychange` — no wasted requests in background tabs.
 * - Applies exponential backoff (×2 per consecutive rejection) so a downed
 *   backend isn't hammered; a single success resets the cadence. A
 *   `Retry-After` the backend attached to the rejection wins over the
 *   computed delay when it is longer.
 */

import { useEffect, useRef } from "react";
import { retryAfterHintMs } from "./use-fetch";

/**
 * Floor for the backoff ceiling.
 *
 * The backend's rate limiter (app/security.py) answers 429 with a
 * `Retry-After` of up to its full window — 60s. The old ceiling of 4× the
 * base interval is 20s on the 5s dashboard, so a throttled page kept firing
 * inside its own saturated bucket and the bucket never drained. The ceiling
 * therefore has to clear 60s; 90s does, with headroom. Slow pollers keep the
 * larger ×4 ceiling they already had.
 */
const MIN_BACKOFF_CEILING_MS = 90_000;
/**
 * Hard cap for a single sleep, hint included — a bad `Retry-After` must not
 * park the loop indefinitely.
 */
const MAX_DELAY_MS = 300_000;
// Streak clamp: 2^10 × any realistic interval is far past the ceiling, and it
// keeps the exponent from overflowing during a long outage.
const MAX_BACKOFF_STREAK = 10;

export function usePolling(
  fn: () => Promise<void> | void,
  intervalMs: number,
  opts?: { enabled?: boolean },
): void {
  const enabled = opts?.enabled ?? true;

  // Always call the latest `fn` without forcing callers to memoize it.
  // Synced in an effect — not during render — so render stays side-effect
  // free (concurrent renders may be thrown away). Declared before the poll
  // effect below so it runs first after each commit.
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    if (!enabled) return;

    let stopped = false;
    let inFlight = false;
    let failures = 0;
    let retryAfter: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ceiling = Math.max(intervalMs * 4, MIN_BACKOFF_CEILING_MS);

    const schedule = () => {
      if (stopped) return;
      const backoff = Math.min(intervalMs * 2 ** failures, ceiling);
      const delay = Math.min(
        retryAfter === null ? backoff : Math.max(backoff, retryAfter),
        MAX_DELAY_MS,
      );
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void tick(), delay);
    };

    const tick = async () => {
      if (stopped || inFlight) return;
      // Paused while hidden — the visibility listener resumes the loop.
      if (document.hidden) return;
      inFlight = true;
      try {
        await fnRef.current();
        failures = 0;
        retryAfter = null;
      } catch (e) {
        failures = Math.min(failures + 1, MAX_BACKOFF_STREAK);
        // Honoured when the rejection carries one; lib/api.ts throws plain
        // Errors today, so this is normally null and the backoff decides.
        retryAfter = retryAfterHintMs(e);
      } finally {
        inFlight = false;
        schedule();
      }
    };

    const onVisibility = () => {
      if (!stopped && !document.hidden) void tick();
    };

    document.addEventListener("visibilitychange", onVisibility);
    void tick();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, intervalMs]);
}

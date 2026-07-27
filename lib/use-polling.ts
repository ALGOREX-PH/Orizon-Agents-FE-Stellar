"use client";
/**
 * Shared polling hook for dashboard pages that refresh on a cadence.
 *
 * - Runs `fn` immediately, then re-schedules after each completion.
 * - Pauses while the tab is hidden and resumes (with an immediate run)
 *   on `visibilitychange` — no wasted requests in background tabs.
 * - Applies exponential backoff (×2 per consecutive rejection, capped at
 *   4× the base interval) so a downed backend isn't hammered; a single
 *   success resets the cadence.
 */

import { useEffect, useRef } from "react";

// 2^2 = ×4 — the backoff cap expressed as a max failure streak.
const MAX_BACKOFF_STREAK = 2;

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
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (stopped) return;
      const delay = Math.min(intervalMs * 2 ** failures, intervalMs * 4);
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
      } catch {
        failures = Math.min(failures + 1, MAX_BACKOFF_STREAK);
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

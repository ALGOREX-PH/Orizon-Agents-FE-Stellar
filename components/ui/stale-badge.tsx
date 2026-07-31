"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * "⚠ stale · updated 2m ago" — dates numbers that are frozen on screen.
 *
 * `useFetch` (and the pages driving `usePolling`) deliberately keep the last
 * good payload when a refresh fails, so balances, task counts and metrics stay
 * readable through an outage. Without a marker those figures present
 * themselves as live: the console showed day-old numbers with no hint that the
 * backend had stopped answering. This is the generalization of the hand-rolled
 * note in orchestrator/_components/fiat-fund.tsx.
 *
 * Stale is NOT the same as failed. Stale means *we have real data on screen
 * and a refresh has since failed*; a page that never loaded has nothing to
 * date and belongs to `ErrorNote`. Both guards are enforced here:
 *
 *   - `stale` false  → nothing renders (the data is live)
 *   - `lastSuccessAt` null → nothing renders (nothing ever loaded)
 *
 * `lastSuccessAt` is exactly that signal: `useFetch` clears it alongside
 * `data`, so a non-null timestamp means a real payload is being displayed.
 *
 * Accessibility: this is a `role="status"` (polite), not an `alert` — the
 * failure itself is announced by the `ErrorNote` next to it, and this only
 * qualifies what is on screen. The announced text is deliberately fixed while
 * the badge is mounted (it names the absolute time of the last update) so a
 * long outage does not re-interrupt a screen reader every time the relative
 * age ticks over; the ticking text is visual and `aria-hidden`.
 */

/** Coarse "how long ago", stable enough that it doesn't tick every second. */
export function formatAge(ageMs: number): string {
  // A clock skew (or a timestamp from the future) must not print "-3s ago".
  const seconds = Math.max(0, Math.floor(ageMs / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * How long until the rendered age could change. Keeps the badge honest
 * without re-rendering once a second through a multi-hour outage.
 */
function nextTickMs(ageMs: number): number {
  if (ageMs < 60_000) return 5_000;
  if (ageMs < 3_600_000) return 30_000;
  return 300_000;
}

export function StaleBadge({
  lastSuccessAt,
  stale,
  what = "data",
  className,
}: {
  /**
   * Epoch ms of the last successful fetch — `lastSuccessAt` from `useFetch`
   * or `usePolling({ trackStatus: true })`. Null means nothing ever loaded,
   * which is a failure, not staleness: the badge stays hidden.
   */
  lastSuccessAt: number | null;
  /** True when the most recent refresh failed. False renders nothing. */
  stale: boolean;
  /** What is frozen, for the announcement — e.g. "network metrics". */
  what?: string;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  // Re-render on a cadence so the age keeps counting instead of freezing at
  // whatever it was when the refresh first failed.
  useEffect(() => {
    if (!stale || lastSuccessAt === null) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      timer = setTimeout(tick, nextTickMs(current - lastSuccessAt));
    };
    timer = setTimeout(tick, nextTickMs(Date.now() - lastSuccessAt));
    return () => clearTimeout(timer);
  }, [stale, lastSuccessAt]);

  // Live data, or data that never arrived — neither is "stale".
  if (!stale || lastSuccessAt === null) return null;

  const age = formatAge(now - lastSuccessAt);
  const at = new Date(lastSuccessAt).toLocaleTimeString();
  const announcement = `Stale ${what} — last updated at ${at}; the most recent refresh failed.`;

  return (
    <span
      role="status"
      title={announcement}
      className={cn("inline-flex max-w-full", className)}
    >
      <Badge tone="magenta" className="max-w-full">
        <span aria-hidden="true">⚠ stale · updated {age}</span>
        <span className="sr-only">{announcement}</span>
      </Badge>
    </span>
  );
}

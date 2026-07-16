import { cn } from "@/lib/utils";
import type { ReputationSource } from "@/lib/types";

/** bps is 0..10000 over a 0–100 rating scale → familiar 0–5 score. */
const score = (bps: number) => (bps / 2000).toFixed(2);

/**
 * Compact on-chain reputation chip.
 *
 * Cyan when the score is backed by on-chain evidence, violet-tinted with a
 * `≈` prefix when it is only the Bayesian prior, magenta when it sits below
 * the network floor. Meaning is never carried by color alone — the ≈ / ★ / ⚑
 * glyphs and the title/aria-label text carry it too.
 */
export function ReputationBadge({
  bps,
  source,
  count,
  disputeRateBps,
  floorBps,
  className,
}: {
  bps: number;
  source: ReputationSource;
  count?: number;
  disputeRateBps?: number;
  floorBps?: number;
  className?: string;
}) {
  const prior = source === "prior";
  const belowFloor = floorBps != null && bps < floorBps;
  const showCount = !prior && count != null && count > 0;
  const disputePct =
    disputeRateBps != null && disputeRateBps > 0
      ? (disputeRateBps / 100).toFixed(1)
      : null;

  const parts = [
    prior
      ? `prior estimate ${score(bps)} — no on-chain ratings yet`
      : showCount
        ? `on-chain reputation ${score(bps)} from ${count} rated job${count === 1 ? "" : "s"}`
        : `on-chain reputation ${score(bps)}`,
    belowFloor ? `below the ${score(floorBps)} network floor` : null,
    disputePct ? `${disputePct}% disputed` : null,
  ].filter(Boolean);
  const label = parts.join(" · ");

  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap border px-2 py-0.5 font-mono text-[10px] tracking-widest",
        belowFloor
          ? "border-magenta/40 bg-magenta/15 text-magenta"
          : prior
            ? "border-violet/25 bg-violet/10 text-muted"
            : "border-cyan/40 bg-cyan/10 text-cyan",
        className,
      )}
    >
      <span aria-hidden="true">
        {prior ? "≈" : ""}★
      </span>
      {score(bps)}
      {showCount && <span className="opacity-70">· {count}</span>}
      {disputePct && <span className="text-magenta">⚑ {disputePct}%</span>}
    </span>
  );
}

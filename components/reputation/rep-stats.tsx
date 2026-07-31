import { Card } from "@/components/ui/card";
import { ErrorNote } from "@/components/ui/error-note";
import { Skeleton, LoadingStatus } from "@/components/ui/skeleton";
import { scoreOutOfFive } from "@/lib/reputation-math";
import type { ReputationBatch } from "@/lib/types";

// ReputationInfo.weight arrives in stroops; 10^7 stroops = 1 USDC.
const STROOPS_PER_USDC = 10_000_000;

/**
 * Stat-tile row summarizing the reputation ledger: agents tracked, how many
 * carry on-chain evidence, total settled evidence, and the routing floor.
 * Renders skeleton tiles while loading.
 *
 * A failed batch fetch replaces the whole row with an announced error — these
 * tiles carry a USDC total and the routing floor, and a formatted placeholder
 * ("—", or worse a plausible-looking number) would read as an empty but
 * healthy ledger. An unreachable backend must never be indistinguishable from
 * "no evidence settled yet".
 */
export function RepStats({
  batch,
  loading,
  error,
  onRetry,
}: {
  batch: ReputationBatch | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}) {
  // Checked before `loading` so a retry keeps the alert on screen (and shows
  // its retrying state) instead of flashing back to skeleton tiles.
  if (error) {
    return (
      <ErrorNote className="clip-cyber-sm" onRetry={onRetry} retrying={loading}>
        reputation ledger unavailable — no agent counts, settled evidence total
        or routing floor. {error}
      </ErrorNote>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <LoadingStatus label="Loading reputation stats…" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="h-3 w-24 mb-4" />
            <Skeleton className="h-8 w-20" />
          </Card>
        ))}
      </div>
    );
  }

  const entries = batch ? Object.values(batch.reputations) : null;
  // `unit` is split off the value so the longest tile ("1234.56 USDC") can
  // wrap between amount and unit instead of running past the card — the Card's
  // clip-cyber clip-path cuts overflow off silently, and globals.css sets
  // overflow-x: hidden, so a too-wide money value is lost, not scrollable.
  const tiles = [
    {
      k: "agents tracked",
      v: entries ? entries.length.toLocaleString() : "—",
      unit: null,
      sub: null,
    },
    {
      k: "rated on-chain",
      v: entries
        ? entries.filter((r) => r.source === "onchain").length.toLocaleString()
        : "—",
      unit: null,
      sub: null,
    },
    {
      k: "evidence settled",
      v: entries
        ? (
            entries.reduce((sum, r) => sum + r.weight, 0) / STROOPS_PER_USDC
          ).toFixed(2)
        : "—",
      unit: entries ? "USDC" : null,
      sub: null,
    },
    {
      k: "routing floor",
      v: batch ? `★ ${scoreOutOfFive(batch.floor_bps)}` : "—",
      unit: null,
      sub: "wilson lower bound",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tiles.map((t) => (
        <Card key={t.k}>
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
            {t.k}
          </div>
          {/* Steps down again at lg, where four columns are narrower than the
              two-column tablet layout they replace. */}
          <div className="font-mono text-2xl neon-text break-words sm:text-3xl lg:text-2xl xl:text-3xl">
            {t.v}
            {t.unit && (
              <span className="ml-1.5 text-sm text-muted sm:text-base">
                {t.unit}
              </span>
            )}
          </div>
          {t.sub && (
            <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted">
              {t.sub}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

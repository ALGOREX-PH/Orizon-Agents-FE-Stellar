import { Card } from "@/components/ui/card";
import { Skeleton, LoadingStatus } from "@/components/ui/skeleton";
import { scoreOutOfFive } from "@/lib/reputation-math";
import type { ReputationBatch } from "@/lib/types";

// ReputationInfo.weight arrives in stroops; 10^7 stroops = 1 USDC.
const STROOPS_PER_USDC = 10_000_000;

/**
 * Stat-tile row summarizing the reputation ledger: agents tracked, how many
 * carry on-chain evidence, total settled evidence, and the routing floor.
 * Renders skeleton tiles while loading and em-dash values if the batch never
 * arrives.
 */
export function RepStats({
  batch,
  loading,
}: {
  batch: ReputationBatch | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
  const tiles = [
    {
      k: "agents tracked",
      v: entries ? entries.length.toLocaleString() : "—",
      sub: null,
    },
    {
      k: "rated on-chain",
      v: entries
        ? entries.filter((r) => r.source === "onchain").length.toLocaleString()
        : "—",
      sub: null,
    },
    {
      k: "evidence settled",
      v: entries
        ? `${(
            entries.reduce((sum, r) => sum + r.weight, 0) / STROOPS_PER_USDC
          ).toFixed(2)} USDC`
        : "—",
      sub: null,
    },
    {
      k: "routing floor",
      v: batch ? `★ ${scoreOutOfFive(batch.floor_bps)}` : "—",
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
          <div className="font-mono text-3xl neon-text">{t.v}</div>
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

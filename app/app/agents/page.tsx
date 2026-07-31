"use client";
import { useCallback, useMemo, useState } from "react";
import { m } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorNote } from "@/components/ui/error-note";
import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";
import { StaleBadge } from "@/components/ui/stale-badge";
import { ReputationBadge } from "@/components/ui/reputation-badge";
import { listAgents, listReputation } from "@/lib/api";
import { focusRing } from "@/lib/ui";
import { useFetch } from "@/lib/use-fetch";
import type { Agent } from "@/lib/types";

const statusTone = {
  online: "cyan" as const,
  idle: "violet" as const,
  offline: "muted" as const,
};

export default function AgentsPage() {
  const {
    data: agents,
    error,
    loading,
    retrying,
    lastSuccessAt,
    reload: reloadAgents,
  } = useFetch(listAgents, [], {
    revalidateOnFocus: true,
  });
  // On-chain reputation is best-effort: on error we silently keep seeded values.
  const { data: repBatch, reload: reloadReputation } = useFetch(
    listReputation,
    [],
    { revalidateOnFocus: true },
  );

  // One outage takes down both reads, so a retry re-runs them together.
  const retry = useCallback(() => {
    reloadAgents();
    reloadReputation();
  }, [reloadAgents, reloadReputation]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "online" | "idle" | "offline">(
    "all",
  );

  const rows = useMemo(() => {
    if (!agents) return [];
    return agents.filter((a) => {
      const ql = q.toLowerCase();
      const matchesQ =
        !ql ||
        a.name.toLowerCase().includes(ql) ||
        a.skills.some((s) => s.toLowerCase().includes(ql));
      const matchesStatus = filter === "all" || a.status === filter;
      return matchesQ && matchesStatus;
    });
  }, [agents, q, filter]);

  const renderReputation = (a: Agent) => {
    const live = repBatch?.reputations[a.id];
    if (live && live.source === "onchain") {
      return (
        <ReputationBadge
          bps={live.smoothed_bps}
          source="onchain"
          count={live.count}
          disputeRateBps={live.dispute_rate_bps}
          floorBps={repBatch?.floor_bps}
        />
      );
    }
    return (
      <ReputationBadge
        bps={a.rep * 2000}
        source="prior"
        floorBps={repBatch?.floor_bps}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Agent Registry
          </h1>
          <p className="mt-1 text-sm text-muted">
            ERC-8004 profiles — identity, skills, price, reputation.
          </p>
        </div>
        <Button variant="primary" disabled title="coming soon">
          + Register agent
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[240px]">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
            >
              <circle
                cx="9"
                cy="9"
                r="6"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M14 14l4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="search"
              aria-label="Search agents by name or skill"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="search name or skill…"
              className={`clip-cyber-sm w-full border border-input bg-bg/60 pl-10 pr-4 h-10 text-sm placeholder:text-muted focus:border-violet transition ${focusRing}`}
            />
          </div>
          <div className="flex gap-2">
            {(["all", "online", "idle", "offline"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  `clip-cyber-sm border px-3 h-10 font-mono text-[10px] uppercase tracking-widest transition ${focusRing} ` +
                  (filter === f
                    ? "border-violet bg-violet/20 text-text"
                    : "border-border text-muted hover:text-text")
                }
              >
                {f}
              </button>
            ))}
          </div>
          {/* Rendered only once a registry has actually been fetched — the
              hook drops `lastSuccessAt` with the data it dates, so a first
              load that never landed shows the error frame alone. */}
          <StaleBadge
            stale={Boolean(error)}
            lastSuccessAt={lastSuccessAt}
            what="agent registry"
          />
        </div>

        {/* `retrying` covers the gaps *between* automatic attempts, when the
            hook is asleep on its backoff and `loading` is false — without it
            the frame flips back to an idle "retry" button and reads like a
            dead end mid-recovery. */}
        {error && (
          <ErrorNote
            className="mb-4 clip-cyber-sm"
            onRetry={retry}
            retrying={loading || retrying}
          >
            backend offline — {error}
          </ErrorNote>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
                <th className="pb-3 text-left">id</th>
                <th className="pb-3 text-left">agent</th>
                <th className="pb-3 text-left">skills</th>
                <th className="pb-3 text-right">price / call</th>
                <th className="pb-3 text-right">reputation</th>
                <th className="pb-3 text-right">runs</th>
                <th className="pb-3 text-left">status</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {/* `!error` first: a retry attempt flips `loading` back to true,
                  and a skeleton must never win over the error frame — that
                  alternation is what makes a failing page look alive. */}
              {!agents &&
                !error &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td colSpan={8} className="py-3">
                      <Skeleton className="h-5 w-full" />
                      {i === 0 && <LoadingStatus label="Loading agents…" />}
                    </td>
                  </tr>
                ))}

              {!agents && error && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-10 text-center text-muted font-mono text-xs"
                  >
                    couldn&apos;t load agents — the registry is unreachable.
                  </td>
                </tr>
              )}

              {rows.map((a, i) => (
                <m.tr
                  key={a.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.03 }}
                  className="border-b border-border/50 last:border-0 hover:bg-violet/5 transition"
                >
                  <td className="py-3 font-mono text-xs text-muted">{a.id}</td>
                  <td className="py-3 font-mono">
                    <div className="flex items-center gap-2">
                      {a.name}
                      {a.real && <Badge tone="cyan">LIVE</Badge>}
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {a.skills.map((s) => (
                        <Badge key={s} tone="muted">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 text-right font-mono text-cyan">
                    {a.price.toFixed(3)}
                  </td>
                  <td className="py-3 text-right">{renderReputation(a)}</td>
                  <td className="py-3 text-right font-mono text-xs text-muted">
                    {a.runs.toLocaleString()}
                  </td>
                  <td className="py-3">
                    <Badge
                      tone={statusTone[a.status]}
                      dot={a.status === "online"}
                    >
                      {a.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled
                      title="coming soon"
                    >
                      ▸ view
                    </Button>
                  </td>
                </m.tr>
              ))}
              {agents && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-10 text-center text-muted font-mono text-xs"
                  >
                    no agents match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

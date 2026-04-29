"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStellarEvents, type FeedEvent } from "@/lib/stellar-events";

type StellarInfo = {
  network: string;
  contracts: Record<string, string>;
};

export default function EventsPage() {
  const [info, setInfo] = useState<StellarInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stellar/network")
      .then((r) => {
        if (!r.ok) throw new Error(`GET /api/stellar/network → ${r.status}`);
        return r.json();
      })
      .then(setInfo)
      .catch((e) => setLoadError(e.message));
  }, []);

  const contractIds = useMemo(
    () => (info ? Object.values(info.contracts) : null),
    [info],
  );

  // Reverse map id → label so we can display "PaymentEscrow" instead of CBJP…
  const idToLabel = useMemo(() => {
    if (!info) return new Map<string, string>();
    const m = new Map<string, string>();
    for (const [name, id] of Object.entries(info.contracts)) {
      m.set(id, prettyName(name));
    }
    return m;
  }, [info]);

  const { status, events, latestLedger, lastTickAt, error } = useStellarEvents(
    contractIds,
    { intervalMs: 5000, max: 60 },
  );

  const ageSec =
    lastTickAt !== null ? Math.max(0, Math.floor((Date.now() - lastTickAt) / 1000)) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Events</h1>
          <p className="mt-1 text-sm text-muted">
            Live Soroban contract events for Orizon's four contracts. Polling{" "}
            <code className="text-cyan">getEvents</code> from testnet RPC every 5 s.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge tone={status === "live" ? "success" : "magenta"} dot>
            {status === "live"
              ? "live"
              : status === "starting"
                ? "starting…"
                : status === "error"
                  ? "error"
                  : "idle"}
          </Badge>
          {latestLedger !== null && (
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
              ledger #{latestLedger}
            </span>
          )}
          {ageSec !== null && (
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
              last poll: {ageSec}s ago
            </span>
          )}
        </div>
      </div>

      {loadError && (
        <Card>
          <div className="font-mono text-[11px] text-magenta">
            backend offline — {loadError}
          </div>
        </Card>
      )}

      {error && (
        <Card>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-magenta mb-2">
            ▸ rpc error
          </div>
          <div className="font-mono text-[11px] text-magenta break-all">{error}</div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan">
            ▸ contract event feed
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            {events.length} {events.length === 1 ? "event" : "events"}
          </span>
        </div>

        {events.length === 0 ? (
          <div className="space-y-2">
            <div className="text-sm text-muted">
              No events yet. Run a workflow on{" "}
              <a href="/app/orchestrator" className="text-cyan hover:underline">
                /app/orchestrator
              </a>{" "}
              — it'll publish <code className="text-cyan">charge</code> and{" "}
              <code className="text-cyan">seal</code> events that show up here within a
              ledger.
            </div>
            <div className="flex gap-3 pt-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex-1 h-16 clip-cyber-sm border border-border bg-bg/40 animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : (
          <ol className="space-y-2">
            {events.map((e) => (
              <EventRow key={e.id} event={e} idToLabel={idToLabel} />
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function EventRow({
  event,
  idToLabel,
}: {
  event: FeedEvent;
  idToLabel: Map<string, string>;
}) {
  const label = idToLabel.get(event.contractId) ?? "Unknown";
  const topic = event.topics[0] || "·";
  return (
    <li className="clip-cyber-sm border border-border bg-bg/40 p-3 hover:border-violet/50 transition">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Badge tone="violet">{label}</Badge>
          <code className="font-mono text-sm text-cyan">{topic}</code>
          {event.topics.slice(1).length > 0 && (
            <span className="font-mono text-[10px] text-muted">
              + {event.topics.slice(1).length} arg
              {event.topics.length > 2 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          <span>ledger #{event.ledger}</span>
          <span>·</span>
          <span>{relativeTime(event.ledgerClosedAt)}</span>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
        <div className="font-mono text-[11px] text-muted break-all">
          {summarize(event.value)}
        </div>
        <a
          href={`https://stellar.expert/explorer/testnet/tx/${event.txHash}`}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[10px] uppercase tracking-widest text-cyan hover:text-text whitespace-nowrap"
        >
          tx ▸ {event.txHash.slice(0, 8)}…
        </a>
      </div>
    </li>
  );
}

function summarize(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "bigint" || typeof v === "boolean")
    return String(v);
  try {
    const s = JSON.stringify(v, (_k, val) =>
      typeof val === "bigint" ? val.toString() : val,
    );
    return s.length > 200 ? s.slice(0, 200) + "…" : s;
  } catch {
    return String(v);
  }
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return iso;
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function prettyName(s: string): string {
  return s
    .split("_")
    .map((w) => (w[0]?.toUpperCase() ?? "") + w.slice(1))
    .join(" ");
}

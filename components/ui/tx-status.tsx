"use client";
/**
 * Shared transaction-status component.
 *
 * Yellow Belt requires explicit lifecycle states (pending / success / fail).
 * This component renders the full progression as a step trail plus the
 * final-state card, so call-sites can drop in one component instead of
 * hand-rolling the same UI in every page.
 *
 *   <TxStatus state="signing" />
 *   <TxStatus state="success" hash="..." amount="1 XLM" destination="G..." />
 *   <TxStatus state="failed" error={friendlyError} />
 */

import { Card } from "@/components/ui/card";
import type { FriendlyError } from "@/lib/wallet-errors";

export type TxState =
  | "idle"
  | "building"
  | "signing"
  | "broadcasting"
  | "pending"
  | "success"
  | "failed";

const STEPS: { id: TxState; label: string }[] = [
  { id: "building", label: "Build" },
  { id: "signing", label: "Sign" },
  { id: "broadcasting", label: "Broadcast" },
  { id: "pending", label: "Pending" },
  { id: "success", label: "Confirmed" },
];

const ORDER: Record<TxState, number> = {
  idle: -1,
  building: 0,
  signing: 1,
  broadcasting: 2,
  pending: 3,
  success: 4,
  failed: 4,
};

export function TxStatus({
  state,
  hash,
  amount,
  destination,
  memo,
  error,
  network = "testnet",
  className,
}: {
  state: TxState;
  hash?: string;
  amount?: string;
  destination?: string;
  memo?: string | null;
  error?: FriendlyError | null;
  network?: "testnet" | "public";
  className?: string;
}) {
  if (state === "idle") return null;

  return (
    <div className={className}>
      <StepTrail state={state} />
      {state === "success" && hash && (
        <SuccessCard
          hash={hash}
          amount={amount}
          destination={destination}
          memo={memo ?? null}
          network={network}
        />
      )}
      {state === "failed" && error && <FailedCard error={error} />}
    </div>
  );
}

function StepTrail({ state }: { state: TxState }) {
  if (state === "failed") {
    return null;
  }
  const current = ORDER[state];
  return (
    <Card className="mb-4">
      <div className="flex items-center justify-between gap-2">
        {STEPS.map((s, i) => {
          const idx = ORDER[s.id];
          const done = idx < current;
          const active = idx === current;
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={[
                    "h-3 w-3 rounded-full transition-all",
                    done && "bg-cyan shadow-[0_0_8px_#00FFD1]",
                    active && "bg-violet shadow-[0_0_12px_#B026FF] animate-pulse",
                    !done && !active && "bg-border",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
                <span
                  className={[
                    "font-mono text-[10px] uppercase tracking-[0.2em] whitespace-nowrap",
                    done && "text-cyan",
                    active && "text-text",
                    !done && !active && "text-muted",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={[
                    "flex-1 h-px mx-2",
                    done ? "bg-cyan/60" : "bg-border",
                  ].join(" ")}
                />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function SuccessCard({
  hash,
  amount,
  destination,
  memo,
  network,
}: {
  hash: string;
  amount?: string;
  destination?: string;
  memo: string | null;
  network: "testnet" | "public";
}) {
  return (
    <Card>
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan mb-3">
        ✓ transaction confirmed
      </div>
      <div className="space-y-2 font-mono text-sm">
        {amount && destination && (
          <Row k="sent" v={`${amount} → ${shortG(destination)}`} />
        )}
        {memo && <Row k="memo" v={memo} />}
        <Row k="tx hash" v={hash} mono />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={`https://stellar.expert/explorer/${network}/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
          className="clip-cyber-sm border border-cyan/60 bg-cyan/10 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-cyan hover:bg-cyan/20 transition"
        >
          view on stellar.expert ▸
        </a>
        <a
          href={`https://horizon-${network === "testnet" ? "testnet" : ""}.stellar.org/transactions/${hash}`}
          target="_blank"
          rel="noreferrer"
          className="clip-cyber-sm border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted hover:text-text hover:border-violet/60 transition"
        >
          raw horizon ▸
        </a>
      </div>
    </Card>
  );
}

function FailedCard({ error }: { error: FriendlyError }) {
  return (
    <Card>
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-magenta mb-2">
        ✗ {error.title}
      </div>
      <div className="text-sm text-text mb-3">{error.detail}</div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
        kind: <span className="text-magenta">{error.kind}</span>
      </div>
      {error.raw && error.raw !== error.detail && (
        <details className="mt-3 font-mono text-[11px] text-muted">
          <summary className="cursor-pointer hover:text-text">raw error</summary>
          <pre className="mt-2 whitespace-pre-wrap break-all text-magenta/80">
            {error.raw}
          </pre>
        </details>
      )}
    </Card>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 flex-wrap">
      <span className="text-muted text-[10px] uppercase tracking-widest">{k}</span>
      <span className={`text-right ${mono ? "text-cyan break-all" : "text-text"}`}>
        {v}
      </span>
    </div>
  );
}

function shortG(g: string): string {
  if (g.length <= 12) return g;
  return `${g.slice(0, 6)}…${g.slice(-6)}`;
}

"use client";
import { useState } from "react";
import { m } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConnectWallet } from "@/components/ui/connect-wallet";
import { ReputationBadge } from "@/components/ui/reputation-badge";
import { defaultExplorerNetwork } from "@/components/ui/stellar-link";
import { useWallet } from "@/lib/wallet";
import type { DecomposeResponse } from "@/lib/types";
import { FiatFund } from "./fiat-fund";

// Display label for the configured network — "mainnet" | "testnet".
const NETWORK_LABEL = defaultExplorerNetwork === "public" ? "mainnet" : "testnet";

/** Which stage of the on-chain authorize flow is running (for button copy). */
export type ExecStep = "" | "sign" | "broadcast" | "execute";

const stepLabel: Record<Exclude<ExecStep, "">, string> = {
  sign: "◉ Freighter…",
  broadcast: "◉ Broadcasting…",
  execute: "◉ Launching…",
};

/**
 * The decomposed-plan card: step list, totals, and the execute controls
 * (simulate / fiat funding / on-chain authorize). Purely presentational —
 * the async flows live in the page; this owns only the fiat-panel toggle.
 */
export function ExecutionPlan({
  plan,
  executing,
  step,
  onSimulate,
  onAuthorize,
}: {
  plan: DecomposeResponse;
  executing: boolean;
  step: ExecStep;
  onSimulate: () => void;
  onAuthorize: () => void;
}) {
  const wallet = useWallet();
  const [showFiat, setShowFiat] = useState(false);

  const fiatToggle = (
    <Button
      variant="primary"
      onClick={() => setShowFiat((v) => !v)}
      disabled={executing}
      size="md"
    >
      {showFiat ? "▾ Hide Fiat" : "Pay with Fiat ▸"}
    </Button>
  );

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Execution plan</h2>
              <Badge tone="violet" dot>
                PHP accepted
              </Badge>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
              plan {plan.plan_id} · {plan.steps.length} step
              {plan.steps.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs">
            <div>
              <div className="text-muted uppercase tracking-widest text-[10px]">
                total est.
              </div>
              <div className="text-cyan text-lg">
                {plan.total_usdc.toFixed(3)} USDC
              </div>
            </div>
            <div>
              <div className="text-muted uppercase tracking-widest text-[10px]">
                eta
              </div>
              <div className="text-violet text-lg">{plan.total_eta.toFixed(1)}s</div>
            </div>
          </div>
        </div>

        <ol className="space-y-3">
          {plan.steps.map((s, i) => (
            <m.li
              key={`${s.agent_id}-${i}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className="clip-cyber-sm border border-border bg-bg/60 p-4 flex flex-wrap items-center gap-4"
            >
              <div className="font-mono text-xs text-muted w-8">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="violet">{s.agent_name ?? s.agent_id}</Badge>
                {s.rep_bps != null && (
                  <ReputationBadge bps={s.rep_bps} source={s.rep_source ?? "prior"} />
                )}
              </div>
              <span className="text-sm text-muted">→</span>
              <div className="flex-1 text-sm">{s.rationale}</div>
              <div className="font-mono text-xs text-cyan">
                {s.est_price_usdc.toFixed(3)} · {s.est_eta_seconds.toFixed(1)}s
              </div>
            </m.li>
          ))}
        </ol>

        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 clip-cyber-sm border border-cyan/40 bg-cyan/5 p-4"
        >
          {wallet.connected ? (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan mb-1">
                  ▸ ready to authorize on-chain
                </div>
                <div className="text-sm">
                  Freighter will prompt for <b className="text-text">one signature</b>{" "}
                  authorizing up to{" "}
                  <b className="text-text">{plan.total_usdc.toFixed(3)} USDC</b>.
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onSimulate}
                  disabled={executing}
                  size="md"
                >
                  simulate
                </Button>
                {fiatToggle}
                <Button
                  variant="cyan"
                  onClick={onAuthorize}
                  disabled={executing}
                  size="md"
                >
                  {executing && step !== ""
                    ? stepLabel[step]
                    : executing
                      ? "◉ Launching…"
                      : "Authorize & Execute ▸"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-magenta mb-1">
                  ▸ wallet required
                </div>
                <div className="text-sm">
                  Connect Freighter ({NETWORK_LABEL}) to pay with x402 on-chain, or run
                  a simulated pass.
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <ConnectWallet size="md" />
                {fiatToggle}
                <Button
                  variant="outline"
                  onClick={onSimulate}
                  disabled={executing}
                  size="md"
                >
                  simulate ▸
                </Button>
              </div>
            </div>
          )}
        </m.div>

        {showFiat && (
          <div className="mt-4">
            <FiatFund
              usdcAmount={plan.total_usdc}
              stellarAddress={wallet.address ?? undefined}
            />
          </div>
        )}
      </Card>
    </m.div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConnectWallet } from "@/components/ui/connect-wallet";
import { buildAuthorize, decompose, execute, submitSigned } from "@/lib/api";
import { useWallet } from "@/lib/wallet";
import type { DecomposeResponse } from "@/lib/types";

function bytesToHex(v: unknown): string | null {
  // The backend returns the 16-byte auth_id as a base64-ish or list — normalize.
  if (typeof v === "string") {
    // hex already?
    if (/^[0-9a-f]{32}$/i.test(v)) return v.toLowerCase();
    // base64?
    try {
      const bin = atob(v);
      let hex = "";
      for (let i = 0; i < bin.length; i++) {
        hex += bin.charCodeAt(i).toString(16).padStart(2, "0");
      }
      if (hex.length === 32) return hex;
    } catch {
      /* fall through */
    }
  }
  if (Array.isArray(v)) {
    const bytes = v as number[];
    if (bytes.length === 16) {
      return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  }
  return null;
}

export default function OrchestratorPage() {
  const router = useRouter();
  const wallet = useWallet();

  const [intent, setIntent] = useState("");
  const [plan, setPlan] = useState<DecomposeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [step, setStep] = useState<"" | "sign" | "broadcast" | "execute">("");
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!intent.trim()) return;
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const p = await decompose(intent.trim());
      setPlan(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setLoading(false);
    }
  };

  /** Simulated path — no wallet required. */
  const runSimulated = async () => {
    if (!plan) return;
    setExecuting(true);
    setError(null);
    try {
      const { task_id } = await execute(plan.plan_id);
      router.push(`/app/trace?task=${task_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setExecuting(false);
    }
  };

  /** Real on-chain path: Freighter signs authorize, backend charges + seals. */
  const authorizeAndExecute = async () => {
    if (!plan || !wallet.connected || !wallet.address) return;
    setExecuting(true);
    setError(null);
    try {
      setStep("sign");
      const { xdr } = await buildAuthorize({
        payer: wallet.address,
        agent_id: "orizon_batch",
        max_amount_usdc: plan.total_usdc || 0.001,
        ttl_seconds: 600,
      });

      const signedXdr = await wallet.signXdr(xdr);

      setStep("broadcast");
      const broadcast = (await submitSigned(signedXdr)) as {
        status: string;
        hash: string;
        return_value: unknown;
        diagnostic?: string;
        explorer?: string;
      };
      if (broadcast.status !== "SUCCESS") {
        const bits = [
          `authorize tx ${broadcast.status}`,
          broadcast.diagnostic,
          broadcast.explorer,
        ]
          .filter(Boolean)
          .join(" · ");
        throw new Error(bits);
      }
      const authHex = bytesToHex(broadcast.return_value);
      if (!authHex) throw new Error("failed to read auth_id from tx result");

      setStep("execute");
      const { task_id } = await execute(plan.plan_id, {
        auth_id_hex: authHex,
        payer: wallet.address,
      });
      router.push(`/app/trace?task=${task_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setExecuting(false);
      setStep("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Orchestrator</h1>
        <p className="mt-1 text-sm text-muted">
          Intent in. Agent chain out. Pay-per-workflow via x402 on Stellar.
        </p>
      </div>

      <Card>
        <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan">
          ▸ intent
        </label>
        <textarea
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          placeholder='e.g. "code a calculator web app"'
          rows={3}
          className="mt-2 w-full bg-bg/60 border border-border p-4 font-mono text-sm placeholder:text-muted/70 focus:border-violet focus:outline-none focus:shadow-neon-violet transition"
        />

        <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            {[
              "code a calculator web app",
              "build a pomodoro timer app",
              "make a landing page for pulse ai",
            ].map((s) => (
              <button
                key={s}
                onClick={() => setIntent(s)}
                className="clip-cyber-sm border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted hover:text-text hover:border-violet/60 transition"
              >
                ▸ {s.slice(0, 36)}
              </button>
            ))}
          </div>
          <Button onClick={run} disabled={!intent.trim() || loading}>
            {loading ? "◉ Decomposing…" : "Decompose ▸"}
          </Button>
        </div>

        {error && (
          <div className="mt-4 clip-cyber-sm border border-magenta/40 bg-magenta/5 px-4 py-3 font-mono text-xs text-magenta">
            {error}
          </div>
        )}
      </Card>

      <AnimatePresence>
        {plan && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Execution plan</h2>
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
                    <div className="text-violet text-lg">
                      {plan.total_eta.toFixed(1)}s
                    </div>
                  </div>
                </div>
              </div>

              <ol className="space-y-3">
                {plan.steps.map((s, i) => (
                  <motion.li
                    key={`${s.agent_id}-${i}`}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.06 }}
                    className="clip-cyber-sm border border-border bg-bg/60 p-4 flex items-center gap-4"
                  >
                    <div className="font-mono text-xs text-muted w-8">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <Badge tone="violet">{s.agent_name ?? s.agent_id}</Badge>
                    <span className="text-sm text-muted">→</span>
                    <div className="flex-1 text-sm">{s.rationale}</div>
                    <div className="font-mono text-xs text-cyan">
                      {s.est_price_usdc.toFixed(3)} · {s.est_eta_seconds.toFixed(1)}s
                    </div>
                  </motion.li>
                ))}
              </ol>

              <motion.div
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
                        onClick={runSimulated}
                        disabled={executing}
                        size="md"
                      >
                        simulate
                      </Button>
                      <Button
                        variant="cyan"
                        onClick={authorizeAndExecute}
                        disabled={executing}
                        size="md"
                      >
                        {executing
                          ? step === "sign"
                            ? "◉ Freighter…"
                            : step === "broadcast"
                              ? "◉ Broadcasting…"
                              : "◉ Launching…"
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
                        Connect Freighter (testnet) to pay with x402 on-chain, or run
                        a simulated pass.
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <ConnectWallet size="md" />
                      <Button
                        variant="outline"
                        onClick={runSimulated}
                        disabled={executing}
                        size="md"
                      >
                        simulate ▸
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

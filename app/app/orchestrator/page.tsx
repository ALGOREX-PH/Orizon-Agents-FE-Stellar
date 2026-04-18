"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { decompose, execute } from "@/lib/api";
import type { DecomposeResponse } from "@/lib/types";

export default function OrchestratorPage() {
  const router = useRouter();
  const [intent, setIntent] = useState("");
  const [plan, setPlan] = useState<DecomposeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
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

  const go = async () => {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Orchestrator</h1>
        <p className="mt-1 text-sm text-muted">
          Intent in. Agent chain out. Pay-per-call via x402.
        </p>
      </div>

      <Card>
        <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan">
          ▸ intent
        </label>
        <textarea
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          placeholder='e.g. "build a waitlist landing page for pulse ai"'
          rows={3}
          className="mt-2 w-full bg-bg/60 border border-border p-4 font-mono text-sm placeholder:text-muted/70 focus:border-violet focus:outline-none focus:shadow-neon-violet transition"
        />

        <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            {[
              "build a landing page for pulse ai",
              "audit vault.sol for re-entrancy",
              "weekly seo brief for fintech ph",
            ].map((s) => (
              <button
                key={s}
                onClick={() => setIntent(s)}
                className="clip-cyber-sm border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted hover:text-text hover:border-violet/60 transition"
              >
                ▸ {s.slice(0, 36)}…
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
                    plan {plan.plan_id} · {plan.steps.length} steps
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
                className="mt-6 flex items-center justify-between clip-cyber-sm border border-cyan/40 bg-cyan/5 p-4 flex-wrap gap-3"
              >
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan mb-1">
                    ▸ ready to execute
                  </div>
                  <div className="text-sm">
                    Click execute to charge agents via x402 and stream the trace.
                  </div>
                </div>
                <Button variant="cyan" onClick={go} disabled={executing}>
                  {executing ? "◉ Launching…" : "Execute ▸"}
                </Button>
              </motion.div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

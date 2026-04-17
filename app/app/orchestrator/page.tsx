"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Step = {
  agent: string;
  skill: string;
  price: number;
  eta: string;
  rationale: string;
};

const plan: Step[] = [
  {
    agent: "seo.brief",
    skill: "research",
    price: 0.009,
    eta: "0.4s",
    rationale: "cheapest agent with audience-clustering capability",
  },
  {
    agent: "copywrite.v3",
    skill: "content",
    price: 0.012,
    eta: "0.5s",
    rationale: "highest reputation (4.92) for en-US marketing copy",
  },
  {
    agent: "design.figma",
    skill: "ui",
    price: 0.048,
    eta: "1.1s",
    rationale: "only agent returning exportable figma layers",
  },
  {
    agent: "code.next",
    skill: "frontend",
    price: 0.066,
    eta: "0.9s",
    rationale: "best match for next.js + tailwind target stack",
  },
  {
    agent: "deploy.v0",
    skill: "deploy",
    price: 0.031,
    eta: "0.4s",
    rationale: "lowest cost deployment agent with vercel adapter",
  },
];

export default function OrchestratorPage() {
  const [intent, setIntent] = useState("");
  const [running, setRunning] = useState(false);
  const [revealed, setRevealed] = useState(0);

  const run = () => {
    if (!intent.trim()) return;
    setRunning(true);
    setRevealed(0);
    plan.forEach((_, i) => {
      setTimeout(() => setRevealed(i + 1), 400 + i * 500);
    });
  };

  const total = plan.reduce((s, p) => s + p.price, 0);

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
          <Button onClick={run} disabled={!intent.trim() || running}>
            {running ? "◉ Running…" : "Decompose ▸"}
          </Button>
        </div>
      </Card>

      <AnimatePresence>
        {revealed > 0 && (
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
                    {revealed} / {plan.length} steps matched
                  </p>
                </div>
                <div className="flex items-center gap-6 font-mono text-xs">
                  <div>
                    <div className="text-muted uppercase tracking-widest text-[10px]">
                      total est.
                    </div>
                    <div className="text-cyan text-lg">
                      {total.toFixed(3)} USDC
                    </div>
                  </div>
                  <div>
                    <div className="text-muted uppercase tracking-widest text-[10px]">
                      eta
                    </div>
                    <div className="text-violet text-lg">3.3s</div>
                  </div>
                </div>
              </div>

              <ol className="space-y-3">
                {plan.slice(0, revealed).map((s, i) => (
                  <motion.li
                    key={s.agent}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35 }}
                    className="relative clip-cyber-sm border border-border bg-bg/60 p-4 flex items-center gap-4"
                  >
                    <div className="font-mono text-xs text-muted w-8">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <Badge tone="violet">{s.agent}</Badge>
                    <span className="text-sm text-muted">→</span>
                    <div className="flex-1 text-sm">{s.rationale}</div>
                    <div className="font-mono text-xs text-cyan">
                      {s.price.toFixed(3)} · {s.eta}
                    </div>
                  </motion.li>
                ))}
              </ol>

              {revealed === plan.length && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-6 flex items-center justify-between clip-cyber-sm border border-cyan/40 bg-cyan/5 p-4"
                >
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan mb-1">
                      ▸ ready to execute
                    </div>
                    <div className="text-sm">
                      Plan sealed. Click execute to charge and run.
                    </div>
                  </div>
                  <Button variant="cyan">Execute ▸</Button>
                </motion.div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

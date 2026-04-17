"use client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { flowGraph } from "@/lib/mock-data";

export default function FlowPage() {
  const { nodes, edges } = flowGraph;
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Flow</h1>
          <p className="mt-1 text-sm text-muted">
            Chain agents with conditional logic and parallel branches.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">↻ Reset</Button>
          <Button size="sm">+ Save workflow</Button>
        </div>
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-surface/80 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Badge tone="violet" dot>autonomous-growth.flow</Badge>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
              6 nodes · 6 edges
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan">
              ◉ live preview
            </span>
          </div>
        </div>

        <div className="relative h-[520px] w-full bg-[#060010] overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-60" />
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#B026FF" />
                <stop offset="100%" stopColor="#00FFD1" />
              </linearGradient>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="4"
                markerHeight="4"
                orient="auto"
              >
                <path d="M0,0 L10,5 L0,10 z" fill="#00FFD1" />
              </marker>
            </defs>
            {edges.map(([from, to], i) => {
              const a = nodeById[from];
              const b = nodeById[to];
              return (
                <motion.path
                  key={`${from}-${to}`}
                  d={`M${a.x},${a.y} C${(a.x + b.x) / 2},${a.y} ${(a.x + b.x) / 2},${b.y} ${b.x},${b.y}`}
                  stroke="url(#edge)"
                  strokeWidth="0.3"
                  strokeDasharray="1 1"
                  fill="none"
                  markerEnd="url(#arrow)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.15 * i }}
                />
              );
            })}
          </svg>

          {nodes.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: 0.08 * i }}
              className="absolute"
              style={{
                left: `${n.x}%`,
                top: `${n.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="clip-cyber-sm border border-violet/60 bg-surface/80 px-4 py-2.5 shadow-neon-violet backdrop-blur hover:border-violet transition min-w-[140px]">
                <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-cyan">
                  ▸ {n.sub}
                </div>
                <div className="font-mono text-sm">{n.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { h: "Nodes", v: "6", t: "violet" as const },
          { h: "Parallel branches", v: "2", t: "cyan" as const },
          { h: "Est. per-run cost", v: "0.112 USDC", t: "magenta" as const },
        ].map((s) => (
          <Card key={s.h}>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted mb-2">
              {s.h}
            </div>
            <div className="font-mono text-2xl neon-text">{s.v}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

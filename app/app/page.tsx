"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getOverview, listTasks } from "@/lib/api";
import type { Overview, Task } from "@/lib/types";

const statusTone: Record<Task["status"], "cyan" | "violet" | "muted" | "magenta"> = {
  complete: "cyan",
  running: "violet",
  pending: "muted",
  failed: "magenta",
};

function Sparkline({ points }: { points: number[] }) {
  if (!points.length) return <div className="h-36" />;
  const max = Math.max(...points);
  const w = 600;
  const h = 140;
  const path = points
    .map((v, i) => {
      const x = (i / Math.max(1, points.length - 1)) * w;
      const y = h - (v / max) * (h - 12) - 6;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-36 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#B026FF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#B026FF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L${w},${h} L0,${h} Z`} fill="url(#sparkFill)" />
      <path d={path} stroke="#B026FF" strokeWidth="1.5" fill="none" />
      <path d={path} stroke="#00FFD1" strokeWidth="0.6" fill="none" opacity="0.6" />
    </svg>
  );
}

export default function OverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [o, t] = await Promise.all([getOverview(), listTasks()]);
        if (!alive) return;
        setOverview(o);
        setTasks(t);
        setError(null);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "fetch failed");
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const metrics = overview
    ? [
        { k: "Agents online", v: overview.agents_online.toLocaleString(), d: "live", tone: "cyan" as const },
        { k: "Tasks / s", v: overview.tasks_per_sec.toFixed(3), d: "+12%", tone: "violet" as const },
        { k: "Avg completion", v: `${(overview.avg_completion * 100).toFixed(1)}%`, d: "+0.4", tone: "cyan" as const },
        { k: "Avg trust", v: overview.avg_trust.toFixed(2), d: "/5", tone: "magenta" as const },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted">
            Realtime pulse of the Orizon network.
          </p>
        </div>
        <Badge tone={error ? "magenta" : "violet"} dot>
          {error ? "backend offline" : "streaming"}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {(overview ? metrics : [0, 1, 2, 3]).map((m, i) =>
          typeof m === "number" ? (
            <Card key={i}>
              <Skeleton className="h-3 w-24 mb-4" />
              <Skeleton className="h-8 w-16" />
            </Card>
          ) : (
            <motion.div
              key={m.k}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
                    {m.k}
                  </span>
                  <Badge tone={m.tone}>{m.d}</Badge>
                </div>
                <div className="font-mono text-3xl neon-text">{m.v}</div>
              </Card>
            </motion.div>
          ),
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Throughput</h2>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
                tasks executed · last 24h
              </p>
            </div>
            <div className="flex gap-2">
              {["1h", "24h", "7d"].map((t, i) => (
                <button
                  key={t}
                  className={
                    "clip-cyber-sm border px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition " +
                    (i === 1
                      ? "border-violet bg-violet/20 text-text"
                      : "border-border text-muted hover:text-text")
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          {overview ? <Sparkline points={overview.throughput} /> : <Skeleton className="h-36 w-full" />}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-1">Network composition</h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted mb-5">
            by skill cluster
          </p>
          <div className="space-y-3">
            {(overview?.skills ?? []).map((r) => (
              <div key={r.name}>
                <div className="flex items-center justify-between font-mono text-[11px] text-muted mb-1">
                  <span className="uppercase tracking-widest">{r.name}</span>
                  <span>{r.pct}%</span>
                </div>
                <div className="h-1.5 bg-white/5 overflow-hidden">
                  <div
                    className={
                      "h-full " +
                      (r.tone === "violet"
                        ? "bg-violet shadow-[0_0_10px_#B026FF]"
                        : r.tone === "cyan"
                          ? "bg-cyan shadow-[0_0_10px_#00FFD1]"
                          : "bg-magenta shadow-[0_0_10px_#FF2E9A]")
                    }
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
              </div>
            ))}
            {!overview && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Recent tasks</h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
            {tasks ? `${tasks.length} tracked` : "loading…"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
                <th className="pb-3 text-left">id</th>
                <th className="pb-3 text-left">intent</th>
                <th className="pb-3 text-left">agents</th>
                <th className="pb-3 text-left">spent</th>
                <th className="pb-3 text-left">status</th>
                <th className="pb-3 text-right">started</th>
              </tr>
            </thead>
            <tbody>
              {(tasks ?? []).map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-border/50 last:border-0 hover:bg-violet/5 transition"
                >
                  <td className="py-3 font-mono text-xs text-muted">{t.id}</td>
                  <td className="py-3 max-w-md truncate">{t.intent}</td>
                  <td className="py-3 font-mono text-xs">{t.agents}</td>
                  <td className="py-3 font-mono text-xs text-cyan">{t.spent.toFixed(3)} USDC</td>
                  <td className="py-3">
                    <Badge tone={statusTone[t.status]} dot={t.status !== "complete"}>
                      {t.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-right font-mono text-xs text-muted">{t.started}</td>
                </tr>
              ))}
              {tasks && tasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted font-mono text-xs">
                    No tasks yet — try the Orchestrator.
                  </td>
                </tr>
              )}
              {!tasks &&
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td colSpan={6} className="py-3">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

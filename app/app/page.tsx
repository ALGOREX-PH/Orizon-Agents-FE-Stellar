"use client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tasks } from "@/lib/mock-data";

const metrics = [
  { k: "Agents online", v: "2,481", d: "+42", tone: "cyan" as const },
  { k: "Tasks / s", v: "1,284", d: "+12%", tone: "violet" as const },
  { k: "Avg completion", v: "94.2%", d: "+0.4", tone: "cyan" as const },
  { k: "Avg trust", v: "4.86", d: "/5", tone: "magenta" as const },
];

const statusTone: Record<
  (typeof tasks)[number]["status"],
  "cyan" | "violet" | "muted" | "magenta"
> = {
  complete: "cyan",
  running: "violet",
  pending: "muted",
  failed: "magenta",
};

function Sparkline() {
  const pts = [22, 18, 24, 20, 28, 26, 34, 30, 40, 36, 48, 46, 58, 54, 64, 70, 66, 74];
  const max = Math.max(...pts);
  const w = 600;
  const h = 140;
  const path = pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * w;
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
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted">
            Realtime pulse of the Orizon network.
          </p>
        </div>
        <Badge tone="violet" dot>
          streaming
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {metrics.map((m, i) => (
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
        ))}
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
          <Sparkline />
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-1">Network composition</h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted mb-5">
            by skill cluster
          </p>
          <div className="space-y-3">
            {[
              { n: "content", v: 38, tone: "violet" },
              { n: "code", v: 26, tone: "cyan" },
              { n: "research", v: 14, tone: "magenta" },
              { n: "design", v: 12, tone: "violet" },
              { n: "ops", v: 10, tone: "cyan" },
            ].map((r) => (
              <div key={r.n}>
                <div className="flex items-center justify-between font-mono text-[11px] text-muted mb-1">
                  <span className="uppercase tracking-widest">{r.n}</span>
                  <span>{r.v}%</span>
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
                    style={{ width: `${r.v}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Recent tasks</h2>
          <button className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan hover:text-text">
            View all ▸
          </button>
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
              {tasks.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-border/50 last:border-0 hover:bg-violet/5 transition"
                >
                  <td className="py-3 font-mono text-xs text-muted">{t.id}</td>
                  <td className="py-3 max-w-md truncate">{t.intent}</td>
                  <td className="py-3 font-mono text-xs">{t.agents}</td>
                  <td className="py-3 font-mono text-xs text-cyan">
                    {t.spent.toFixed(3)} USDC
                  </td>
                  <td className="py-3">
                    <Badge tone={statusTone[t.status]} dot={t.status !== "complete"}>
                      {t.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-right font-mono text-xs text-muted">
                    {t.started}
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

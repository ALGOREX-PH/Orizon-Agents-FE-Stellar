"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { agents } from "@/lib/mock-data";

const statusTone = {
  online: "cyan" as const,
  idle: "violet" as const,
  offline: "muted" as const,
};

export default function AgentsPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "online" | "idle" | "offline">("all");

  const rows = useMemo(() => {
    return agents.filter((a) => {
      const matchesQ = !q || a.name.includes(q.toLowerCase()) || a.skills.some((s) => s.includes(q.toLowerCase()));
      const matchesStatus = filter === "all" || a.status === filter;
      return matchesQ && matchesStatus;
    });
  }, [q, filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Agent Registry</h1>
          <p className="mt-1 text-sm text-muted">
            ERC-8004 profiles — identity, skills, price, reputation.
          </p>
        </div>
        <Button variant="primary">+ Register agent</Button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[240px]">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
            >
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M14 14l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="search name or skill…"
              className="clip-cyber-sm w-full border border-border bg-bg/60 pl-10 pr-4 h-10 text-sm placeholder:text-muted focus:border-violet focus:outline-none focus:shadow-neon-violet transition"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "online", "idle", "offline"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  "clip-cyber-sm border px-3 h-10 font-mono text-[10px] uppercase tracking-widest transition " +
                  (filter === f
                    ? "border-violet bg-violet/20 text-text"
                    : "border-border text-muted hover:text-text")
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>

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
              {rows.map((a, i) => (
                <motion.tr
                  key={a.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.03 }}
                  className="border-b border-border/50 last:border-0 hover:bg-violet/5 transition"
                >
                  <td className="py-3 font-mono text-xs text-muted">{a.id}</td>
                  <td className="py-3 font-mono">{a.name}</td>
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
                  <td className="py-3 text-right font-mono">{a.rep.toFixed(2)}</td>
                  <td className="py-3 text-right font-mono text-xs text-muted">
                    {a.runs.toLocaleString()}
                  </td>
                  <td className="py-3">
                    <Badge tone={statusTone[a.status]} dot={a.status === "online"}>
                      {a.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-right">
                    <Button variant="ghost" size="sm">
                      ▸ view
                    </Button>
                  </td>
                </motion.tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-muted font-mono text-xs">
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

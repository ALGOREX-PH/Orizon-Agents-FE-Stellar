"use client";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { traceLines } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const levelColor = {
  input: "text-cyan",
  exec: "text-violet",
  proof: "text-magenta",
  cost: "text-emerald-300",
  out: "text-text",
} as const;

export default function TracePage() {
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing) return;
    if (cursor >= traceLines.length) return;
    const id = setTimeout(() => setCursor((c) => c + 1), 550);
    return () => clearTimeout(id);
  }, [cursor, playing]);

  useEffect(() => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [cursor]);

  const restart = () => {
    setCursor(0);
    setPlaying(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Trace</h1>
          <p className="mt-1 text-sm text-muted">
            Every step attributed, recorded, and verifiable.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPlaying((p) => !p)}>
            {playing ? "⏸ Pause" : "▸ Play"}
          </Button>
          <Button variant="outline" size="sm" onClick={restart}>
            ↻ Restart
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card className="!p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-surface/80 px-4 py-2.5">
            <div className="flex items-center gap-3">
              <Badge tone="violet" dot>
                tsk_4812
              </Badge>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
                build a landing page for pulse ai
              </span>
            </div>
            <span className="font-mono text-[10px] text-muted">
              {cursor} / {traceLines.length} steps
            </span>
          </div>
          <div
            ref={containerRef}
            className="font-mono text-xs p-5 h-[540px] overflow-y-auto space-y-1.5 bg-[#060010]"
          >
            {traceLines.slice(0, cursor).map((line, i) => (
              <div key={i} className="flex gap-3">
                <span className="w-16 text-muted">{line.t}</span>
                <span
                  className={cn(
                    "w-14 uppercase tracking-widest text-[10px]",
                    levelColor[line.level],
                  )}
                >
                  {line.level}
                </span>
                <span className="flex-1 text-text/90 leading-5">{line.msg}</span>
              </div>
            ))}
            {cursor < traceLines.length && (
              <div className="flex gap-3 animate-pulse">
                <span className="w-16 text-muted">…</span>
                <span className="w-14 text-violet uppercase tracking-widest text-[10px]">
                  wait
                </span>
                <span className="flex-1 text-muted">awaiting next step…</span>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan mb-4">
              Summary
            </div>
            <dl className="space-y-3 text-sm">
              {[
                ["Agents", "5"],
                ["Calls", "5"],
                ["Spent", "0.166 USDC"],
                ["Duration", "3.93s"],
                ["Proof", "ERC-8004 ✓"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-border/40 pb-2">
                  <dt className="text-muted font-mono text-[11px] uppercase tracking-widest">
                    {k}
                  </dt>
                  <dd className="font-mono">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-magenta mb-4">
              Attestation
            </div>
            <div className="font-mono text-xs text-muted break-all leading-5">
              0x7fa2c9d11e8c4b42a1
              <br />
              9e3a6c88f2d10b91d...
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline">
                View on-chain
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

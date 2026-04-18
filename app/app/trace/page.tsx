"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { openTraceStream } from "@/lib/api";
import { traceLines as demoTrace } from "@/lib/mock-data";
import type { TraceLine } from "@/lib/types";
import { cn } from "@/lib/utils";

const levelColor: Record<TraceLine["level"], string> = {
  input: "text-cyan",
  exec: "text-violet",
  proof: "text-magenta",
  cost: "text-emerald-300",
  out: "text-text",
  error: "text-magenta",
};

function TracePageInner() {
  const params = useSearchParams();
  const taskId = params.get("task");
  const [lines, setLines] = useState<TraceLine[]>([]);
  const [done, setDone] = useState(false);
  const [demoCursor, setDemoCursor] = useState(0);
  const [demoPlaying, setDemoPlaying] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Live mode: subscribe to SSE for the given task_id.
  useEffect(() => {
    if (!taskId) return;
    setLines([]);
    setDone(false);
    const close = openTraceStream(
      taskId,
      (line) => setLines((prev) => [...prev, line]),
      () => setDone(true),
    );
    return close;
  }, [taskId]);

  // Demo mode: no task id → replay local mock data so the page still looks alive.
  useEffect(() => {
    if (taskId) return;
    if (!demoPlaying) return;
    if (demoCursor >= demoTrace.length) return;
    const id = setTimeout(() => setDemoCursor((c) => c + 1), 550);
    return () => clearTimeout(id);
  }, [taskId, demoCursor, demoPlaying]);

  useEffect(() => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [lines.length, demoCursor]);

  const visible: TraceLine[] = taskId ? lines : (demoTrace.slice(0, demoCursor) as TraceLine[]);
  const total = taskId ? lines.length : demoTrace.length;

  const spent = visible
    .filter((l) => l.level === "cost")
    .reduce((acc, l) => {
      const m = l.msg.match(/([0-9]+\.[0-9]+)\s+USDC/);
      return acc + (m ? parseFloat(m[1]) : 0);
    }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Trace</h1>
          <p className="mt-1 text-sm text-muted">
            {taskId
              ? "Every step attributed, recorded, and verifiable."
              : "Replaying a demo trace — run an intent in the Orchestrator to see a live one."}
          </p>
        </div>
        {!taskId && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDemoPlaying((p) => !p)}
            >
              {demoPlaying ? "⏸ Pause" : "▸ Play"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDemoCursor(0);
                setDemoPlaying(true);
              }}
            >
              ↻ Restart
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card className="!p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-surface/80 px-4 py-2.5">
            <div className="flex items-center gap-3">
              <Badge tone={done ? "cyan" : "violet"} dot={!done}>
                {taskId ?? "demo"}
              </Badge>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
                {taskId ? (done ? "sealed" : "streaming") : "demo replay"}
              </span>
            </div>
            <span className="font-mono text-[10px] text-muted">
              {visible.length} / {total} steps
            </span>
          </div>
          <div
            ref={containerRef}
            className="font-mono text-xs p-5 h-[540px] overflow-y-auto space-y-1.5 bg-[#060010]"
          >
            {visible.map((line, i) => (
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
            {taskId && !done && (
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
                ["Task", taskId ?? "demo"],
                ["Lines", String(visible.length)],
                ["Spent", `${spent.toFixed(3)} USDC`],
                ["State", taskId ? (done ? "sealed ✓" : "streaming…") : "demo"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between border-b border-border/40 pb-2"
                >
                  <dt className="text-muted font-mono text-[11px] uppercase tracking-widest">
                    {k}
                  </dt>
                  <dd className="font-mono truncate max-w-[160px] text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-magenta mb-4">
              Attestation
            </div>
            <div className="font-mono text-xs text-muted break-all leading-5">
              {visible.find((l) => l.level === "proof")?.msg ??
                "awaiting ERC-8004 attestation…"}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function TracePage() {
  return (
    <Suspense fallback={<div className="font-mono text-sm text-muted">loading…</div>}>
      <TracePageInner />
    </Suspense>
  );
}

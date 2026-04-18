"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArtifactViewer } from "@/components/ui/artifact-viewer";
import { getArtifact, openTraceStream } from "@/lib/api";
import { traceLines as demoTrace } from "@/lib/mock-data";
import type { ArtifactResponse, TraceLine } from "@/lib/types";
import { cn } from "@/lib/utils";

const levelColor: Record<TraceLine["level"], string> = {
  input: "text-cyan",
  exec: "text-violet",
  proof: "text-magenta",
  cost: "text-emerald-300",
  out: "text-text",
  error: "text-magenta",
  artifact: "text-cyan",
};

type Tab = "trace" | "artifact";

function TracePageInner() {
  const params = useSearchParams();
  const taskId = params.get("task");
  const [lines, setLines] = useState<TraceLine[]>([]);
  const [done, setDone] = useState(false);
  const [tab, setTab] = useState<Tab>("trace");
  const [artifactData, setArtifactData] = useState<ArtifactResponse | null>(null);

  const [demoCursor, setDemoCursor] = useState(0);
  const [demoPlaying, setDemoPlaying] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Live mode: subscribe to SSE.
  useEffect(() => {
    if (!taskId) return;
    setLines([]);
    setDone(false);
    setArtifactData(null);
    const close = openTraceStream(
      taskId,
      (line) => {
        setLines((prev) => [...prev, line]);
        if (line.level === "artifact") {
          getArtifact(taskId).then(setArtifactData).catch(() => {});
        }
      },
      () => {
        setDone(true);
        getArtifact(taskId).then(setArtifactData).catch(() => {});
      },
    );
    return close;
  }, [taskId]);

  // Auto-switch tabs when an artifact arrives.
  useEffect(() => {
    if (artifactData?.artifact) setTab("artifact");
  }, [artifactData]);

  // Demo mode (no task id) replays local mock data.
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

  const artifact = artifactData?.artifact ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Trace</h1>
          <p className="mt-1 text-sm text-muted">
            {taskId
              ? "Every step attributed, recorded, verifiable."
              : "Demo replay — run an intent in the Orchestrator to see a live one."}
          </p>
        </div>
        {!taskId && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setDemoPlaying((p) => !p)}>
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

      {artifact && (
        <div className="flex gap-2">
          <button
            onClick={() => setTab("trace")}
            className={cn(
              "clip-cyber-sm border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition",
              tab === "trace"
                ? "border-violet bg-violet/20 text-text shadow-neon-violet"
                : "border-border text-muted hover:text-text",
            )}
          >
            ▸ trace log
          </button>
          <button
            onClick={() => setTab("artifact")}
            className={cn(
              "clip-cyber-sm border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition",
              tab === "artifact"
                ? "border-cyan bg-cyan/20 text-text shadow-neon-cyan"
                : "border-border text-muted hover:text-text",
            )}
          >
            ▣ artifact
          </button>
        </div>
      )}

      {tab === "artifact" && artifact ? (
        <>
          <ArtifactViewer artifact={artifact} />
          {(artifactData?.charge_tx || artifactData?.proof_tx) && (
            <Card>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-magenta mb-4">
                On-chain receipts
              </div>
              <dl className="space-y-3 text-sm font-mono">
                {artifactData?.charge_tx && (
                  <TxRow label="charge" hash={artifactData.charge_tx} />
                )}
                {artifactData?.proof_tx && (
                  <TxRow label="seal" hash={artifactData.proof_tx} />
                )}
              </dl>
            </Card>
          )}
        </>
      ) : (
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
              {artifactData?.proof_tx && (
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${artifactData.proof_tx}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block font-mono text-[10px] uppercase tracking-widest text-cyan hover:text-text"
                >
                  view on stellar.expert ▸
                </a>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function TxRow({ label, hash }: { label: string; hash: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-2 last:border-0">
      <dt className="text-muted text-[10px] uppercase tracking-widest pt-1 w-16">
        {label}
      </dt>
      <dd className="text-right flex-1">
        <div className="break-all">{hash}</div>
        <a
          href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
          className="inline-block mt-1 text-[10px] uppercase tracking-widest text-cyan hover:text-text"
        >
          view on stellar.expert ▸
        </a>
      </dd>
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

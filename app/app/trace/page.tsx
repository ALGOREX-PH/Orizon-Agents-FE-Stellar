"use client";
import {
  Suspense,
  memo,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArtifactViewer } from "@/components/ui/artifact-viewer";
import { ErrorNote } from "@/components/ui/error-note";
import { KVRow } from "@/components/ui/kv-row";
import { StellarExpertLink } from "@/components/ui/stellar-link";
import { getArtifact, openTraceStream } from "@/lib/api";
import type { ArtifactResponse, TraceLine } from "@/lib/types";
import { focusRing } from "@/lib/ui";
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

// Memoized row: every SSE tick appends a line — previously the whole list
// re-rendered per tick. Line objects are stable references, so memo skips
// all already-rendered rows.
const TraceRow = memo(function TraceRow({ line }: { line: TraceLine }) {
  return (
    <div className="flex gap-3">
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
  );
});

function TracePageInner() {
  const params = useSearchParams();
  const taskId = params.get("task");
  const [lines, setLines] = useState<TraceLine[]>([]);
  const [done, setDone] = useState(false);
  const [tab, setTab] = useState<Tab>("trace");
  const [artifactData, setArtifactData] = useState<ArtifactResponse | null>(
    null,
  );
  const [artifactError, setArtifactError] = useState<string | null>(null);
  const [streamError, setStreamError] = useState(false);
  // Bumping this re-runs the subscribe effect, which tears the dead stream
  // down and opens a fresh one — the manual counterpart to the 3 automatic
  // reconnects openTraceStream spends before giving up.
  const [streamAttempt, setStreamAttempt] = useState(0);

  const [demoCursor, setDemoCursor] = useState(0);
  const [demoPlaying, setDemoPlaying] = useState(true);
  // Demo replay data loads on demand — live-task views never ship it.
  const [demoTrace, setDemoTrace] = useState<TraceLine[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (taskId) return;
    let alive = true;
    import("@/lib/mock-data").then(({ traceLines }) => {
      if (alive) setDemoTrace(traceLines as TraceLine[]);
    });
    return () => {
      alive = false;
    };
  }, [taskId]);

  // Live mode: subscribe to SSE.
  useEffect(() => {
    if (!taskId) return;
    // getArtifact can resolve up to 30s later — without this guard a slow
    // response lands after unmount or applies the previous task's artifact
    // when ?task= changes.
    let alive = true;
    setLines([]);
    setDone(false);
    setArtifactData(null);
    setArtifactError(null);
    setStreamError(false);
    const fetchArtifact = () =>
      getArtifact(taskId)
        .then((data) => {
          if (!alive) return;
          setArtifactData(data);
          setArtifactError(null);
        })
        .catch((err: unknown) => {
          if (!alive) return;
          setArtifactError(
            err instanceof Error ? err.message : "artifact fetch failed",
          );
        });
    const close = openTraceStream(
      taskId,
      (line) => {
        setLines((prev) => [...prev, line]);
        if (line.level === "artifact") {
          fetchArtifact();
        }
      },
      () => {
        setDone(true);
        fetchArtifact();
      },
      () => {
        // Stream dropped mid-flight — do not present it as a sealed run.
        setStreamError(true);
        fetchArtifact();
      },
      () => {
        // Reconnecting — the backend replays full history to the new
        // subscriber, so drop what we have or every line (and the spent
        // sum) doubles.
        setLines([]);
      },
    );
    return () => {
      alive = false;
      close();
    };
  }, [taskId, streamAttempt]);

  // Auto-switch tabs when an artifact arrives.
  useEffect(() => {
    if (artifactData?.artifact) setTab("artifact");
  }, [artifactData]);

  // Demo mode (no task id) replays local mock data using the timestamps
  // embedded in each line — heavy steps (code.gen, code.critic) naturally
  // produce a longer pause, snappy steps stay snappy. Total replay matches
  // what a real run would look like (~6 seconds).
  useEffect(() => {
    if (taskId) return;
    if (!demoPlaying) return;
    if (demoCursor >= demoTrace.length) return;
    const prevT =
      demoCursor === 0 ? 0 : parseFloat(demoTrace[demoCursor - 1].t);
    const nextT = parseFloat(demoTrace[demoCursor].t);
    const rawDelta = Math.round((nextT - prevT) * 1000);
    // Floor 120ms so very-fast steps still feel like motion; cap 2800ms so a
    // single gap never stalls the demo into fatigue.
    const deltaMs = Math.min(Math.max(rawDelta, 120), 2800);
    const id = setTimeout(() => setDemoCursor((c) => c + 1), deltaMs);
    return () => clearTimeout(id);
  }, [taskId, demoCursor, demoPlaying, demoTrace]);

  useEffect(() => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [lines.length, demoCursor]);

  const visible: TraceLine[] = taskId ? lines : demoTrace.slice(0, demoCursor);
  const total = taskId ? lines.length : demoTrace.length;

  const spent = visible
    .filter((l) => l.level === "cost")
    .reduce((acc, l) => {
      const m = l.msg.match(/([0-9]+\.[0-9]+)\s+USDC/);
      return acc + (m ? parseFloat(m[1]) : 0);
    }, 0);

  // A stream that failed — or that never delivered a line — tells us nothing
  // about what the run cost. The reduce over an empty list formats as
  // "0.000 USDC", which reads as "this run was free": the exact lie that let
  // days of 404ing backend calls pass as healthy. Spend is only a fact when
  // there are lines to total AND the stream did not drop mid-run (a dropped
  // stream may have missed cost lines that were already charged).
  const spendUnknownReason = !taskId
    ? null
    : streamError
      ? "stream failed — spend unknown"
      : visible.length === 0
        ? done
          ? "stream closed with no trace lines"
          : "no trace lines received yet"
        : null;

  const artifact = artifactData?.artifact ?? null;

  const proofMsg = visible.find((l) => l.level === "proof")?.msg ?? null;
  const proofTx = artifactData?.proof_tx ?? null;
  // "awaiting…" is a promise that something is still coming. Once the stream
  // is dead — or sealed without a proof — nothing is on its way, and saying
  // otherwise leaves the panel waiting forever on a run that already ended.
  const attestationUnavailable =
    !proofMsg && !proofTx && Boolean(taskId) && (streamError || done);
  const attestationText = proofMsg
    ? proofMsg
    : proofTx
      ? "ERC-8004 attestation sealed on-chain"
      : streamError
        ? "attestation unknown — the stream failed before one was recorded"
        : done
          ? "run sealed without an ERC-8004 attestation"
          : "awaiting ERC-8004 attestation…";

  // The subscribe effect resets lines/done/error and opens a new EventSource,
  // so a retry restarts from the backend's replayed history rather than
  // appending onto a stale half-run.
  const reconnect = () => setStreamAttempt((n) => n + 1);

  const summaryRows: Array<[string, ReactNode]> = [
    ["Task", taskId ?? "demo"],
    ["Lines", String(visible.length)],
    [
      "Spent",
      spendUnknownReason ? (
        <>
          <span className="text-magenta" aria-hidden="true">
            —
          </span>
          <span className="sr-only">unknown</span>
          <div className="mt-1 text-[10px] leading-4 text-magenta/80">
            {spendUnknownReason}
          </div>
        </>
      ) : (
        `${spent.toFixed(3)} USDC`
      ),
    ],
    [
      "State",
      taskId
        ? streamError
          ? "interrupted ✕"
          : done
            ? "sealed ✓"
            : "streaming…"
        : "demo",
    ],
  ];

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

      {artifact && (
        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={tab === "trace"}
            onClick={() => setTab("trace")}
            className={cn(
              "clip-cyber-sm border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition",
              focusRing,
              tab === "trace"
                ? "border-violet bg-violet/20 text-text shadow-neon-violet"
                : "border-border text-muted hover:text-text",
            )}
          >
            ▸ trace log
          </button>
          <button
            type="button"
            aria-pressed={tab === "artifact"}
            onClick={() => setTab("artifact")}
            className={cn(
              "clip-cyber-sm border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition",
              focusRing,
              tab === "artifact"
                ? "border-cyan bg-cyan/20 text-text shadow-neon-cyan"
                : "border-border text-muted hover:text-text",
            )}
          >
            ▣ artifact
          </button>
        </div>
      )}

      {artifactError && !artifact && (
        <ErrorNote className="clip-cyber-sm">
          ⚠ artifact fetch failed — {artifactError}
        </ErrorNote>
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
                <Badge
                  tone={streamError ? "magenta" : done ? "cyan" : "violet"}
                  dot={!done && !streamError}
                >
                  {taskId ?? "demo"}
                </Badge>
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
                  {taskId
                    ? streamError
                      ? "stream interrupted"
                      : done
                        ? "sealed"
                        : "streaming"
                    : "demo replay"}
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
                <TraceRow key={i} line={line} />
              ))}
              {taskId && !done && !streamError && (
                <div className="flex gap-3 animate-pulse">
                  <span className="w-16 text-muted">…</span>
                  <span className="w-14 text-violet uppercase tracking-widest text-[10px]">
                    wait
                  </span>
                  <span className="flex-1 text-muted">awaiting next step…</span>
                </div>
              )}
              {taskId && streamError && (
                <div
                  className={cn(
                    "flex",
                    visible.length === 0 ? "h-full items-center" : "pt-4",
                  )}
                >
                  <ErrorNote
                    className="w-full leading-5"
                    onRetry={reconnect}
                    retryLabel="↻ reconnect"
                  >
                    <span className="block uppercase tracking-[0.2em] text-[10px]">
                      ⚠ stream lost
                    </span>
                    <span className="mt-1.5 block text-magenta/80">
                      the trace stream dropped and three automatic reconnects
                      failed
                      {visible.length === 0
                        ? " before a single line arrived"
                        : ` after ${visible.length} line${visible.length === 1 ? "" : "s"}`}
                      . nothing further will arrive on this connection — the
                      summary and attestation are incomplete until it is
                      restored.
                    </span>
                  </ErrorNote>
                </div>
              )}
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan mb-4">
                Summary
              </div>
              <dl className="space-y-3 text-sm font-mono">
                {summaryRows.map(([k, v]) => (
                  <KVRow key={k} k={k}>
                    {v}
                  </KVRow>
                ))}
              </dl>
            </Card>
            <Card>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-magenta mb-4">
                Attestation
              </div>
              <div
                className={cn(
                  "font-mono text-xs break-all leading-5",
                  attestationUnavailable ? "text-magenta/90" : "text-muted",
                )}
              >
                {attestationText}
              </div>
              {proofTx && (
                <StellarExpertLink
                  kind="tx"
                  id={proofTx}
                  className="mt-3 inline-block"
                />
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
    <KVRow k={label}>
      <div className="break-all">{hash}</div>
      <StellarExpertLink kind="tx" id={hash} className="inline-block mt-1" />
    </KVRow>
  );
}

export default function TracePage() {
  return (
    <Suspense
      fallback={<div className="font-mono text-sm text-muted">loading…</div>}
    >
      <TracePageInner />
    </Suspense>
  );
}

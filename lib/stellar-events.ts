"use client";
/**
 * Live Soroban contract-event feed.
 *
 * Yellow Belt requires "event listening + state synchronization". We do this
 * by polling Stellar testnet RPC's `getEvents` for the four Orizon contracts.
 * Each tick advances the cursor, so the feed never repeats events.
 *
 * Browser-side polling keeps the backend out of the loop — Soroban RPC has
 * permissive CORS on testnet, so the FE can talk to it directly.
 */

import { useCallback, useEffect, useRef, useState } from "react";
// Type-only import — the SDK itself is lazy-loaded inside the polling effect
// so the (large) @stellar/stellar-sdk stays out of the initial bundle.
import type { rpc as RpcNs } from "@stellar/stellar-sdk";

type StellarSdk = typeof import("@stellar/stellar-sdk");
type ScValToNativeFn = StellarSdk["scValToNative"];

// RPC endpoint resolution lives in lib/env.ts (validated at build time).
import { SOROBAN_RPC_URL as RPC_URL } from "@/lib/env";

export type FeedEvent = {
  id: string;
  ledger: number;
  ledgerClosedAt: string;
  contractId: string;
  txHash: string;
  topics: string[];
  value: unknown;
};

type Status = "idle" | "starting" | "live" | "error";

export type EventsFeedHook = {
  status: Status;
  events: FeedEvent[];
  latestLedger: number | null;
  lastTickAt: number | null;
  error: string | null;
};

export function useStellarEvents(
  contractIds: string[] | null,
  opts?: { intervalMs?: number; max?: number },
): EventsFeedHook {
  const intervalMs = opts?.intervalMs ?? 5000;
  const max = opts?.max ?? 50;

  const [status, setStatus] = useState<Status>("idle");
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [latestLedger, setLatestLedger] = useState<number | null>(null);
  const [lastTickAt, setLastTickAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cursorRef = useRef<string | null>(null);
  const startLedgerRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);

  const tick = useCallback(
    async (server: RpcNs.Server, scValToNative: ScValToNativeFn) => {
      if (!contractIds || contractIds.length === 0) return;
      try {
        // First call: anchor on a recent ledger; later: advance with cursor.
        const useCursor = cursorRef.current !== null;
        const req = useCursor
          ? {
              filters: [{ type: "contract" as const, contractIds }],
              cursor: cursorRef.current!,
              limit: 100,
            }
          : {
              filters: [{ type: "contract" as const, contractIds }],
              startLedger: startLedgerRef.current!,
              limit: 100,
            };

        const resp = await server.getEvents(req);
        cursorRef.current = resp.cursor;
        setLatestLedger(resp.latestLedger);
        setLastTickAt(Date.now());
        // A successful poll clears any stale error from a prior transient failure.
        setError(null);

        if (resp.events.length === 0) return;

        const mapped: FeedEvent[] = resp.events.map((e) => ({
          id: e.id,
          ledger: e.ledger,
          ledgerClosedAt: e.ledgerClosedAt,
          contractId: e.contractId?.toString() ?? "",
          txHash: e.txHash,
          topics: e.topic.map((t) => safeScValToString(scValToNative, t)),
          value: tryScValToNative(scValToNative, e.value),
        }));

        setEvents((prev) => {
          // newest first, then prior, capped at `max`. dedupe by id.
          const seen = new Set(prev.map((p) => p.id));
          const additions = mapped.filter((m) => !seen.has(m.id));
          return [...additions.reverse(), ...prev].slice(0, max);
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        // If the cursor expired (RPC retention window), drop it and re-anchor.
        if (/cursor|retention|out of range|invalid/i.test(msg)) {
          cursorRef.current = null;
        }
        return false;
      }
      return true;
    },
    [contractIds, max],
  );

  useEffect(() => {
    if (!contractIds || contractIds.length === 0) return;
    stoppedRef.current = false;
    setStatus("starting");
    setError(null);

    let timer: ReturnType<typeof setTimeout> | null = null;
    let removeVisListener: (() => void) | null = null;

    (async () => {
      try {
        // Lazy-load the SDK on first use — keeps it out of the initial bundle.
        const { rpc, scValToNative } = await import("@stellar/stellar-sdk");
        if (stoppedRef.current) return;
        const server = new rpc.Server(RPC_URL);

        const latest = await server.getLatestLedger();
        // Anchor 50 ledgers back so we catch fresh events for active workflows.
        startLedgerRef.current = Math.max(latest.sequence - 50, 1);
        setLatestLedger(latest.sequence);
        if (stoppedRef.current) return;

        // Self-scheduling poll: pauses while the tab is hidden (no RPC calls
        // in the background) and backs off ×2 up to ×4 after consecutive
        // failures, resetting on the first success.
        let fails = 0;
        const schedule = () => {
          if (stoppedRef.current) return;
          const delay = Math.min(intervalMs * 2 ** fails, intervalMs * 4);
          timer = setTimeout(async () => {
            if (stoppedRef.current) return;
            if (typeof document !== "undefined" && document.hidden) {
              schedule();
              return;
            }
            const ok = await tick(server, scValToNative);
            fails = ok ? 0 : Math.min(fails + 1, 2);
            schedule();
          }, delay);
        };

        // Poll promptly when the tab becomes visible again.
        const onVisible = () => {
          if (document.hidden || stoppedRef.current) return;
          if (timer) clearTimeout(timer);
          void tick(server, scValToNative).then((ok) => {
            fails = ok ? 0 : Math.min(fails + 1, 2);
            schedule();
          });
        };
        document.addEventListener("visibilitychange", onVisible);
        removeVisListener = () =>
          document.removeEventListener("visibilitychange", onVisible);

        // Initial pull + then poll.
        await tick(server, scValToNative);
        setStatus("live");
        schedule();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setStatus("error");
      }
    })();

    return () => {
      stoppedRef.current = true;
      if (timer) clearTimeout(timer);
      removeVisListener?.();
    };
  }, [contractIds, intervalMs, tick]);

  return { status, events, latestLedger, lastTickAt, error };
}

function safeScValToString(
  scValToNative: ScValToNativeFn,
  sv: unknown,
): string {
  try {
    const v = scValToNative(sv as Parameters<ScValToNativeFn>[0]);
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (
      typeof v === "number" ||
      typeof v === "bigint" ||
      typeof v === "boolean"
    )
      return String(v);
    if (v instanceof Uint8Array) return bytesToHex(v).slice(0, 16) + "…";
    return JSON.stringify(v).slice(0, 32);
  } catch {
    return "·";
  }
}

function tryScValToNative(
  scValToNative: ScValToNativeFn,
  sv: unknown,
): unknown {
  try {
    return scValToNative(sv as Parameters<ScValToNativeFn>[0]);
  } catch {
    return null;
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

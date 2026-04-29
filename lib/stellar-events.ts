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
import { rpc as RpcNs, scValToNative } from "@stellar/stellar-sdk";

const RPC_URL = "https://soroban-testnet.stellar.org";

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

  const tick = useCallback(async (server: RpcNs.Server) => {
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

      if (resp.events.length === 0) return;

      const mapped: FeedEvent[] = resp.events.map((e) => ({
        id: e.id,
        ledger: e.ledger,
        ledgerClosedAt: e.ledgerClosedAt,
        contractId: e.contractId?.toString() ?? "",
        txHash: e.txHash,
        topics: e.topic.map(safeScValToString),
        value: tryScValToNative(e.value),
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
    }
  }, [contractIds, max]);

  useEffect(() => {
    if (!contractIds || contractIds.length === 0) return;
    stoppedRef.current = false;
    setStatus("starting");
    setError(null);

    const server = new RpcNs.Server(RPC_URL);

    let timer: ReturnType<typeof setInterval> | null = null;

    (async () => {
      try {
        const latest = await server.getLatestLedger();
        // Anchor 50 ledgers back so we catch fresh events for active workflows.
        startLedgerRef.current = Math.max(latest.sequence - 50, 1);
        setLatestLedger(latest.sequence);
        if (stoppedRef.current) return;

        // Initial pull + then poll.
        await tick(server);
        setStatus("live");
        timer = setInterval(() => {
          if (!stoppedRef.current) tick(server);
        }, intervalMs);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setStatus("error");
      }
    })();

    return () => {
      stoppedRef.current = true;
      if (timer) clearInterval(timer);
    };
  }, [contractIds, intervalMs, tick]);

  return { status, events, latestLedger, lastTickAt, error };
}

function safeScValToString(sv: unknown): string {
  try {
    const v = scValToNative(sv as Parameters<typeof scValToNative>[0]);
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "bigint" || typeof v === "boolean")
      return String(v);
    if (v instanceof Uint8Array) return bytesToHex(v).slice(0, 16) + "…";
    return JSON.stringify(v).slice(0, 32);
  } catch {
    return "·";
  }
}

function tryScValToNative(sv: unknown): unknown {
  try {
    return scValToNative(sv as Parameters<typeof scValToNative>[0]);
  } catch {
    return null;
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

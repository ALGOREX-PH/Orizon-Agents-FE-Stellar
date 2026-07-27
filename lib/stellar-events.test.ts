// @vitest-environment jsdom
/**
 * Unit tests for the cursor/dedupe logic in useStellarEvents
 * (lib/stellar-events.ts).
 *
 * The dynamically imported @stellar/stellar-sdk is replaced with vi.mock —
 * vitest intercepts the hook's lazy `await import(...)` — so no SDK loads
 * and RPC calls are plain vi.fn()s. Fake timers drive the poll loop.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useStellarEvents } from "./stellar-events";

const { getEventsMock, getLatestLedgerMock } = vi.hoisted(() => ({
  getEventsMock: vi.fn(),
  getLatestLedgerMock: vi.fn(),
}));

vi.mock("@stellar/stellar-sdk", () => ({
  rpc: {
    Server: class {
      getLatestLedger = getLatestLedgerMock;
      getEvents = getEventsMock;
    },
  },
  // Identity — topics/values pass through so assertions stay readable.
  scValToNative: (v: unknown) => v,
}));

const IDS = ["CATESTCONTRACT"];
const INTERVAL = 5000;
const FILTERS = [{ type: "contract", contractIds: IDS }];

function ev(id: string, ledger = 990) {
  return {
    id,
    ledger,
    ledgerClosedAt: "2026-01-01T00:00:00Z",
    contractId: "CATESTCONTRACT",
    txHash: `tx-${id}`,
    topic: ["transfer", 7],
    value: { amount: 1 },
  };
}

function page(cursor: string, latestLedger: number, events: ReturnType<typeof ev>[]) {
  return { cursor, latestLedger, events };
}

/** Flush the mocked import → getLatestLedger → tick promise chain. */
const flush = () =>
  act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => {
  vi.useFakeTimers();
  getLatestLedgerMock.mockResolvedValue({ sequence: 1000 });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  getEventsMock.mockReset();
  getLatestLedgerMock.mockReset();
});

describe("useStellarEvents", () => {
  it("anchors 50 ledgers back, goes live, then advances the cursor each poll", async () => {
    getEventsMock
      .mockResolvedValueOnce(page("cur-1", 1000, [ev("e1"), ev("e2")]))
      .mockResolvedValueOnce(page("cur-2", 1001, [ev("e3")]))
      .mockResolvedValueOnce(page("cur-3", 1002, []));

    const { result } = renderHook(() =>
      useStellarEvents(IDS, { intervalMs: INTERVAL }),
    );
    expect(result.current.status).toBe("starting");
    await flush();

    // First request anchors on latest - 50 with no cursor.
    expect(getEventsMock).toHaveBeenCalledTimes(1);
    expect(getEventsMock.mock.calls[0][0]).toEqual({
      filters: FILTERS,
      startLedger: 950,
      limit: 100,
    });
    expect(result.current.status).toBe("live");
    expect(result.current.latestLedger).toBe(1000);
    // Newest first; topics stringified through scValToNative.
    expect(result.current.events.map((e) => e.id)).toEqual(["e2", "e1"]);
    expect(result.current.events[0].topics).toEqual(["transfer", "7"]);
    expect(result.current.events[0].txHash).toBe("tx-e2");

    // Subsequent polls ride the returned cursor, never the start ledger.
    await advance(INTERVAL);
    expect(getEventsMock).toHaveBeenCalledTimes(2);
    expect(getEventsMock.mock.calls[1][0]).toEqual({
      filters: FILTERS,
      cursor: "cur-1",
      limit: 100,
    });
    await advance(INTERVAL);
    expect(getEventsMock.mock.calls[2][0]).toEqual({
      filters: FILTERS,
      cursor: "cur-2",
      limit: 100,
    });
    expect(result.current.latestLedger).toBe(1002);
  });

  it("dedupes events by id across polls and caps the feed at max", async () => {
    getEventsMock
      .mockResolvedValueOnce(page("cur-1", 1000, [ev("e1"), ev("e2")]))
      // e2 is re-delivered next poll — it must not appear twice.
      .mockResolvedValueOnce(page("cur-2", 1001, [ev("e2"), ev("e3")]))
      .mockResolvedValueOnce(page("cur-3", 1002, [ev("e4")]));

    const { result } = renderHook(() =>
      useStellarEvents(IDS, { intervalMs: INTERVAL, max: 3 }),
    );
    await flush();
    expect(result.current.events.map((e) => e.id)).toEqual(["e2", "e1"]);

    await advance(INTERVAL);
    const ids = result.current.events.map((e) => e.id);
    expect(ids).toEqual(["e3", "e2", "e1"]);
    expect(new Set(ids).size).toBe(ids.length); // no duplicate ids

    // max: 3 → the oldest entry falls off when e4 arrives.
    await advance(INTERVAL);
    expect(result.current.events.map((e) => e.id)).toEqual(["e4", "e3", "e2"]);
  });

  it("sets error on a failed poll, backs off, and clears it on the next success", async () => {
    getEventsMock
      .mockResolvedValueOnce(page("cur-1", 1000, [ev("e1")]))
      .mockRejectedValueOnce(new Error("rpc 503"))
      .mockResolvedValueOnce(page("cur-2", 1001, []));

    const { result } = renderHook(() =>
      useStellarEvents(IDS, { intervalMs: INTERVAL }),
    );
    await flush();
    expect(result.current.error).toBeNull();

    await advance(INTERVAL);
    expect(result.current.error).toBe("rpc 503");
    expect(result.current.events.map((e) => e.id)).toEqual(["e1"]); // feed intact

    // One failure → next poll is delayed ×2, and it retries the same cursor
    // ("rpc 503" is not a cursor-expiry message).
    await advance(INTERVAL);
    expect(getEventsMock).toHaveBeenCalledTimes(2);
    await advance(INTERVAL);
    expect(getEventsMock).toHaveBeenCalledTimes(3);
    expect(getEventsMock.mock.calls[2][0]).toMatchObject({ cursor: "cur-1" });
    expect(result.current.error).toBeNull(); // success wipes the stale error
  });

  it("drops an expired cursor and re-anchors on the start ledger", async () => {
    getEventsMock
      .mockResolvedValueOnce(page("cur-1", 1000, [ev("e1")]))
      .mockRejectedValueOnce(new Error("cursor is invalid or outside retention"))
      .mockResolvedValueOnce(page("cur-2", 1001, []));

    renderHook(() => useStellarEvents(IDS, { intervalMs: INTERVAL }));
    await flush();
    await advance(INTERVAL); // fails, cursor dropped
    await advance(INTERVAL * 2); // backoff ×2 elapses → retry
    expect(getEventsMock).toHaveBeenCalledTimes(3);
    expect(getEventsMock.mock.calls[2][0]).toEqual({
      filters: FILTERS,
      startLedger: 950,
      limit: 100,
    });
  });

  it("reports status error when the initial anchor fails", async () => {
    getLatestLedgerMock.mockRejectedValueOnce(new Error("rpc down"));
    const { result } = renderHook(() =>
      useStellarEvents(IDS, { intervalMs: INTERVAL }),
    );
    await flush();
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("rpc down");
    expect(getEventsMock).not.toHaveBeenCalled();
  });

  it("stops polling after unmount", async () => {
    getEventsMock.mockResolvedValue(page("cur-1", 1000, []));
    const { unmount } = renderHook(() =>
      useStellarEvents(IDS, { intervalMs: INTERVAL }),
    );
    await flush();
    expect(getEventsMock).toHaveBeenCalledTimes(1);
    unmount();
    await advance(INTERVAL * 5);
    expect(getEventsMock).toHaveBeenCalledTimes(1);
  });
});

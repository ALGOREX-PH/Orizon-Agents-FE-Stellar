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

const { getEventsMock, getLatestLedgerMock, scValToNativeMock } = vi.hoisted(
  () => ({
    getEventsMock: vi.fn(),
    getLatestLedgerMock: vi.fn(),
    scValToNativeMock: vi.fn(),
  }),
);

vi.mock("@stellar/stellar-sdk", () => ({
  rpc: {
    Server: class {
      getLatestLedger = getLatestLedgerMock;
      getEvents = getEventsMock;
    },
  },
  // Identity by default (see beforeEach) — topics/values pass through so
  // assertions stay readable. Tests that need exotic or undecodable ScVals
  // swap in their own implementation.
  scValToNative: scValToNativeMock,
}));

const IDS = ["CATESTCONTRACT"];
const INTERVAL = 5000;
const FILTERS = [{ type: "contract", contractIds: IDS }];

/**
 * One raw RPC event. Loose on purpose: a real node can hand back an absent
 * contractId or an ScVal the SDK refuses to decode, and the hook has to
 * survive both.
 */
type RawEvent = {
  id: string;
  ledger: number;
  ledgerClosedAt: string;
  contractId?: string;
  txHash: string;
  topic: unknown[];
  value: unknown;
};

function ev(id: string, ledger = 990): RawEvent {
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

function page(cursor: string, latestLedger: number, events: RawEvent[]) {
  return { cursor, latestLedger, events };
}

/** Flush the mocked import → getLatestLedger → tick promise chain. */
const flush = () =>
  act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

/** Fire the event the hook listens on, then settle what it kicked off. */
const fireVisibilityChange = () =>
  act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });

/** jsdom derives document.hidden and won't let a test set it, so shadow it. */
function stubHidden() {
  let hidden = false;
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });
  return {
    set: (v: boolean) => {
      hidden = v;
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  getLatestLedgerMock.mockResolvedValue({ sequence: 1000 });
  scValToNativeMock.mockImplementation((v: unknown) => v);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  getEventsMock.mockReset();
  getLatestLedgerMock.mockReset();
  scValToNativeMock.mockReset();
  // Drop any own `hidden` shadow so jsdom's real getter is back in place.
  delete (document as { hidden?: boolean }).hidden;
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
      .mockRejectedValueOnce(
        new Error("cursor is invalid or outside retention"),
      )
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

  it("does not resume a dead run when contractIds identity changes mid-start", async () => {
    // Park the FIRST run on getLatestLedger, restart the effect while it is
    // in flight, then release it: the dead run must not start a second poll
    // loop or register a visibility listener its cleanup already missed.
    let releaseFirst: (v: { sequence: number }) => void = () => {};
    getLatestLedgerMock.mockImplementationOnce(
      () =>
        new Promise<{ sequence: number }>((resolve) => {
          releaseFirst = resolve;
        }),
    );
    getEventsMock.mockResolvedValue(page("cur-1", 1000, [ev("e1")]));

    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const visCalls = (spy: typeof addSpy) =>
      spy.mock.calls.filter(([type]) => type === "visibilitychange").length;

    const { rerender, unmount } = renderHook(
      ({ ids }: { ids: string[] }) =>
        useStellarEvents(ids, { intervalMs: INTERVAL }),
      { initialProps: { ids: [...IDS] } },
    );
    await flush(); // run 1 is parked on getLatestLedger
    rerender({ ids: [...IDS] }); // new identity → cleanup run 1, start run 2
    await flush(); // run 2 anchors, ticks, goes live
    expect(getEventsMock).toHaveBeenCalledTimes(1);

    releaseFirst({ sequence: 1000 }); // run 1 resumes on a dead run
    await flush();

    // Only run 2's listener is live; run 1 registered none after its death.
    expect(visCalls(addSpy)).toBe(1);

    // Exactly one poll loop: each interval produces one getEvents, not two.
    await advance(INTERVAL);
    expect(getEventsMock).toHaveBeenCalledTimes(2);
    await advance(INTERVAL);
    expect(getEventsMock).toHaveBeenCalledTimes(3);

    // And the surviving listener is balanced by unmount.
    unmount();
    expect(visCalls(removeSpy)).toBe(visCalls(addSpy));
  });

  it("keeps the normal interval while a healthy contract stays quiet", async () => {
    // Zero events is the steady state of a live contract, not a failure — a
    // quiet feed must never slow itself down.
    getEventsMock.mockResolvedValue(page("cur-1", 1000, []));

    const { result } = renderHook(() =>
      useStellarEvents(IDS, { intervalMs: INTERVAL }),
    );
    await flush();
    expect(getEventsMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("live");

    // Three empty polls, three plain intervals — no ×2 drift.
    await advance(INTERVAL);
    expect(getEventsMock).toHaveBeenCalledTimes(2);
    await advance(INTERVAL);
    expect(getEventsMock).toHaveBeenCalledTimes(3);
    await advance(INTERVAL);
    expect(getEventsMock).toHaveBeenCalledTimes(4);
    expect(result.current.error).toBeNull();
    expect(result.current.events).toEqual([]);
  });

  it("backs off ×2 then ×4 on real failures, and an empty success restores the cadence", async () => {
    getEventsMock
      .mockResolvedValueOnce(page("cur-1", 1000, [ev("e1")]))
      .mockRejectedValueOnce(new Error("rpc 503"))
      .mockRejectedValueOnce(new Error("rpc 503"))
      .mockResolvedValue(page("cur-2", 1001, []));

    renderHook(() => useStellarEvents(IDS, { intervalMs: INTERVAL }));
    await flush();

    await advance(INTERVAL); // failure 1 → next poll is ×2 away
    expect(getEventsMock).toHaveBeenCalledTimes(2);
    await advance(INTERVAL);
    expect(getEventsMock).toHaveBeenCalledTimes(2); // still waiting out ×2

    await advance(INTERVAL); // failure 2 → next poll is ×4 away (the cap)
    expect(getEventsMock).toHaveBeenCalledTimes(3);
    await advance(INTERVAL * 2);
    expect(getEventsMock).toHaveBeenCalledTimes(3); // still waiting out ×4

    await advance(INTERVAL * 2); // recovers — with an empty page
    expect(getEventsMock).toHaveBeenCalledTimes(4);

    // That empty page counts as a success, so the next poll is one interval
    // away rather than four.
    await advance(INTERVAL);
    expect(getEventsMock).toHaveBeenCalledTimes(5);
  });

  it("pauses polling while the tab is hidden and primes a poll on resume", async () => {
    getEventsMock.mockResolvedValue(page("cur-1", 1000, [ev("e1")]));
    const vis = stubHidden();

    renderHook(() => useStellarEvents(IDS, { intervalMs: INTERVAL }));
    await flush();
    expect(getEventsMock).toHaveBeenCalledTimes(1);

    // Hidden: the loop keeps rescheduling itself but issues no RPC calls.
    vis.set(true);
    await fireVisibilityChange();
    await advance(INTERVAL * 4);
    expect(getEventsMock).toHaveBeenCalledTimes(1);

    // Visible again: poll straight away instead of waiting out the interval.
    vis.set(false);
    await fireVisibilityChange();
    expect(getEventsMock).toHaveBeenCalledTimes(2);

    // …and the normal cadence picks up from there.
    await advance(INTERVAL);
    expect(getEventsMock).toHaveBeenCalledTimes(3);
  });

  it("backs off when the poll that resumes a hidden tab fails", async () => {
    getEventsMock
      .mockResolvedValueOnce(page("cur-1", 1000, [ev("e1")]))
      .mockRejectedValueOnce(new Error("rpc 503"))
      .mockResolvedValue(page("cur-2", 1001, []));
    const vis = stubHidden();

    renderHook(() => useStellarEvents(IDS, { intervalMs: INTERVAL }));
    await flush();

    vis.set(true);
    await fireVisibilityChange();
    await advance(INTERVAL * 2);
    expect(getEventsMock).toHaveBeenCalledTimes(1); // paused

    vis.set(false);
    await fireVisibilityChange(); // primes a poll, and it fails
    expect(getEventsMock).toHaveBeenCalledTimes(2);

    // A resume failure counts like any other: the next poll is ×2 away.
    await advance(INTERVAL);
    expect(getEventsMock).toHaveBeenCalledTimes(2);
    await advance(INTERVAL);
    expect(getEventsMock).toHaveBeenCalledTimes(3);
  });

  it("renders exotic and undecodable ScVals without crashing the feed", async () => {
    const bytes = new Uint8Array([
      0xde, 0xad, 0xbe, 0xef, 0x00, 0x11, 0x22, 0x33, 0x44,
    ]);
    // The SDK throws on an ScVal it can't decode; one bad topic must not take
    // the event — or the poll — down with it.
    scValToNativeMock.mockImplementation((v: unknown) => {
      if (v === "undecodable") throw new Error("bad ScVal");
      return v;
    });
    getEventsMock.mockResolvedValue(
      page("cur-1", 1000, [
        {
          ...ev("e1"),
          contractId: undefined,
          topic: [
            null,
            9007199254740993n,
            true,
            bytes,
            { memo: "a".repeat(40) },
            "undecodable",
          ],
          value: "undecodable",
        },
      ]),
    );

    const { result } = renderHook(() =>
      useStellarEvents(IDS, { intervalMs: INTERVAL }),
    );
    await flush();

    expect(result.current.status).toBe("live");
    const [event] = result.current.events;
    expect(event.topics).toEqual([
      "", // nothing decoded
      "9007199254740993", // bigint keeps its precision
      "true",
      "deadbeef00112233…", // bytes → hex, truncated
      '{"memo":"' + "a".repeat(23), // objects → 32 chars of JSON
      "·", // the undecodable one
    ]);
    expect(event.value).toBeNull(); // an undecodable value degrades to null
    expect(event.contractId).toBe(""); // …and a missing contract id to ""
  });

  it("stays idle when there are no contract ids to watch", async () => {
    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] | null }) => useStellarEvents(ids),
      { initialProps: { ids: null as string[] | null } },
    );
    await flush();
    expect(result.current.status).toBe("idle");

    rerender({ ids: [] });
    await flush();
    expect(result.current.status).toBe("idle");
    expect(getLatestLedgerMock).not.toHaveBeenCalled();
    expect(getEventsMock).not.toHaveBeenCalled();
  });

  it("polls every 5s when no interval is given", async () => {
    getEventsMock.mockResolvedValue(page("cur-1", 1000, []));
    renderHook(() => useStellarEvents(IDS));
    await flush();
    expect(getEventsMock).toHaveBeenCalledTimes(1);

    await advance(4999);
    expect(getEventsMock).toHaveBeenCalledTimes(1);
    await advance(1);
    expect(getEventsMock).toHaveBeenCalledTimes(2);
  });

  it("stringifies a non-Error thrown by the anchor or by a poll", async () => {
    getLatestLedgerMock.mockRejectedValueOnce("rpc exploded");
    const anchor = renderHook(() =>
      useStellarEvents(IDS, { intervalMs: INTERVAL }),
    );
    await flush();
    expect(anchor.result.current.status).toBe("error");
    expect(anchor.result.current.error).toBe("rpc exploded");
    anchor.unmount();

    getEventsMock.mockRejectedValueOnce("poll exploded");
    const poll = renderHook(() =>
      useStellarEvents(IDS, { intervalMs: INTERVAL }),
    );
    await flush();
    // A failed poll is recoverable, so the feed stays live and just reports it.
    expect(poll.result.current.status).toBe("live");
    expect(poll.result.current.error).toBe("poll exploded");
  });

  it("abandons the run when torn down before the sdk finishes loading", async () => {
    const { unmount } = renderHook(() =>
      useStellarEvents(IDS, { intervalMs: INTERVAL }),
    );
    unmount(); // cleanup lands before the lazy import settles
    await flush();
    await advance(INTERVAL * 5);
    expect(getLatestLedgerMock).not.toHaveBeenCalled();
    expect(getEventsMock).not.toHaveBeenCalled();
  });

  it("does not schedule another poll when unmounted mid-poll", async () => {
    let releasePoll: (v: ReturnType<typeof page>) => void = () => {};
    getEventsMock.mockImplementationOnce(
      () =>
        new Promise<ReturnType<typeof page>>((resolve) => {
          releasePoll = resolve;
        }),
    );

    const { unmount } = renderHook(() =>
      useStellarEvents(IDS, { intervalMs: INTERVAL }),
    );
    await flush(); // parked inside the first tick
    expect(getEventsMock).toHaveBeenCalledTimes(1);

    unmount();
    await act(async () => {
      releasePoll(page("cur-1", 1000, [ev("e1")]));
      for (let i = 0; i < 20; i++) await Promise.resolve();
    });

    // The in-flight poll landed after teardown: no follow-up timer.
    await advance(INTERVAL * 5);
    expect(getEventsMock).toHaveBeenCalledTimes(1);
  });
});

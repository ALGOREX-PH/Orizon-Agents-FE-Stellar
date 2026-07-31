// @vitest-environment jsdom
/**
 * Unit tests for the usePolling loop (lib/use-polling.ts).
 *
 * Fake timers drive the self-scheduling loop; `document.hidden` is stubbed
 * with a configurable own-property getter so visibility pauses can be
 * simulated. The hook holds no React state unless `trackStatus` is on, so
 * only those tests wrap timer advances in act().
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { usePolling } from "./use-polling";

const INTERVAL = 1000;

let hidden = false;

beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  Reflect.deleteProperty(document, "hidden");
});

/** Drain chained promise continuations (await → catch → finally → schedule). */
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

function deferred() {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("usePolling", () => {
  it("runs fn immediately on mount and again one interval after completion", async () => {
    const fn = vi.fn(async () => {});
    renderHook(() => usePolling(fn, INTERVAL));
    expect(fn).toHaveBeenCalledTimes(1);

    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(INTERVAL - 1);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("never overlaps calls when fn is slower than the interval", async () => {
    const d = deferred();
    const fn = vi.fn(() => d.promise);
    renderHook(() => usePolling(fn, INTERVAL));
    expect(fn).toHaveBeenCalledTimes(1);

    // Several intervals elapse while the first call is still in flight —
    // nothing is rescheduled until it settles, and a visibility poke is
    // rejected by the in-flight guard.
    await vi.advanceTimersByTimeAsync(INTERVAL * 3);
    document.dispatchEvent(new Event("visibilitychange"));
    await flushMicrotasks();
    expect(fn).toHaveBeenCalledTimes(1);

    d.resolve();
    await flushMicrotasks();
    // Settled → exactly one follow-up run, one interval later.
    await vi.advanceTimersByTimeAsync(INTERVAL - 1);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("backs off ×2 per consecutive failure, caps past the backend's max Retry-After, and resets on success", async () => {
    let failing = true;
    const fn = vi.fn(async () => {
      if (failing) throw new Error("boom");
    });
    renderHook(() => usePolling(fn, INTERVAL));
    expect(fn).toHaveBeenCalledTimes(1); // t=0, rejects
    await flushMicrotasks();

    // 2s, 4s, 8s, … doubling on every consecutive rejection.
    let calls = 1;
    for (const multiple of [2, 4, 8, 16, 32, 64]) {
      await vi.advanceTimersByTimeAsync(INTERVAL * multiple - 1);
      expect(fn).toHaveBeenCalledTimes(calls);
      await vi.advanceTimersByTimeAsync(1);
      expect(fn).toHaveBeenCalledTimes(++calls);
    }

    // The 8th delay would be 128s uncapped; the ceiling holds it at 90s —
    // still longer than the 60s the backend's rate limiter can ask for.
    await vi.advanceTimersByTimeAsync(90_000 - 1);
    expect(fn).toHaveBeenCalledTimes(calls);
    failing = false;
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(++calls); // succeeds

    // Success resets the cadence to the base interval.
    await vi.advanceTimersByTimeAsync(INTERVAL);
    expect(fn).toHaveBeenCalledTimes(++calls);
  });

  it("keeps the wider ×4 ceiling for slow pollers, where it already clears 60s", async () => {
    const SLOW = 60_000;
    const fn = vi.fn(async () => {
      throw new Error("boom");
    });
    renderHook(() => usePolling(fn, SLOW));
    await flushMicrotasks();

    // 2× = 120s, then the ×4 ceiling (240s) rather than the 90s floor.
    await vi.advanceTimersByTimeAsync(SLOW * 2);
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(SLOW * 4 - 1);
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("waits out a Retry-After hint longer than the computed backoff", async () => {
    let throttled = true;
    const fn = vi.fn(async () => {
      if (!throttled) return;
      throw Object.assign(new Error("GET /metrics/overview → 429"), {
        retryAfter: 60, // seconds, as the header carries it
      });
    });
    renderHook(() => usePolling(fn, INTERVAL));
    await flushMicrotasks();

    // Backoff alone would poll again after 2s and keep the bucket saturated.
    await vi.advanceTimersByTimeAsync(59_999);
    expect(fn).toHaveBeenCalledTimes(1);
    throttled = false;
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(2);

    // A success drops the hint — back to the base cadence.
    await vi.advanceTimersByTimeAsync(INTERVAL);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not poll at all while the document is hidden", async () => {
    hidden = true;
    const fn = vi.fn(async () => {});
    renderHook(() => usePolling(fn, INTERVAL));
    await vi.advanceTimersByTimeAsync(INTERVAL * 8);
    expect(fn).not.toHaveBeenCalled();
  });

  it("parks the loop when the tab hides and resumes immediately on visibilitychange", async () => {
    const fn = vi.fn(async () => {});
    renderHook(() => usePolling(fn, INTERVAL));
    expect(fn).toHaveBeenCalledTimes(1);
    await flushMicrotasks();

    // The scheduled tick fires while hidden, does nothing, and stops
    // rescheduling — no background polling.
    hidden = true;
    await vi.advanceTimersByTimeAsync(INTERVAL * 8);
    expect(fn).toHaveBeenCalledTimes(1);

    // Becoming visible runs immediately and restores the cadence.
    hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
    expect(fn).toHaveBeenCalledTimes(2);
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(INTERVAL);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("stops scheduling after unmount", async () => {
    const fn = vi.fn(async () => {});
    const { unmount } = renderHook(() => usePolling(fn, INTERVAL));
    expect(fn).toHaveBeenCalledTimes(1);
    await flushMicrotasks();
    unmount();
    await vi.advanceTimersByTimeAsync(INTERVAL * 8);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("reports lastSuccessAt and the failure streak when trackStatus is on", async () => {
    let failing = false;
    const fn = vi.fn(async () => {
      if (failing) throw new Error("boom");
    });
    const { result } = renderHook(() =>
      usePolling(fn, INTERVAL, { trackStatus: true }),
    );
    expect(result.current).toEqual({ lastSuccessAt: null, failures: 0 });

    await act(async () => {
      await flushMicrotasks();
    });
    const first = result.current.lastSuccessAt;
    expect(first).toBe(Date.now());

    // Failures accumulate while the timestamp stays put — it dates the data
    // the page is still showing.
    failing = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(INTERVAL);
    });
    expect(result.current).toEqual({ lastSuccessAt: first, failures: 1 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(INTERVAL * 2);
    });
    expect(result.current.failures).toBe(2);

    failing = false;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(INTERVAL * 4);
    });
    expect(result.current.failures).toBe(0);
    expect(result.current.lastSuccessAt).toBeGreaterThan(first!);
  });

  it("holds no state unless trackStatus is asked for", async () => {
    const fn = vi.fn(async () => {});
    const { result } = renderHook(() => usePolling(fn, INTERVAL));
    await vi.advanceTimersByTimeAsync(INTERVAL * 4);
    expect(fn.mock.calls.length).toBeGreaterThan(1);
    // No re-render, no timestamp: existing call sites poll exactly as before.
    expect(result.current).toEqual({ lastSuccessAt: null, failures: 0 });
  });

  it("does nothing when disabled", async () => {
    const fn = vi.fn(async () => {});
    renderHook(() => usePolling(fn, INTERVAL, { enabled: false }));
    await vi.advanceTimersByTimeAsync(INTERVAL * 4);
    expect(fn).not.toHaveBeenCalled();
  });
});

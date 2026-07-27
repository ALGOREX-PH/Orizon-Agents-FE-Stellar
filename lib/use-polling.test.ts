// @vitest-environment jsdom
/**
 * Unit tests for the usePolling loop (lib/use-polling.ts).
 *
 * Fake timers drive the self-scheduling loop; `document.hidden` is stubbed
 * with a configurable own-property getter so visibility pauses can be
 * simulated. The hook holds no React state, so no act() wrapping is needed
 * beyond what renderHook does itself.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
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

  it("backs off ×2 per consecutive failure, caps at ×4, and resets on success", async () => {
    let failing = true;
    const fn = vi.fn(async () => {
      if (failing) throw new Error("boom");
    });
    renderHook(() => usePolling(fn, INTERVAL));
    expect(fn).toHaveBeenCalledTimes(1); // t=0, rejects
    await flushMicrotasks();

    // One failure → next run at 2× the base interval.
    await vi.advanceTimersByTimeAsync(INTERVAL);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(INTERVAL);
    expect(fn).toHaveBeenCalledTimes(2); // t=2000, rejects again

    // Two failures → capped at 4× the base interval.
    await vi.advanceTimersByTimeAsync(INTERVAL * 3);
    expect(fn).toHaveBeenCalledTimes(2);
    failing = false;
    await vi.advanceTimersByTimeAsync(INTERVAL);
    expect(fn).toHaveBeenCalledTimes(3); // t=6000, succeeds

    // Success resets the cadence to the base interval.
    await vi.advanceTimersByTimeAsync(INTERVAL);
    expect(fn).toHaveBeenCalledTimes(4);
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

  it("does nothing when disabled", async () => {
    const fn = vi.fn(async () => {});
    renderHook(() => usePolling(fn, INTERVAL, { enabled: false }));
    await vi.advanceTimersByTimeAsync(INTERVAL * 4);
    expect(fn).not.toHaveBeenCalled();
  });
});

// @vitest-environment jsdom
/**
 * Unit tests for useFetch (lib/use-fetch.ts).
 *
 * Covers the deps-change semantics: by default stale `data`/`error` are
 * cleared the moment deps change (no old record shown against new deps),
 * `keepPreviousData` opts back into the retain-while-loading behavior, and
 * `reload()` always keeps the current data. Also verifies unmount safety
 * (a late settlement never sets state — no act warnings) and that the
 * latest `fn` is used without callers memoizing it.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useFetch } from "./use-fetch";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useFetch", () => {
  it("resolves data on mount and clears loading", async () => {
    const { result } = renderHook(() => useFetch(async () => "hello", []));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe("hello");
    expect(result.current.error).toBeNull();
  });

  it("surfaces a rejection message and keeps data null", async () => {
    const { result } = renderHook(() =>
      useFetch(() => Promise.reject(new Error("nope")), []),
    );
    await waitFor(() => expect(result.current.error).toBe("nope"));
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("clears stale data immediately when deps change (default)", async () => {
    const resolvers = new Map<number, (v: string) => void>();
    const fn = vi.fn(
      (dep: number) => new Promise<string>((res) => resolvers.set(dep, res)),
    );
    const { result, rerender } = renderHook(
      ({ dep }) => useFetch(() => fn(dep), [dep]),
      { initialProps: { dep: 1 } },
    );
    await act(async () => resolvers.get(1)!("record-1"));
    expect(result.current.data).toBe("record-1");

    // Deps change: the old record must not linger while the refetch runs.
    rerender({ dep: 2 });
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(true);

    await act(async () => resolvers.get(2)!("record-2"));
    expect(result.current.data).toBe("record-2");
    expect(result.current.loading).toBe(false);
  });

  it("clears a previous error when deps change", async () => {
    const fn = vi.fn(async (dep: number) => {
      if (dep === 1) throw new Error("boom");
      return "ok";
    });
    const { result, rerender } = renderHook(
      ({ dep }) => useFetch(() => fn(dep), [dep]),
      { initialProps: { dep: 1 } },
    );
    await waitFor(() => expect(result.current.error).toBe("boom"));

    rerender({ dep: 2 });
    expect(result.current.error).toBeNull();
    await waitFor(() => expect(result.current.data).toBe("ok"));
  });

  it("keeps the old data across a deps change with keepPreviousData", async () => {
    const resolvers = new Map<number, (v: string) => void>();
    const fn = vi.fn(
      (dep: number) => new Promise<string>((res) => resolvers.set(dep, res)),
    );
    const { result, rerender } = renderHook(
      ({ dep }) => useFetch(() => fn(dep), [dep], { keepPreviousData: true }),
      { initialProps: { dep: 1 } },
    );
    await act(async () => resolvers.get(1)!("record-1"));
    expect(result.current.data).toBe("record-1");

    rerender({ dep: 2 });
    expect(result.current.data).toBe("record-1"); // retained while loading
    expect(result.current.loading).toBe(true);

    await act(async () => resolvers.get(2)!("record-2"));
    expect(result.current.data).toBe("record-2");
  });

  it("keeps the current data while a reload() refetch is in flight", async () => {
    const defs: Array<{ promise: Promise<string>; resolve: (v: string) => void }> = [];
    const fn = vi.fn(() => {
      const d = deferred<string>();
      defs.push(d);
      return d.promise;
    });
    const { result } = renderHook(() => useFetch(fn, []));
    await act(async () => defs[0].resolve("first"));
    expect(result.current.data).toBe("first");

    act(() => result.current.reload());
    // reload is a nonce bump, not a deps change — data stays visible.
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe("first");

    await act(async () => defs[1].resolve("second"));
    expect(result.current.data).toBe("second");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("always invokes the latest fn on reload without requiring memoization", async () => {
    const first = vi.fn(async () => "first");
    const second = vi.fn(async () => "second");
    const { result, rerender } = renderHook(({ fn }) => useFetch(fn, []), {
      initialProps: { fn: first },
    });
    await waitFor(() => expect(result.current.data).toBe("first"));

    // Swapping fn alone (deps unchanged) does not refetch…
    rerender({ fn: second });
    expect(second).not.toHaveBeenCalled();
    expect(result.current.data).toBe("first");

    // …but the next run uses the swapped-in fn, not a stale closure.
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.data).toBe("second"));
    expect(first).toHaveBeenCalledTimes(1);
  });

  it("ignores settlements that land after unmount — no state updates, no warnings", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const late = deferred<string>();
    const resolved = renderHook(() => useFetch(() => late.promise, []));
    expect(resolved.result.current.loading).toBe(true);
    resolved.unmount();
    late.resolve("too late");

    const failing = deferred<string>();
    const rejected = renderHook(() => useFetch(() => failing.promise, []));
    rejected.unmount();
    failing.reject(new Error("too late to fail"));

    // Let both settlements flush outside act — the alive guard must swallow
    // them without touching state (would otherwise trigger act warnings).
    await new Promise((r) => setTimeout(r, 0));
    expect(errSpy).not.toHaveBeenCalled();
  });
});

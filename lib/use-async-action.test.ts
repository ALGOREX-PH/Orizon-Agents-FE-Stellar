// @vitest-environment jsdom
/**
 * Unit tests for the shared async-action hook.
 *
 * Locks in the contract the PDAX panels rely on: pending transitions
 * around `run`, error normalization (no "Error: " prefix leaking into
 * money-panel UIs), data retention across failures, and `reset`.
 */

import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { toMessage, useAsyncAction } from "./use-async-action";

// @testing-library/react's act() requires this flag in a bare jsdom env.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

/** A promise with externally controlled settle, to observe mid-flight state. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("toMessage", () => {
  it("uses .message for Error instances (no 'Error: ' prefix)", () => {
    expect(toMessage(new Error("POST /ramp → 502 — upstream down"))).toBe(
      "POST /ramp → 502 — upstream down",
    );
  });

  it("stringifies non-Error throwables", () => {
    expect(toMessage("plain string")).toBe("plain string");
    expect(toMessage(42)).toBe("42");
  });
});

describe("useAsyncAction", () => {
  it("starts idle: no data, no error, not pending", () => {
    const { result } = renderHook(() =>
      useAsyncAction(async () => "unused"),
    );
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.pending).toBe(false);
  });

  it("tracks pending across a successful run and stores the result", async () => {
    const d = deferred<string>();
    const { result } = renderHook(() => useAsyncAction(() => d.promise));

    let returned: Promise<string | undefined>;
    act(() => {
      returned = result.current.run();
    });
    expect(result.current.pending).toBe(true);
    expect(result.current.error).toBeNull();

    await act(async () => {
      d.resolve("balances");
      await returned;
    });
    expect(result.current.pending).toBe(false);
    expect(result.current.data).toBe("balances");
    expect(result.current.error).toBeNull();
    await expect(returned!).resolves.toBe("balances");
  });

  it("passes run() arguments through to fn", async () => {
    const calls: Array<[string, number]> = [];
    const { result } = renderHook(() =>
      useAsyncAction(async (a: string, b: number) => {
        calls.push([a, b]);
        return `${a}:${b}`;
      }),
    );
    await act(async () => {
      await result.current.run("USDC", 10);
    });
    expect(calls).toEqual([["USDC", 10]]);
    expect(result.current.data).toBe("USDC:10");
  });

  it("normalizes a thrown Error to its message and resolves undefined", async () => {
    const { result } = renderHook(() =>
      useAsyncAction<[], string>(async () => {
        throw new Error("GET /balances → 503 — down");
      }),
    );
    let returned: string | undefined = "sentinel";
    await act(async () => {
      returned = await result.current.run();
    });
    expect(returned).toBeUndefined();
    expect(result.current.error).toBe("GET /balances → 503 — down");
    expect(result.current.error).not.toMatch(/^Error: /);
    expect(result.current.pending).toBe(false);
  });

  it("stringifies non-Error rejections", async () => {
    const { result } = renderHook(() =>
      useAsyncAction<[], never>(() => Promise.reject("nope")),
    );
    await act(async () => {
      await result.current.run();
    });
    expect(result.current.error).toBe("nope");
  });

  it("keeps prior data after a failed run and clears the error on the next run", async () => {
    let fail = false;
    const { result } = renderHook(() =>
      useAsyncAction(async () => {
        if (fail) throw new Error("boom");
        return "first";
      }),
    );

    await act(async () => {
      await result.current.run();
    });
    expect(result.current.data).toBe("first");

    fail = true;
    await act(async () => {
      await result.current.run();
    });
    expect(result.current.data).toBe("first"); // stale data retained
    expect(result.current.error).toBe("boom");

    // A new run clears the previous error immediately (while pending).
    fail = false;
    let mid: Promise<string | undefined>;
    act(() => {
      mid = result.current.run();
    });
    expect(result.current.error).toBeNull();
    await act(async () => {
      await mid;
    });
    expect(result.current.data).toBe("first");
  });

  it("reset() clears data and error", async () => {
    const { result } = renderHook(() =>
      useAsyncAction(async () => "value"),
    );
    await act(async () => {
      await result.current.run();
    });
    expect(result.current.data).toBe("value");

    act(() => {
      result.current.reset();
    });
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.pending).toBe(false);
  });

  it("calls the latest fn on each run (no stale closure)", async () => {
    let value = "old";
    const { result, rerender } = renderHook(() =>
      useAsyncAction(async () => value),
    );
    value = "new";
    rerender();
    await act(async () => {
      await result.current.run();
    });
    expect(result.current.data).toBe("new");
  });
});

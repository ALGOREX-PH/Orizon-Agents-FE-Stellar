/**
 * Reconnect-behavior tests for openTraceStream (lib/api.ts).
 *
 * The backend replays the full trace history to every new SSE subscriber,
 * so a reconnect re-delivers already-seen lines. These tests stub a fake
 * EventSource and assert that onReset fires before each reconnect so a
 * consumer that clears its buffer never renders (or counts) a line twice.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openTraceStream } from "./api";
import type { TraceLine } from "./types";

type Listener = (e: MessageEvent) => void;

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  closed = false;
  private listeners = new Map<string, Listener[]>();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, cb: Listener): void {
    const arr = this.listeners.get(type) ?? [];
    arr.push(cb);
    this.listeners.set(type, arr);
  }

  close(): void {
    this.closed = true;
  }

  emit(type: string, data?: unknown): void {
    for (const cb of this.listeners.get(type) ?? []) {
      cb({ data: JSON.stringify(data) } as MessageEvent);
    }
  }
}

const line = (t: string, msg: string): TraceLine => ({ t, level: "cost", msg });

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("EventSource", FakeEventSource);
  FakeEventSource.instances = [];
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("openTraceStream reconnect", () => {
  it("fires onReset before reconnecting so a full replay never duplicates lines", () => {
    const lines: TraceLine[] = [];
    let resets = 0;
    const dispose = openTraceStream(
      "tsk_1",
      (l) => lines.push(l),
      undefined,
      undefined,
      () => {
        resets += 1;
        lines.length = 0;
      },
    );

    const first = FakeEventSource.instances[0];
    first.emit("trace", line("0.1", "0.010 USDC"));
    first.emit("trace", line("0.2", "0.020 USDC"));
    expect(lines).toHaveLength(2);

    // Drop the stream; backoff is 1s before the first retry.
    first.emit("error");
    expect(resets).toBe(0);
    vi.advanceTimersByTime(1_000);
    expect(resets).toBe(1);
    expect(FakeEventSource.instances).toHaveLength(2);

    // The new subscriber gets the full history replayed, plus one new line.
    const second = FakeEventSource.instances[1];
    second.emit("trace", line("0.1", "0.010 USDC"));
    second.emit("trace", line("0.2", "0.020 USDC"));
    second.emit("trace", line("0.3", "0.030 USDC"));

    expect(lines).toHaveLength(3);
    const keys = lines.map((l) => `${l.t}|${l.msg}`);
    expect(new Set(keys).size).toBe(keys.length);

    dispose();
  });

  it("does not fire onReset when disposed before the retry timer elapses", () => {
    const onReset = vi.fn();
    const dispose = openTraceStream(
      "tsk_2",
      () => {},
      undefined,
      undefined,
      onReset,
    );

    FakeEventSource.instances[0].emit("error");
    dispose();
    vi.advanceTimersByTime(10_000);

    expect(onReset).not.toHaveBeenCalled();
    expect(FakeEventSource.instances).toHaveLength(1);
  });
});

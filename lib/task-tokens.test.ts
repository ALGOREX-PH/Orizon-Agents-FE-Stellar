// @vitest-environment jsdom
/**
 * Unit tests for the task read-token store (lib/task-tokens.ts).
 *
 * Locks in the sessionStorage roundtrip, the FIFO cap, and the degrade-to-
 * no-token behavior on corrupt or unavailable storage — absent token must
 * always equal the pre-token behavior, never a crash.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_TASK_TOKENS,
  getTaskToken,
  rememberTaskToken,
} from "./task-tokens";

const KEY = "orizon.task-tokens";

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("task-tokens", () => {
  it("roundtrips a remembered token", () => {
    rememberTaskToken("tsk_1", "tok_abc");
    expect(getTaskToken("tsk_1")).toBe("tok_abc");
  });

  it("returns null for an unknown task id", () => {
    rememberTaskToken("tsk_1", "tok_abc");
    expect(getTaskToken("tsk_nope")).toBeNull();
  });

  it("persists via sessionStorage (survives a reload, not a new tab)", () => {
    rememberTaskToken("tsk_1", "tok_abc");
    expect(sessionStorage.getItem(KEY)).toContain("tsk_1");
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("ignores missing tokens so enforcement-off responses are a no-op", () => {
    rememberTaskToken("tsk_1", null);
    rememberTaskToken("tsk_2", undefined);
    rememberTaskToken("tsk_3", "");
    expect(getTaskToken("tsk_1")).toBeNull();
    expect(getTaskToken("tsk_2")).toBeNull();
    expect(getTaskToken("tsk_3")).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it("re-remembering a task refreshes its token", () => {
    rememberTaskToken("tsk_1", "old");
    rememberTaskToken("tsk_1", "new");
    expect(getTaskToken("tsk_1")).toBe("new");
  });

  it("caps entries FIFO — the oldest task is evicted first", () => {
    for (let i = 0; i < MAX_TASK_TOKENS + 2; i++) {
      rememberTaskToken(`tsk_${i}`, `tok_${i}`);
    }
    expect(getTaskToken("tsk_0")).toBeNull();
    expect(getTaskToken("tsk_1")).toBeNull();
    expect(getTaskToken("tsk_2")).toBe("tok_2");
    expect(getTaskToken(`tsk_${MAX_TASK_TOKENS + 1}`)).toBe(
      `tok_${MAX_TASK_TOKENS + 1}`,
    );
  });

  it("re-remembering an id refreshes its FIFO position, not just its token", () => {
    for (let i = 0; i < MAX_TASK_TOKENS; i++) {
      rememberTaskToken(`tsk_${i}`, `tok_${i}`);
    }
    // Touch the oldest, then push one more: the second-oldest gets evicted.
    rememberTaskToken("tsk_0", "tok_0b");
    rememberTaskToken("tsk_new", "tok_new");
    expect(getTaskToken("tsk_0")).toBe("tok_0b");
    expect(getTaskToken("tsk_1")).toBeNull();
  });

  it("treats corrupt JSON as empty instead of throwing", () => {
    sessionStorage.setItem(KEY, "{not json");
    expect(getTaskToken("tsk_1")).toBeNull();
    rememberTaskToken("tsk_1", "tok_abc");
    expect(getTaskToken("tsk_1")).toBe("tok_abc");
  });

  it("drops malformed entries while keeping valid ones", () => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify([["tsk_ok", "tok_ok"], ["only-id"], 42, null]),
    );
    expect(getTaskToken("tsk_ok")).toBe("tok_ok");
    expect(getTaskToken("only-id")).toBeNull();
  });

  it("degrades to no-token when storage throws (private mode / quota)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(() => rememberTaskToken("tsk_1", "tok_abc")).not.toThrow();
    expect(getTaskToken("tsk_1")).toBeNull();
  });
});

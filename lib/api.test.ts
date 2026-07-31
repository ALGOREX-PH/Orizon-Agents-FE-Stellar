/**
 * Unit tests for the fetch plumbing in lib/api.ts.
 *
 * `get` and `post` are module-private, so they are exercised through the
 * thinnest exported wrappers: `listAgents` (get) and `decompose` (post).
 * `globalThis.fetch` is stubbed — no network, no DOM. The SSE helper
 * `openTraceStream` needs EventSource (DOM) and is deliberately untested here.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  GET_DEDUPE_MS,
  GET_TIMEOUT_MS,
  clearGetCache,
  decompose,
  execute,
  getArtifact,
  getFlow,
  getOverview,
  getReputation,
  getReputationParams,
  getTrace,
  listAgents,
  listReputation,
  openTraceStream,
} from "./api";
import { rememberTaskToken } from "./task-tokens";
import type { TraceLine } from "./types";

type FetchMockResponse = {
  ok: boolean;
  status: number;
  statusText?: string;
  headers?: { get: (name: string) => string | null };
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

const fetchMock =
  vi.fn<(input: string, init?: RequestInit) => Promise<FetchMockResponse>>();
vi.stubGlobal("fetch", fetchMock);

// This suite runs in node (no DOM): give lib/task-tokens a window with a
// Map-backed sessionStorage so token wiring is testable, and stub a minimal
// EventSource so openTraceStream's URL construction is observable.
const sessionStore = new Map<string, string>();
vi.stubGlobal("window", {
  sessionStorage: {
    getItem: (k: string) => sessionStore.get(k) ?? null,
    setItem: (k: string, v: string) => void sessionStore.set(k, v),
    removeItem: (k: string) => void sessionStore.delete(k),
    clear: () => sessionStore.clear(),
  },
});

class FakeEventSource {
  static urls: string[] = [];
  constructor(url: string) {
    FakeEventSource.urls.push(url);
  }
  addEventListener(): void {}
  close(): void {}
}
vi.stubGlobal("EventSource", FakeEventSource);

function jsonResponse(status: number, body: unknown): FetchMockResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

afterEach(() => {
  fetchMock.mockReset();
  // GETs dedupe per path for ~1s — flush so each test controls its fetches.
  clearGetCache();
  sessionStore.clear();
  FakeEventSource.urls = [];
  vi.restoreAllMocks();
});

// Guarded by isAgentList, so the fixture carries every field the agents
// table computes with (price/rep/runs/skills/status).
const agentFixture = {
  id: "agt_01",
  name: "copywrite.v3",
  skills: ["content"],
  price: 0.012,
  rep: 4.6,
  status: "online",
  runs: 1284,
};

describe("get (via listAgents)", () => {
  it("hits the /api prefix with no-store and resolves parsed JSON", async () => {
    const agents = [agentFixture];
    fetchMock.mockResolvedValueOnce(jsonResponse(200, agents));

    await expect(listAgents()).resolves.toEqual(agents);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/agents",
      expect.objectContaining({
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("rejects on a non-OK response with method, path and status in the message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { detail: "boom" }));

    await expect(listAgents()).rejects.toThrow("GET /agents → 500");
  });

  it("propagates a network-level rejection untouched", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    await expect(listAgents()).rejects.toThrow("network down");
  });

  it("surfaces the backend error envelope, like post does", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(503, {
        error: { code: "unavailable", message: "horizon unreachable" },
        detail: "legacy detail",
      }),
    );

    await expect(listAgents()).rejects.toThrow(
      "GET /agents → 503 — horizon unreachable",
    );
  });

  it("falls back to the legacy detail field", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(404, { detail: "no agents" }));

    await expect(listAgents()).rejects.toThrow("GET /agents → 404 — no agents");
  });

  // "backend offline" is a lie when the backend answered "not this second".
  it("reports a 429 as rate limited, with the wait the backend asked for", async () => {
    fetchMock.mockResolvedValueOnce({
      ...jsonResponse(429, {
        detail: "rate_limited",
        error: { code: "rate_limited", message: "too many requests" },
      }),
      headers: {
        get: (name: string) => (name === "retry-after" ? "12" : null),
      },
    });

    const err = await listAgents().then(
      () => {
        throw new Error("expected rejection");
      },
      (e: unknown) => e as ApiError,
    );

    expect(err.message).toBe("GET /agents → 429 — rate limited, retry in 12s");
    expect(err.status).toBe(429);
    expect(err.retryAfterMs).toBe(12_000);
  });

  it("still names the throttling when the backend sends no Retry-After", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(429, { detail: "rate_limited" }),
    );

    const err = await listAgents().then(
      () => {
        throw new Error("expected rejection");
      },
      (e: unknown) => e as ApiError,
    );

    expect(err.message).toBe("GET /agents → 429 — rate limited, retry shortly");
    expect(err.retryAfterMs).toBeUndefined();
  });

  it("reads an HTTP-date Retry-After as a wait in ms", async () => {
    const at = new Date(Date.now() + 30_000).toUTCString();
    fetchMock.mockResolvedValueOnce({
      ...jsonResponse(429, {}),
      headers: { get: () => at },
    });

    const err = await listAgents().then(
      () => {
        throw new Error("expected rejection");
      },
      (e: unknown) => e as ApiError,
    );

    expect(err.retryAfterMs).toBeGreaterThan(25_000);
    expect(err.retryAfterMs).toBeLessThanOrEqual(30_000);
  });
});

describe("fetch deadline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stops the deadline once the body has been read", async () => {
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementationOnce((_url, init) => {
      signal = init?.signal ?? undefined;
      return Promise.resolve(jsonResponse(200, []));
    });

    await expect(listAgents()).resolves.toEqual([]);

    await vi.advanceTimersByTimeAsync(GET_TIMEOUT_MS * 2);
    expect(signal?.aborted).toBe(false);
  });

  // fetch() resolves when HEADERS arrive: a body that never lands used to sit
  // outside the guarded scope and hang the loading state forever.
  it("covers a stalled response body and reports it as a timeout", async () => {
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementationOnce((_url, init) => {
      signal = init?.signal ?? undefined;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          new Promise<never>((_resolve, reject) => {
            signal?.addEventListener("abort", () =>
              reject(new Error("The operation was aborted")),
            );
          }),
        text: () => Promise.resolve(""),
      });
    });

    const rejects = expect(listAgents()).rejects.toThrow(
      "GET /agents → timeout after 60s",
    );
    await vi.advanceTimersByTimeAsync(GET_TIMEOUT_MS + 1);
    await rejects;
    expect(signal?.aborted).toBe(true);
  });
});

const repInfo = {
  agent_id: "agt_01h8",
  smoothed_bps: 7000,
  lower_bound_bps: 5677,
  avg_bps: 0,
  count: 0,
  weight: 0,
  disputed: 0,
  dispute_rate_bps: 0,
  source: "prior",
};

describe("listReputation", () => {
  it("hits the batch reputation endpoint and resolves the parsed batch", async () => {
    const batch = {
      reputations: { agt_01h8: repInfo },
      floor_bps: 5500,
      prior_bps: 7000,
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, batch));

    await expect(listReputation()).resolves.toEqual(batch);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/stellar/reputation",
      expect.objectContaining({
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("rejects on a non-OK response with method, path and status in the message", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(502, { detail: "horizon down" }),
    );

    await expect(listReputation()).rejects.toThrow(
      "GET /stellar/reputation → 502",
    );
  });
});

describe("getReputation", () => {
  it("hits the per-agent reputation endpoint and resolves the parsed object", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, repInfo));

    await expect(getReputation("agt_01h8")).resolves.toEqual(repInfo);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/stellar/reputation/agt_01h8",
      expect.objectContaining({
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("rejects on a non-OK response with method, path and status in the message", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, { detail: "unknown agent" }),
    );

    await expect(getReputation("agt_nope")).rejects.toThrow(
      "GET /stellar/reputation/agt_nope → 404",
    );
  });
});

// Guarded by isReputationParams: every constant the reputation math divides
// or smooths with has to be present and numeric.
const paramsFixture = {
  enabled: true,
  prior_bps: 7000,
  prior_weight_usdc: 12,
  floor_bps: 5500,
  max_rating_weight_usdc: 100,
  read_ttl_seconds: 15,
  wilson_z: 1,
  epoch_seconds: 604_800,
  decay_bps_per_epoch: 9250,
  max_decay_epochs: 96,
  contract_id: "CDCSOBEVZUPQZV5GV4D6KYHZCLNGW2KXY74RUHSZ3EZUXF34DPW422ZT",
  network: "testnet",
};

describe("getReputationParams", () => {
  it("hits the params endpoint and resolves the parsed object", async () => {
    const params = paramsFixture;
    fetchMock.mockResolvedValueOnce(jsonResponse(200, params));

    await expect(getReputationParams()).resolves.toEqual(params);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/stellar/reputation/params",
      expect.objectContaining({
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("rejects on a non-OK response with method, path and status in the message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(503, { detail: "rpc down" }));

    await expect(getReputationParams()).rejects.toThrow(
      "GET /stellar/reputation/params → 503",
    );
  });
});

describe("response guards", () => {
  it("rejects a malformed agent list as a normal request error", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, [{ id: "agt_01", name: "copywrite.v3" }]),
    );

    await expect(listAgents()).rejects.toThrow(
      "malformed response from /agents",
    );
  });

  it("rejects a flow payload with no edges as a normal request error", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { nodes: [{ id: "in", label: "intent" }] }),
    );

    await expect(getFlow()).rejects.toThrow(
      "malformed response from /flow/default",
    );
  });

  it("rejects reputation params missing a decay constant", async () => {
    const { epoch_seconds: _drop, ...rest } = paramsFixture;
    fetchMock.mockResolvedValueOnce(jsonResponse(200, rest));

    await expect(getReputationParams()).rejects.toThrow(
      "malformed response from /stellar/reputation/params",
    );
  });

  it("rejects a malformed overview payload as a normal request error", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { agents_online: 1, throughput: "not-an-array" }),
    );

    await expect(getOverview()).rejects.toThrow(
      "malformed response from /metrics/overview",
    );
  });

  it("rejects a malformed decompose payload as a normal request error", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { plan_id: "pln_1", steps: [], total_usdc: "0.03" }),
    );

    await expect(decompose("x")).rejects.toThrow(
      "malformed response from /orchestrator/decompose",
    );
  });

  it("resolves a well-formed guarded payload untouched", async () => {
    const overview = {
      agents_online: 12,
      tasks_per_sec: 0.4,
      avg_completion: 0.97,
      avg_trust: 4.6,
      throughput: [1, 2, 3],
      skills: [{ name: "code", pct: 62, tone: "violet" }],
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, overview));

    await expect(getOverview()).resolves.toEqual(overview);
  });
});

describe("get dedupe cache", () => {
  it("shares one fetch across concurrent requests for the same path", async () => {
    const agents = [agentFixture];
    fetchMock.mockResolvedValueOnce(jsonResponse(200, agents));

    const [a, b] = await Promise.all([listAgents(), listAgents()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toEqual(agents);
    expect(b).toBe(a); // same underlying promise → same resolved value
  });

  it("reuses a resolved response inside the dedupe window and refetches after it", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000_000);
    fetchMock.mockResolvedValue(jsonResponse(200, []));

    await listAgents();
    await listAgents();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    nowSpy.mockReturnValue(1_000_000 + GET_DEDUPE_MS + 1);
    await listAgents();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("evicts rejected requests so the next call retries the network", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { detail: "boom" }));
    await expect(listAgents()).rejects.toThrow("GET /agents → 500");

    fetchMock.mockResolvedValueOnce(jsonResponse(200, []));
    await expect(listAgents()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not dedupe across different paths", async () => {
    // Both paths are guarded, so each mock body has to satisfy its own guard.
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, []))
      .mockResolvedValueOnce(jsonResponse(200, paramsFixture));

    await Promise.all([listAgents(), getReputationParams()]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("post (via decompose)", () => {
  it("sends a JSON body with content-type header and resolves parsed JSON", async () => {
    const plan = {
      plan_id: "pln_1",
      intent: "tetris",
      steps: [],
      total_usdc: 0,
      total_eta: 0,
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, plan));

    await expect(decompose("tetris")).resolves.toEqual(plan);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/orchestrator/decompose",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intent: "tetris" }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("surfaces the backend `detail` field in the rejection message", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(422, { detail: "plan too vague" }),
    );

    await expect(decompose("x")).rejects.toThrow(
      "POST /orchestrator/decompose → 422 — plan too vague",
    );
  });

  it("prefers the standardized error-envelope message over detail", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(402, {
        error: { code: "payment_required", message: "authorization expired" },
        detail: "legacy detail",
      }),
    );

    await expect(decompose("x")).rejects.toThrow(
      "POST /orchestrator/decompose → 402 — authorization expired",
    );
  });

  it("falls back to detail when the envelope carries no message", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(422, {
        error: { code: "invalid_plan" },
        detail: "plan too vague",
      }),
    );

    await expect(decompose("x")).rejects.toThrow(
      "POST /orchestrator/decompose → 422 — plan too vague",
    );
  });

  it("falls back to statusText when the body is unreadable", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      json: () => Promise.reject(new Error("no body")),
      text: () => Promise.reject(new Error("no body")),
    });

    await expect(decompose("x")).rejects.toThrow(
      "POST /orchestrator/decompose → 503 — Service Unavailable",
    );
  });

  it("falls back to the stringified JSON body (capped at 300 chars) when detail is absent", async () => {
    const noise = "z".repeat(400);
    fetchMock.mockResolvedValueOnce(jsonResponse(400, { error: noise }));

    const err = await decompose("x").then(
      () => {
        throw new Error("expected rejection");
      },
      (e: unknown) => e as Error,
    );

    expect(err.message).toContain("POST /orchestrator/decompose → 400 — ");
    expect(err.message).toContain('{"error":"zzz');
    const detail = err.message.split(" — ")[1];
    expect(detail.length).toBe(300);
  });

  it("falls back to the raw text body when the error payload is not JSON", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error("not json")),
      text: () => Promise.resolve("Bad Gateway"),
    });

    await expect(decompose("x")).rejects.toThrow(
      "POST /orchestrator/decompose → 502 — Bad Gateway",
    );
  });

  it("still rejects with method, path and status when the body is unreadable", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("no body")),
      text: () => Promise.reject(new Error("no body")),
    });

    await expect(decompose("x")).rejects.toThrow(
      "POST /orchestrator/decompose → 500",
    );
  });

  it("propagates a network-level rejection untouched", async () => {
    fetchMock.mockRejectedValueOnce(new Error("socket hang up"));

    await expect(decompose("x")).rejects.toThrow("socket hang up");
  });
});

describe("task read tokens", () => {
  it("attaches X-Task-Token to getTrace when a token is known", async () => {
    rememberTaskToken("tsk_tok", "tok_1");
    fetchMock.mockResolvedValueOnce(jsonResponse(200, []));

    await getTrace("tsk_tok");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/trace/tsk_tok",
      expect.objectContaining({ headers: { "X-Task-Token": "tok_1" } }),
    );
  });

  it("attaches X-Task-Token to getArtifact when a token is known", async () => {
    rememberTaskToken("tsk_tok", "tok_1");
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { artifact: null }));

    await getArtifact("tsk_tok");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tasks/tsk_tok/artifact",
      expect.objectContaining({ headers: { "X-Task-Token": "tok_1" } }),
    );
  });

  it("sends no headers when no token is known for the task", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));

    await getTrace("tsk_unknown");

    expect(fetchMock.mock.calls[0][1]?.headers).toBeUndefined();
  });

  it("remembers the token from an execute response for later reads", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { task_id: "tsk_9", read_token: "tok_9" }),
    );
    await expect(execute("pln_1")).resolves.toEqual({
      task_id: "tsk_9",
      read_token: "tok_9",
    });

    fetchMock.mockResolvedValueOnce(jsonResponse(200, []));
    await getTrace("tsk_9");

    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/trace/tsk_9",
      expect.objectContaining({ headers: { "X-Task-Token": "tok_9" } }),
    );
  });

  it("leaves reads bare when the execute response ships no token", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { task_id: "tsk_10" }));
    await execute("pln_1");

    fetchMock.mockResolvedValueOnce(jsonResponse(200, []));
    await getTrace("tsk_10");

    expect(fetchMock.mock.lastCall?.[1]?.headers).toBeUndefined();
  });

  it("appends the token as a query param on the SSE stream url", () => {
    // EventSource cannot set headers — the token rides the query string,
    // encoded so reserved characters survive.
    rememberTaskToken("tsk_sse", "tok se/1");
    const dispose = openTraceStream("tsk_sse", () => {});

    expect(FakeEventSource.urls).toEqual([
      "/api/trace/tsk_sse/stream?token=tok%20se%2F1",
    ]);
    dispose();
  });

  it("opens the SSE stream without a query param when no token is known", () => {
    const dispose = openTraceStream("tsk_plain", () => {});

    expect(FakeEventSource.urls).toEqual(["/api/trace/tsk_plain/stream"]);
    dispose();
  });
});

/**
 * Richer than the URL-only stub above: the suites below drive the whole
 * connection lifecycle (open / trace / done / error) that openTraceStream
 * reacts to.
 */
class StubEventSource {
  static instances: StubEventSource[] = [];
  url: string;
  closed = false;
  private listeners = new Map<string, Array<(e: MessageEvent) => void>>();

  constructor(url: string) {
    this.url = url;
    StubEventSource.instances.push(this);
  }

  addEventListener(type: string, cb: (e: MessageEvent) => void): void {
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

  static last(): StubEventSource {
    return StubEventSource.instances[StubEventSource.instances.length - 1];
  }
}

const traceLine = (t: string, msg: string): TraceLine => ({
  t,
  level: "cost",
  msg,
});

function useStubEventSource() {
  beforeEach(() => {
    vi.useFakeTimers();
    StubEventSource.instances = [];
    vi.stubGlobal("EventSource", StubEventSource);
  });
  afterEach(() => {
    vi.useRealTimers();
    // Hand the module-level stub back to the token tests above.
    vi.stubGlobal("EventSource", FakeEventSource);
  });
}

describe("openTraceStream reconnect budget", () => {
  useStubEventSource();

  // A free-form workflow streams for minutes. A budget that never reset
  // declared such a run dead on its third transport hiccup — while it was
  // still executing, and still charging.
  it("refreshes the budget after every connection that carried lines", async () => {
    const lines: TraceLine[] = [];
    const onError = vi.fn();
    const dispose = openTraceStream(
      "tsk_long",
      (l) => lines.push(l),
      undefined,
      onError,
      () => {
        lines.length = 0;
      },
    );

    // Six outages — twice the old whole-stream budget of three.
    for (let i = 0; i < 6; i += 1) {
      const es = StubEventSource.last();
      es.emit("open");
      es.emit("trace", traceLine(`${i}.0`, `step ${i} — 0.010 USDC`));
      es.emit("error");
      await vi.advanceTimersByTimeAsync(1_000);
    }

    expect(StubEventSource.instances).toHaveLength(7);
    expect(onError).not.toHaveBeenCalled();
    expect(lines).toHaveLength(0); // consumer cleared on the last reset
    dispose();
  });

  // Silence is not failure — steps can take 120s — so simply holding the
  // connection counts as working.
  it("refreshes the budget after a connection that merely stayed up", async () => {
    const dispose = openTraceStream("tsk_quiet", () => {});

    for (let i = 0; i < 5; i += 1) {
      const es = StubEventSource.last();
      es.emit("open");
      await vi.advanceTimersByTimeAsync(20_000); // two keepalive windows
      es.emit("ping");
      es.emit("error");
      await vi.advanceTimersByTimeAsync(1_000);
    }

    expect(StubEventSource.instances).toHaveLength(6);
    dispose();
  });

  it("does not refresh the budget for a connection that dies on open", async () => {
    const dispose = openTraceStream("tsk_flap", () => {});

    for (const delay of [1_000, 2_000, 4_000, 1_000]) {
      const es = StubEventSource.last();
      es.emit("open");
      es.emit("error");
      await vi.advanceTimersByTimeAsync(delay);
    }

    // Three reconnects, then no more sockets: the flap does not loop.
    expect(StubEventSource.instances).toHaveLength(4);
    dispose();
  });

  it("closes the socket and reconnects no further once disposed", async () => {
    const onReset = vi.fn();
    const dispose = openTraceStream(
      "tsk_gone",
      () => {},
      undefined,
      undefined,
      onReset,
    );

    StubEventSource.last().emit("error");
    dispose();
    await vi.advanceTimersByTimeAsync(30_000);

    expect(onReset).not.toHaveBeenCalled();
    expect(StubEventSource.instances).toHaveLength(1);
  });
});

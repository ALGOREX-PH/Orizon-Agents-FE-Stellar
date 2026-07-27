/**
 * Unit tests for the fetch plumbing in lib/api.ts.
 *
 * `get` and `post` are module-private, so they are exercised through the
 * thinnest exported wrappers: `listAgents` (get) and `decompose` (post).
 * `globalThis.fetch` is stubbed — no network, no DOM. The SSE helper
 * `openTraceStream` needs EventSource (DOM) and is deliberately untested here.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decompose,
  getReputation,
  getReputationParams,
  listAgents,
  listReputation,
} from "./api";

type FetchMockResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<FetchMockResponse>>();
vi.stubGlobal("fetch", fetchMock);

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
});

describe("get (via listAgents)", () => {
  it("hits the /api prefix with no-store and resolves parsed JSON", async () => {
    const agents = [{ id: "agt_01", name: "copywrite.v3" }];
    fetchMock.mockResolvedValueOnce(jsonResponse(200, agents));

    await expect(listAgents()).resolves.toEqual(agents);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/agents",
      expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }),
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
      expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }),
    );
  });

  it("rejects on a non-OK response with method, path and status in the message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(502, { detail: "horizon down" }));

    await expect(listReputation()).rejects.toThrow("GET /stellar/reputation → 502");
  });
});

describe("getReputation", () => {
  it("hits the per-agent reputation endpoint and resolves the parsed object", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, repInfo));

    await expect(getReputation("agt_01h8")).resolves.toEqual(repInfo);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/stellar/reputation/agt_01h8",
      expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }),
    );
  });

  it("rejects on a non-OK response with method, path and status in the message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(404, { detail: "unknown agent" }));

    await expect(getReputation("agt_nope")).rejects.toThrow(
      "GET /stellar/reputation/agt_nope → 404",
    );
  });
});

describe("getReputationParams", () => {
  it("hits the params endpoint and resolves the parsed object", async () => {
    const params = {
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
    fetchMock.mockResolvedValueOnce(jsonResponse(200, params));

    await expect(getReputationParams()).resolves.toEqual(params);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/stellar/reputation/params",
      expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }),
    );
  });

  it("rejects on a non-OK response with method, path and status in the message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(503, { detail: "rpc down" }));

    await expect(getReputationParams()).rejects.toThrow(
      "GET /stellar/reputation/params → 503",
    );
  });
});

describe("post (via decompose)", () => {
  it("sends a JSON body with content-type header and resolves parsed JSON", async () => {
    const plan = { plan_id: "pln_1", intent: "tetris", steps: [], total_usdc: 0, total_eta: 0 };
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
    fetchMock.mockResolvedValueOnce(jsonResponse(422, { detail: "plan too vague" }));

    await expect(decompose("x")).rejects.toThrow(
      "POST /orchestrator/decompose → 422 — plan too vague",
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

    await expect(decompose("x")).rejects.toThrow("POST /orchestrator/decompose → 500");
  });

  it("propagates a network-level rejection untouched", async () => {
    fetchMock.mockRejectedValueOnce(new Error("socket hang up"));

    await expect(decompose("x")).rejects.toThrow("socket hang up");
  });
});

/**
 * Unit tests for the fetch plumbing in lib/api.ts.
 *
 * `get` and `post` are module-private, so they are exercised through the
 * thinnest exported wrappers: `listAgents` (get) and `decompose` (post).
 * `globalThis.fetch` is stubbed — no network, no DOM. The SSE helper
 * `openTraceStream` needs EventSource (DOM) and is deliberately untested here.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { decompose, listAgents } from "./api";

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
    expect(fetchMock).toHaveBeenCalledWith("/api/agents", { cache: "no-store" });
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

describe("post (via decompose)", () => {
  it("sends a JSON body with content-type header and resolves parsed JSON", async () => {
    const plan = { plan_id: "pln_1", intent: "tetris", steps: [], total_usdc: 0, total_eta: 0 };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, plan));

    await expect(decompose("tetris")).resolves.toEqual(plan);

    expect(fetchMock).toHaveBeenCalledWith("/api/orchestrator/decompose", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ intent: "tetris" }),
    });
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

/**
 * Unit tests for the PDAX client (lib/pdax.ts).
 *
 * Mirrors the fetch-mock pattern of lib/api.test.ts: `globalThis.fetch` is
 * stubbed, so requests are asserted at the wire (URL, method, headers, body)
 * without any network. Requests route through fetchWithTimeout from lib/api,
 * which prepends the shared "/api" base. Every test uses a distinct URL so
 * the suite is independent of any GET de-duplication upstream.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getPdaxBalances,
  getPdaxBanks,
  getPdaxOrder,
  getPdaxOrders,
  getPdaxPrice,
  getPdaxRamp,
  getPdaxReference,
  pdaxFiatWithdraw,
  pdaxFirmQuote,
  pdaxRampEstimate,
  pdaxReconcileRamp,
} from "./pdax";

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

describe("query-string construction", () => {
  it("appends defined params to the balances path", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { balances: [] }));

    await expect(getPdaxBalances("PHP")).resolves.toEqual({ balances: [] });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pdax/balances?currency=PHP",
      expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }),
    );
  });

  it("omits the ? entirely when every param is undefined", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { balances: [] }));

    await getPdaxBalances();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pdax/balances",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("URI-encodes values and joins multiple params on the price path", async () => {
    const quote = { price: "57.10" };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, quote));

    await expect(
      getPdaxPrice({
        quote_currency: "PHP",
        side: "buy",
        base_quantity: "1.5",
        base_currency: "USDC/XLM",
      }),
    ).resolves.toEqual(quote);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pdax/trade/price?quote_currency=PHP&side=buy&base_quantity=1.5&base_currency=USDC%2FXLM",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("drops undefined and empty-string params from the orders listing", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { orders: [] }));

    await getPdaxOrders({ page: 2, pageSize: 50, startDate: undefined, endDate: "" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pdax/trade/orders?page=2&pageSize=50",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
});

describe("path construction", () => {
  it("interpolates the order id into the single-order path", async () => {
    const order = { order_id: 42, status: "filled" };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, order));

    await expect(getPdaxOrder(42)).resolves.toEqual(order);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pdax/trade/orders/42",
      expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }),
    );
  });

  it("interpolates the ramp id into the ramp lookup path", async () => {
    const ramp = { ramp_id: "rmp_9", status: "settled" };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, ramp));

    await expect(getPdaxRamp("rmp_9")).resolves.toEqual(ramp);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pdax/ramp/rmp_9",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
});

describe("POST endpoints", () => {
  it("sends the firm-quote body as JSON with content-type", async () => {
    const body = { quote_currency: "PHP", side: "buy" as const, base_quantity: "10" };
    const quote = { quote_id: "q_1", price: "57.00" };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, quote));

    await expect(pdaxFirmQuote(body)).resolves.toEqual(quote);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pdax/trade/quote",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("posts fiat withdrawals to /fiat/withdraw", async () => {
    const body = { identifier: "user-1", amount: "500", bank: "BDO" };
    const result = { id: "wd_1", status: "pending" };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, result));

    await expect(pdaxFiatWithdraw(body)).resolves.toEqual(result);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pdax/fiat/withdraw",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
  });

  it("posts the ramp estimate with params in the query string and an empty body", async () => {
    const estimate = { direction: "onramp", php_in: "1000", usdc_out: "17.2" };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, estimate));

    await expect(pdaxRampEstimate("onramp", "1000", "PHP")).resolves.toEqual(estimate);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pdax/ramp/estimate?direction=onramp&amount=1000&currency=PHP",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
    );
  });

  it("posts the reconcile action to the per-ramp path", async () => {
    const ramp = { ramp_id: "rmp_7", status: "reconciled" };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, ramp));

    await expect(pdaxReconcileRamp("rmp_7")).resolves.toEqual(ramp);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pdax/ramp/rmp_7/reconcile",
      expect.objectContaining({ method: "POST", body: "{}" }),
    );
  });
});

describe("error detail extraction", () => {
  it("surfaces the backend detail field on a GET failure", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(503, { detail: "pdax maintenance" }));

    await expect(getPdaxReference()).rejects.toThrow(
      "GET /reference → 503 — pdax maintenance",
    );
  });

  it("falls back to the stringified JSON body (capped at 300 chars) when detail is absent", async () => {
    const noise = "z".repeat(400);
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: noise }));

    const err = await getPdaxBanks().then(
      () => {
        throw new Error("expected rejection");
      },
      (e: unknown) => e as Error,
    );

    expect(err.message).toContain("GET /reference/banks → 500 — ");
    expect(err.message).toContain('{"error":"zzz');
    expect(err.message.split(" — ")[1].length).toBe(300);
  });

  it("omits the detail suffix when the error body is not JSON", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error("not json")),
      text: () => Promise.resolve("Bad Gateway"),
    });

    await expect(getPdaxRamp("rmp_bad")).rejects.toThrow("GET /ramp/rmp_bad → 502");
  });

  it("includes the query string and detail in a POST failure message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(422, { detail: "amount too small" }));

    await expect(pdaxRampEstimate("offramp", "5")).rejects.toThrow(
      "POST /ramp/estimate?direction=offramp&amount=5 → 422 — amount too small",
    );
  });

  it("propagates a network-level rejection untouched", async () => {
    fetchMock.mockRejectedValueOnce(new Error("socket hang up"));

    await expect(pdaxFiatWithdraw({ identifier: "u" })).rejects.toThrow("socket hang up");
  });
});

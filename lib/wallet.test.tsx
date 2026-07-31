// @vitest-environment jsdom
/**
 * Unit tests for the balance state exposed by WalletProvider (lib/wallet.tsx).
 *
 * The console shipped for days with every backend call failing because a
 * failed balance fetch was indistinguishable from "no balance yet": it set
 * `xlmBalance = null` and told no one. These tests pin the four states apart —
 * loading, known (including a real zero), failed, and recovered — so a
 * regression can't quietly turn the Send form's affordability guard back off.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

const ADDRESS = "GA".padEnd(56, "X");

// Hoisted: vi.mock factories run before module-scope consts are initialized.
const { kitMock } = vi.hoisted(() => ({
  kitMock: {
    init: vi.fn(),
    setWallet: vi.fn(),
    getNetwork: vi.fn(async () => ({
      network: "TESTNET",
      networkPassphrase: "Test SDF Network ; September 2015",
    })),
    authModal: vi.fn(),
    disconnect: vi.fn(async () => {}),
    signTransaction: vi.fn(),
    selectedModule: { productId: "freighter", productName: "Freighter" },
  },
}));

vi.mock("@creit.tech/stellar-wallets-kit", () => ({
  StellarWalletsKit: kitMock,
}));
vi.mock("@creit.tech/stellar-wallets-kit/modules/utils", () => ({
  defaultModules: () => [],
}));
vi.mock("@creit.tech/stellar-wallets-kit/modules/freighter", () => ({
  FREIGHTER_ID: "freighter",
}));

import { WalletProvider, useWallet } from "./wallet";

function wrapper({ children }: { children: React.ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}

/** Renders the provider with a restored session so an address is present. */
async function mountConnected() {
  const hook = renderHook(() => useWallet(), { wrapper });
  await waitFor(() => expect(hook.result.current.address).toBe(ADDRESS));
  return hook;
}

function horizonOk(balance: string): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      balances: [{ asset_type: "native", balance }],
    }),
  } as unknown as Response;
}

function horizonStatus(status: number): Response {
  return {
    ok: false,
    status,
    json: async () => ({}),
  } as unknown as Response;
}

beforeEach(() => {
  window.localStorage.setItem(
    "orizon.wallet.v2",
    JSON.stringify({ walletId: "freighter", address: ADDRESS }),
  );
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("WalletProvider balance state", () => {
  it("reports a fetched balance with no error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => horizonOk("123.4567890")),
    );

    const { result } = await mountConnected();

    await waitFor(() => expect(result.current.balanceLoading).toBe(false));
    expect(result.current.xlmBalance).toBe("123.4567890");
    expect(result.current.balanceError).toBeNull();
  });

  it("treats an unfunded (404) account as a known zero, not an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => horizonStatus(404)),
    );

    const { result } = await mountConnected();

    await waitFor(() => expect(result.current.xlmBalance).toBe("0"));
    expect(result.current.balanceError).toBeNull();
  });

  it("exposes an error — not a silent null — on a non-OK Horizon response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => horizonStatus(503)),
    );

    const { result } = await mountConnected();

    await waitFor(() =>
      expect(result.current.balanceError).toBe("Horizon responded 503"),
    );
    expect(result.current.xlmBalance).toBeNull();
    expect(result.current.balanceLoading).toBe(false);
  });

  it("exposes an error when the request itself throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Failed to fetch");
      }),
    );

    const { result } = await mountConnected();

    await waitFor(() =>
      expect(result.current.balanceError).toBe("Failed to fetch"),
    );
    expect(result.current.xlmBalance).toBeNull();
  });

  it("keeps the error visible while a refreshBalance() retry is in flight, then clears it on success", async () => {
    let settle: (r: Response) => void = () => {};
    const fetchMock = vi
      .fn<() => Promise<Response>>()
      .mockImplementationOnce(async () => horizonStatus(500))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            settle = resolve;
          }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = await mountConnected();
    await waitFor(() =>
      expect(result.current.balanceError).toBe("Horizon responded 500"),
    );

    act(() => {
      void result.current.refreshBalance();
    });

    // Retry in flight: still loading, and the reason is still on screen so the
    // UI can render "retrying…" beside it instead of flashing a placeholder.
    await waitFor(() => expect(result.current.balanceLoading).toBe(true));
    expect(result.current.balanceError).toBe("Horizon responded 500");

    await act(async () => {
      settle(horizonOk("7.0000000"));
    });

    await waitFor(() => expect(result.current.balanceError).toBeNull());
    expect(result.current.xlmBalance).toBe("7.0000000");
  });

  it("clears the balance and its error on disconnect", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => horizonStatus(502)),
    );

    const { result } = await mountConnected();
    await waitFor(() => expect(result.current.balanceError).not.toBeNull());

    await act(async () => {
      await result.current.disconnect();
    });

    await waitFor(() => expect(result.current.connected).toBe(false));
    expect(result.current.xlmBalance).toBeNull();
    expect(result.current.balanceError).toBeNull();
    expect(result.current.balanceLoading).toBe(false);
  });

  it("defaults a funded account with no native entry to zero", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          ({
            ok: true,
            status: 200,
            json: async () => ({ balances: [] }),
          }) as unknown as Response,
      ),
    );

    const { result } = await mountConnected();

    await waitFor(() => expect(result.current.xlmBalance).toBe("0"));
    expect(result.current.balanceError).toBeNull();
  });
});

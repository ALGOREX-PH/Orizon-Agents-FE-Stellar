import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * lib/env.ts validates at module load, so each case stubs the env and
 * re-imports a fresh copy. (Vitest reads real process.env — the Next.js
 * build-time inlining doesn't apply here.)
 */
const PUBLIC_PASSPHRASE = "Public Global Stellar Network ; September 2015";

async function loadEnv(vars: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(vars)) {
    vi.stubEnv(key, value);
  }
  return import("./env");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("env", () => {
  it("defaults to testnet when nothing is set", async () => {
    const env = await loadEnv({});
    expect(env.NETWORK_NAME).toBe("TESTNET");
    expect(env.IS_MAINNET).toBe(false);
    expect(env.HORIZON_URL).toBe("https://horizon-testnet.stellar.org");
    expect(env.SOROBAN_RPC_URL).toBe("https://soroban-testnet.stellar.org");
  });

  it("accepts a consistent mainnet config", async () => {
    const env = await loadEnv({
      NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE: PUBLIC_PASSPHRASE,
      NEXT_PUBLIC_HORIZON_URL: "https://horizon.stellar.org",
      NEXT_PUBLIC_SOROBAN_RPC_URL: "https://mainnet.sorobanrpc.com",
    });
    expect(env.NETWORK_NAME).toBe("PUBLIC");
    expect(env.IS_MAINNET).toBe(true);
  });

  it("rejects an unknown passphrase", async () => {
    await expect(
      loadEnv({ NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE: "Publc Global Stellar Network ; September 2015" }),
    ).rejects.toThrow(/not a known Stellar network/);
  });

  it("rejects a mainnet passphrase with a testnet endpoint", async () => {
    await expect(
      loadEnv({
        NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE: PUBLIC_PASSPHRASE,
        NEXT_PUBLIC_HORIZON_URL: "https://horizon-testnet.stellar.org",
      }),
    ).rejects.toThrow(/test network but the passphrase is mainnet/);
  });

  it("rejects a testnet passphrase with a mainnet endpoint", async () => {
    await expect(
      loadEnv({ NEXT_PUBLIC_SOROBAN_RPC_URL: "https://mainnet.sorobanrpc.com" }),
    ).rejects.toThrow(/mainnet endpoint but the passphrase is not mainnet/);
  });

  it("leaves custom self-hosted endpoints alone", async () => {
    const env = await loadEnv({
      NEXT_PUBLIC_SOROBAN_RPC_URL: "http://localhost:8000/rpc",
    });
    expect(env.SOROBAN_RPC_URL).toBe("http://localhost:8000/rpc");
  });
});

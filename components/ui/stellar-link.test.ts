import { describe, expect, it } from "vitest";
import { defaultExplorerNetwork, stellarExpertUrl } from "./stellar-link";

// NEXT_PUBLIC_* vars are inlined at build time, so the env-driven branch is
// covered by the default (passphrase unset → testnet) plus the explicit
// network argument path.
describe("stellarExpertUrl", () => {
  it("defaults to the testnet explorer segment", () => {
    expect(defaultExplorerNetwork).toBe("testnet");
    expect(stellarExpertUrl("tx", "abc")).toContain("/explorer/testnet/");
  });

  it("uses the explicit network segment when given", () => {
    expect(stellarExpertUrl("tx", "abc", "public")).toBe(
      "https://stellar.expert/explorer/public/tx/abc",
    );
    expect(stellarExpertUrl("tx", "abc", "public")).toContain(
      "/explorer/public/",
    );
  });

  it("normalizes backend network names onto stellar.expert's segments", () => {
    // GET /stellar/network reports "mainnet"; the explorer only knows "public".
    expect(stellarExpertUrl("contract", "abc", "mainnet")).toBe(
      "https://stellar.expert/explorer/public/contract/abc",
    );
    // Anything unrecognized falls back to the testnet explorer.
    expect(stellarExpertUrl("tx", "abc", "futurenet")).toContain(
      "/explorer/testnet/",
    );
  });
});

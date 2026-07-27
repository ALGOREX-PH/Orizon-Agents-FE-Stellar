/**
 * Unit tests for the wallet error classifier.
 *
 * Yellow Belt promised the dApp distinguishes three error types
 * (`wallet_not_found`, `user_rejected`, `insufficient_balance`).
 * These tests lock that contract in so a refactor can't silently
 * regress the friendly-error UX.
 */

import { describe, it, expect } from "vitest";
import { classifyError, isFriendlyError, wrongNetworkError } from "./wallet-errors";

describe("classifyError", () => {
  it("maps Freighter user-rejected message to user_rejected", () => {
    const e = new Error("User declined access");
    const f = classifyError(e);
    expect(f.kind).toBe("user_rejected");
    expect(f.title).toMatch(/cancel/i);
  });

  it("maps Horizon tx_insufficient_balance to insufficient_balance", () => {
    const e = {
      message: "Request failed with status code 400",
      response: {
        data: {
          extras: {
            result_codes: { transaction: "tx_insufficient_balance" },
          },
        },
      },
    };
    const f = classifyError(e);
    expect(f.kind).toBe("insufficient_balance");
    expect(f.title).toMatch(/insufficient/i);
  });

  it("maps op_no_destination to a friendly 'destination doesn't exist' message", () => {
    const e = {
      response: {
        data: {
          extras: {
            result_codes: {
              transaction: "tx_failed",
              operations: ["op_no_destination"],
            },
          },
        },
      },
    };
    const f = classifyError(e);
    expect(f.title).toMatch(/destination/i);
    expect(f.detail).toMatch(/friendbot|funded/i);
    expect(f.raw).toContain("op_no_destination");
  });

  it("falls through to unknown for unmapped errors but preserves the raw message", () => {
    const e = new Error("freezer compartment overheating");
    const f = classifyError(e);
    expect(f.kind).toBe("unknown");
    expect(f.raw).toContain("freezer");
  });

  it("treats wallet-extension-missing messages as wallet_not_found", () => {
    const e = new Error("Freighter is not installed");
    const f = classifyError(e);
    expect(f.kind).toBe("wallet_not_found");
    expect(f.detail).toMatch(/install/i);
  });

  it("maps wallet wrong-network messages to wrong_network", () => {
    const f = classifyError(new Error("Wrong network selected in the wallet"));
    expect(f.kind).toBe("wrong_network");
    expect(f.detail).toMatch(/switch/i);
  });

  it("passes an already-classified FriendlyError through unchanged", () => {
    const pre = wrongNetworkError("wallet reports PUBLIC; app expects TESTNET");
    const f = classifyError(pre);
    expect(f).toBe(pre);
    expect(f.kind).toBe("wrong_network");
    expect(f.raw).toContain("PUBLIC");
  });
});

describe("wrongNetworkError", () => {
  it("builds the canonical wrong_network shape with switch-network advice", () => {
    const f = wrongNetworkError("raw detail");
    expect(f.kind).toBe("wrong_network");
    expect(f.title).toMatch(/wrong network/i);
    expect(f.detail).toMatch(/switch to .*(test net|public network)/i);
    expect(f.raw).toBe("raw detail");
  });
});

describe("isFriendlyError", () => {
  it("accepts a well-formed FriendlyError", () => {
    expect(isFriendlyError(wrongNetworkError())).toBe(true);
  });

  it("rejects plain Errors, partial shapes, and unknown kinds", () => {
    expect(isFriendlyError(new Error("wrong network"))).toBe(false);
    expect(isFriendlyError({ kind: "wrong_network", title: "x" })).toBe(false);
    expect(
      isFriendlyError({ kind: "nonsense", title: "x", detail: "y", raw: "z" }),
    ).toBe(false);
    expect(isFriendlyError(null)).toBe(false);
    expect(isFriendlyError("wrong network")).toBe(false);
  });
});

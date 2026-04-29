/**
 * Unit tests for the wallet error classifier.
 *
 * Yellow Belt promised the dApp distinguishes three error types
 * (`wallet_not_found`, `user_rejected`, `insufficient_balance`).
 * These tests lock that contract in so a refactor can't silently
 * regress the friendly-error UX.
 */

import { describe, it, expect } from "vitest";
import { classifyError } from "./wallet-errors";

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
});

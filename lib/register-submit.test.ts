/**
 * Tests for the register-submit result interpreter in lib/register-submit.ts.
 *
 * Covers every branch of the outcome: SUCCESS (any case), the decoded
 * duplicate-id failure surfaced from either the status or the diagnostic, the
 * generic on-chain failure with and without a diagnostic, and that the tx hash
 * is always echoed — including on failure.
 */

import { describe, expect, it } from "vitest";
import type { SubmitResult } from "./types";
import {
  ALREADY_EXISTS_MARKERS,
  interpretRegisterSubmit,
  isAgentAlreadyExists,
} from "./register-submit";

const base: SubmitResult = {
  hash: "9f2c1a",
  status: "SUCCESS",
  return_value: "00112233445566778899aabbccddeeff",
};

describe("interpretRegisterSubmit", () => {
  it("reports success and echoes the hash on SUCCESS", () => {
    const out = interpretRegisterSubmit(base);
    expect(out.ok).toBe(true);
    expect(out.hash).toBe("9f2c1a");
    expect(out.message).toContain("registered on-chain");
  });

  it("treats a lowercase 'success' status as success (case-insensitive)", () => {
    const out = interpretRegisterSubmit({ ...base, status: "success" });
    expect(out.ok).toBe(true);
    expect(out.message).toContain("registered on-chain");
  });

  it("decodes a duplicate id in the diagnostic to the 'just taken' message", () => {
    const out = interpretRegisterSubmit({
      ...base,
      status: "FAILED",
      diagnostic: "HostError: Error(Contract, #3)",
    });
    expect(out.ok).toBe(false);
    expect(out.message).toBe(
      "That agent ID was just taken — change it and register again.",
    );
  });

  it("decodes an AlreadyExists in the status to the 'just taken' message", () => {
    const out = interpretRegisterSubmit({
      ...base,
      status: "FAILED: AlreadyExists",
    });
    expect(out.ok).toBe(false);
    expect(out.message).toBe(
      "That agent ID was just taken — change it and register again.",
    );
  });

  it("falls back to a generic message with the status and diagnostic", () => {
    const out = interpretRegisterSubmit({
      ...base,
      status: "FAILED",
      diagnostic: "tx_bad_auth",
    });
    expect(out.ok).toBe(false);
    expect(out.message).toBe(
      "Registration failed on-chain (FAILED). tx_bad_auth",
    );
  });

  it("omits the diagnostic (no trailing space or undefined) when absent", () => {
    const out = interpretRegisterSubmit({ ...base, status: "FAILED" });
    expect(out.ok).toBe(false);
    expect(out.message).toBe("Registration failed on-chain (FAILED).");
    expect(out.message).not.toContain("undefined");
    expect(out.message.endsWith(".")).toBe(true);
  });

  it("echoes the hash even on failure", () => {
    const out = interpretRegisterSubmit({
      ...base,
      hash: "deadbeef",
      status: "FAILED",
    });
    expect(out.hash).toBe("deadbeef");
  });
});

describe("isAgentAlreadyExists", () => {
  it("is true for the contract error marker in the diagnostic", () => {
    expect(
      isAgentAlreadyExists({
        ...base,
        status: "FAILED",
        diagnostic: "Error(Contract, #3)",
      }),
    ).toBe(true);
  });

  it("is true regardless of marker case", () => {
    expect(
      isAgentAlreadyExists({ ...base, status: "FAILED: ALREADYEXISTS" }),
    ).toBe(true);
    expect(
      isAgentAlreadyExists({
        ...base,
        status: "FAILED",
        diagnostic: "Already Exists",
      }),
    ).toBe(true);
  });

  it("is false for an unrelated failure", () => {
    expect(
      isAgentAlreadyExists({
        ...base,
        status: "FAILED",
        diagnostic: "tx_bad_auth",
      }),
    ).toBe(false);
  });

  it("tolerates a missing diagnostic", () => {
    expect(isAgentAlreadyExists({ ...base, status: "FAILED" })).toBe(false);
  });
});

describe("ALREADY_EXISTS_MARKERS", () => {
  it("is the shared source of truth, all lowercase", () => {
    expect(ALREADY_EXISTS_MARKERS).toContain("alreadyexists");
    for (const marker of ALREADY_EXISTS_MARKERS) {
      expect(marker).toBe(marker.toLowerCase());
    }
  });
});

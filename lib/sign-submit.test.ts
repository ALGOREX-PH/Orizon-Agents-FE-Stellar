/**
 * Tests for the shared signing sequence in lib/sign-submit.ts (story 1.08).
 *
 * Covers every stage: a settled SUCCESS, a settled on-chain FAILED, a declined
 * signature (rejected), a non-decline signing failure (sign_error), a dropped
 * submit (submit_error), and that submit is never reached once signing was
 * declined. `submit`/`interpret` are injected so no wallet or network is
 * touched.
 */

import { describe, expect, it } from "vitest";
import { signAndSubmit } from "./sign-submit";
import type { SubmitResult } from "./types";

const OK_RESULT: SubmitResult = {
  hash: "abc123",
  status: "SUCCESS",
  return_value: null,
};

const okInterpret = () => ({ ok: true, hash: "abc123", message: "done" });

describe("signAndSubmit", () => {
  it("returns settled + ok when signing and submit both succeed", async () => {
    const r = await signAndSubmit("XDR", async () => "SIGNED", {
      submit: async () => OK_RESULT,
      interpret: okInterpret,
    });
    expect(r.stage).toBe("settled");
    if (r.stage === "settled") {
      expect(r.outcome.ok).toBe(true);
      expect(r.result).toBe(OK_RESULT);
    }
  });

  it("returns settled + failed when the tx failed on-chain", async () => {
    const failed: SubmitResult = {
      hash: "def456",
      status: "FAILED",
      return_value: null,
      diagnostic: "boom",
    };
    const r = await signAndSubmit("XDR", async () => "SIGNED", {
      submit: async () => failed,
      interpret: () => ({ ok: false, hash: "def456", message: "it failed" }),
    });
    expect(r.stage).toBe("settled");
    if (r.stage === "settled") expect(r.outcome.ok).toBe(false);
  });

  it("returns rejected when the wallet declines the signature", async () => {
    const r = await signAndSubmit("XDR", async () => {
      throw new Error("User rejected the request");
    });
    expect(r.stage).toBe("rejected");
  });

  it("returns sign_error for a non-decline signing failure", async () => {
    const r = await signAndSubmit("XDR", async () => {
      throw new Error("the extension exploded");
    });
    expect(r.stage).toBe("sign_error");
    if (r.stage === "sign_error") {
      expect(r.error.kind).not.toBe("user_rejected");
    }
  });

  it("returns submit_error when the network drops mid-submit", async () => {
    const r = await signAndSubmit("XDR", async () => "SIGNED", {
      submit: async () => {
        throw new Error("network down");
      },
    });
    expect(r.stage).toBe("submit_error");
  });

  it("never reaches submit once signing was declined", async () => {
    let submitCalls = 0;
    const r = await signAndSubmit(
      "XDR",
      async () => {
        throw new Error("user cancelled");
      },
      {
        submit: async () => {
          submitCalls += 1;
          return OK_RESULT;
        },
      },
    );
    expect(r.stage).toBe("rejected");
    expect(submitCalls).toBe(0);
  });
});

/**
 * Unit tests for the pure helpers in lib/utils.ts.
 *
 * `prettyName` turns snake_case identifiers (contract names, agent ids) into
 * Title Case display labels. Pure string work — no DOM, no network.
 */

import { describe, expect, it } from "vitest";
import { prettyName } from "./utils";

describe("prettyName", () => {
  it("converts snake_case to Title Case", () => {
    expect(prettyName("payment_escrow")).toBe("Payment Escrow");
    expect(prettyName("reputation_ledger")).toBe("Reputation Ledger");
  });

  it("capitalizes a single word with no underscores", () => {
    expect(prettyName("registry")).toBe("Registry");
  });

  it("returns the empty string unchanged", () => {
    expect(prettyName("")).toBe("");
  });
});

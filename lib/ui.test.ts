/**
 * Unit tests for the shared UI helpers in lib/ui.ts.
 *
 * `statusTone` maps backend status strings to Badge tones, case-insensitively,
 * falling back to "muted" for anything unrecognized. Pure — no DOM, no network.
 */

import { describe, expect, it } from "vitest";
import { focusRing, inputCls, statusTone } from "./ui";

describe("focusRing", () => {
  it("uses an inset ring so the indicator survives the cyber clip-paths", () => {
    expect(focusRing).toContain("focus-visible:ring-inset");
    expect(focusRing).toContain("focus-visible:ring-2");
  });

  it("is applied to the shared input class", () => {
    expect(inputCls).toContain(focusRing);
    expect(inputCls).toContain("border-input");
  });
});

describe("statusTone", () => {
  it("maps known statuses to their Badge tones", () => {
    expect(statusTone("completed")).toBe("success");
    expect(statusTone("failed")).toBe("magenta");
    expect(statusTone("awaiting_payment")).toBe("cyan");
  });

  it("matches case-insensitively", () => {
    expect(statusTone("COMPLETED")).toBe("success");
    expect(statusTone("Failed")).toBe("magenta");
  });

  it("falls back to muted for unknown or empty statuses", () => {
    expect(statusTone("pending_review")).toBe("muted");
    expect(statusTone("")).toBe("muted");
  });
});

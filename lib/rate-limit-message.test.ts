/**
 * Tests for the 429 message helper in lib/rate-limit-message.ts (story 1.09).
 *
 * Covers every branch: a 429 with a Retry-After wait (named, rounded up to at
 * least 1s), a 429 without one (generic wait), a non-429 ApiError, and any
 * non-ApiError value — the last two return undefined so the caller falls
 * through to its normal error handling.
 */

import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { rateLimitMessage } from "./rate-limit-message";

describe("rateLimitMessage", () => {
  it("names the wait for a 429 that carries Retry-After", () => {
    expect(rateLimitMessage(new ApiError("x", 429, 3000, "rate_limited"))).toBe(
      "Too many requests — wait 3s and try again. Nothing was lost.",
    );
  });

  it("rounds a fractional wait up, with a 1s floor", () => {
    expect(rateLimitMessage(new ApiError("x", 429, 1200, "rate_limited"))).toBe(
      "Too many requests — wait 2s and try again. Nothing was lost.",
    );
    expect(rateLimitMessage(new ApiError("x", 429, 10, "rate_limited"))).toBe(
      "Too many requests — wait 1s and try again. Nothing was lost.",
    );
  });

  it("falls back to a generic wait when Retry-After is absent", () => {
    expect(rateLimitMessage(new ApiError("x", 429))).toBe(
      "Too many requests — wait a moment and try again. Nothing was lost.",
    );
  });

  it("returns undefined for a non-429 ApiError", () => {
    expect(
      rateLimitMessage(new ApiError("boom", 500, undefined, "build_failed")),
    ).toBeUndefined();
  });

  it("returns undefined for anything that is not an ApiError", () => {
    expect(rateLimitMessage(new Error("nope"))).toBeUndefined();
    expect(rateLimitMessage(undefined)).toBeUndefined();
    expect(rateLimitMessage(null)).toBeUndefined();
  });
});

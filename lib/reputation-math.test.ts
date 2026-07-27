/**
 * Unit tests for the client-side reputation math in lib/reputation-math.ts.
 *
 * The parity cases pin the FE mirror to values the backend/contract actually
 * produced: 7008 came from the on-chain smoke test (one 90/100 rating on a
 * 0.054 USDC step against the 3.50★ / 12 USDC prior), and 5677 is the
 * prior-only lower bound the backend serves for unrated agents.
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_REP_PARAMS,
  lowerBoundBps,
  scoreOutOfFive,
  smoothedBps,
} from "./reputation-math";

describe("smoothedBps", () => {
  it("returns the prior with zero evidence", () => {
    expect(smoothedBps(0, 0)).toBe(DEFAULT_REP_PARAMS.prior_bps);
  });

  it("matches the on-chain smoke test value", () => {
    expect(smoothedBps(9000, 0.054)).toBe(7008);
  });

  it("moves toward the evidence as weight grows", () => {
    const light = smoothedBps(9500, 1);
    const heavy = smoothedBps(9500, 100);
    expect(light).toBeGreaterThan(DEFAULT_REP_PARAMS.prior_bps);
    expect(heavy).toBeGreaterThan(light);
    expect(heavy).toBeLessThanOrEqual(9500);
  });

  it("clamps into 0..10000", () => {
    expect(smoothedBps(20_000, 1_000)).toBe(10_000);
    expect(smoothedBps(-5_000, 1_000)).toBe(0);
  });
});

describe("lowerBoundBps", () => {
  it("matches the backend prior-only lower bound", () => {
    expect(lowerBoundBps(DEFAULT_REP_PARAMS.prior_bps, 0)).toBe(5677);
  });

  it("lets a prior-only newcomer clear the default floor", () => {
    expect(
      lowerBoundBps(DEFAULT_REP_PARAMS.prior_bps, 0),
    ).toBeGreaterThanOrEqual(DEFAULT_REP_PARAMS.floor_bps);
  });

  it("sits below the mean and tightens with evidence", () => {
    const smoothed = smoothedBps(8000, 5);
    const small = lowerBoundBps(smoothed, 5);
    const big = lowerBoundBps(smoothed, 500);
    expect(small).toBeLessThan(smoothed);
    expect(big).toBeGreaterThan(small);
    expect(big).toBeLessThanOrEqual(smoothed);
  });

  it("sinks heavy negative evidence below the floor", () => {
    const smoothed = smoothedBps(1000, 20);
    expect(lowerBoundBps(smoothed, 20)).toBeLessThan(
      DEFAULT_REP_PARAMS.floor_bps,
    );
  });
});

describe("scoreOutOfFive", () => {
  it("renders bps as a 0-5 score with two decimals", () => {
    expect(scoreOutOfFive(7000)).toBe("3.50");
    expect(scoreOutOfFive(5500)).toBe("2.75");
    expect(scoreOutOfFive(10_000)).toBe("5.00");
  });
});

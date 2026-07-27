/**
 * Client-side mirror of the backend reputation math
 * (backend/app/services/reputation_svc.py).
 *
 * Powers the interactive score calculator on /app/reputation so visitors can
 * probe how the Bayesian prior and the Wilson lower bound shape a score
 * without a network round-trip. Weights are USDC here — the backend computes
 * in stroops, but the ratios are identical, so results agree to within one
 * basis point of float rounding.
 */

import type { ReputationParams } from "./types";

export type RepMathParams = Pick<
  ReputationParams,
  "prior_bps" | "prior_weight_usdc" | "floor_bps" | "wilson_z"
>;

/** Backend defaults — used until GET /stellar/reputation/params resolves. */
export const DEFAULT_REP_PARAMS: RepMathParams = {
  prior_bps: 7000,
  prior_weight_usdc: 12,
  floor_bps: 5500,
  wilson_z: 1,
};

const clampBps = (v: number) => Math.max(0, Math.min(10_000, v));

/** Bayesian smoothed mean: prior mass pulls sparse evidence toward the prior. */
export function smoothedBps(
  meanBps: number,
  weightUsdc: number,
  p: RepMathParams = DEFAULT_REP_PARAMS,
): number {
  const den = p.prior_weight_usdc + weightUsdc;
  if (den <= 0) return p.prior_bps;
  return clampBps(
    Math.floor(
      (p.prior_weight_usdc * p.prior_bps + meanBps * weightUsdc) / den,
    ),
  );
}

/**
 * Wilson-style lower bound on a (smoothed) mean. Sample size counts prior
 * mass plus evidence in one-USDC units — confidence grows with settled value,
 * not raw rating count.
 */
export function lowerBoundBps(
  meanBps: number,
  weightUsdc: number,
  p: RepMathParams = DEFAULT_REP_PARAMS,
): number {
  const n = p.prior_weight_usdc + Math.max(weightUsdc, 0);
  if (n <= 0) return 0;
  const prob = Math.max(0, Math.min(1, meanBps / 10_000));
  const lb = prob - p.wilson_z * Math.sqrt((prob * (1 - prob)) / n);
  return clampBps(Math.round(lb * 10_000));
}

/** bps of the 0–100 rating scale → the familiar 0–5 star score. */
export const scoreOutOfFive = (bps: number) => (bps / 2000).toFixed(2);

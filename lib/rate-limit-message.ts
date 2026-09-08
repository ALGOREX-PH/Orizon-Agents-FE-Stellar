/**
 * A user-facing message for an HTTP 429 from the backend's abuse-bound rate
 * limiter (story 1.09). A 429 is a "not this second", not a failure: the
 * caller's inputs are untouched, so the message says how long to wait and that
 * nothing was lost. Returns undefined for anything that is not a 429, so a
 * caller falls through to its normal error handling.
 *
 * Pure and total: never throws. The wait comes from ApiError.retryAfterMs,
 * which api.ts derives from the Retry-After header the limiter sends.
 */

import { ApiError } from "./api";

export function rateLimitMessage(err: unknown): string | undefined {
  if (!(err instanceof ApiError) || err.status !== 429) return undefined;
  const secs = err.retryAfterMs
    ? Math.max(1, Math.ceil(err.retryAfterMs / 1_000))
    : undefined;
  return secs
    ? `Too many requests — wait ${secs}s and try again. Nothing was lost.`
    : "Too many requests — wait a moment and try again. Nothing was lost.";
}

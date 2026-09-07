/**
 * Interpret a submitted registration's on-chain result for story 1.05.
 *
 * `POST /api/stellar/submit` returns 200 even for a FAILED transaction — the
 * `status` describes the on-chain outcome, not the HTTP call. This maps that
 * `SubmitResult` to a display outcome the register page can render directly:
 * a success line, or a plain-language failure reason.
 *
 * The one failure worth decoding is a duplicate agent id, which surfaces
 * on-chain as `Error(Contract, #3)` / `AlreadyExists` (contract error code 3 =
 * the registry's AlreadyExists). In practice the register BUILD endpoint
 * catches duplicates first (409 id_taken, handled by the form), so an
 * AlreadyExists at SUBMIT is a rare race — decoded here regardless.
 *
 * Pure and total: never throws, tolerates a missing diagnostic. Zero deps.
 */

import type { SubmitResult } from "./types";

export type RegisterOutcome = {
  /** status === "SUCCESS" (case-insensitive). */
  ok: boolean;
  /** Always the tx hash — the operator's handle, shown even on failure. */
  hash: string;
  /** Plain-language result; on failure, a decoded reason. */
  message: string;
};

/**
 * Substrings that mark an on-chain "already exists" failure. Matched
 * case-insensitively against the joined `status` + `diagnostic`. Exported so a
 * test and the page reference the same source of truth.
 */
export const ALREADY_EXISTS_MARKERS = [
  "error(contract, #3)",
  "alreadyexists",
  "already exists",
];

/** True when the result's status/diagnostic carries an already-exists marker. */
export function isAgentAlreadyExists(result: SubmitResult): boolean {
  const haystack = `${result.status} ${result.diagnostic ?? ""}`.toLowerCase();
  return ALREADY_EXISTS_MARKERS.some((marker) => haystack.includes(marker));
}

/** Map a submitted registration's result to a display outcome. Never throws. */
export function interpretRegisterSubmit(result: SubmitResult): RegisterOutcome {
  const ok = result.status.toUpperCase() === "SUCCESS";
  return { ok, hash: result.hash, message: messageFor(result, ok) };
}

/** The display message for a result: success line, decoded duplicate, or a
 * short generic failure that leans on the explorer link for the rest. */
function messageFor(result: SubmitResult, ok: boolean): string {
  if (ok) return "Agent registered on-chain.";
  if (isAgentAlreadyExists(result))
    return "That agent ID was just taken — change it and register again.";
  return (
    `Registration failed on-chain (${result.status}).` +
    (result.diagnostic ? ` ${result.diagnostic}` : "")
  );
}

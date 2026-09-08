/**
 * The shared signing sequence for every owner-signed transaction: sign the
 * built XDR in the wallet → submit it → interpret the on-chain result. Both the
 * registration flow and agent management (story 1.08) call this, so error
 * handling can never drift between them — a second, subtly different signing
 * path is how inconsistent handling gets introduced.
 *
 * It owns only the fragile, must-not-diverge parts: the sequence itself and the
 * wallet-error classification. Each caller owns its own copy and its TxState
 * transitions, keyed off the returned `stage`. `submit` and `interpret` are
 * injectable so the sequence is unit-testable without a wallet or the network.
 */

import { submitSigned } from "./api";
import {
  interpretRegisterSubmit,
  type RegisterOutcome,
} from "./register-submit";
import type { SubmitResult } from "./types";
import { classifyError, type FriendlyError } from "./wallet-errors";

export type SignSubmitOutcome =
  // The wallet declined the signature — a normal action; the caller keeps the
  // form and stays neutral.
  | { stage: "rejected" }
  // Signing failed for another reason (e.g. a locked wallet) — the caller shows
  // the classified error.
  | { stage: "sign_error"; error: FriendlyError }
  // The network dropped mid-submit; the tx may still have landed, so the caller
  // warns the operator to check the explorer and never auto-retries.
  | { stage: "submit_error"; error: FriendlyError }
  // The submit returned: a FAILED tx still lands here with a hash. The caller
  // inspects `outcome.ok` (and `result` for domain-specific decoding).
  | { stage: "settled"; result: SubmitResult; outcome: RegisterOutcome };

export async function signAndSubmit(
  xdr: string,
  signXdr: (xdr: string) => Promise<string>,
  opts: {
    submit?: (signedXdr: string) => Promise<SubmitResult>;
    interpret?: (result: SubmitResult) => RegisterOutcome;
    // Fired once the wallet has signed, before the submit — lets the caller
    // advance its UI from "signing" to "broadcasting".
    onSigned?: () => void;
  } = {},
): Promise<SignSubmitOutcome> {
  const submit = opts.submit ?? submitSigned;
  const interpret = opts.interpret ?? interpretRegisterSubmit;

  let signedXdr: string;
  try {
    signedXdr = await signXdr(xdr);
  } catch (err) {
    const error = classifyError(err);
    return error.kind === "user_rejected"
      ? { stage: "rejected" }
      : { stage: "sign_error", error };
  }
  opts.onSigned?.();

  let result: SubmitResult;
  try {
    result = await submit(signedXdr);
  } catch (err) {
    return { stage: "submit_error", error: classifyError(err) };
  }

  return { stage: "settled", result, outcome: interpret(result) };
}

/**
 * Centralized wallet/tx error classification.
 *
 * Yellow Belt requires distinguishing at least three error types:
 *   - wallet_not_found     → no extension / unsupported environment
 *   - user_rejected        → the user closed/declined the signing popup
 *   - insufficient_balance → on-chain XLM balance too low to fund the op
 *
 * Different wallets phrase the same condition differently, so we match on
 * a small regex set and return a stable, friendly shape. Anything we can't
 * classify falls through to `unknown` and the original message is preserved.
 */

export type WalletErrorKind =
  | "wallet_not_found"
  | "user_rejected"
  | "insufficient_balance"
  | "wrong_network"
  | "unknown";

export type FriendlyError = {
  kind: WalletErrorKind;
  title: string;
  detail: string;
  /** Raw underlying message — handy for the dev console; not shown to users by default. */
  raw: string;
};

const REJECT_PATTERNS = [
  /user (?:declined|rejected|cancelled|canceled)/i,
  /denied/i,
  /request was rejected/i,
  /sign(?:ing)? (?:was )?cancell?ed/i,
  /closed (?:the )?modal/i,
  /no wallet selected/i,
];

const NOT_FOUND_PATTERNS = [
  /not installed/i,
  /no wallets? (?:detected|available|found)/i,
  /freighter (?:is )?not (?:found|installed)/i,
  /xbull (?:is )?not/i,
  /no extension/i,
];

const INSUFFICIENT_PATTERNS = [
  /tx_insufficient_balance/i,
  /op_underfunded/i,
  /insufficient (?:funds|balance|xlm)/i,
];

const WRONG_NETWORK_PATTERNS = [
  /wrong (?:net|network)/i,
  /unsupported network/i,
  /please (?:switch|change) (?:to )?testnet/i,
];

/** Normalize anything thrown by Freighter / xBull / Horizon / our own code into a FriendlyError. */
export function classifyError(e: unknown): FriendlyError {
  const raw = extractMessage(e);
  const horizonExtras = extractHorizonResultCodes(e);

  // Horizon's result_codes are the most reliable signal for on-chain failures.
  if (horizonExtras) {
    const tx = horizonExtras.transaction ?? "";
    const ops = horizonExtras.operations ?? [];
    if (tx === "tx_insufficient_balance" || ops.includes("op_underfunded")) {
      return {
        kind: "insufficient_balance",
        title: "Insufficient XLM balance",
        detail:
          "Your wallet doesn't have enough XLM to cover this payment plus the network fee. Top up via Friendbot and try again.",
        raw,
      };
    }
  }

  if (NOT_FOUND_PATTERNS.some((re) => re.test(raw))) {
    return {
      kind: "wallet_not_found",
      title: "No wallet detected",
      detail:
        "We couldn't find a Stellar wallet extension. Install Freighter, xBull, or Albedo and refresh the page.",
      raw,
    };
  }

  if (REJECT_PATTERNS.some((re) => re.test(raw))) {
    return {
      kind: "user_rejected",
      title: "Signature cancelled",
      detail: "You closed or declined the signing prompt — nothing was sent on-chain.",
      raw,
    };
  }

  if (INSUFFICIENT_PATTERNS.some((re) => re.test(raw))) {
    return {
      kind: "insufficient_balance",
      title: "Insufficient XLM balance",
      detail:
        "Your wallet doesn't have enough XLM to cover this payment plus the network fee. Top up via Friendbot and try again.",
      raw,
    };
  }

  if (WRONG_NETWORK_PATTERNS.some((re) => re.test(raw))) {
    return {
      kind: "wrong_network",
      title: "Wrong network",
      detail:
        "Your wallet is connected to the wrong network. Switch to Stellar Test Net in your wallet extension.",
      raw,
    };
  }

  return {
    kind: "unknown",
    title: "Transaction failed",
    detail: raw || "Something went wrong. Check your wallet and try again.",
    raw,
  };
}

function extractMessage(e: unknown): string {
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object") {
    const anyE = e as { message?: string; error?: string; reason?: string };
    return anyE.message ?? anyE.error ?? anyE.reason ?? JSON.stringify(e);
  }
  return String(e ?? "");
}

function extractHorizonResultCodes(
  e: unknown,
): { transaction?: string; operations?: string[] } | null {
  if (!e || typeof e !== "object") return null;
  const anyE = e as {
    response?: { data?: { extras?: { result_codes?: { transaction?: string; operations?: string[] } } } };
  };
  return anyE.response?.data?.extras?.result_codes ?? null;
}

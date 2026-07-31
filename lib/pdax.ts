// PDAX API client — talks to the FastAPI backend under /api/pdax/*.
// Mirrors the fetch + error-extraction pattern in lib/api.ts.
import type {
  PdaxBalance,
  PdaxCryptoDepositAddress,
  PdaxCryptoTransaction,
  PdaxEnvironment,
  PdaxFirmQuoteRequest,
  PdaxFundingQuote,
  PdaxHealth,
  PdaxOffRampRequest,
  PdaxOnRampRequest,
  PdaxQuote,
  PdaxRampEstimate,
  PdaxRampRecord,
  PdaxSide,
  RampDirection,
} from "./pdax-types";
import { fetchWithTimeout, GET_TIMEOUT_MS, POST_TIMEOUT_MS } from "./api";

// fetchWithTimeout prepends the shared "/api" base, so only "/pdax" is added here.
const base = "/pdax";

async function get<T>(path: string): Promise<T> {
  const res = await fetchWithTimeout(
    "GET",
    `${base}${path}`,
    { cache: "no-store" },
    GET_TIMEOUT_MS,
  );
  if (!res.ok)
    throw new Error(`GET ${path} → ${res.status}${await detail(res)}`);
  return res.json();
}

async function post<T, B>(path: string, body: B): Promise<T> {
  const res = await fetchWithTimeout(
    "POST",
    `${base}${path}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
    POST_TIMEOUT_MS,
  );
  if (!res.ok)
    throw new Error(`POST ${path} → ${res.status}${await detail(res)}`);
  return res.json();
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// FastAPI prefixes every validation `loc` with where the value came from.
// "body.stellar_address" reads worse than "stellar_address" and the user
// cannot act on the distinction, so the prefix is dropped.
const LOC_PREFIXES = new Set(["body", "query", "path", "header", "cookie"]);

/**
 * Flatten pydantic's validation-error list into readable "field: message"
 * lines. Each entry is `{ loc: [...], msg, type }`; interpolating the list
 * itself yields "[object Object]", which is what the user used to see after
 * pasting a truncated Stellar address.
 */
function formatValidationErrors(errors: unknown[]): string | undefined {
  const lines = errors.flatMap((e) => {
    if (!isRecord(e)) return typeof e === "string" ? [e] : [];
    if (typeof e.msg !== "string") return [];
    const parts = Array.isArray(e.loc)
      ? e.loc.filter(
          (p): p is string | number =>
            typeof p === "string" || typeof p === "number",
        )
      : [];
    const field = parts
      .filter((p, i) => !(i === 0 && LOC_PREFIXES.has(String(p))))
      .join(".");
    return [field ? `${field}: ${e.msg}` : e.msg];
  });
  return lines.length ? lines.join("; ") : undefined;
}

/**
 * The human-readable part of a failed response body. Mirrors lib/api.ts,
 * which prefers the backend's `{ error: { code, message } }` envelope over
 * the legacy `detail`, with one addition: on a 422 `detail` is the array of
 * pydantic field errors while the envelope message is only the generic
 * "request validation failed", so the field errors win there.
 */
function errorText(j: unknown): string | undefined {
  if (!isRecord(j)) return undefined;
  const fromFields = Array.isArray(j.detail)
    ? formatValidationErrors(j.detail)
    : undefined;
  if (fromFields) return fromFields;
  const envelope = isRecord(j.error) ? j.error : undefined;
  if (typeof envelope?.message === "string" && envelope.message)
    return envelope.message;
  if (typeof j.detail === "string" && j.detail) return j.detail;
  return undefined;
}

async function detail(res: Response): Promise<string> {
  try {
    const j: unknown = await res.json();
    const msg = errorText(j);
    return ` — ${(msg ?? JSON.stringify(j)).slice(0, 300)}`;
  } catch {
    return "";
  }
}

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== "",
  );
  return entries.length
    ? "?" +
        entries
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join("&")
    : "";
}

// ── meta + balances ─────────────────────────────────────────
export const getPdaxEnvironment = () => get<PdaxEnvironment>("/environment");

export const getPdaxHealth = () => get<PdaxHealth>("/health");

export const getPdaxBalances = (currency?: string) =>
  get<{ balances: PdaxBalance[] }>(`/balances${qs({ currency })}`);

// ── trade ───────────────────────────────────────────────────
export const getPdaxPrice = (p: {
  quote_currency: string;
  side: PdaxSide;
  base_quantity: string;
  base_currency?: string;
}) => get<PdaxQuote>(`/trade/price${qs(p)}`);

export const pdaxFirmQuote = (body: PdaxFirmQuoteRequest) =>
  post<PdaxQuote, PdaxFirmQuoteRequest>("/trade/quote", body);

// ── funding ─────────────────────────────────────────────────
export const getPdaxCryptoDeposit = (currency: string) =>
  get<PdaxCryptoDepositAddress>(`/crypto/deposit${qs({ currency })}`);

// ── transaction history ─────────────────────────────────────
export const getPdaxCryptoTransactions = (p?: {
  identifier?: string;
  txn_hash?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}) =>
  get<{ transactions: PdaxCryptoTransaction[] }>(
    `/crypto/transactions${qs(p ?? {})}`,
  );

// ── ramp (PHP <-> USDCXLM orchestration) ────────────────────
export const pdaxRampEstimate = (
  direction: RampDirection,
  amount: string,
  currency?: string,
) =>
  post<PdaxRampEstimate, Record<string, never>>(
    `/ramp/estimate${qs({ direction, amount, currency })}`,
    {} as Record<string, never>,
  );

export const pdaxFundingQuote = (usdc: string) =>
  post<PdaxFundingQuote, Record<string, never>>(
    `/ramp/funding-quote${qs({ usdc })}`,
    {} as Record<string, never>,
  );

export const pdaxStartOnRamp = (body: PdaxOnRampRequest) =>
  post<PdaxRampRecord, PdaxOnRampRequest>("/ramp/onramp", body);

export const pdaxStartOffRamp = (body: PdaxOffRampRequest) =>
  post<PdaxRampRecord, PdaxOffRampRequest>("/ramp/offramp", body);

export const getPdaxRamp = (rampId: string) =>
  get<PdaxRampRecord>(`/ramp/${rampId}`);

export const pdaxReconcileRamp = (rampId: string) =>
  post<PdaxRampRecord, Record<string, never>>(
    `/ramp/${rampId}/reconcile`,
    {} as Record<string, never>,
  );

export const getPdaxRamps = () => get<{ ramps: PdaxRampRecord[] }>("/ramp");

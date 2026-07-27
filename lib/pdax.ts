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
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}${await detail(res)}`);
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
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}${await detail(res)}`);
  return res.json();
}

async function detail(res: Response): Promise<string> {
  try {
    const j = await res.json();
    return j?.detail ? ` — ${j.detail}` : ` — ${JSON.stringify(j).slice(0, 300)}`;
  } catch {
    return "";
  }
}

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  return entries.length
    ? "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&")
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
}) => get<{ transactions: PdaxCryptoTransaction[] }>(`/crypto/transactions${qs(p ?? {})}`);

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

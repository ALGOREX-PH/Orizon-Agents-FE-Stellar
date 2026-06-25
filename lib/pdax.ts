// PDAX API client — talks to the FastAPI backend under /api/pdax/*.
// Mirrors the fetch + error-extraction pattern in lib/api.ts.
import type {
  PdaxBalance,
  PdaxEnvironment,
  PdaxReference,
} from "./pdax-types";

const base = "/api/pdax";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${base}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}${await detail(res)}`);
  return res.json();
}

async function post<T, B>(path: string, body: B): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
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

// ── meta + balances + reference ─────────────────────────────
export const getPdaxEnvironment = () => get<PdaxEnvironment>("/environment");

export const getPdaxBalances = (currency?: string) =>
  get<{ balances: PdaxBalance[] }>(`/balances${qs({ currency })}`);

export const getPdaxReference = () => get<PdaxReference>("/reference");

export const getPdaxBanks = () =>
  get<{ banks: Record<string, string> }>("/reference/banks");

export const getPdaxTokens = () =>
  get<{ tokens: Record<string, string>; stellar: string[] }>("/reference/tokens");

export const getPdaxCountries = () =>
  get<{ countries: string[] }>("/reference/countries");

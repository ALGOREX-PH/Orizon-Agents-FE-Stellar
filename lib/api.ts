import type {
  Agent,
  ArtifactResponse,
  DecomposeResponse,
  Flow,
  Overview,
  ReputationBatch,
  ReputationInfo,
  ReputationParams,
  Task,
  TraceLine,
} from "./types";

const base = "/api";

const GET_TIMEOUT_MS = 30_000;
// execute/decompose can be slow, so POSTs get a much longer leash.
const POST_TIMEOUT_MS = 90_000;

/**
 * fetch with an AbortController deadline so a hung backend cannot stall
 * loading states forever. Timeouts reject with a clear message; every
 * other failure (network drop, non-OK status) propagates untouched.
 */
async function fetchWithTimeout(
  method: "GET" | "POST",
  path: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${base}${path}`, { ...init, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(`${method} ${path} → timeout after ${timeoutMs / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetchWithTimeout("GET", path, { cache: "no-store" }, GET_TIMEOUT_MS);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function post<T, B>(path: string, body: B): Promise<T> {
  const res = await fetchWithTimeout(
    "POST",
    path,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
    POST_TIMEOUT_MS,
  );
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.detail ? ` — ${j.detail}` : ` — ${JSON.stringify(j).slice(0, 300)}`;
    } catch {
      try {
        detail = ` — ${(await res.text()).slice(0, 300)}`;
      } catch {
        /* ignore */
      }
    }
    throw new Error(`POST ${path} → ${res.status}${detail}`);
  }
  return res.json();
}

export const listAgents = () => get<Agent[]>("/agents");
export const listTasks = () => get<Task[]>("/tasks");
export const getOverview = () => get<Overview>("/metrics/overview");
export const getFlow = () => get<Flow>("/flow/default");
export const getTrace = (taskId: string) => get<TraceLine[]>(`/trace/${taskId}`);

export const decompose = (intent: string) =>
  post<DecomposeResponse, { intent: string }>("/orchestrator/decompose", { intent });

export const execute = (
  planId: string,
  opts?: { auth_id_hex?: string; payer?: string },
) =>
  post<{ task_id: string }, { plan_id: string; auth_id_hex?: string; payer?: string }>(
    "/orchestrator/execute",
    { plan_id: planId, ...opts },
  );

export const getArtifact = (taskId: string) =>
  get<ArtifactResponse>(`/tasks/${taskId}/artifact`);

// ── Stellar / x402 ──────────────────────────────────────────
export const buildAuthorize = (body: {
  payer: string;
  agent_id: string;
  max_amount_usdc: number;
  ttl_seconds?: number;
}) =>
  post<{ xdr: string; expires_at: number }, typeof body>(
    "/stellar/build/authorize",
    body,
  );

export const listReputation = () => get<ReputationBatch>("/stellar/reputation");
export const getReputationParams = () =>
  get<ReputationParams>("/stellar/reputation/params");
export const getReputation = (agentId: string) =>
  get<ReputationInfo>(`/stellar/reputation/${agentId}`);

export const submitSigned = (signedXdr: string) =>
  post<
    {
      hash: string;
      status: string;
      return_value: unknown;
      diagnostic?: string;
      explorer?: string;
    },
    { signed_xdr: string }
  >("/stellar/submit", { signed_xdr: signedXdr });

/**
 * Subscribe to a live SSE trace stream.
 * Returns a disposer. onEvent is called for each trace line; onDone fires on
 * completion; onError fires if the stream drops mid-flight (falls back to
 * onDone when not provided, preserving the old behavior).
 */
export function openTraceStream(
  taskId: string,
  onEvent: (line: TraceLine) => void,
  onDone?: () => void,
  onError?: () => void,
): () => void {
  const es = new EventSource(`${base}/trace/${taskId}/stream`);
  es.addEventListener("trace", (e) => {
    try {
      const line = JSON.parse((e as MessageEvent).data) as TraceLine;
      onEvent(line);
    } catch {
      /* ignore */
    }
  });
  es.addEventListener("done", () => {
    es.close();
    onDone?.();
  });
  es.addEventListener("error", () => {
    es.close();
    (onError ?? onDone)?.();
  });
  return () => es.close();
}

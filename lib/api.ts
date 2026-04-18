import type {
  Agent,
  ArtifactResponse,
  DecomposeResponse,
  Flow,
  Overview,
  Task,
  TraceLine,
} from "./types";

const base = "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${base}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function post<T, B>(path: string, body: B): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
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

export const submitSigned = (signedXdr: string) =>
  post<
    { hash: string; status: string; return_value: unknown },
    { signed_xdr: string }
  >("/stellar/submit", { signed_xdr: signedXdr });

/**
 * Subscribe to a live SSE trace stream.
 * Returns a disposer. onEvent is called for each trace line; onDone fires on completion.
 */
export function openTraceStream(
  taskId: string,
  onEvent: (line: TraceLine) => void,
  onDone?: () => void,
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
    onDone?.();
  });
  return () => es.close();
}

import type {
  Agent,
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
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json();
}

export const listAgents = () => get<Agent[]>("/agents");
export const listTasks = () => get<Task[]>("/tasks");
export const getOverview = () => get<Overview>("/metrics/overview");
export const getFlow = () => get<Flow>("/flow/default");
export const getTrace = (taskId: string) => get<TraceLine[]>(`/trace/${taskId}`);

export const decompose = (intent: string) =>
  post<DecomposeResponse, { intent: string }>("/orchestrator/decompose", { intent });

export const execute = (planId: string) =>
  post<{ task_id: string }, { plan_id: string }>("/orchestrator/execute", { plan_id: planId });

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

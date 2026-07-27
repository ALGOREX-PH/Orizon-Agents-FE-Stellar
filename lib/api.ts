import {
  isArtifactResponse,
  isDecomposeResponse,
  isOverview,
  isReputationBatch,
  isStellarNetworkInfo,
  isTaskList,
} from "./guards";
import { getTaskToken, rememberTaskToken } from "./task-tokens";
import type {
  Agent,
  ArtifactResponse,
  DecomposeResponse,
  ExecuteResponse,
  Flow,
  Overview,
  ReputationBatch,
  ReputationInfo,
  ReputationParams,
  StellarNetworkInfo,
  Task,
  TraceLine,
} from "./types";

const base = "/api";

export const GET_TIMEOUT_MS = 30_000;
// execute/decompose can be slow, so POSTs get a much longer leash.
export const POST_TIMEOUT_MS = 90_000;

/**
 * fetch with an AbortController deadline so a hung backend cannot stall
 * loading states forever. Timeouts reject with a clear message; every
 * other failure (network drop, non-OK status) propagates untouched.
 * Exported so sibling clients (e.g. lib/pdax.ts) share the same plumbing;
 * `path` is relative to the shared `/api` base.
 */
export async function fetchWithTimeout(
  method: "GET" | "POST",
  path: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${base}${path}`, {
      ...init,
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(`${method} ${path} → timeout after ${timeoutMs / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Several components fetch the same GET simultaneously on mount (/app fires
// getOverview from both the sidebar and the page). Identical paths share one
// request while it is in flight and for a short window after it resolves;
// rejections are evicted immediately so retries always hit the network.
export const GET_DEDUPE_MS = 1_000;

type GetCacheEntry = { promise: Promise<unknown>; settledAt: number | null };
const getCache = new Map<string, GetCacheEntry>();

/** Drops all deduped GET entries — exposed for tests. */
export function clearGetCache(): void {
  getCache.clear();
}

function get<T>(
  path: string,
  parse?: (v: unknown) => T,
  headers?: Record<string, string>,
): Promise<T> {
  const hit = getCache.get(path);
  if (
    hit &&
    (hit.settledAt === null || Date.now() - hit.settledAt < GET_DEDUPE_MS)
  ) {
    return hit.promise as Promise<T>;
  }
  const promise = (async () => {
    const res = await fetchWithTimeout(
      "GET",
      path,
      { cache: "no-store", ...(headers ? { headers } : {}) },
      GET_TIMEOUT_MS,
    );
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
    const json: unknown = await res.json();
    return parse ? parse(json) : (json as T);
  })();
  const entry: GetCacheEntry = { promise, settledAt: null };
  getCache.set(path, entry);
  promise.then(
    () => {
      entry.settledAt = Date.now();
    },
    () => {
      if (getCache.get(path) === entry) getCache.delete(path);
    },
  );
  return promise;
}

async function post<T, B>(
  path: string,
  body: B,
  parse?: (v: unknown) => T,
): Promise<T> {
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
      // The backend is standardizing on an { error: { code, message } }
      // envelope — prefer its message, fall back to the legacy `detail`
      // field, then the raw body; statusText is the last resort below.
      const envelopeMsg =
        typeof j?.error?.message === "string" ? j.error.message : undefined;
      const msg = envelopeMsg ?? j?.detail;
      detail = msg ? ` — ${msg}` : ` — ${JSON.stringify(j).slice(0, 300)}`;
    } catch {
      try {
        detail = ` — ${(await res.text()).slice(0, 300)}`;
      } catch {
        /* ignore */
      }
    }
    if (!detail && res.statusText) detail = ` — ${res.statusText}`;
    throw new Error(`POST ${path} → ${res.status}${detail}`);
  }
  const json: unknown = await res.json();
  return parse ? parse(json) : (json as T);
}

/**
 * Wraps a runtime guard into a parse fn for `get`/`post`: a payload that
 * fails the guard rejects like any other request error and surfaces in the
 * page's normal error state, instead of crashing mid-render on
 * `undefined.toFixed(...)`.
 */
function ensure<T>(
  path: string,
  guard: (v: unknown) => v is T,
): (v: unknown) => T {
  return (v) => {
    if (!guard(v)) throw new Error(`malformed response from ${path}`);
    return v;
  };
}

/**
 * `X-Task-Token` header for per-task reads when this session holds the
 * task's read token (stored at execute time). Undefined — today's exact
 * behavior — when no token is known; required by the backend only once its
 * enforcement flag flips.
 */
function taskAuthHeaders(taskId: string): Record<string, string> | undefined {
  const token = getTaskToken(taskId);
  return token ? { "X-Task-Token": token } : undefined;
}

export const listAgents = () => get<Agent[]>("/agents");
export const listTasks = () =>
  get<Task[]>("/tasks", ensure("/tasks", isTaskList));
export const getOverview = () =>
  get<Overview>("/metrics/overview", ensure("/metrics/overview", isOverview));
export const getFlow = () => get<Flow>("/flow/default");
export const getTrace = (taskId: string) =>
  get<TraceLine[]>(`/trace/${taskId}`, undefined, taskAuthHeaders(taskId));

export const decompose = (intent: string) =>
  post<DecomposeResponse, { intent: string }>(
    "/orchestrator/decompose",
    { intent },
    ensure("/orchestrator/decompose", isDecomposeResponse),
  );

export const execute = (
  planId: string,
  opts?: { auth_id_hex?: string; payer?: string },
) =>
  post<
    ExecuteResponse,
    { plan_id: string; auth_id_hex?: string; payer?: string }
  >("/orchestrator/execute", { plan_id: planId, ...opts }).then((res) => {
    // Remember the read token at the API seam so every execute caller
    // (simulated and on-chain paths alike) gets later task reads authorized
    // without extra wiring. No-op while the backend ships no token.
    rememberTaskToken(res.task_id, res.read_token);
    return res;
  });

export const getArtifact = (taskId: string) =>
  get<ArtifactResponse>(
    `/tasks/${taskId}/artifact`,
    ensure(`/tasks/${taskId}/artifact`, isArtifactResponse),
    taskAuthHeaders(taskId),
  );

// ── Stellar / x402 ──────────────────────────────────────────
export const getStellarNetwork = () =>
  get<StellarNetworkInfo>(
    "/stellar/network",
    ensure("/stellar/network", isStellarNetworkInfo),
  );

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

export const listReputation = () =>
  get<ReputationBatch>(
    "/stellar/reputation",
    ensure("/stellar/reputation", isReputationBatch),
  );
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
 *
 * Transient drops auto-reconnect up to 3 times (1s/2s/4s backoff) before
 * surfacing the error; once `done` arrives no reconnect is attempted.
 *
 * The backend replays the full trace history to every new subscriber, so a
 * reconnect re-delivers already-seen lines. onReset fires immediately before
 * each reconnect opens its EventSource — consumers must drop accumulated
 * lines there or the replay double-renders (and double-counts spend).
 */
export function openTraceStream(
  taskId: string,
  onEvent: (line: TraceLine) => void,
  onDone?: () => void,
  onError?: () => void,
  onReset?: () => void,
): () => void {
  const MAX_RECONNECTS = 3;
  const BACKOFF_MS = [1_000, 2_000, 4_000];
  let es: EventSource | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let attempts = 0;
  let settled = false; // done received, terminally errored, or disposed

  // EventSource cannot set headers, so the task read token (when this
  // session holds one) rides along as a query param instead.
  const token = getTaskToken(taskId);
  const query = token ? `?token=${encodeURIComponent(token)}` : "";

  const connect = () => {
    es = new EventSource(`${base}/trace/${taskId}/stream${query}`);
    es.addEventListener("trace", (e) => {
      try {
        const line = JSON.parse((e as MessageEvent).data) as TraceLine;
        onEvent(line);
      } catch {
        /* ignore */
      }
    });
    es.addEventListener("done", () => {
      settled = true;
      es?.close();
      onDone?.();
    });
    es.addEventListener("error", () => {
      es?.close();
      if (settled) return;
      if (attempts < MAX_RECONNECTS) {
        const delay = BACKOFF_MS[attempts];
        attempts += 1;
        retryTimer = setTimeout(() => {
          retryTimer = null;
          onReset?.();
          connect();
        }, delay);
      } else {
        settled = true;
        (onError ?? onDone)?.();
      }
    });
  };

  connect();

  return () => {
    settled = true;
    if (retryTimer !== null) clearTimeout(retryTimer);
    retryTimer = null;
    es?.close();
  };
}

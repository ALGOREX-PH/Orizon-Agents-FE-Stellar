import {
  isAgentList,
  isArtifactResponse,
  isDecomposeResponse,
  isFlow,
  isOverview,
  isReputationBatch,
  isReputationParams,
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

// The backend sleeps on Render's free tier and takes 30-60s to wake, so a 30s
// deadline turned every first visit into a hard failure.
export const GET_TIMEOUT_MS = 60_000;
// execute/decompose can be slow, so POSTs get a much longer leash. This MUST
// stay above the backend's own decompose budget (DECOMPOSE_TIMEOUT_SECONDS,
// 90s) plus the reputation fetch that precedes it — otherwise the client
// always aborts first and the backend's typed 504 `decompose_timeout` is
// unreachable, leaving the user a generic "timeout after 90s" instead.
export const POST_TIMEOUT_MS = 105_000;

// Methods that consume the response body. The deadline has to stay armed
// across these — `fetch()` resolves as soon as HEADERS arrive, so clearing
// the timer there left every body read (the artifact route alone returns
// 30-76 kB) unguarded, and a stalled body hung the loading state forever.
const BODY_READERS = new Set([
  "json",
  "text",
  "arrayBuffer",
  "blob",
  "bytes",
  "formData",
]);

/**
 * Wraps a Response so its body readers run inside the same deadline that
 * covered the headers: the timer is cleared when the body settles, and an
 * abort that lands mid-body is reported as the timeout it is.
 *
 * A Proxy (rather than a rebuilt Response) keeps `ok`/`status`/`headers`
 * and every other member reading exactly as the caller expects.
 */
function guardBody(
  res: Response,
  timer: ReturnType<typeof setTimeout>,
  signal: AbortSignal,
  expired: () => Error,
): Response {
  return new Proxy(res, {
    get(target, prop) {
      // `target` as receiver: Response's accessors are prototype getters
      // that need the real instance, not the proxy.
      const value: unknown = Reflect.get(target, prop, target);
      if (typeof value !== "function") return value;
      const fn = value as (...args: unknown[]) => unknown;
      if (typeof prop !== "string" || !BODY_READERS.has(prop)) {
        return fn.bind(target);
      }
      return async (...args: unknown[]) => {
        try {
          return await fn.apply(target, args);
        } catch (err) {
          if (signal.aborted) throw expired();
          throw err;
        } finally {
          clearTimeout(timer);
        }
      };
    },
  });
}

/**
 * fetch with an AbortController deadline so a hung backend cannot stall
 * loading states forever. The deadline covers the whole exchange — headers
 * AND body. Timeouts reject with a clear message; every other failure
 * (network drop, non-OK status) propagates untouched.
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
  // A caller that never reads the body would otherwise hold the event loop
  // open for the full deadline (node only — browsers return a number).
  (timer as unknown as { unref?: () => void }).unref?.();
  const expired = () =>
    new Error(`${method} ${path} → timeout after ${timeoutMs / 1000}s`);
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      ...init,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (controller.signal.aborted) throw expired();
    throw err;
  }
  return guardBody(res, timer, controller.signal, expired);
}

/**
 * A non-OK HTTP answer, carrying the machine-readable bits the message can
 * only spell out. `retryAfterMs` mirrors the header the backend's rate
 * limiter sets — lib/use-fetch and lib/use-polling already duck-type that
 * field off rejections, so a throttled page now waits exactly as long as it
 * was asked to instead of guessing.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly retryAfterMs?: number;

  constructor(message: string, status: number, retryAfterMs?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    if (retryAfterMs !== undefined) this.retryAfterMs = retryAfterMs;
  }
}

/**
 * `Retry-After` in ms — seconds or an HTTP-date, per RFC 9110 — or null when
 * the response says nothing. Written defensively: `headers` is absent on the
 * plain-object responses used in tests.
 */
function retryAfterMs(res: Response): number | undefined {
  const raw = (
    res as { headers?: { get?: (name: string) => string | null } }
  ).headers?.get?.("retry-after");
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, seconds) * 1_000;
  const at = Date.parse(raw);
  return Number.isFinite(at) ? Math.max(0, at - Date.now()) : undefined;
}

/**
 * Turns a non-OK response into the error the user reads.
 *
 * The backend is standardizing on an { error: { code, message } } envelope —
 * prefer its message, fall back to the legacy `detail` field, then the raw
 * body, then statusText. 429 gets its own sentence: "backend offline" is a
 * lie when the answer was "not this second", and the wait is actionable.
 */
async function httpError(
  method: "GET" | "POST",
  path: string,
  res: Response,
): Promise<ApiError> {
  let detail = "";
  try {
    const j = await res.json();
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
  const wait = retryAfterMs(res);
  if (res.status === 429) {
    // The limiter's own envelope message is "too many requests", which adds
    // nothing over the status — the wait is the part worth printing.
    detail =
      wait === undefined
        ? " — rate limited, retry shortly"
        : ` — rate limited, retry in ${Math.max(1, Math.ceil(wait / 1_000))}s`;
  }
  return new ApiError(
    `${method} ${path} → ${res.status}${detail}`,
    res.status,
    wait,
  );
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
    if (!res.ok) throw await httpError("GET", path, res);
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
  if (!res.ok) throw await httpError("POST", path, res);
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

export const listAgents = () =>
  get<Agent[]>("/agents", ensure("/agents", isAgentList));
export const listTasks = () =>
  get<Task[]>("/tasks", ensure("/tasks", isTaskList));
export const getOverview = () =>
  get<Overview>("/metrics/overview", ensure("/metrics/overview", isOverview));
export const getFlow = () =>
  get<Flow>("/flow/default", ensure("/flow/default", isFlow));
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
  get<ReputationParams>(
    "/stellar/reputation/params",
    ensure("/stellar/reputation/params", isReputationParams),
  );
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

/** Consecutive failed reconnects tolerated before SSE is given up on. */
const MAX_RECONNECTS = 3;
const BACKOFF_MS = [1_000, 2_000, 4_000];
/**
 * Lifetime cap on reconnects. The per-outage budget above refreshes on every
 * connection that actually ran, which is what keeps a 12-minute workflow
 * alive — this is the backstop that keeps a server accepting and instantly
 * dropping the stream from reconnecting forever.
 */
const MAX_TOTAL_RECONNECTS = 60;
/**
 * A connection that stayed up this long counts as having worked even if it
 * carried no line: steps can take 120s, so silence is not failure.
 */
const STABLE_CONNECTION_MS = 5_000;
/**
 * How long a new EventSource has to answer before it is treated as failed.
 *
 * Every GET/POST has an AbortController deadline; EventSource has none and
 * fires no `error` while a request simply hangs. Opening a shared trace link
 * against a sleeping backend (Render free tier, 30-60s cold start) therefore
 * pinned the page on a pulsing "awaiting next step…" forever. A warm backend
 * answers in milliseconds, so 12s is loose enough to never fire on a healthy
 * connection and short enough that a dead one surfaces.
 */
export const STREAM_CONNECT_TIMEOUT_MS = 12_000;

/**
 * Subscribe to a live SSE trace stream.
 * Returns a disposer. onEvent is called for each trace line; onDone fires on
 * completion; onError fires if the stream drops mid-flight (falls back to
 * onDone when not provided, preserving the old behavior).
 *
 * Transient drops auto-reconnect with a 1s/2s/4s backoff. The budget is per
 * outage, not per stream: any connection that opens and carries a line (or
 * simply holds for a few seconds) refreshes it. A free-form workflow can
 * legitimately stream for ~12 minutes, and a monotonic counter declared such
 * a run dead on its third transport hiccup while it was still executing —
 * and still charging. Once `done` arrives no reconnect is attempted.
 *
 * A connection that never answers within STREAM_CONNECT_TIMEOUT_MS is failed
 * deliberately: EventSource has no deadline of its own, so a hung request
 * (asleep backend, dead proxy) otherwise streamed nothing, forever, while the
 * UI claimed to be live.
 *
 * The backend replays the full trace history to every new subscriber
 * (app/routers/trace.py), so a reconnect re-delivers already-seen lines.
 * onReset fires immediately before each reconnect opens its EventSource and
 * means "the lines you hold are about to be superseded": consumers must
 * REPLACE their buffer with the first line that arrives afterwards, not
 * empty it on the spot. Emptying it eagerly loses the whole rendered run
 * whenever the reconnect then fails — the backend's traces are in-memory
 * only, so a restart answers 404 and nothing re-fetches them.
 */
export function openTraceStream(
  taskId: string,
  onEvent: (line: TraceLine) => void,
  onDone?: () => void,
  onError?: () => void,
  onReset?: () => void,
): () => void {
  let es: EventSource | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let connectTimer: ReturnType<typeof setTimeout> | null = null;
  let attempts = 0; // consecutive failures since the last working connection
  let reconnects = 0; // lifetime total
  let settled = false; // done received, terminally errored, or disposed

  // EventSource cannot set headers, so the task read token (when this
  // session holds one) rides along as a query param instead.
  const token = getTaskToken(taskId);
  const query = token ? `?token=${encodeURIComponent(token)}` : "";

  const clearConnectTimer = () => {
    if (connectTimer !== null) clearTimeout(connectTimer);
    connectTimer = null;
  };

  const settle = (ok: boolean) => {
    if (settled) return;
    settled = true;
    clearConnectTimer();
    es?.close();
    if (ok) onDone?.();
    else (onError ?? onDone)?.();
  };

  const connect = () => {
    const source = new EventSource(`${base}/trace/${taskId}/stream${query}`);
    es = source;
    let openedAt: number | null = null;
    let carried = 0;
    let dead = false;

    // `open` is the real signal, but any event proves the connection is
    // live — including the backend's 15s keepalive ping.
    const established = () => {
      if (openedAt !== null) return;
      openedAt = Date.now();
      clearConnectTimer();
    };

    /** This connection is over — reconnect if the budget allows. */
    const failed = () => {
      if (dead) return;
      dead = true;
      clearConnectTimer();
      source.close();
      if (settled) return;
      // A connection that did its job earns a fresh budget; one that opened
      // and died on the spot does not, or a flapping backend would be
      // reconnected against in a tight loop.
      const worked =
        openedAt !== null &&
        (carried > 0 || Date.now() - openedAt >= STABLE_CONNECTION_MS);
      if (worked) attempts = 0;
      if (attempts < MAX_RECONNECTS && reconnects < MAX_TOTAL_RECONNECTS) {
        const delay = BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length - 1)];
        attempts += 1;
        reconnects += 1;
        retryTimer = setTimeout(() => {
          retryTimer = null;
          onReset?.();
          connect();
        }, delay);
      } else {
        settle(false);
      }
    };

    // The deadline EventSource does not have: a request that hangs (asleep
    // backend, dead proxy) never fires `error` on its own.
    connectTimer = setTimeout(() => {
      connectTimer = null;
      if (settled || openedAt !== null) return;
      failed();
    }, STREAM_CONNECT_TIMEOUT_MS);

    source.addEventListener("open", established);
    source.addEventListener("ping", established);
    source.addEventListener("trace", (e) => {
      established();
      try {
        const line = JSON.parse((e as MessageEvent).data) as TraceLine;
        carried += 1;
        onEvent(line);
      } catch {
        /* ignore */
      }
    });
    source.addEventListener("done", () => {
      established();
      settle(true);
    });
    source.addEventListener("error", failed);
  };

  connect();

  return () => {
    settled = true;
    if (retryTimer !== null) clearTimeout(retryTimer);
    retryTimer = null;
    clearConnectTimer();
    es?.close();
  };
}

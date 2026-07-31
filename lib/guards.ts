/**
 * Hand-written runtime guards for the responses whose fields feed arithmetic
 * or `.map` during render. A malformed payload (proxy error page, half-rolled
 * backend, envelope change) would otherwise crash the component tree with
 * `undefined.toFixed(...)`; failing the guard lets lib/api.ts surface a
 * normal error state instead.
 *
 * Deliberately shallow: each guard checks only the fields the UI actually
 * computes with — not the full schema. Zero dependencies.
 */

import type {
  Agent,
  ArtifactResponse,
  CodeArtifact,
  DecomposeResponse,
  Overview,
  ReputationBatch,
  StellarNetworkInfo,
  Task,
} from "./types";

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const isStr = (v: unknown): v is string => typeof v === "string";

const isNumArray = (v: unknown): v is number[] =>
  Array.isArray(v) && v.every(isNum);

const isStrArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every(isStr);

/** Backend `AgentStatus` literal (app/schemas.py). Checked as a set, not just
 * as a string, because the status indexes a tone map — an unlisted value
 * silently renders an unstyled badge. */
const AGENT_STATUSES = new Set(["online", "idle", "offline"]);

/** Agents table + reputation leaderboard: `price.toFixed(3)`,
 * `runs.toLocaleString()`, `skills.map`, `rep * 2000`, and `status` keys a
 * tone map. Mirrors backend `Agent` (`app/schemas.py`); `real` has a server
 * default and is only used as a truthiness flag, so it stays unchecked. */
export function isAgentList(v: unknown): v is Agent[] {
  return (
    Array.isArray(v) &&
    v.every(
      (a) =>
        isRecord(a) &&
        isStr(a.id) &&
        isStr(a.name) &&
        isStrArray(a.skills) &&
        isNum(a.price) &&
        isNum(a.rep) &&
        isNum(a.runs) &&
        isStr(a.status) &&
        AGENT_STATUSES.has(a.status),
    )
  );
}

/** Dashboard + sidebar: stat tiles do `*100`/`.toFixed`, sparkline maps
 * `throughput`, the skills list maps `name`/`pct`. */
export function isOverview(v: unknown): v is Overview {
  return (
    isRecord(v) &&
    isNum(v.agents_online) &&
    isNum(v.tasks_per_sec) &&
    isNum(v.avg_completion) &&
    isNum(v.avg_trust) &&
    isNumArray(v.throughput) &&
    Array.isArray(v.skills) &&
    v.skills.every((s) => isRecord(s) && isStr(s.name) && isNum(s.pct))
  );
}

/** Task table: rows keyed by `id`, `spent.toFixed(3)` per row. */
export function isTaskList(v: unknown): v is Task[] {
  return (
    Array.isArray(v) &&
    v.every((t) => isRecord(t) && isStr(t.id) && isNum(t.spent))
  );
}

/** Plan panel: `total_usdc`/`total_eta` get `.toFixed`, steps are mapped with
 * `.toFixed` on each estimate. */
export function isDecomposeResponse(v: unknown): v is DecomposeResponse {
  return (
    isRecord(v) &&
    isStr(v.plan_id) &&
    isNum(v.total_usdc) &&
    isNum(v.total_eta) &&
    Array.isArray(v.steps) &&
    v.steps.every(
      (s) =>
        isRecord(s) &&
        isStr(s.agent_id) &&
        isNum(s.est_price_usdc) &&
        isNum(s.est_eta_seconds),
    )
  );
}

/** Reputation pages: `reputations` values feed bps→score math, evidence sums
 * (`weight`), counts and dispute rates; `floor_bps` feeds the floor badge. */
export function isReputationBatch(v: unknown): v is ReputationBatch {
  return (
    isRecord(v) &&
    isNum(v.floor_bps) &&
    isNum(v.prior_bps) &&
    isRecord(v.reputations) &&
    Object.values(v.reputations).every(
      (r) =>
        isRecord(r) &&
        isNum(r.smoothed_bps) &&
        isNum(r.lower_bound_bps) &&
        isNum(r.count) &&
        isNum(r.weight) &&
        isNum(r.dispute_rate_bps),
    )
  );
}

/** Artifact viewer maps `files`, sums `content.length`, renders `title` and
 * `preview_html`; `artifact` itself may legitimately be null (not sealed). */
function isCodeArtifact(v: unknown): v is CodeArtifact {
  return (
    isRecord(v) &&
    isStr(v.title) &&
    isStr(v.preview_html) &&
    Array.isArray(v.files) &&
    v.files.every((f) => isRecord(f) && isStr(f.path) && isStr(f.content))
  );
}

export function isArtifactResponse(v: unknown): v is ArtifactResponse {
  if (!isRecord(v)) return false;
  const a = v.artifact;
  return a === null || a === undefined || isCodeArtifact(a);
}

/** Wallet page: `Object.entries(contracts)` is mapped into explorer links,
 * `asset_sac.slice(0, 8)`, and the string fields render as React children. */
export function isStellarNetworkInfo(v: unknown): v is StellarNetworkInfo {
  return (
    isRecord(v) &&
    isStr(v.network) &&
    isStr(v.network_passphrase) &&
    isStr(v.rpc_url) &&
    isStr(v.admin) &&
    isStr(v.asset) &&
    isStr(v.asset_sac) &&
    isRecord(v.contracts) &&
    Object.values(v.contracts).every(isStr)
  );
}

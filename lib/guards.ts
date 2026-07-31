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
  Flow,
  Overview,
  ReputationBatch,
  ReputationParams,
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

/** Flow graph: `nodes.map` positions each node with `x`/`y` percentages and
 * `edges.map(([from, to]) => …)` destructures every edge — a missing or
 * non-pair `edges` entry is an immediate crash. Mirrors backend `Flow` /
 * `FlowNode` (`app/schemas.py`), where edges are `list[tuple[str, str]]`. */
export function isFlow(v: unknown): v is Flow {
  return (
    isRecord(v) &&
    Array.isArray(v.nodes) &&
    v.nodes.every(
      (n) =>
        isRecord(n) &&
        isStr(n.id) &&
        isStr(n.label) &&
        isStr(n.sub) &&
        isNum(n.x) &&
        isNum(n.y),
    ) &&
    Array.isArray(v.edges) &&
    v.edges.every((e) => Array.isArray(e) && e.length === 2 && e.every(isStr))
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

/** Backend `ReputationInfo.source` literal (`app/routers/stellar.py`). The
 * leaderboard branches on it to decide whether a row shows on-chain evidence
 * or the seeded prior, so an unlisted value would present prior data as
 * measured. */
const REPUTATION_SOURCES = new Set(["onchain", "prior"]);

/** Reputation pages: `reputations` values feed bps→score math, evidence sums
 * (`weight`), counts and dispute rates; `floor_bps` feeds the floor badge.
 * `disputed` is also a sort comparator (`sortValue.disputes`) — a non-number
 * makes every comparison NaN and silently scrambles row order — and `avg_bps`
 * is the unsmoothed on-chain mean. All required on the backend model. */
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
        isNum(r.avg_bps) &&
        isNum(r.count) &&
        isNum(r.weight) &&
        isNum(r.disputed) &&
        isNum(r.dispute_rate_bps) &&
        isStr(r.source) &&
        REPUTATION_SOURCES.has(r.source),
    )
  );
}

/** Reputation reference card + score calculator: every numeric here is
 * divided or fed into the smoothed/lower-bound chain (`epoch_seconds / 86400`,
 * `decay_bps_per_epoch / 100`, the whole `prior_weight_usdc`/`wilson_z` math),
 * so a missing one renders `NaN` or `★ NaN`. Mirrors backend `ReputationParams`
 * (`app/routers/stellar.py`); `enabled` is not computed with, so it is left
 * unchecked in keeping with this file's shallow contract. */
export function isReputationParams(v: unknown): v is ReputationParams {
  return (
    isRecord(v) &&
    isNum(v.prior_bps) &&
    isNum(v.prior_weight_usdc) &&
    isNum(v.floor_bps) &&
    isNum(v.max_rating_weight_usdc) &&
    isNum(v.read_ttl_seconds) &&
    isNum(v.wilson_z) &&
    isNum(v.epoch_seconds) &&
    isNum(v.decay_bps_per_epoch) &&
    isNum(v.max_decay_epochs) &&
    isStr(v.contract_id) &&
    isStr(v.network)
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

export type AgentStatus = "online" | "idle" | "offline";

export type Agent = {
  id: string;
  name: string;
  skills: string[];
  price: number;
  rep: number;
  status: AgentStatus;
  runs: number;
  real?: boolean;
};

export type TaskStatus = "pending" | "running" | "complete" | "failed";

export type Task = {
  id: string;
  intent: string;
  agents: number;
  spent: number;
  status: TaskStatus;
  started: string;
};

export type PlanStep = {
  agent_id: string;
  agent_name?: string;
  rationale: string;
  est_price_usdc: number;
  est_eta_seconds: number;
  rep_bps?: number | null;
  rep_source?: ReputationSource | null;
};

export type DecomposeResponse = {
  plan_id: string;
  intent: string;
  steps: PlanStep[];
  total_usdc: number;
  total_eta: number;
};

/** Response of POST /api/orchestrator/execute. */
export type ExecuteResponse = {
  task_id: string;
  /**
   * Capability token for reading this task's trace/artifact. Replayed via
   * `X-Task-Token` (or `?token=` on the SSE stream) once backend enforcement
   * turns on; absent/null while enforcement is off.
   */
  read_token?: string | null;
};

export type TraceLevel =
  "input" | "exec" | "proof" | "cost" | "out" | "error" | "artifact";
export type TraceLine = { t: string; level: TraceLevel; msg: string };

export type ArtifactFile = {
  path: string;
  language: string;
  content: string;
};

export type CodeArtifact = {
  title: string;
  summary: string;
  files: ArtifactFile[];
  entry: string;
  preview_html: string;
};

export type ArtifactResponse = {
  artifact: CodeArtifact | null;
  charge_tx?: string | null;
  proof_tx?: string | null;
};

export type FlowNode = {
  id: string;
  label: string;
  sub: string;
  x: number;
  y: number;
};
export type Flow = { nodes: FlowNode[]; edges: [string, string][] };

export type Overview = {
  agents_online: number;
  tasks_per_sec: number;
  avg_completion: number;
  avg_trust: number;
  throughput: number[];
  skills: { name: string; pct: number; tone: "violet" | "cyan" | "magenta" }[];
};

/** Where a reputation score comes from: on-chain evidence or the Bayesian prior. */
export type ReputationSource = "onchain" | "prior";

/** Per-agent reputation as served by GET /api/stellar/reputation[/{agent_id}]. */
export type ReputationInfo = {
  agent_id: string;
  smoothed_bps: number;
  lower_bound_bps: number;
  avg_bps: number;
  count: number;
  weight: number;
  disputed: number;
  dispute_rate_bps: number;
  source: ReputationSource;
  /**
   * The on-chain ledger read failed and this score is the Bayesian prior
   * served in its place — the reputation service fails OPEN. It is the only
   * thing separating "we could not read the chain" from a genuine cold-start
   * newcomer, which `source: "prior"` alone reports identically. Optional:
   * absent on any response from a backend that predates the flag.
   */
  degraded?: boolean;
};

/** Response of GET /api/stellar/reputation — all agents keyed by id. */
export type ReputationBatch = {
  reputations: Record<string, ReputationInfo>;
  floor_bps: number;
  prior_bps: number;
};

/** Response of GET /api/stellar/reputation/params — the full parameter set
 * of the reputation system (routing constants + on-chain decay constants). */
export type ReputationParams = {
  enabled: boolean;
  prior_bps: number;
  prior_weight_usdc: number;
  floor_bps: number;
  max_rating_weight_usdc: number;
  read_ttl_seconds: number;
  wilson_z: number;
  epoch_seconds: number;
  decay_bps_per_epoch: number;
  max_decay_epochs: number;
  contract_id: string;
  network: string;
};

/** Response of POST /api/stellar/build/authorize — the unsigned x402
 * authorization the wallet is asked to sign. */
export type AuthorizeBuild = {
  xdr: string;
  expires_at: number;
};

/** Response of POST /api/stellar/submit — the outcome of broadcasting a
 * signed envelope. `return_value` is the contract's raw return, normalized
 * by the caller (hex, base64 or a byte list). */
export type SubmitResult = {
  hash: string;
  status: string;
  return_value: unknown;
  diagnostic?: string;
  explorer?: string;
};

/** Response of GET /api/stellar/network — network meta + deployed contract ids. */
export type StellarNetworkInfo = {
  network: string;
  rpc_url: string;
  network_passphrase: string;
  admin: string;
  contracts: Record<string, string>;
  asset: string;
  asset_sac: string;
};

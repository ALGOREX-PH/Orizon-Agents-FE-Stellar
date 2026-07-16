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

export type TraceLevel =
  | "input"
  | "exec"
  | "proof"
  | "cost"
  | "out"
  | "error"
  | "artifact";
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

export type FlowNode = { id: string; label: string; sub: string; x: number; y: number };
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
};

/** Response of GET /api/stellar/reputation — all agents keyed by id. */
export type ReputationBatch = {
  reputations: Record<string, ReputationInfo>;
  floor_bps: number;
  prior_bps: number;
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

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
};

export type DecomposeResponse = {
  plan_id: string;
  intent: string;
  steps: PlanStep[];
  total_usdc: number;
  total_eta: number;
};

export type TraceLevel = "input" | "exec" | "proof" | "cost" | "out" | "error";
export type TraceLine = { t: string; level: TraceLevel; msg: string };

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

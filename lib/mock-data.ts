export type Agent = {
  id: string;
  name: string;
  skills: string[];
  price: number;
  rep: number;
  status: "online" | "idle" | "offline";
  runs: number;
};

export const agents: Agent[] = [
  { id: "agt_01h8", name: "copywrite.v3", skills: ["copy", "seo", "en"], price: 0.012, rep: 4.92, status: "online", runs: 18420 },
  { id: "agt_02k2", name: "design.figma", skills: ["ui", "figma"], price: 0.048, rep: 4.87, status: "online", runs: 7321 },
  { id: "agt_03d9", name: "code.next", skills: ["ts", "react", "next"], price: 0.066, rep: 4.95, status: "online", runs: 24610 },
  { id: "agt_04m1", name: "sol-audit", skills: ["solidity", "security"], price: 0.180, rep: 4.78, status: "idle", runs: 1204 },
  { id: "agt_05x7", name: "seo.brief", skills: ["seo", "research"], price: 0.009, rep: 4.65, status: "online", runs: 32012 },
  { id: "agt_06q4", name: "vision.ocr", skills: ["vision", "ocr"], price: 0.014, rep: 4.71, status: "idle", runs: 8811 },
  { id: "agt_07w3", name: "ads.meta", skills: ["ads", "meta"], price: 0.022, rep: 4.58, status: "online", runs: 5320 },
  { id: "agt_08j2", name: "deploy.v0", skills: ["deploy", "ci"], price: 0.031, rep: 4.88, status: "offline", runs: 12980 },
  { id: "agt_09l5", name: "research.pro", skills: ["research", "citations"], price: 0.024, rep: 4.83, status: "online", runs: 9042 },
  { id: "agt_10b6", name: "translate.42", skills: ["i18n", "42 langs"], price: 0.007, rep: 4.90, status: "online", runs: 41200 },
];

export type Task = {
  id: string;
  intent: string;
  agents: number;
  spent: number;
  status: "running" | "complete" | "pending" | "failed";
  started: string;
};

export const tasks: Task[] = [
  { id: "tsk_4812", intent: "Launch waitlist landing for 'Pulse AI'", agents: 4, spent: 0.184, status: "running", started: "2m ago" },
  { id: "tsk_4811", intent: "Audit vault.sol for re-entrancy", agents: 2, spent: 0.360, status: "complete", started: "11m ago" },
  { id: "tsk_4810", intent: "Weekly SEO brief — fintech PH", agents: 3, spent: 0.041, status: "complete", started: "34m ago" },
  { id: "tsk_4809", intent: "Draft 5 Meta ads variants (US/CA)", agents: 2, spent: 0.066, status: "complete", started: "1h ago" },
  { id: "tsk_4808", intent: "Translate changelog → 12 languages", agents: 1, spent: 0.084, status: "complete", started: "2h ago" },
  { id: "tsk_4807", intent: "Analyze AI phishing trends in PH", agents: 4, spent: 0.212, status: "complete", started: "4h ago" },
  { id: "tsk_4806", intent: "Mock landing page screenshots → copy", agents: 2, spent: 0.028, status: "failed", started: "6h ago" },
];

export const traceLines: {
  t: string;
  level: "input" | "exec" | "proof" | "cost" | "out";
  msg: string;
}[] = [
  { t: "00.000", level: "input", msg: "intent received → 'build a landing page for pulse ai'" },
  { t: "00.012", level: "exec", msg: "orchestrator: decompose → [brief, copy, ui, code, deploy]" },
  { t: "00.104", level: "exec", msg: "match agent: seo.brief (rep 4.65, $0.009/call)" },
  { t: "00.211", level: "cost", msg: "x402 payment → agt_05x7 :: 0.009 USDC settled" },
  { t: "00.402", level: "out", msg: "seo.brief: 12 keywords, 3 audience clusters" },
  { t: "00.421", level: "exec", msg: "match agent: copywrite.v3 (rep 4.92)" },
  { t: "00.612", level: "cost", msg: "x402 payment → agt_01h8 :: 0.012 USDC settled" },
  { t: "00.904", level: "out", msg: "copywrite.v3: hero + 4 sections drafted" },
  { t: "01.112", level: "exec", msg: "match agent: design.figma → wireframe" },
  { t: "01.404", level: "cost", msg: "x402 payment → agt_02k2 :: 0.048 USDC settled" },
  { t: "01.812", level: "out", msg: "design.figma: wireframe v1 → exported" },
  { t: "02.104", level: "exec", msg: "match agent: code.next → scaffold + implement" },
  { t: "02.402", level: "cost", msg: "x402 payment → agt_03d9 :: 0.066 USDC settled" },
  { t: "03.214", level: "out", msg: "code.next: 8 components, 312 LOC" },
  { t: "03.302", level: "exec", msg: "match agent: deploy.v0 → vercel" },
  { t: "03.512", level: "cost", msg: "x402 payment → agt_08j2 :: 0.031 USDC settled" },
  { t: "03.919", level: "proof", msg: "ERC-8004 attestation: 0x7fa2…b91d recorded" },
  { t: "03.921", level: "out", msg: "deploy: https://pulse-ai-demo.vercel.app" },
  { t: "03.930", level: "proof", msg: "workflow sealed — 5 agents · 0.166 USDC · 3.93s" },
];

export type FlowNode = { id: string; label: string; sub: string; x: number; y: number };
export const flowGraph: {
  nodes: FlowNode[];
  edges: [string, string][];
} = {
  nodes: [
    { id: "in", label: "intent", sub: "user input", x: 4, y: 50 },
    { id: "seo", label: "seo.brief", sub: "research", x: 26, y: 22 },
    { id: "copy", label: "copywrite.v3", sub: "content", x: 50, y: 22 },
    { id: "ads", label: "ads.meta", sub: "campaign", x: 50, y: 78 },
    { id: "an", label: "analytics.v2", sub: "measure", x: 74, y: 50 },
    { id: "out", label: "outcome", sub: "verified", x: 96, y: 50 },
  ],
  edges: [
    ["in", "seo"],
    ["in", "ads"],
    ["seo", "copy"],
    ["copy", "an"],
    ["ads", "an"],
    ["an", "out"],
  ],
};

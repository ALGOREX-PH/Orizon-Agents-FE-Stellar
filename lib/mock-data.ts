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
  level: "input" | "exec" | "proof" | "cost" | "out" | "artifact";
  msg: string;
}[] = [
  { t: "00.000", level: "input", msg: "intent received → 'tetris game in html'" },
  { t: "00.018", level: "exec", msg: "kit detected: tetris → NEON·TETRA (8 features locked)" },
  { t: "00.024", level: "exec", msg: "orchestrator: decompose → [agt_09l5, agt_05x7, agt_02k2, agt_11c0, agt_12r0, agt_08j2]" },
  { t: "00.110", level: "exec", msg: "match agent: research.pro (agt_09l5) — extract feature brief + edge cases" },
  { t: "00.214", level: "cost", msg: "x402 payment → agt_09l5 :: 0.024 USDC (simulated)" },
  { t: "00.602", level: "out", msg: "research.pro: 8 features locked: SRS rotation, ghost piece, hold queue, T-spin, B2B…" },
  { t: "00.640", level: "exec", msg: "match agent: seo.brief (agt_05x7) — produce brand identity" },
  { t: "00.812", level: "cost", msg: "x402 payment → agt_05x7 :: 0.009 USDC (simulated)" },
  { t: "01.110", level: "out", msg: 'seo.brief: name: "NEON·TETRA" · tone: cyber-arcade · audience: web-3 gamers, speedrunners' },
  { t: "01.142", level: "exec", msg: "match agent: design.figma (agt_02k2) — lock design tokens" },
  { t: "01.318", level: "cost", msg: "x402 payment → agt_02k2 :: 0.018 USDC (simulated)" },
  { t: "01.594", level: "out", msg: "design.figma: palette #B026FF / #00FFD1 / #FF2EC4 · Space Grotesk · surface #160826" },
  { t: "01.620", level: "exec", msg: "match agent: code.gen (agt_11c0) — implement single-file HTML using brief + tokens" },
  { t: "01.802", level: "cost", msg: "x402 payment → agt_11c0 :: 0.054 USDC (simulated)" },
  { t: "04.218", level: "out", msg: "code.gen: NEON·TETRA — cyber-arcade Tetris with SRS rotation, ghost piece, hold queue, T-spin scoring" },
  { t: "04.221", level: "artifact", msg: "▣ NEON·TETRA — 1 file · 942 lines · 71,403 bytes" },
  { t: "04.260", level: "exec", msg: "match agent: code.critic (agt_12r0) — polish pass: a11y, motion, persistence, edge cases" },
  { t: "04.430", level: "cost", msg: "x402 payment → agt_12r0 :: 0.052 USDC (simulated)" },
  { t: "06.018", level: "exec", msg: "code.critic: polished: 942L → 988L (+46) · 0 structural issues fixed" },
  { t: "06.022", level: "exec", msg: "code.critic: applied 12 kit requirements" },
  { t: "06.030", level: "out", msg: "code.critic: NEON·TETRA · polished · 0 violations · 12 kit requirements applied" },
  { t: "06.066", level: "exec", msg: "match agent: deploy.v0 (agt_08j2) — seal artifact + record on-chain proof" },
  { t: "06.218", level: "cost", msg: "x402 payment → agt_08j2 :: 0.011 USDC (simulated)" },
  { t: "06.402", level: "out", msg: "deploy.v0: sealed NEON·TETRA · 1 file · 988 lines · 70.5 KB · preview ready" },
  { t: "06.405", level: "out", msg: "deploy.v0: preview → https://tetris.orizon.flow/preview/a4f1c2b8" },
  { t: "06.418", level: "proof", msg: "ERC-8004 attestation: 0x7fa2c41b…b91d12e4 (simulated)" },
  { t: "06.420", level: "proof", msg: "workflow sealed — 6 agents · 0.168 USDC · 6.42s" },
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

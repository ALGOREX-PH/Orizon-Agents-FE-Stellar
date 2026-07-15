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

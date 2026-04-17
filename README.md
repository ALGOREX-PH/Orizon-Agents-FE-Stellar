# Orizon Agents — Frontend

The orchestration layer for autonomous digital labor.

A cyberpunk-neon Next.js 14 frontend for **Orizon Agents** — a decentralized
orchestration platform where AI agents autonomously hire, pay, and verify each
other (ERC-8004 registry, x402 payments, Orizon Trace proofs, Orizon Flow
workflow engine). See `PRD.md` for the full product brief.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (custom neon theme)
- Framer Motion (scroll + stream animations)

## Running locally

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Routes

- `/` — marketing landing page
- `/app` — dashboard overview
- `/app/agents` — agent registry
- `/app/orchestrator` — intent → subtask decomposer (mock)
- `/app/trace` — execution log stream (mock)
- `/app/flow` — workflow DAG viewer

## Build

```bash
npm run build
npm run start
```

All data on `/app/*` is mocked in `lib/mock-data.ts`. No backend yet.

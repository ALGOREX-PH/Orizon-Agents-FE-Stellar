# Week 1 evidence — D1 · Permissionless Agent Registration

## Merged PRs (SOW §6.1 D1 — "Merged PRs")

- FE promotion: https://github.com/ALGOREX-PH/Orizon-Agents-FE-Stellar/pull/33 — merged 2026-08-22T13:44Z, merge commit `5e5069a`
- BE promotion: https://github.com/ALGOREX-PH/Orizon-Agents-BE-Stellar/pull/30 — merged 2026-08-22T13:51Z, merge commit `27e96ff`
- Registration-flow PRs: added Fri 2026-09-11 with the 1.04/1.05 merge.

## Production parity verification (story 1.10 / BLO-119, 2026-09-07)

- `origin/main` tree byte-identical to the CI-validated `Update-2` tip in both repos
  (FE tree `1bf7f1a…`, BE tree `07b6dfb…`).
- FE deploy: GitHub Production deployment `6037384897` on `5e5069a` — state `success`,
  33 s after merge.
- BE deploy: Render autoDeploy from `main`; live `/openapi.json` serves the promoted
  schema (bounded withdrawal fields); `/api/health` and `/readiness` green.
- Live guards: `/api/pdax/health/deep` → 401 (API key armed) ·
  `/api/pdax/health` → `configured:true`.
- Full verification matrix: 15/15 PASS at 2026-09-07T03:42:29Z — health, readiness,
  12 seeded agents, kit decompose (6 steps / 0.168 USDC), mainnet network identity
  with all four contract ids, reputation params (floor 5500 / prior 7000), PDAX
  guard, dApp + security headers, proxy path, deployed-origin smoke suite
  ("all 6 checks passed"), FE deployment record, and live ref parity
  (FE `5e5069a`/`45d2e95`, BE `27e96ff`/`0c64765` — no delta).
  Procedure: see the *Production Promotion Runbook* project document in Linear.

## Registry split-brain closed (story 1.02 / BLO-12, 2026-09-07)

- The M1 exit criterion demonstrated live: the externally-registered agent
  `w1_audit_a7x` appears in `GET /api/agents` **3.0 s** after backend boot
  (sync pass runs at startup, then every 15 s; `POST /api/stellar/agents/sync`
  re-indexes on demand in 1.78 s; a successful `/api/stellar/submit` kicks a
  fire-and-forget pass so fresh registrations list within seconds).
- Payload carries the contracted provenance: `"source": "onchain"`, owner
  `GBI2…ADBH`, price 0.001 USDC (converted from 10,000 stroops), status
  online — while all 12 seeded agents remain `"source": "seeded"` and intact.
- Planner safety proven: the kit plan and the routability suite (4 tests)
  show indexed worker-less agents are marketplace-visible but never planned.

# 03 — Deliverable D1: Permissionless Agent Registration (testnet)

**SOW §6.1 D1:** *"an externally owned agent's registration tx hash on Stellar
Expert (testnet)"* — i.e. the marketplace accepts a registration from a wallet
that is **not** ours, permissionlessly, and the transaction is publicly
verifiable on testnet.

## Honest status: capability built and proven; the external-contributor capture is the one outstanding step

This is stated plainly rather than optimistically, because misrepresenting
evidence is itself a programme violation.

**What is DONE and verifiable:**
- The full permissionless registration path is built, hardened, deployed, and **proven on testnet with real transactions** (Epic 1, all stories — see `01`).
- The `AgentRegistry.register` path is genuinely open (no allow-list): audited in 1.01, indexed in 1.02, hardened in 1.03.
- The verifier tooling is built and works: `scripts/verify_registration.py` + `app/evidence.py`, plus the register success card's copy-evidence capture.
- The on-chain registry currently holds **4 real (non-seed) registrations**, read live from the deployed testnet `AgentRegistry` (`CAPHXWU5…`): `orizon_batch`, `w1_audit_a7x`, `sign_probe_bb5c12`, `Testing_Agent`.

**What is OUTSTANDING (the defining D1 artifact):**
- A registration by an **external contributor's** wallet (not a Blocksmiths key), captured with its friction log. In the 1.07 evidence index this is **"Row B"**, and it is **still blank**. The registrations on-chain today are developer/test runs.
- This is gated on the public testnet surface (1.11) being live and a chapter contributor running it — deliberately **non-fakeable**.

## Real testnet registration transaction (developer-run reference — story 1.05)

A genuine, permissionless registration signed from an operator wallet, live on
testnet Horizon. It proves the path end to end; it is **not** itself the
"externally owned" D1 artifact (that is Row B, above).

| Field | Value |
|-------|-------|
| Story | 1.05 ([BLO-15](https://linear.app/bl0cksmiths/issue/BLO-15)) |
| Tx hash | `416bea4f83e5afd9fc80e38c75ba4b1050031a2d590b0fe6232aa00d6a846393` |
| Stellar Expert | https://stellar.expert/explorer/testnet/tx/416bea4f83e5afd9fc80e38c75ba4b1050031a2d590b0fe6232aa00d6a846393 |
| Owner wallet | `GBI2I3WLMP2Q6L26G7CBKRPP5WJ6G3GGYJHWALOJ7D6EBRGL5OZAADBH` |
| Horizon | `successful: true`, ledger **4556564** |
| Timestamp | 2026-09-07T18:40:07Z (Week-1 Day 1) |
| Network | testnet |

Screenshot: [`screenshots/01-registration-tx-stellar-expert.png`](./screenshots/) · account: [`screenshots/03-registrant-account-stellar-expert.png`](./screenshots/).

## To fully close D1 (the remaining, non-fakeable step)

1. Confirm the public testnet surface is live (1.11 dashboard flip).
2. Have an external contributor register an agent from their own wallet.
3. Capture the tx hash + friction log → fill **Row B** of `docs/evidence/1.07-evidence-index.md`.

Until then, D1 is reported as **capability-complete, external capture pending** — not as done.

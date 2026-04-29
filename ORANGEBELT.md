# 🟠 Orange Belt — todo list

Action list for completing **Level 3 — Orange Belt** of the Stellar Composability Hackathon. The code work (Vitest setup + 5 unit tests + README updates) is in place; what's left is verify-locally, capture the test-output screenshot, record a 1-minute demo video, and submit.

> **Reviewer revisions across all three belts:** "Make folder name `contract` put inside there the smart contract" — already resolved. The four Soroban contracts live in `contract/` both at the FE root ([`/contract`](./contract)) and in the canonical contracts repo (`crates/` was renamed).

## What's already in place (code)

- ✅ **Vitest** installed as a dev dep + `vitest.config.ts` at repo root.
- ✅ **`npm test`** + **`npm run test:watch`** scripts in `package.json`.
- ✅ **5 unit tests** in `lib/wallet-errors.test.ts` covering the wallet-error classifier — all passing in <1 s.
- ✅ **Orange Belt** section added to `README.md` with the test command, requirements table, and screenshot reference.
- ✅ **`ORANGEBELT.md`** (this file) — actionable checklist.

## 1. Verify locally (~2 min)

- [ ] `npm install` → resolves cleanly (Vitest is a dev dep, no peer-dep conflicts)
- [ ] `npm test` → terminal shows:
  ```
  Test Files  1 passed (1)
       Tests  5 passed (5)
  ```
- [ ] All 5 test names visible in the output:
  - maps Freighter user-rejected message to user_rejected
  - maps Horizon tx_insufficient_balance to insufficient_balance
  - maps op_no_destination to a friendly 'destination doesn't exist' message
  - falls through to unknown for unmapped errors but preserves the raw message
  - treats wallet-extension-missing messages as wallet_not_found

## 2. Capture test-output screenshot (~2 min)

- [ ] Run `npm test` in a fresh terminal (so the output is clean).
- [ ] Snipping Tool (`Win+Shift+S`) → frame the **`RUN  v4.x.x` header** through the **`Tests  5 passed (5)`** summary line.
- [ ] Save as `public/tests-passing.png`.

> Make sure all 5 ✓ lines are visible — that's the proof the rubric wants.

## 3. Record the 1-minute demo video (~10 min, including takes)

The video has to fit **60 seconds**. Tight script:

| Time     | What to show                                                                                       |
| -------- | -------------------------------------------------------------------------------------------------- |
| 0:00–0:08 | Open `/app/orchestrator`, type `code a calculator web app`, click **Decompose ▸**                  |
| 0:08–0:20 | Click **Connect Wallet** → kit modal opens → pick Freighter → sign **Authorize & Execute**         |
| 0:20–0:38 | Trace page streams the workflow → final calculator artifact loads in the iframe                   |
| 0:38–0:48 | Click `view on stellar.expert` next to a `charge` receipt → on-chain tx visible                    |
| 0:48–0:55 | Quick flash of `/app/events` showing the `charge` and `seal` events live                           |
| 0:55–1:00 | `/app/wallet` showing the balance + connected state                                                 |

**Tools (pick one):**
- **Loom** (easiest) — https://loom.com → record screen → Loom auto-uploads → copy share link.
- **YouTube unlisted** — OBS or Windows Game Bar (`Win+Alt+R`) → record → upload to YouTube as **Unlisted** → copy URL.

- [ ] Recorded the clip (~60 s).
- [ ] Uploaded to a public URL.
- [ ] Copied the share/embed URL.

## 4. Pin the demo video URL in README (~1 min)

- [ ] Open `README.md` → find the **Orange Belt** section.
- [ ] Replace `https://youtu.be/REPLACE_WITH_YOUR_VIDEO_ID` with your real video URL.

## 5. Commit + push (~3 min)

The Vitest setup + tests + docs naturally split into three commits. That alone clears the **3+ meaningful commits** rubric (and you've got 50+ historical commits regardless).

```bash
cd ~/Websites-2026/orizon-agents-FE-Stellar

# 1 — Vitest scaffold (already done by Claude)
git add package.json package-lock.json vitest.config.ts
git commit -m "chore(orange-belt): add Vitest test runner"

# 2 — Tests
git add lib/wallet-errors.test.ts
git commit -m "test(orange-belt): unit tests for wallet error classifier"

# 3 — Screenshot + README + ORANGEBELT (after capturing screenshot + pasting video URL)
git add public/tests-passing.png README.md ORANGEBELT.md
git commit -m "docs(orange-belt): test output screenshot + demo video link"

git push origin main
```

## 6. Verify the deploy (~2 min)

- [ ] Wait ~60 s for Vercel to rebuild (the test runner shouldn't affect the production bundle).
- [ ] Open https://orizon-agents-fe-stellar.vercel.app — site still loads.
- [ ] Open the README on github.com — Orange Belt section renders + screenshot inline + demo video link clickable.
- [ ] Click the demo video link → it plays.

## 7. Submit (~1 min)

- [ ] Open the Orange Belt submission form.
- [ ] Paste: `https://github.com/ALGOREX-PH/Orizon-Agents-FE-Stellar`
- [ ] Submit before the monthly deadline.

---

## Requirements ↔ where it's implemented

| Orange Belt requirement | Status | File / location |
| --- | --- | --- |
| Mini-dApp fully functional | ✅ | live at `https://orizon-agents-fe-stellar.vercel.app` |
| **Minimum 3 tests passing** | ✅ | `lib/wallet-errors.test.ts` (5 tests) |
| Test runner installed | ✅ | `vitest@^4` + `vitest.config.ts` |
| `npm test` script | ✅ | `package.json` |
| README — complete documentation | ✅ | `README.md` (White + Yellow + Orange sections) |
| **Demo video (1 minute)** | ⚠️ pending | record + paste URL into README |
| Test-output screenshot | ⚠️ pending | `public/tests-passing.png` |
| **3+ meaningful commits** | ✅ | 50+ commits in log; 3 more from steps 5 above |
| Live demo link in README | ✅ | https://orizon-agents-fe-stellar.vercel.app |
| Reviewer revision: `contract/` folder | ✅ | resolved across all 3 belts |

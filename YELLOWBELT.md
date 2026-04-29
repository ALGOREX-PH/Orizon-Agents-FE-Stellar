# 🟡 Yellow Belt — todo list

Action list for completing **Level 2 — Yellow Belt** of the Stellar Composability Hackathon. The code work is in place; what's left is verify-in-the-browser, capture screenshots, push commits, submit.

## What's already in place (code)

- ✅ **StellarWalletsKit** (`lib/wallet.tsx`) — multi-wallet modal: Freighter, xBull, Albedo, LOBSTR, Hana, Hot Wallet.
- ✅ **3 explicit error types** (`lib/wallet-errors.ts`):
  1. `wallet_not_found` — friendly "No wallet detected" + install link.
  2. `user_rejected` — friendly "Signature cancelled".
  3. `insufficient_balance` — mapped from Horizon `tx_insufficient_balance` / `op_underfunded`.
- ✅ **Tx status lifecycle** (`components/ui/tx-status.tsx`) — Build → Sign → Broadcast → Pending → Confirmed (or Failed).
- ✅ **Live Soroban event feed** at `/app/events` (`lib/stellar-events.ts` polls RPC `getEvents` every 5 s).
- ✅ **Contract folder rename** — `crates/` → `contract/` in the smart-contract repo (reviewer revision).
- ✅ **Monorepo snapshot** — `/contract/` and `/backend/` mirrored into this repo so the full stack is visible in one place. (Folder name is **singular `contract`** per the White-Belt reviewer revision.)

## 1. Verify locally (~10 min)

- [ ] Backend running: in `backend/` → `./run.sh`
- [ ] Frontend running: in repo root → `npm install` (one-time, picks up `@creit.tech/stellar-wallets-kit`) → `npm run dev`
- [ ] Open http://localhost:3000/app
- [ ] Click **Connect Wallet** — confirm a **modal pops up with multiple wallet options** (Freighter, xBull, Albedo, LOBSTR, Hana, Hot Wallet)
- [ ] Pick **Freighter** → approve on Test Net → topbar shows the wallet name + balance
- [ ] Disconnect (click the address chip) → modal-ready state again

## 2. Trigger each of the 3 error types (~5 min)

- [ ] **Wallet not found:** open the dApp in a browser without any Stellar wallet extension installed (or use a fresh Chrome profile) → click Connect Wallet → modal shows "No wallets detected" or install links → if you click outside the modal, the friendly `wallet_not_found` state appears (red banner, not a raw error).
- [ ] **User rejected:** on `/app/send`, fill in destination + 1 XLM → click **Send XLM** → in the Freighter popup, **click Reject** → the failed card shows **"Signature cancelled"** (not the raw Freighter message).
- [ ] **Insufficient balance:** on `/app/send`, type an amount **greater than your balance** → submit blocked client-side with `amount exceeds balance`. *Optional advanced check:* set the amount equal to balance + 0.0001 (just under client guard), submit → Horizon rejects → red card shows **"Insufficient XLM balance"** (mapped from `tx_insufficient_balance`).

## 3. Verify the live event feed (~3 min)

- [ ] Open `/app/events` — within ~10 s the topbar shows **`live`** + `last poll: Ns ago` and the latest ledger #.
- [ ] In a second tab, open `/app/orchestrator` → run `code a calculator web app` → Authorize & Execute.
- [ ] Switch back to `/app/events` — within 5 s of the workflow's charge + seal, **`charge` and `seal` events appear** at the top of the feed with `tx ▸ <hash>` links to `stellar.expert`.

## 4. Verify TxStatus lifecycle (~2 min)

- [ ] On `/app/send`, send 0.5 XLM to a fresh address — watch the lifecycle dots animate: **Build** (cyan) → **Sign** (violet, pulsing) → **Broadcast** → **Pending** → **Confirmed** (green) with the success card + tx hash + stellar.expert link.
- [ ] Repeat with a forced failure (cancel in Freighter) — dots stop, red `failed` card with the friendly error appears, **`reset`** button clears it.

## 5. Capture 3 screenshots (~5 min)

Save into `public/`:

- [ ] `wallet-options.png` — the **StellarWalletsKit modal** open with multiple wallet options visible.
- [ ] `events-feed.png` — `/app/events` showing **at least one `charge` or `seal` event** with the `live` badge.
- [ ] `tx-status.png` — `/app/send` mid-flow with the **lifecycle dots visible** (or right after success).

> WSL tip: Windows Snipping Tool (`Win+Shift+S`) → save into `\\wsl$\…\public\`.

## 6. Pin a sample contract-call tx hash in the README (~2 min)

- [ ] After a successful Authorize & Execute on `/app/orchestrator`, copy the `charge` tx hash from the trace.
- [ ] In `README.md`, find the line `> **Sample contract-call tx hash**` (under "Yellow Belt — multi-wallet, events, status") and replace it with:

```markdown
> **Sample contract-call tx hash:** [`<your-hash>`](https://stellar.expert/explorer/testnet/tx/<your-hash>) — `PaymentEscrow.charge`, settled on testnet.
```

## 7. Commit + push (~3 min)

The Yellow Belt work spans two logical commits — that already satisfies the **2+ meaningful commits** requirement.

```bash
cd ~/Websites-2026/orizon-agents-FE-Stellar

# Commit 1 — multi-wallet, errors, events, txstatus
git add lib/wallet.tsx \
        lib/wallet-errors.ts \
        lib/stellar-events.ts \
        components/ui/connect-wallet.tsx \
        components/ui/tx-status.tsx \
        app/app/_components/sidebar.tsx \
        app/app/_components/topbar.tsx \
        app/app/orchestrator/page.tsx \
        app/app/send/page.tsx \
        app/app/events/page.tsx \
        package.json package-lock.json

git commit -m "feat(yellow-belt): multi-wallet kit, 3 error types, live events, tx status"

# Commit 2 — monorepo snapshot + README + screenshots + YELLOWBELT
git add contract/ backend/ .gitignore \
        public/wallet-options.png \
        public/events-feed.png \
        public/tx-status.png \
        README.md \
        YELLOWBELT.md

git commit -m "chore(yellow-belt): monorepo snapshot + README + screenshots"

git push origin main
```

In the **contracts repo** (separate push):

```bash
cd ~/Contracts-2026/orizon-agents-Smart-Contract-Stellar
git add Cargo.toml README.md
# the rename is already staged via git mv; just confirm:
git status
git commit -m "chore: rename crates/ → contract/ (yellow-belt revision)"
git push origin main
```

## 8. Verify the deploy (~3 min)

- [ ] Wait ~60 s for Vercel.
- [ ] Open https://orizon-agents-fe-stellar.vercel.app/app/events → page loads, badge goes `live`.
- [ ] https://orizon-agents-fe-stellar.vercel.app/app/orchestrator → modal opens with multiple wallet options.
- [ ] README on github.com renders the new section with all three Yellow-Belt screenshots.

## 9. Submit (~1 min)

- [ ] Open the hackathon Yellow Belt submission form.
- [ ] Paste: `https://github.com/ALGOREX-PH/Orizon-Agents-FE-Stellar`
- [ ] Submit before the monthly deadline.

---

## Requirements ↔ where it's implemented

| Yellow Belt requirement | Status | File / location |
| --- | --- | --- |
| StellarWalletsKit (multi-wallet) | ✅ | `lib/wallet.tsx` |
| Error: wallet not found | ✅ | `lib/wallet-errors.ts` (`wallet_not_found`) |
| Error: user rejected sign | ✅ | `lib/wallet-errors.ts` (`user_rejected`) |
| Error: insufficient balance | ✅ | `lib/wallet-errors.ts` (`insufficient_balance`) |
| Contract deployed on testnet | ✅ | `contracts/addresses.json`, `README.md#testnet-deployment` |
| Contract called from FE | ✅ | `app/app/orchestrator/page.tsx` (PaymentEscrow.authorize) |
| Read + write contract data | ✅ | reads via `getEvents` (`/app/events`) + REST; writes via signed XDR |
| Event listening + state sync | ✅ | `lib/stellar-events.ts` + `app/app/events/page.tsx` |
| Tx status (pending/success/fail) | ✅ | `components/ui/tx-status.tsx` |
| 2+ meaningful commits | ⚠️ pending push | see step 7 |
| Folder named `contract` (reviewer revision) | ✅ | `contracts/contract/` (mirror) + canonical contracts repo `contract/` |
| README — wallet-options screenshot | ⚠️ pending | `public/wallet-options.png` |
| README — events-feed screenshot | ⚠️ pending | `public/events-feed.png` |
| README — tx-status screenshot | ⚠️ pending | `public/tx-status.png` |
| README — deployed contract address | ✅ | `README.md#testnet-deployment` |
| README — contract-call tx hash | ⚠️ pending | step 6 above |

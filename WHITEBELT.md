# 🥋 White Belt — todo list

Action list for completing **Level 1 — White Belt** of the Stellar Composability Hackathon. Code is in place; this is the manual verification + capture + submit work.

> **Reviewer revisions (resolved):**
>
> - **Revision 1** — _Folder name "contract" with the smart contract inside._ Smart contracts now live in `contract/` both in this repo at [`/contract`](./contract) and in the canonical contracts repo (`crates/` was renamed to `contract/`).
> - **Revision 2** — _Add the deployed contract on your README._ The four Soroban contract addresses are now in a prominent `## 📜 Deployed contracts (Stellar testnet)` section right under the Live Deployment banner at the top of the README — no scrolling required. Each address links to `stellar.expert/explorer/testnet/contract/<id>`.

## 0. Sanity-check the revisions (~1 min)

- [ ] `ls contract/` — should list the four Soroban contracts (`agent-registry`, `attestation-registry`, `payment-escrow`, `reputation-ledger`, `shared`) plus `Cargo.toml`, `Makefile`, `README.md`, `addresses.json`, `scripts/`.
- [ ] `ls contracts 2>/dev/null` — should output nothing (the old plural folder no longer exists).
- [ ] Open `README.md` — within the first 40 lines, the `## 📜 Deployed contracts (Stellar testnet)` table is visible with all 4 contract IDs + Asset SAC.
- [ ] Click any address in that table — it should open the `stellar.expert` page for that contract on testnet.

## 1. Verify locally (~5 min)

- [ ] Start the BE: in `~/Websites-2026/orizon-agents-FE-Stellar/backend` → `./run.sh`  *(or the canonical `~/Websites-Services-2026/orizon-agents-BE-Stellar`)*
- [ ] Start the FE: in repo root → `npm run dev`
- [ ] Open http://localhost:3000/app
- [ ] Click **Connect Wallet** → pick **Freighter** in the StellarWalletsKit modal → approve on **Test Net**
- [ ] Confirm topbar shows your XLM balance (e.g. `9999.9999 XLM`)
- [ ] Visit `/app/wallet` — the big balance card should appear above the contracts grid
- [ ] Click **↻ refresh** — number should re-fetch
- [ ] If you don't have testnet XLM yet, click **▸ fund testnet** on the wallet card and friendbot your address

## 2. Send a real testnet payment (~3 min)

- [ ] Generate a second testnet address you own (Freighter → "Add account" → fund via friendbot) — this is your destination
- [ ] In your dApp, click **Send XLM** in the sidebar
- [ ] Paste the destination address, amount `1`, memo `White Belt`
- [ ] Click **Send XLM ▸**, sign in Freighter
- [ ] Confirm the green success card shows the tx hash
- [ ] Click **view on stellar.expert ▸** — that page should load and show the transaction
- [ ] Confirm topbar balance dropped by ~1 XLM

## 3. Capture 4 screenshots (~5 min)

Save into `~/Websites-2026/orizon-agents-FE-Stellar/public/` with these exact filenames:

- [ ] `wallet-connected.png` — topbar with your address chip + balance visible
- [ ] `balance.png` — full `/app/wallet` page with the balance card
- [ ] `send-success.png` — `/app/send` after a successful send (success card + hash)
- [ ] `stellar-expert.png` — the `stellar.expert/explorer/testnet/tx/<hash>` page for that send

> 💡 **WSL tip:** use Windows Snipping Tool (`Win+Shift+S`), save to `\\wsl$\...public\`. After each save, run `ls public/` to confirm it landed.

## 4. Commit + push (~3 min)

The folder rename + README updates count as one meaningful commit; the screenshots are another.

```bash
cd ~/Websites-2026/orizon-agents-FE-Stellar

# Commit 1 — folder rename + path updates
git add contract/ .gitignore README.md WHITEBELT.md YELLOWBELT.md
# old contracts/ folder is removed automatically by `git mv` history; verify with:
git status

git commit -m "chore: rename contracts/ → contract/ (white-belt reviewer revision)"

# Commit 2 — screenshots (after capturing them in step 3)
git add public/wallet-connected.png \
        public/balance.png \
        public/send-success.png \
        public/stellar-expert.png
git commit -m "docs: white-belt screenshots — wallet, balance, send, stellar.expert"

git push origin main
```

> If `git status` shows `contracts/` as deleted but the files weren't moved into git's index of `contract/`, run `git add -A` once to let git pick up the rename automatically.

## 5. Verify the deploy (~3 min)

- [ ] Wait ~60 s for Vercel to redeploy
- [ ] Open https://orizon-agents-fe-stellar.vercel.app/app/send → page loads
- [ ] Connect a wallet via the StellarWalletsKit modal (you'll need to re-approve once on the production origin)
- [ ] Confirm the four screenshots render in the README on github.com
- [ ] Confirm the `contract/` link in the Repositories table works (clicks through to the folder)

## 6. Submit (~1 min)

- [ ] Open the hackathon White Belt **revision** form (or reply to the reviewer)
- [ ] Paste: `https://github.com/ALGOREX-PH/Orizon-Agents-FE-Stellar`
- [ ] Mention the revision: "Folder is now named `contract/` per the reviewer note. Smart contracts live there in both this repo and the canonical contracts repo."
- [ ] Submit before the monthly deadline

---

**Total time:** ~20 min if friendbot cooperates. Most of it is just capturing the four screenshots cleanly.

## Requirements ↔ where it's implemented

| White Belt requirement | Status | File / location |
| --- | --- | --- |
| **Reviewer revision: folder named `contract`** | ✅ | [`./contract`](./contract) (FE snapshot) + canonical contracts repo `contract/` |
| Freighter wallet | ✅ | `lib/wallet.tsx` (via StellarWalletsKit) |
| Stellar Testnet | ✅ | enforced via `Networks.TESTNET` + wrong-net warning |
| Connect functionality | ✅ | `components/ui/connect-wallet.tsx` (multi-wallet modal) |
| Disconnect functionality | ✅ | click address chip in topbar |
| Fetch XLM balance | ✅ | `lib/wallet.tsx` → Horizon `/accounts/{g}` |
| Display balance | ✅ | topbar live + `/app/wallet` card |
| Send XLM transaction | ✅ | `/app/send` — `Operation.payment` |
| Tx success/failure feedback | ✅ | green success card / red error card on `/app/send` |
| Tx hash + explorer link | ✅ | success card → `stellar.expert/explorer/testnet/tx/<hash>` |
| README — description | ✅ | `README.md` |
| README — setup instructions | ✅ | `README.md` → "Local setup" |
| README — wallet-connected screenshot | ⚠️ pending | `public/wallet-connected.png` |
| README — balance screenshot | ⚠️ pending | `public/balance.png` |
| README — successful tx screenshot | ⚠️ pending | `public/send-success.png` |
| README — tx result screenshot | ⚠️ pending | `public/stellar-expert.png` |

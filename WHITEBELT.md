# 🥋 White Belt — todo list

Action list for completing **Level 1 — White Belt** of the Stellar Composability Hackathon. Code is in place; this is the manual verification + capture + submit work.

## 1. Verify locally (~5 min)

- [ ] Start the BE: in `~/Websites-Services-2026/orizon-agents-BE-Stellar` → `./run.sh`
- [ ] Start the FE: in `~/Websites-2026/orizon-agents-FE-Stellar` → `npm run dev`
- [ ] Open http://localhost:3000/app
- [ ] Click **Connect Wallet** → approve in Freighter on **Test Net**
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

## 4. Commit + push (~2 min)

```bash
cd ~/Websites-2026/orizon-agents-FE-Stellar
git add lib/wallet.tsx \
        app/app/_components/topbar.tsx \
        app/app/_components/sidebar.tsx \
        app/app/wallet/page.tsx \
        app/app/send/page.tsx \
        public/wallet-connected.png \
        public/balance.png \
        public/send-success.png \
        public/stellar-expert.png \
        README.md \
        WHITEBELT.md
git commit -m "feat: white-belt — XLM balance + send page + screenshots"
git push origin main
```

## 5. Verify the deploy (~3 min)

- [ ] Wait ~60s for Vercel to redeploy
- [ ] Open https://orizon-agents-fe-stellar.vercel.app/app/send → page loads
- [ ] Connect Freighter (you'll need to re-approve once on the production origin)
- [ ] Confirm the four screenshots render in the README on github.com

## 6. Submit (~1 min)

- [ ] Open the hackathon submission form
- [ ] Paste: `https://github.com/ALGOREX-PH/Orizon-Agents-FE-Stellar`
- [ ] Submit before the monthly deadline

---

**Total time:** ~20 min if friendbot cooperates. Most of it is just capturing the four screenshots cleanly.

## Requirements ↔ where it's implemented

| White Belt requirement | Status | File / location |
| --- | --- | --- |
| Freighter wallet | ✅ | `lib/wallet.tsx` |
| Stellar Testnet | ✅ | enforced via `Networks.TESTNET` + wrong-net warning |
| Connect functionality | ✅ | `components/ui/connect-wallet.tsx` |
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

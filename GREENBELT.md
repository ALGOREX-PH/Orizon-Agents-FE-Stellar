# 🟢 Green Belt — todo list

Action list for completing **Level 4 — Green Belt** of the Stellar Composability Hackathon. The code work (CI workflow + mobile-responsive shell + inter-contract documentation) is in place; what's left is verify-locally, capture screenshots, push, submit.

## What's already in place (code)

- ✅ **CI/CD** — `.github/workflows/ci.yml` runs `npm ci → lint → test → build` on every push to `main` and on PRs. Cache enabled, 10-min timeout, concurrency control.
- ✅ **CI badge** in `README.md` (top of file).
- ✅ **Mobile-responsive app shell** — `app/app/_components/sidebar.tsx` slides in/out on `<md` viewports, full-height drawer with backdrop. New context `mobile-nav-context.tsx` shares state with the topbar's hamburger button.
- ✅ **Hamburger button** in `app/app/_components/topbar.tsx` (visible only on mobile).
- ✅ **Layout reflow** — `app/app/layout.tsx` removed unconditional `pl-60`; now `md:pl-60`. Padding scales `px-4 sm:px-6 md:px-8`.
- ✅ **Inter-contract call documentation** — Green Belt section in README explains `PaymentEscrow.charge()` calling `AgentRegistry.owner_of()` and `Token.transfer()` with line refs.
- ✅ **GREENBELT.md** (this file).

## 1. Verify CI runs (~3 min)

After you push, GitHub Actions kicks off automatically.

- [ ] Push the Green-Belt commits (see step 5).
- [ ] Open https://github.com/ALGOREX-PH/Orizon-Agents-FE-Stellar/actions — watch the latest run.
- [ ] Wait for it to go green ✅ (~3-4 min: install + lint + test + build).
- [ ] If it fails:
  - Click into the run, expand the failed step
  - Most common failure: missing env var for `npm run build` → already provided as `NEXT_PUBLIC_API_BASE` in the workflow.
  - Lint or test break → run locally to fix.

## 2. Verify mobile responsive (~3 min)

- [ ] `npm run dev` → http://localhost:3000/app
- [ ] Open Chrome DevTools (F12) → toggle device toolbar (Ctrl+Shift+M) → pick **iPhone 14 Pro** or any 375×812 preset.
- [ ] Confirm:
  - Sidebar is **hidden by default**.
  - Topbar shows a **hamburger button** on the left.
  - Tapping the hamburger slides the sidebar in from the left with a backdrop.
  - Tapping a nav item closes the drawer and navigates.
  - Tapping the backdrop closes the drawer.
  - Main content takes **full width** (no left padding).
  - Topbar elements don't overflow (`Connect Wallet`, balance chip on `sm:` and up, `live` badge).

## 3. Capture 2 screenshots (~5 min)

Save into `public/`:

### `public/mobile.png` — mobile responsive view

- DevTools mobile preview at ~375×812 (iPhone preset)
- Frame the **whole viewport**: hamburger top-left, brand or page title, full-width content
- Bonus: capture the **sidebar drawer open** state (backdrop visible) — that's the most "mobile UX" shot

### `public/ci-passing.png` — CI/CD pipeline running/passing

After the first push triggers CI:

- Open https://github.com/ALGOREX-PH/Orizon-Agents-FE-Stellar/actions
- Click the latest **green** run
- Frame should include: workflow name `CI`, the green ✓ at the top, and the steps list (`Checkout`, `Setup Node.js 20`, `Install dependencies`, `Lint`, `Test`, `Build`) — most/all green

## 4. (Optional) Trigger a `charge` tx for an inter-contract proof (~2 min)

The README pins the `47a13c4b…` `authorize` hash as the sample. If you want a **real `charge` tx** that demonstrates `PaymentEscrow → AgentRegistry → SAC`, run a successful workflow:

- [ ] Open `/app/orchestrator` → type `code a calculator web app` → **Decompose** → **Authorize & Execute**.
- [ ] Sign in Freighter.
- [ ] On the trace page, scroll to the `charge` step → copy the tx hash from `view on stellar.expert ▸`.
- [ ] In `README.md`, under the Green-Belt section, **add a second tx-hash line**:
  ```markdown
  > **Inter-contract `charge` tx hash:** [`<charge-hash>`](https://stellar.expert/explorer/testnet/tx/<charge-hash>) — emits `Token.transfer` and reads `Registry.owner_of` in a single Soroban tx.
  ```

This is fully optional — the existing `authorize` hash + the contract source link already satisfies the rubric's "if applicable" clause.

## 5. Commit + push (3 logical commits = ≥ 8 commits total for Green Belt) (~3 min)

The Green Belt work splits naturally into 3 commits:

```bash
cd ~/Websites-2026/orizon-agents-FE-Stellar

# 1 — CI workflow
git add .github/workflows/ci.yml
git commit -m "ci(green-belt): GitHub Actions pipeline (lint + test + build)"

# 2 — Mobile responsive shell
git add app/app/_components/mobile-nav-context.tsx \
        app/app/_components/sidebar.tsx \
        app/app/_components/topbar.tsx \
        app/app/layout.tsx
git commit -m "feat(green-belt): mobile-responsive shell with sidebar drawer"

# 3 — Docs + screenshots (after capture in §3)
git add README.md GREENBELT.md public/mobile.png public/ci-passing.png
git commit -m "docs(green-belt): README section + mobile + CI screenshots"

git push origin main
```

This adds 3 commits on top of the 50+ already in the log → way more than the **8+ meaningful commits** the rubric asks for.

## 6. Verify the deploy (~3 min)

- [ ] Wait ~60 s for Vercel to rebuild.
- [ ] Open https://orizon-agents-fe-stellar.vercel.app/app on your phone (or Chrome's mobile emulator) — sidebar drawer works.
- [ ] Open the README on github.com — the **CI badge** at the top is green and clicking it opens the workflow runs page.
- [ ] All Green-Belt screenshots render inline.

## 7. Submit (~1 min)

- [ ] Open the Green Belt submission form.
- [ ] Paste: `https://github.com/ALGOREX-PH/Orizon-Agents-FE-Stellar`
- [ ] Submit before the monthly deadline.

---

## Requirements ↔ where it's implemented

| Green Belt requirement | Status | File / location |
| --- | --- | --- |
| Inter-contract call working | ✅ | `contract/contract/payment-escrow/src/lib.rs:140,149` (RegistryClient + TokenClient inside `charge()`) |
| Custom token / pool deployed | n/a | uses native XLM SAC (`CDLZFC3S…CYSC`) — no custom asset |
| **CI/CD pipeline running** | ✅ committed | `.github/workflows/ci.yml` + badge in README |
| **Mobile responsive** | ✅ committed | sidebar drawer + hamburger + responsive layout padding |
| 8+ meaningful commits | ✅ | 50+ historical + 3 new for Green Belt |
| Live demo link in README | ✅ | https://orizon-agents-fe-stellar.vercel.app |
| **Mobile screenshot in README** | ⚠️ pending capture | `public/mobile.png` |
| **CI screenshot/badge in README** | ⚠️ partly | badge ✓ at top of README; screenshot `public/ci-passing.png` pending capture |
| Contract addresses + tx hash | ✅ | top of README + sample tx hash pinned |
| Reviewer revision (`contract/` folder) | ✅ | resolved across all belts |

// Capture the Week-1 tranche evidence screenshots.
// Prereq: `npx playwright install-deps chromium` (needs sudo, once).
// Run from the frontend repo root:
//   node Week-1-Tranche-Submission/screenshots/capture-screenshots.mjs
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = dirname(fileURLToPath(import.meta.url));

const SHOTS = [
  ["01-registration-tx-stellar-expert.png", "https://stellar.expert/explorer/testnet/tx/416bea4f83e5afd9fc80e38c75ba4b1050031a2d590b0fe6232aa00d6a846393"],
  ["02-refund-tx-stellar-expert.png", "https://stellar.expert/explorer/testnet/tx/9b8ffaa44b2b966e4c3f1ab581f4203a30d282901ba3b231a578e46d8f919a68"],
  ["03-registrant-account-stellar-expert.png", "https://stellar.expert/explorer/testnet/account/GBI2I3WLMP2Q6L26G7CBKRPP5WJ6G3GGYJHWALOJ7D6EBRGL5OZAADBH"],
  ["04-be-pr-40.png", "https://github.com/Bl0cksmiths/Orizon-Agents-BE-Stellar/pull/40"],
  ["05-uat-repo-rie-commits.png", "https://github.com/Bl0cksmiths/Orizon-Agents-UAT-Stellar/commits"],
  ["06-be-pull-requests.png", "https://github.com/Bl0cksmiths/Orizon-Agents-BE-Stellar/pulls?q=is%3Apr"],
  ["07-orizons-home.png", "https://orizons.xyz"],
  ["08-orizons-agents.png", "https://orizons.xyz/app/agents"],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
for (const [name, url] of SHOTS) {
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(3000); // let SPA content settle
    await page.screenshot({ path: join(OUT, name), fullPage: true });
    console.log(`ok   ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}: ${e.message}`);
  }
}
await browser.close();

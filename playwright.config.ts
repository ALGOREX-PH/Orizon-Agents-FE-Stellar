import { defineConfig, devices } from "@playwright/test";

/**
 * Minimal E2E smoke suite. Runs against `next dev` (no build needed); every
 * /api/* call is route-intercepted in the specs, so no backend — and no
 * NEXT_PUBLIC_API_BASE — is required.
 */
export default defineConfig({
  testDir: "e2e",
  // First on-demand compile of a route under `next dev` can be slow.
  timeout: 120_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npx next dev",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

import type { Page, Route } from "@playwright/test";

/**
 * Mock payloads shaped to satisfy lib/guards.ts (isOverview, isTaskList,
 * isDecomposeResponse) so lib/api.ts accepts them exactly like real backend
 * responses. Values are chosen to be distinctive so specs can assert them.
 */

export const mockOverview = {
  agents_online: 2481,
  tasks_per_sec: 1.234,
  avg_completion: 0.984,
  avg_trust: 4.87,
  throughput: [12, 18, 9, 22, 30, 25, 14, 19, 27, 31, 24, 16],
  skills: [
    { name: "code", pct: 42, tone: "violet" },
    { name: "design", pct: 31, tone: "cyan" },
    { name: "research", pct: 27, tone: "magenta" },
  ],
};

export const mockTasks = [
  {
    id: "task_e2e_001",
    intent: "build a landing page for pulse ai",
    agents: 3,
    spent: 0.166,
    status: "complete",
    started: "2026-07-27 10:00",
  },
  {
    id: "task_e2e_002",
    intent: "audit the escrow contract",
    agents: 2,
    spent: 0.045,
    status: "running",
    started: "2026-07-27 10:05",
  },
];

export const mockPlan = {
  plan_id: "plan_e2e_1",
  intent: "code a calculator web app",
  steps: [
    {
      agent_id: "seo.brief",
      agent_name: "seo.brief",
      rationale: "outline requirements and keywords",
      est_price_usdc: 0.009,
      est_eta_seconds: 1.2,
    },
    {
      agent_id: "design.figma",
      agent_name: "design.figma",
      rationale: "produce the interface layout",
      est_price_usdc: 0.048,
      est_eta_seconds: 2.4,
    },
    {
      agent_id: "code.next",
      agent_name: "code.next",
      rationale: "implement and wire up the app",
      est_price_usdc: 0.066,
      est_eta_seconds: 3.1,
    },
  ],
  total_usdc: 0.123,
  total_eta: 6.7,
};

function json(route: Route, body: unknown) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

/**
 * Intercepts every /api/* request the app can make (all data fetching is
 * client-side and /api is a pure rewrite proxy, so this catches everything)
 * and fulfills it with mocked JSON — no backend needed.
 */
/**
 * Shapes copied from the live backend. They exist because the runtime guards
 * in lib/guards.ts now reject the catch-all `{}` below — a spec that visits
 * /app/flow or /app/reputation would otherwise land in an error state and look
 * like a product bug rather than a missing fixture.
 */
export const mockFlow = {
  nodes: [
    { id: "in", label: "intent", sub: "user input", x: 4, y: 50 },
    { id: "seo", label: "seo.brief", sub: "research", x: 26, y: 22 },
    { id: "copy", label: "copywrite.v3", sub: "content", x: 50, y: 22 },
    { id: "out", label: "artifact", sub: "delivered", x: 92, y: 50 },
  ],
  edges: [
    ["in", "seo"],
    ["seo", "copy"],
    ["copy", "out"],
  ],
};

export const mockReputationParams = {
  enabled: true,
  prior_bps: 7000,
  prior_weight_usdc: 12.0,
  floor_bps: 5500,
  max_rating_weight_usdc: 100.0,
  read_ttl_seconds: 15.0,
  wilson_z: 1.0,
  epoch_seconds: 604800,
  decay_bps_per_epoch: 9250,
  max_decay_epochs: 96,
  contract_id: "CDFWQJY72GPH7PEQVFGBDZESZNVRF6LQLVWU42CFMWPGRME5RWN5AXSX",
  network: "mainnet",
};

/**
 * Fails every `/api/*` call the way the production outage did: a 404 carrying
 * the backend's real error envelope. This is deliberately indistinguishable
 * from a healthy backend behind a misconfigured proxy — the exact condition
 * that ran unnoticed in production for days.
 */
export async function mockApiOutage(page: Page): Promise<void> {
  await page.route("**/api/**", (route) =>
    route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({
        detail: "Not Found",
        error: {
          code: "not_found",
          message: "Not Found",
          request_id: "e2e0000000000000",
        },
      }),
    }),
  );
}

export async function mockApi(page: Page): Promise<void> {
  await page.route("**/api/**", (route) => {
    const { pathname } = new URL(route.request().url());
    const method = route.request().method();

    if (method === "GET" && pathname === "/api/metrics/overview") {
      return json(route, mockOverview);
    }
    if (method === "GET" && pathname === "/api/tasks") {
      return json(route, mockTasks);
    }
    if (method === "POST" && pathname === "/api/orchestrator/decompose") {
      return json(route, mockPlan);
    }
    if (method === "GET" && pathname === "/api/agents") {
      return json(route, []);
    }
    // Anything else gets an empty-but-valid JSON body so stray fetches
    // resolve instead of hanging or erroring.
    return json(route, {});
  });
}

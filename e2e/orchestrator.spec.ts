import { test, expect } from "@playwright/test";
import { mockApi, mockPlan } from "./mocks";

test.describe("orchestrator", () => {
  test("/app/orchestrator decomposes an intent into a mocked 3-step plan", async ({
    page,
  }) => {
    await mockApi(page);
    await page.goto("/app/orchestrator");

    // Type an intent and submit decompose.
    await page
      .getByRole("textbox", { name: /intent/i })
      .fill("code a calculator web app");
    await page.getByRole("button", { name: /decompos/i }).click();

    // The mocked POST /api/orchestrator/decompose plan renders 3 step rows.
    const steps = page.locator("ol").getByRole("listitem");
    await expect(steps).toHaveCount(mockPlan.steps.length);
    for (const step of mockPlan.steps) {
      await expect(steps.filter({ hasText: step.agent_id })).toBeVisible();
    }

    // The mocked total appears ("0.123 USDC").
    await expect(
      page.getByText(`${mockPlan.total_usdc.toFixed(3)} USDC`).first(),
    ).toBeVisible();

    // story 3.02 — the reputation-floor block explains the plan's shape and
    // the affected steps carry inline marks, never a silent reshuffle.
    await expect(page.getByText(/reputation floor/i)).toBeVisible();
    for (const notice of mockPlan.notices) {
      await expect(page.getByText(notice.reason)).toBeVisible();
    }
    await expect(steps.filter({ hasText: "⇄ for vision.ocr" })).toBeVisible();
    await expect(steps.filter({ hasText: "▾ below floor" })).toBeVisible();
  });
});

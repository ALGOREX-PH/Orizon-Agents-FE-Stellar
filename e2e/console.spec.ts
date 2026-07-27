import { test, expect } from "@playwright/test";
import { mockApi, mockOverview, mockTasks } from "./mocks";

test.describe("console overview", () => {
  test("/app renders sidebar nav, mocked metrics, and recent tasks", async ({
    page,
  }) => {
    await mockApi(page);
    await page.goto("/app");

    // Sidebar navigation renders its workspace items.
    const sidebar = page.locator("aside");
    for (const label of ["Overview", "Agents", "Orchestrator", "Trace"]) {
      await expect(
        sidebar.getByRole("link", { name: label, exact: true }),
      ).toBeVisible();
    }

    // Metric cards resolve against the mocked GET /api/metrics/overview.
    // agents_online renders localized ("2,481") in a metric card (and again
    // in the sidebar footer, hence first()); tasks_per_sec renders "1.234".
    await expect(
      page
        .getByText(mockOverview.agents_online.toLocaleString("en-US"))
        .first(),
    ).toBeVisible();
    await expect(
      page.getByText(mockOverview.tasks_per_sec.toFixed(3)).first(),
    ).toBeVisible();

    // Recent-tasks table shows a mocked task id.
    await expect(page.getByText(mockTasks[0].id)).toBeVisible();
  });
});

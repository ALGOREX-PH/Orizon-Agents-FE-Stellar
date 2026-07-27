import { test, expect } from "@playwright/test";
import { mockApi } from "./mocks";

test.describe("marketing page", () => {
  test("/ renders hero, nav, JSON-LD, and stays free of console errors", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await mockApi(page);
    await page.goto("/");

    // Hero heading — assert the landmark, not the exact copy.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Top navigation is present (first() — a hidden mobile menu nav may
    // also live in the header).
    await expect(page.locator("header nav").first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: /launch app/i }),
    ).toBeVisible();

    // Structured data ships as static HTML.
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).not.toHaveCount(0);
    expect(await jsonLd.first().textContent()).toContain("Orizon Agents");

    // No console errors, ignoring favicon/network noise (e.g. analytics
    // scripts or resources unreachable in a sandboxed run).
    const NOISE =
      /favicon|failed to load resource|net::err|err_(name_not_resolved|internet_disconnected|connection)/i;
    expect(consoleErrors.filter((e) => !NOISE.test(e))).toEqual([]);
  });
});

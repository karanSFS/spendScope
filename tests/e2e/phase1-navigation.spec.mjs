import { test, expect } from "@playwright/test";

test.describe("Phase 1 Foundation & Guest Mode Shell", () => {
  test("Landing page allows instant Continue as Guest entry and clean navigation across all routes without horizontal overflow", async ({
    page,
  }) => {
    const consoleErrors = [];
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Calm Control Over/i }),
    ).toBeVisible();

    // No horizontal overflow on Landing
    const landingOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(landingOverflow).toBe(false);

    // Click Continue as Guest
    await page
      .getByRole("button", { name: /Continue as Guest/i })
      .first()
      .click();
    await page.waitForURL("**/dashboard");

    // Verify all primary routes resolve cleanly
    const routes = [
      "/dashboard",
      "/transactions",
      "/analytics",
      "/spend-bucket",
      "/categories",
      "/calculators",
      "/settings",
      "/privacy-policy",
    ];

    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(400);
      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(hasHorizontalOverflow).toBe(false);
    }

    // Legacy route redirects preserve query params
    await page.goto("/calculators-m/calculating?type=emi-calculator&category=emi");
    await page.waitForURL("**/calculators?type=emi-calculator&category=emi");

    expect(consoleErrors).toEqual([]);
  });
});

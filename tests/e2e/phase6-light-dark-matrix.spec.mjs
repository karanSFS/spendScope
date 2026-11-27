import { test, expect } from "@playwright/test";

const PUBLIC_ROUTES = ["/", "/sign-in", "/signup", "/privacy-policy"];

const PRIVATE_ROUTES = [
  "/dashboard",
  "/transactions",
  "/analytics",
  "/spend-bucket",
  "/categories",
  "/calculators",
  "/settings",
  "/settings/accounts",
  "/settings/time-period",
  "/settings/budget-mode",
  "/settings/hide-transactions",
  "/settings/reminders",
  "/settings/security",
  "/settings/profile",
  "/settings/backup",
  "/settings/reset",
];

async function assertNoHorizontalOverflow(page, routeLabel) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(
    metrics.scrollWidth,
    `Horizontal overflow on ${routeLabel}: scrollWidth=${metrics.scrollWidth} > innerWidth=${metrics.innerWidth}`,
  ).toBeLessThanOrEqual(metrics.innerWidth + 1);
}

test.describe("Phase 6 Light/Dark & Responsive Layout Matrix", () => {
  test("Primary routes render without overflow, page errors, or console errors in both Light and Dark themes", async ({
    page,
  }) => {
    test.setTimeout(60000);
    const pageErrors = [];
    const consoleErrors = [];
    const failedResponses = [];

    page.on("pageerror", (err) => pageErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("response", (res) => {
      if (res.status() >= 400) {
        failedResponses.push(`${res.status()} ${res.url()}`);
      }
    });

    // 1. Public pages Light check + interactive widgets + enter Guest Mode
    for (const pubRoute of PUBLIC_ROUTES) {
      await page.goto(pubRoute);
      await page.waitForLoadState("networkidle");
      await assertNoHorizontalOverflow(page, `${pubRoute} (light)`);
    }

    await page.goto("/");
    await page.getByRole("tab", { name: /Income \(6\)/i }).click();
    await expect(page.getByText("Freelance")).toBeVisible();
    await page
      .getByRole("button", { name: /Continue as Guest/i })
      .first()
      .click();
    await page.waitForURL("**/dashboard");

    // 2. Verify Light palette tokens & native Custom Range picker
    await expect
      .poll(() =>
        page.evaluate(() => ({
          hasDark: document.documentElement.classList.contains("dark"),
          bg: getComputedStyle(document.documentElement)
            .getPropertyValue("--home-background")
            .trim()
            .toUpperCase(),
        })),
      )
      .toEqual({ hasDark: false, bg: "#F5EDDE" });

    await page.getByRole("tab", { name: "Custom" }).click();
    await expect(page.getByLabel("Custom range start date")).toBeVisible();
    await expect(page.getByLabel("Custom range end date")).toBeVisible();
    await assertNoHorizontalOverflow(page, "/dashboard custom range (light)");
    await page.getByRole("tab", { name: "Monthly" }).click();

    // 3. Light mode route sweep
    for (const route of PRIVATE_ROUTES) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await assertNoHorizontalOverflow(page, `${route} (light)`);
    }

    // 4. Switch to Dark Mode via header quick toggle
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Switch to Dark Mode" }).click();
    await expect
      .poll(() =>
        page.evaluate(() => ({
          hasDark: document.documentElement.classList.contains("dark"),
          bg: getComputedStyle(document.documentElement)
            .getPropertyValue("--home-background")
            .trim()
            .toUpperCase(),
        })),
      )
      .toEqual({ hasDark: true, bg: "#1A1714" });

    // 5. Dark mode route sweep (public + private, verifying persistence + zero overflow)
    for (const route of [...PUBLIC_ROUTES, ...PRIVATE_ROUTES]) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const isStillDark = await page.evaluate(() =>
        document.documentElement.classList.contains("dark"),
      );
      expect(isStillDark, `Dark class lost on ${route}`).toBe(true);
      await assertNoHorizontalOverflow(page, `${route} (dark)`);
    }

    expect(failedResponses).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});

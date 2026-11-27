import { test, expect } from "@playwright/test";

test.describe("Phase 3 Categories & Settings Flows", () => {
  test("Categories CRUD, 3-mode color picker, reassign-to-Other delete, Account Transfers, Budget Mode, and Reset Data", async ({
    page,
  }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    // 1. Enter Guest Mode
    await page.goto("/");
    await page
      .getByRole("button", { name: /Continue as Guest/i })
      .first()
      .click();
    await page.waitForURL("**/dashboard");

    // 2. Categories manager: Create custom category with 3-mode Color Picker
    await page.goto("/categories");
    await expect(
      page.getByRole("heading", { name: "Categories" }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Add Category/i }).click();

    await page.getByRole("button", { name: /^Color/i }).click();
    await page.getByRole("tab", { name: "Spectrum" }).click();
    await page.getByRole("tab", { name: "Sliders" }).click();
    await page.getByLabel("Hex Code").fill("#4F46E5");
    await page.getByRole("button", { name: /Apply Color/i }).click();

    await page.getByLabel("Category Name").fill("Specialty Coffee");
    await page.getByRole("button", { name: /Create Category/i }).click();
    await expect(page.getByText("Specialty Coffee")).toBeVisible();

    // Reorder Specialty Coffee up
    await page.getByRole("button", { name: "Move Specialty Coffee up" }).click();

    // 3. Log an expense using Specialty Coffee then delete category -> reassigns to Other
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Add Transaction" }).first().click();
    await page.getByLabel("Transaction amount").fill("350");
    await page.getByRole("button", { name: "Specialty Coffee" }).click();
    await page.getByRole("button", { name: /Save Expense/i }).click();
    await expect(page.getByText("Specialty Coffee").first()).toBeVisible();

    await page.goto("/categories");
    await page.getByRole("button", { name: "Delete Specialty Coffee" }).click();
    await expect(page.getByText(/move them to same-kind "Other"/i)).toBeVisible();
    await page.getByRole("button", { name: /Reassign & Delete/i }).click();
    await expect(page.getByText(/reassigned 1 transaction/i)).toBeVisible();

    // 4. Settings Hub: verify no Rate App link, open Accounts & Transfer Money
    await page.goto("/settings");
    await expect(page.getByText("App Version")).toBeVisible();
    await expect(page.getByText(/Rate App/i)).toHaveCount(0);

    await page.goto("/settings/accounts");
    await page.getByRole("button", { name: /New Account/i }).click();
    await page.getByLabel("Account Name").fill("Savings Vault");
    await page.getByRole("button", { name: /Create Account/i }).click();
    await expect(
      page.getByRole("heading", { name: "Savings Vault" }),
    ).toBeVisible();

    // Neutral transfer between Default and Savings Vault
    await page.getByRole("button", { name: /Transfer Money/i }).click();
    await page.getByLabel("Amount").fill("2000");
    await page.getByLabel(/Note/i).fill("Savings sweep");
    await page.getByRole("button", { name: /Confirm Transfer/i }).click();
    await expect(page.getByText(/Transferred 2000/i)).toBeVisible();

    // 5. Budget Mode + Include Income
    await page.goto("/settings/budget-mode");
    await page.getByLabel("Enable Budget Mode").check();
    await page.getByLabel(/Budget Cap/i).fill("12000");
    await page.getByLabel("Include Income").check();
    await page.getByRole("button", { name: /Save Budget Mode/i }).click();
    await expect(page.getByText("Budget Mode settings saved.")).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByText(/Budget \+ Income/i).first()).toBeVisible();

    // 6. Reset Data (Keep Accounts + Keep Categories)
    await page.goto("/settings/reset");
    await page.getByRole("button", { name: /Reset Selected Data/i }).click();
    await page.getByPlaceholder("RESET").fill("RESET");
    await page.getByRole("button", { name: /Confirm Reset/i }).click();
    await expect(page.getByText(/Selected data was reset cleanly/i)).toBeVisible();

    expect(pageErrors).toEqual([]);
  });
});

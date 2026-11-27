import { test, expect } from "@playwright/test";

test.describe("Phase 2 Core Finance Flows", () => {
  test("Multi-account switching, keypad expression entry, transactions filtering, analytics charts, and spend buckets CRUD", async ({
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
    await expect(
      page.getByRole("heading", { name: "Default" }),
    ).toBeVisible();

    // 2. Create & switch to a second account ("Travel USD")
    await page.getByRole("button", { name: "Switch", exact: true }).click();
    await page.getByRole("button", { name: "Add Account" }).click();
    await page.getByLabel("Account Name").fill("Travel USD");
    await page.locator("#currency-select").click();
    await page.getByPlaceholder("Search currency or country...").fill("USD");
    await page.getByRole("button", { name: /US Dollar/i }).click();
    await page.getByRole("button", { name: /Create Account/i }).click();

    await expect(
      page.getByRole("heading", { name: "Travel USD" }),
    ).toBeVisible();

    // 3. Add a transaction using calculator expression "120+80" -> 200
    await page.getByRole("button", { name: "Add Transaction" }).first().click();
    const amountInput = page.getByLabel("Transaction amount");
    await amountInput.fill("120+80");
    await page.getByRole("button", { name: /= Calculate/i }).click();
    await expect(amountInput).toHaveValue("200");

    await page.getByRole("button", { name: "Dining Out" }).click();
    await page.getByLabel(/Note/i).fill("Airport lunch");
    await page.getByRole("button", { name: /Save Expense/i }).click();

    await expect(page.getByText(/Airport lunch/i)).toBeVisible();
    await expect(page.getByText("$200").first()).toBeVisible();

    // 4. Edit transaction amount to 150.50
    await page.getByRole("button", { name: "Edit transaction" }).first().click();
    const editInput = page.getByLabel("Transaction amount");
    await editInput.fill("150.5");
    await page.getByRole("button", { name: /Save Changes/i }).click();
    await expect(page.getByText("$150.5").first()).toBeVisible();

    // 5. Verify Transactions page search, filter, and export modal
    await page.goto("/transactions");
    await expect(page.getByText(/Airport lunch/i)).toBeVisible();
    await page.getByPlaceholder(/Search note, category/i).fill("Airport");
    await expect(page.getByText("1 entry", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Export" }).click();
    await expect(
      page.getByRole("heading", { name: "Export Transactions" }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Close export modal/i }).click();

    // 6. Verify Analytics charts page renders cleanly
    await page.goto("/analytics");
    await expect(
      page.getByRole("heading", { name: "Monthly Expense Breakdown" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Yearly Cashflow/i }),
    ).toBeVisible();

    // 7. Spend Buckets CRUD + Reorder + Drill-Down
    await page.goto("/spend-bucket");
    await page.getByRole("button", { name: /New Bucket/i }).click();
    await page.getByLabel("Bucket Name").fill("Goa Trip");
    await page.getByRole("button", { name: /Create Bucket/i }).click();

    await page.getByRole("button", { name: /New Bucket/i }).click();
    await page.getByLabel("Bucket Name").fill("Gadgets");
    await page.getByRole("button", { name: /Create Bucket/i }).click();

    // Move Gadgets up
    await page.getByRole("button", { name: "Move Gadgets up" }).click();

    // Open Goa Trip drill-down
    await page.getByRole("heading", { name: "Goa Trip" }).click();
    await page.waitForURL("**/spend-bucket/*");

    await page.getByRole("button", { name: "Add Fund" }).first().click();
    await page.locator('input[placeholder="0.00"]').fill("1000");
    await page.getByLabel(/Note/i).fill("Initial savings");
    await page.locator('form button[type="submit"]').click();

    await expect(page.getByText("$1,000").first()).toBeVisible();

    await page.getByRole("button", { name: "Add Expense" }).click();
    await page.locator('input[placeholder="0.00"]').fill("250");
    await page.getByLabel(/Note/i).fill("Flight booking");
    await page.locator('form button[type="submit"]').click();

    await expect(page.getByText("$750").first()).toBeVisible();

    expect(pageErrors).toEqual([]);
  });
});

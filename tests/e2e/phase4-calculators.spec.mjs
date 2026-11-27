import { test, expect } from "@playwright/test";

test.describe("Phase 4 Consolidated Financial Calculators", () => {
  test("Unified /calculators hub, 4 Loan tools, active account currency propagation, formula fixes, and mobile/desktop layouts", async ({
    page,
  }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    // 1. Enter Guest Mode and verify native viewport has 0 horizontal overflow
    await page.goto("/");
    await page
      .getByRole("button", { name: /Continue as Guest/i })
      .first()
      .click();
    await page.waitForURL("**/dashboard");

    await page.goto("/calculators?type=loan-profile&category=loan");
    await page.waitForLoadState("networkidle");
    const initialOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(initialOverflow).toBe(false);

    // 2. Test Desktop/Tablet 2-column workspace + redirect preservation
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(
      "/calculators-m?type=loan-profile&category=loan",
    );
    await page.waitForURL("**/calculators?type=loan-profile&category=loan");
    await expect(
      page.getByRole("heading", { name: "Financial Calculators" }),
    ).toBeVisible();
    await expect(page.getByText("24 Tools")).toBeVisible();

    // 3. Loan Profile CRUD + Detail + Repayment Schedule + Delete
    await page.getByRole("button", { name: /Add Loan/i }).first().click();
    await page.getByRole("textbox", { name: "Loan Name" }).fill("Home Equity Loan");
    await page.getByRole("textbox", { name: "Loan A/C No" }).fill("HL-2026-01");
    await page.getByRole("textbox", { name: "Bank Name" }).fill("HDFC Bank");
    await page.getByRole("textbox", { name: /Loan Amount/i }).fill("1200000");
    await page.getByRole("textbox", { name: /Interest Rate/i }).fill("8.5");
    await page.getByRole("textbox", { name: /Tenure \(Months\)/i }).fill("120");
    await page.getByRole("button", { name: /Save Loan Profile/i }).click();

    await expect(page.getByText("Home Equity Loan")).toBeVisible();
    await page.getByText("Home Equity Loan").first().click();
    await expect(page.getByText("Loan A/C No")).toBeVisible();

    await page
      .getByRole("button", { name: /View Repayment Schedule/i })
      .click();
    await expect(page.getByText("Amortization Schedule")).toBeVisible();
    await expect(page.getByText(/Total \(\d{4}\)/i).first()).toBeVisible();
    await page.getByRole("button", { name: /Details/i }).click();

    // Delete Loan Profile cleanly
    await page.getByRole("button", { name: /Delete loan/i }).click();
    await page.getByRole("button", { name: /^Delete$/ }).click();
    await expect(page.getByText(/No loan profiles yet/i)).toBeVisible();

    // 4. Loan Eligible Calculator allows 0 existing EMIs
    await page
      .getByRole("button", { name: "Loan Eligible Calculator" })
      .click();
    await page.getByRole("button", { name: /^Calculate$/ }).click();
    await expect(page.getByText("Eligible Loan Amount")).toBeVisible();

    // 5. Pre Payment / ROI Change comparison
    await page
      .getByRole("button", { name: "Pre Payment/ ROI Change" })
      .click();
    await page.getByRole("button", { name: /^Calculate$/ }).click();
    await expect(
      page.getByText("If You Change Monthly EMI (Same Tenure)"),
    ).toBeVisible();

    // 6. Moratorium Calculator (non-amortizable warning when rate+duration makes base EMI <= compounded interest)
    await page.getByRole("button", { name: "Moratorium Calculator" }).click();
    await page.getByRole("textbox", { name: "Interest (%)" }).fill("18");
    await page.getByRole("textbox", { name: /Loan Period/i }).fill("25");
    await page.getByRole("textbox", { name: "Moratorium Period (Months)" }).fill("12");
    await page.getByRole("textbox", { name: "Installments Already Paid" }).fill("0");
    await page.getByRole("button", { name: /^Calculate$/ }).click();
    await expect(
      page.getByText(/Monthly interest after moratorium exceeds the original EMI/i),
    ).toBeVisible();

    // 7. GST Remove Bug Fix (Gross 11800 -> Base Pre-Tax 10,000.00 < Gross)
    await page.getByRole("button", { name: /^GST & VAT/i }).click();
    await page.getByRole("button", { name: "Remove GST (-)" }).click();
    await page.getByRole("textbox", { name: /Gross Amount/i }).fill("11800");
    await page.getByRole("button", { name: /^Calculate$/ }).click();
    await expect(page.getByText("Base (Pre-Tax) Amount")).toBeVisible();
    await expect(page.getByText(/10,000\.00/).first()).toBeVisible();

    // 8. Banking -> PPF (<15 yr clamp) & Inflation Impact typo fix
    await page.getByRole("button", { name: /^Banking/i }).click();
    await page.getByRole("button", { name: "PPF Calculator" }).click();
    await page.getByRole("textbox", { name: /Period/i }).fill("10");
    await page.getByRole("button", { name: /^Calculate$/ }).click();
    await expect(page.getByText(/minimum 15-year lock-in/i)).toBeVisible();

    await page.getByRole("button", { name: /^Edit$/ }).click();
    await page.getByRole("button", { name: "Inflation Impact" }).click();
    await expect(page.getByRole("textbox", { name: "Initial Amount" })).toBeVisible();

    // 9. SIP -> SWP Depletion Warning
    await page.getByRole("button", { name: /^SIP/i }).click();
    await page.getByRole("button", { name: "SWP Calculator" }).click();
    await page.getByRole("textbox", { name: "Total Investment" }).fill("100000");
    await page.getByRole("textbox", { name: "Monthly Withdrawal" }).fill("15000");
    await page.getByRole("textbox", { name: /Expected Return/i }).fill("5");
    await page.getByRole("textbox", { name: /Period \(Years\)/i }).fill("5");
    await page.getByRole("button", { name: /^Calculate$/ }).click();
    await expect(page.getByText(/Corpus depletes at Month/i)).toBeVisible();

    // 10. Active Account Currency Propagation (INR -> USD)
    await page.goto("/settings/accounts");
    await page.getByRole("button", { name: /New Account/i }).click();
    await page.getByLabel("Account Name").fill("USD Wallet");
    await page.locator("#currency-select").click();
    await page.getByPlaceholder("Search currency or country...").fill("USD");
    await page.getByRole("button", { name: /US Dollar/i }).click();
    await page.getByRole("button", { name: /Create Account/i }).click();
    await expect(
      page.getByRole("heading", { name: "USD Wallet" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Switch active account" }),
    ).toContainText("USD");

    await page.goto("/calculators?type=cash-note-counter&category=other");
    await expect(page.getByText("DENOMINATIONS (USD)")).toBeVisible();
    await page.getByPlaceholder("0").first().fill("2");
    await expect(page.getByTestId("cash-note-words")).toContainText(
      /Two Hundred Dollars/i,
    );

    // 11. Mobile 375px layout: Tile Hub + Tool Navigation + Back to Grid
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/calculators");
    await expect(
      page.getByRole("button", { name: "EMI Calculator" }).first(),
    ).toBeVisible();

    const mobileGridOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(mobileGridOverflow).toBe(false);

    await page.getByRole("button", { name: "EMI Calculator" }).first().click();
    await page.waitForURL("**/calculators?type=emi-calculator&category=emi");
    await expect(page.getByText("LOAN INSTALLMENT")).toBeVisible();

    const mobileToolOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(mobileToolOverflow).toBe(false);

    await page.getByRole("button", { name: /Calculators/i }).first().click();
    await page.waitForURL("**/calculators");

    expect(pageErrors).toEqual([]);
  });
});

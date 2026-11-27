import { test, expect } from "@playwright/test";

/**
 * Generates a crisp synthetic receipt PNG in Chromium via Canvas so OCR tests
 * run deterministically offline without storing binary test fixtures.
 */
async function createReceiptPngBuffer(page) {
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#111111";
    ctx.font = "bold 28px monospace";
    ctx.fillText("GREEN MART GROCERS", 40, 60);

    ctx.font = "22px monospace";
    ctx.fillText("DATE: 2026-11-20", 40, 115);
    ctx.fillText("SUBTOTAL:     400.00", 40, 175);
    ctx.fillText("TAX:           50.00", 40, 220);

    ctx.font = "bold 30px monospace";
    ctx.fillText("GRAND TOTAL:  450.00", 40, 290);
    return canvas.toDataURL("image/png");
  });
  const base64 = dataUrl.split(",")[1];
  return Buffer.from(base64, "base64");
}

test.describe("Phase 5 Advanced Browser Features & Guest Backup", () => {
  test("Self-hosted Tesseract OCR with 0 third-party requests, PIN '0000' + 4-min lockout, Reminders, and Backup preview", async ({
    page,
  }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    // Track all outgoing network requests to ensure 0 third-party CDN calls during OCR
    const thirdPartyRequests = [];
    page.on("request", (req) => {
      const url = req.url();
      if (
        !url.startsWith("http://127.0.0.1") &&
        !url.startsWith("http://localhost") &&
        !url.startsWith("data:") &&
        !url.startsWith("blob:")
      ) {
        thirdPartyRequests.push(url);
      }
    });

    // 1. Enter Guest Mode
    await page.goto("/");
    await page
      .getByRole("button", { name: /Continue as Guest/i })
      .first()
      .click();
    await page.waitForURL("**/dashboard");

    // 2. Receipt OCR inside TransactionFormModal using self-hosted /tesseract/* assets
    const receiptBuffer = await createReceiptPngBuffer(page);
    await page.getByRole("button", { name: "Add Transaction" }).first().click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "receipt.png",
      mimeType: "image/png",
      buffer: receiptBuffer,
    });

    await expect(page.getByText(/Receipt scanned/i)).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByLabel("Transaction amount")).toHaveValue(/450/);
    await expect(page.locator("#tx-date")).toHaveValue("2026-11-20");

    // Save the OCR-prefilled transaction
    await page.getByRole("button", { name: /Save Expense/i }).click();
    await expect(page.getByText(/GREEN MART GROCERS/i).first()).toBeVisible();
    await expect(page.getByText(/₹450/).first()).toBeVisible();

    // Confirm zero third-party network calls occurred during OCR
    expect(thirdPartyRequests).toEqual([]);

    // 3. Settings -> Cloud Backup shows Guest counts cleanly
    await page.goto("/settings/backup");
    await expect(
      page.getByText(/You are currently using Local Guest Mode/i),
    ).toBeVisible();
    await expect(page.getByText(/1 transactions/i)).toBeVisible();

    // 4. Reminders schedule save
    await page.goto("/settings/reminders");
    await page.getByRole("button", { name: "Daily" }).click();
    await page.getByRole("button", { name: /Save Schedule/i }).click();
    await expect(page.getByText("Reminder schedule updated.")).toBeVisible();

    // 5. Security: PIN '0000', Lock Now, 5 wrong tries -> 4-min lockout
    await page.goto("/settings/security");
    await page.getByLabel("New 4-Digit PIN").fill("0000");
    await page.getByLabel("Confirm PIN").fill("0000");
    await page.getByRole("button", { name: /Enable 4-Digit PIN/i }).click();
    await expect(
      page.getByText(/Device-local 4-digit PIN saved/i),
    ).toBeVisible();

    // Trigger lock gate immediately
    await page.getByRole("button", { name: /Lock App Now/i }).click();
    await expect(
      page.getByRole("dialog", { name: "App Lock Screen" }),
    ).toBeVisible();

    // Unlock cleanly with "0000"
    for (let i = 0; i < 4; i++) {
      await page.getByRole("button", { name: "0", exact: true }).click();
    }
    await expect(
      page.getByRole("dialog", { name: "App Lock Screen" }),
    ).toBeHidden();

    // Lock again and test 5 wrong tries -> 4-minute lockout
    await page.getByRole("button", { name: /Lock App Now/i }).click();
    await expect(
      page.getByRole("dialog", { name: "App Lock Screen" }),
    ).toBeVisible();

    for (let attempt = 0; attempt < 5; attempt++) {
      for (let d = 0; d < 4; d++) {
        await page.getByRole("button", { name: "9", exact: true }).click();
      }
      if (attempt < 4) {
        await expect(page.getByText(/Incorrect PIN/i)).toBeVisible();
      }
    }
    await expect(page.getByText(/Locked for/i)).toBeVisible();
    await expect(page.getByText(/4 min remaining/i)).toBeVisible();

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasOverflow).toBe(false);
    expect(pageErrors).toEqual([]);
  });
});

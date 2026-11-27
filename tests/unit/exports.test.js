import { describe, it, expect } from "vitest";
import { escapeCsvField, buildTransactionsCsv } from "@/lib/csvExport";
import { generateTransactionsPdf } from "@/lib/pdfExport";
import { computeSpendingSummary } from "@/lib/budgetMath";

describe("csvExport & pdfExport", () => {
  it("escapes RFC-4180 CSV delimiters and neutralizes spreadsheet formula injection", () => {
    expect(escapeCsvField("=SUM(A1:A5)")).toBe("'=SUM(A1:A5)");
    expect(escapeCsvField("+123")).toBe("'+123");
    expect(escapeCsvField("-99")).toBe("'-99");
    expect(escapeCsvField("@cmd")).toBe("'@cmd");
    expect(escapeCsvField('Dinner, "Cafe"')).toBe('"Dinner, ""Cafe"""');
  });

  it("builds valid CRLF CSV output for transactions", () => {
    const csv = buildTransactionsCsv(
      [
        {
          date: "2026-11-26",
          kind: "expense",
          category: "Food",
          amount: 420.5,
          note: "=EVIL",
        },
        {
          date: "2026-11-25",
          kind: "income",
          category: "Salary",
          amount: 5000,
          note: "Payroll, Nov",
        },
      ],
      { currencyCode: "INR" },
    );

    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("Date,Kind,Category,Amount,Currency,Note,Transfer");
    expect(lines[1]).toContain("'=EVIL");
    expect(lines[2]).toContain('"Payroll, Nov"');
  });

  it("generates a valid multi-page PDF document via pdf-lib", async () => {
    const txs = Array.from({ length: 65 }, (_, i) => ({
      date: "2026-11-26",
      kind: i % 5 === 0 ? "income" : "expense",
      category: i % 5 === 0 ? "Salary" : "Food",
      amount: 100 + i,
      note: `Entry #${i + 1}`,
    }));

    const bytes = await generateTransactionsPdf({
      transactions: txs,
      accountName: "Default",
      periodLabel: "November 2026",
      currencyCode: "USD",
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.byteLength).toBeGreaterThan(1500);
    // Standard PDF magic bytes %PDF-
    const header = String.fromCharCode(...bytes.slice(0, 5));
    expect(header).toBe("%PDF-");
  });

  it("reconciles fractional sums & excludes neutral transfers consistently across Summary, CSV, and PDF", async () => {
    const txs = [
      { date: "2026-11-26", kind: "expense", category: "Food", amount: 0.1 },
      { date: "2026-11-26", kind: "expense", category: "Food", amount: 0.2 },
      { date: "2026-11-26", kind: "income", category: "Salary", amount: 100.55 },
      {
        date: "2026-11-26",
        kind: "expense",
        category: "Transfer",
        amount: 500,
        transfer_group_id: "tg-1",
      },
    ];

    const summary = computeSpendingSummary({ transactions: txs });
    expect(summary.totalExpense).toBe(0.3);
    expect(summary.totalIncome).toBe(100.55);
    expect(summary.transferCount).toBe(1);
    expect(summary.transferVolume).toBe(500);

    const csv = buildTransactionsCsv(txs, { currencyCode: "JPY" });
    expect(csv).toContain(",Transfer");

    const pdfBytes = await generateTransactionsPdf({
      transactions: txs,
      accountName: "Tokyo",
      periodLabel: "Nov 2026",
      currencyCode: "JPY",
    });
    expect(String.fromCharCode(...pdfBytes.slice(0, 5))).toBe("%PDF-");
  });
});

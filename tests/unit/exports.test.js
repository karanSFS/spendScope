import { describe, it, expect } from "vitest";
import { escapeCsvField, buildTransactionsCsv } from "@/lib/csvExport";
import { generateTransactionsPdf } from "@/lib/pdfExport";

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
});

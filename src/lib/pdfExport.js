/**
 * Multi-page styled PDF report generator using pdf-lib (loaded lazily on export).
 */

import { getCurrencyConfig } from "@/utils/currencies";

const ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW", "VND"]);

function formatPdfMoney(value, currencyCode) {
  const num = Number(value) || 0;
  const config = getCurrencyConfig(currencyCode);
  const decimals = ZERO_DECIMAL_CURRENCIES.has(config.code) ? 0 : 2;
  const factor = Math.pow(10, decimals);
  const abs = Math.abs(num);
  const rounded = Math.round((abs + Number.EPSILON) * factor) / factor;
  // Helvetica standard WinAnsi encoding safely renders ASCII currency code alongside amount
  // when symbols like INR ₹ are outside WinAnsi range.
  const asciiSymbol = ["$", "€", "£", "¥", "A$", "C$", "S$", "R$"].includes(
    config.symbol,
  )
    ? config.symbol
    : `${config.code} `;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(rounded);
  return `${rounded > 0 && num < 0 ? "-" : ""}${asciiSymbol}${formatted}`;
}

function sanitizeWinAnsi(text) {
  return String(text || "").replace(/[^\x20-\x7E]/g, " ");
}

export async function generateTransactionsPdf({
  transactions = [],
  accountName = "Default",
  periodLabel = "All Transactions",
  currencyCode = "INR",
}) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;

  const ink = rgb(0.17, 0.16, 0.15);
  const muted = rgb(0.41, 0.39, 0.36);
  const accent = rgb(0.78, 0.53, 0.34);
  const incomeColor = rgb(0.42, 0.46, 0.33);
  const expenseColor = rgb(0.59, 0.38, 0.19);
  const borderCol = rgb(0.88, 0.85, 0.8);
  const cardBg = rgb(0.98, 0.97, 0.94);

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const ensureSpace = (needed = 22) => {
    if (y - needed < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  // Header
  page.drawText("SpendScope Financial Report", {
    x: margin,
    y,
    size: 18,
    font: fontBold,
    color: ink,
  });
  y -= 18;
  page.drawText(
    sanitizeWinAnsi(
      `Account: ${accountName}  |  Period: ${periodLabel}  |  Generated: ${new Date().toLocaleDateString("en-US")}`,
    ),
    { x: margin, y, size: 9.5, font: fontRegular, color: muted },
  );
  y -= 18;

  // Separate totals in integer minor units (transfers excluded)
  let totalIncomeMinor = 0;
  let totalExpenseMinor = 0;
  const expenseCategoryMinor = new Map();
  const incomeCategoryMinor = new Map();

  for (const tx of transactions) {
    if (tx.transfer_group_id) continue;
    const amtMinor = Math.round((Number(tx.amount) || 0) * 100);
    const catName = tx.category || "Uncategorized";
    if (tx.kind === "income" || tx.type === "Income") {
      totalIncomeMinor += amtMinor;
      incomeCategoryMinor.set(
        catName,
        (incomeCategoryMinor.get(catName) || 0) + amtMinor,
      );
    } else {
      totalExpenseMinor += amtMinor;
      expenseCategoryMinor.set(
        catName,
        (expenseCategoryMinor.get(catName) || 0) + amtMinor,
      );
    }
  }

  const totalIncome = Math.round(totalIncomeMinor) / 100;
  const totalExpense = Math.round(totalExpenseMinor) / 100;
  const expenseCategoryTotals = new Map(
    Array.from(expenseCategoryMinor.entries()).map(([k, v]) => [k, v / 100]),
  );
  const incomeCategoryTotals = new Map(
    Array.from(incomeCategoryMinor.entries()).map(([k, v]) => [k, v / 100]),
  );

  // Summary box
  page.drawRectangle({
    x: margin,
    y: y - 48,
    width: contentWidth,
    height: 48,
    color: cardBg,
    borderColor: borderCol,
    borderWidth: 1,
  });

  const colW = contentWidth / 3;
  page.drawText("TOTAL INCOME", {
    x: margin + 12,
    y: y - 16,
    size: 8,
    font: fontBold,
    color: muted,
  });
  page.drawText(formatPdfMoney(totalIncome, currencyCode), {
    x: margin + 12,
    y: y - 34,
    size: 12,
    font: fontBold,
    color: incomeColor,
  });

  page.drawText("TOTAL EXPENSE", {
    x: margin + colW + 12,
    y: y - 16,
    size: 8,
    font: fontBold,
    color: muted,
  });
  page.drawText(formatPdfMoney(totalExpense, currencyCode), {
    x: margin + colW + 12,
    y: y - 34,
    size: 12,
    font: fontBold,
    color: expenseColor,
  });

  page.drawText("NET BALANCE", {
    x: margin + colW * 2 + 12,
    y: y - 16,
    size: 8,
    font: fontBold,
    color: muted,
  });
  page.drawText(formatPdfMoney(totalIncome - totalExpense, currencyCode), {
    x: margin + colW * 2 + 12,
    y: y - 34,
    size: 12,
    font: fontBold,
    color: ink,
  });

  y -= 68;

  // Category Breakdown helper
  const drawCategorySection = (title, map, color) => {
    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return;

    ensureSpace(40);
    page.drawText(title, {
      x: margin,
      y,
      size: 11,
      font: fontBold,
      color: accent,
    });
    y -= 16;

    for (const [catName, sum] of entries) {
      ensureSpace(18);
      page.drawText(sanitizeWinAnsi(catName).slice(0, 40), {
        x: margin + 6,
        y,
        size: 9.5,
        font: fontRegular,
        color: ink,
      });
      page.drawText(formatPdfMoney(sum, currencyCode), {
        x: margin + contentWidth - 110,
        y,
        size: 9.5,
        font: fontBold,
        color,
      });
      y -= 15;
    }
    y -= 10;
  };

  drawCategorySection(
    "Expense Breakdown by Category",
    expenseCategoryTotals,
    expenseColor,
  );
  drawCategorySection(
    "Income Breakdown by Category",
    incomeCategoryTotals,
    incomeColor,
  );

  // Transactions Table
  ensureSpace(44);
  page.drawText(`Transactions (${transactions.length})`, {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: accent,
  });
  y -= 16;

  const drawTableHeader = () => {
    page.drawRectangle({
      x: margin,
      y: y - 16,
      width: contentWidth,
      height: 18,
      color: cardBg,
      borderColor: borderCol,
      borderWidth: 0.75,
    });
    page.drawText("Date", { x: margin + 6, y: y - 11, size: 8.5, font: fontBold, color: muted });
    page.drawText("Category", { x: margin + 84, y: y - 11, size: 8.5, font: fontBold, color: muted });
    page.drawText("Note", { x: margin + 210, y: y - 11, size: 8.5, font: fontBold, color: muted });
    page.drawText("Type", { x: margin + 370, y: y - 11, size: 8.5, font: fontBold, color: muted });
    page.drawText("Amount", { x: margin + 430, y: y - 11, size: 8.5, font: fontBold, color: muted });
    y -= 24;
  };

  drawTableHeader();

  for (const tx of transactions) {
    if (y - 20 < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      drawTableHeader();
    }

    const isIncome = tx.kind === "income" || tx.type === "Income";
    const typeLabel = tx.transfer_group_id
      ? "Transfer"
      : isIncome
        ? "Income"
        : "Expense";

    page.drawText(sanitizeWinAnsi(tx.date || ""), {
      x: margin + 6,
      y,
      size: 8.5,
      font: fontRegular,
      color: muted,
    });
    page.drawText(sanitizeWinAnsi(tx.category || "Uncategorized").slice(0, 22), {
      x: margin + 84,
      y,
      size: 8.5,
      font: fontBold,
      color: ink,
    });
    page.drawText(sanitizeWinAnsi(tx.note || "-").slice(0, 28), {
      x: margin + 210,
      y,
      size: 8.5,
      font: fontRegular,
      color: muted,
    });
    page.drawText(typeLabel, {
      x: margin + 370,
      y,
      size: 8.5,
      font: fontRegular,
      color: muted,
    });
    page.drawText(formatPdfMoney(tx.amount, currencyCode), {
      x: margin + 430,
      y,
      size: 8.5,
      font: fontBold,
      color: tx.transfer_group_id ? muted : isIncome ? incomeColor : expenseColor,
    });
    y -= 17;
  }

  return await doc.save();
}

export async function downloadTransactionsPdf(options) {
  const bytes = await generateTransactionsPdf(options);
  if (typeof window === "undefined") return bytes;
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = options?.filename || "spendscope-report.pdf";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return bytes;
}

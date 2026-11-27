/**
 * RFC-4180 compliant CSV builder with spreadsheet formula-injection neutralization.
 */

export function escapeCsvField(value) {
  let str = value == null ? "" : String(value);
  // Neutralize Excel/Sheets formula injection if field begins with =, +, -, @, tab, or CR
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildTransactionsCsv(
  transactions = [],
  { currencyCode = "INR" } = {},
) {
  const headers = [
    "Date",
    "Kind",
    "Category",
    "Amount",
    "Currency",
    "Note",
    "Transfer",
  ];
  const rows = [headers.map(escapeCsvField).join(",")];

  for (const tx of transactions) {
    const line = [
      tx.date || "",
      tx.kind === "income" || tx.type === "Income" ? "Income" : "Expense",
      tx.category || "Uncategorized",
      (Number(tx.amount) || 0).toFixed(2),
      currencyCode,
      tx.note || "",
      tx.transfer_group_id ? "Transfer" : "",
    ];
    rows.push(line.map(escapeCsvField).join(","));
  }

  return rows.join("\r\n");
}

export function downloadCsv(filename, csvContent) {
  if (typeof window === "undefined") return;
  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename || "spendscope-transactions.csv";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

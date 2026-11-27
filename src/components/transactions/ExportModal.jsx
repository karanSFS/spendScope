"use client";

import React, { useState } from "react";
import {
  HiXMark,
  HiOutlineDocumentText,
  HiOutlineTableCells,
} from "react-icons/hi2";
import { buildTransactionsCsv, downloadCsv } from "@/lib/csvExport";
import { downloadTransactionsPdf } from "@/lib/pdfExport";

export default function ExportModal({
  open,
  transactions = [],
  accountName = "Default",
  periodLabel = "Selected Period",
  currencyCode = "INR",
  onClose,
}) {
  const [exportingPdf, setExportingPdf] = useState(false);

  if (!open) return null;

  const handleCsv = () => {
    const csv = buildTransactionsCsv(transactions, { currencyCode });
    const safeSlug = String(accountName || "spendscope")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    downloadCsv(`${safeSlug}-transactions.csv`, csv);
    onClose?.();
  };

  const handlePdf = async () => {
    setExportingPdf(true);
    try {
      const safeSlug = String(accountName || "spendscope")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      await downloadTransactionsPdf({
        transactions,
        accountName,
        periodLabel,
        currencyCode,
        filename: `${safeSlug}-report.pdf`,
      });
      onClose?.();
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Export transactions"
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text)] p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg">Export Transactions</h3>
            <p className="text-xs text-[var(--home-text-muted)]">
              {transactions.length} matching entries · {periodLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export modal"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] cursor-pointer"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleCsv}
            disabled={transactions.length === 0}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border border-[var(--home-border)] bg-[var(--home-background)] hover:border-[var(--home-accent)] transition-colors text-left cursor-pointer disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--home-track)] flex items-center justify-center text-[var(--home-accent)] shrink-0">
              <HiOutlineTableCells className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold block">Download CSV</span>
              <span className="text-xs text-[var(--home-text-muted)]">
                Spreadsheet-ready RFC-4180 export
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={handlePdf}
            disabled={transactions.length === 0 || exportingPdf}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border border-[var(--home-border)] bg-[var(--home-background)] hover:border-[var(--home-accent)] transition-colors text-left cursor-pointer disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--home-track)] flex items-center justify-center text-[var(--home-accent)] shrink-0">
              <HiOutlineDocumentText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold block">
                {exportingPdf ? "Building PDF…" : "Download PDF Report"}
              </span>
              <span className="text-xs text-[var(--home-text-muted)]">
                Multi-page report with category summaries
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

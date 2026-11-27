"use client";

import React, { useState, useMemo } from "react";
import { HiOutlineClipboardDocument, HiOutlineArrowPath } from "react-icons/hi2";
import {
  useCalcCurrency,
  useShareCalc,
  CalcHeader,
  CalcCard,
  ShareIconButton,
  CalcToast,
  sanitizeInt,
} from "@/components/calculators/v2/CalculatorShell";
import {
  getDefaultNoteDenominations,
  calculateCashNotes,
} from "@/lib/calculatorEngine";

export default function CashNoteCounter({ onBack }) {
  const { currencyCode, fmtCompact } = useCalcCurrency();
  const { toast, notify, shareText } = useShareCalc();

  const denominations = useMemo(
    () => getDefaultNoteDenominations(currencyCode),
    [currencyCode],
  );

  const [counts, setCounts] = useState({});
  const [customDenom, setCustomDenom] = useState("");
  const [customCount, setCustomCount] = useState("");

  const result = useMemo(
    () =>
      calculateCashNotes({
        denominations,
        counts,
        customDenom: Number(customDenom) || 0,
        customCount: Number(customCount) || 0,
        currencyCode,
      }),
    [denominations, counts, customDenom, customCount, currencyCode],
  );

  const handleReset = () => {
    setCounts({});
    setCustomDenom("");
    setCustomCount("");
    notify("Cleared all denominations");
  };

  const buildSummaryText = () => {
    const lines = [`Cash Note Counter (${currencyCode})`, "-------------------------"];
    result.rows.forEach((row) => {
      if (row.count > 0) {
        lines.push(`${row.denom} × ${row.count} = ${fmtCompact(row.subtotal)}`);
      }
    });
    if (result.customRow.denom > 0 && result.customRow.count > 0) {
      lines.push(
        `${result.customRow.denom} × ${result.customRow.count} = ${fmtCompact(result.customRow.subtotal)}`,
      );
    }
    lines.push("-------------------------");
    lines.push(`Total Notes: ${result.totalNotes}`);
    lines.push(`Total Amount: ${fmtCompact(result.totalAmount)}`);
    lines.push(`In Words: ${result.amountInWords}`);
    return lines.join("\n");
  };

  const handleCopy = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(buildSummaryText());
      notify("Summary copied to clipboard");
    }
  };

  const handleShare = () => {
    shareText({
      title: "Cash Note Counter Summary",
      text: buildSummaryText(),
    });
  };

  return (
    <div className="space-y-4">
      <CalcHeader
        title="Cash Note Counter"
        eyebrow={`DENOMINATIONS (${currencyCode})`}
        onBack={onBack}
        backLabel="Calculators"
        rightAction={
          <button
            type="button"
            onClick={handleReset}
            aria-label="Reset notes"
            className="w-9 h-9 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text-secondary)] hover:text-[var(--home-text)] flex items-center justify-center cursor-pointer"
          >
            <HiOutlineArrowPath className="w-4 h-4" />
          </button>
        }
      />

      <CalcToast message={toast} />

      <CalcCard className="p-5 text-center space-y-1.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--home-text-muted)]">
          Grand Total ({result.totalNotes} Notes)
        </p>
        <p className="font-mono-num text-3xl font-bold text-[var(--home-accent)]">
          {fmtCompact(result.totalAmount)}
        </p>
        <p
          data-testid="cash-note-words"
          className="text-xs sm:text-sm font-medium text-[var(--home-text-secondary)] pt-1"
        >
          {result.amountInWords}
        </p>
      </CalcCard>

      <CalcCard className="px-4 py-3 divide-y divide-[var(--home-border)]">
        {result.rows.map((row) => (
          <div
            key={row.denom}
            className="grid grid-cols-[64px_20px_1fr_20px_96px] items-center gap-1.5 py-2.5"
          >
            <span className="font-mono-num text-right text-sm font-bold text-[var(--home-text)]">
              {row.denom}
            </span>
            <span className="text-center text-xs font-bold text-[var(--home-accent)]">
              ×
            </span>
            <div className="flex justify-center">
              <input
                type="text"
                inputMode="numeric"
                value={counts[row.denom] || ""}
                onChange={(e) =>
                  setCounts((prev) => ({
                    ...prev,
                    [row.denom]: sanitizeInt(e.target.value),
                  }))
                }
                placeholder="0"
                className="w-20 h-9 text-center rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] font-mono-num text-sm font-semibold text-[var(--home-text)] outline-none focus:border-[var(--home-accent)]"
              />
            </div>
            <span className="text-center text-xs font-bold text-[var(--home-accent)]">
              =
            </span>
            <span className="font-mono-num text-right text-xs sm:text-sm font-bold text-[var(--home-text)] truncate">
              {fmtCompact(row.subtotal)}
            </span>
          </div>
        ))}

        {/* Custom Denomination */}
        <div className="grid grid-cols-[64px_20px_1fr_20px_96px] items-center gap-1.5 py-2.5">
          <input
            type="text"
            inputMode="numeric"
            value={customDenom}
            onChange={(e) => setCustomDenom(sanitizeInt(e.target.value))}
            placeholder="Note"
            className="w-16 h-9 text-center rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] font-mono-num text-xs font-semibold text-[var(--home-text)] outline-none focus:border-[var(--home-accent)]"
          />
          <span className="text-center text-xs font-bold text-[var(--home-accent)]">
            ×
          </span>
          <div className="flex justify-center">
            <input
              type="text"
              inputMode="numeric"
              value={customCount}
              onChange={(e) => setCustomCount(sanitizeInt(e.target.value))}
              placeholder="Qty"
              className="w-20 h-9 text-center rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] font-mono-num text-sm font-semibold text-[var(--home-text)] outline-none focus:border-[var(--home-accent)]"
            />
          </div>
          <span className="text-center text-xs font-bold text-[var(--home-accent)]">
            =
          </span>
          <span className="font-mono-num text-right text-xs sm:text-sm font-bold text-[var(--home-text)] truncate">
            {fmtCompact(result.customRow.subtotal)}
          </span>
        </div>
      </CalcCard>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className="w-full py-3 px-4 rounded-2xl border border-[var(--home-border)] bg-[var(--home-card)] text-sm font-bold text-[var(--home-text)] flex items-center justify-center gap-2 hover:bg-[var(--home-track)] cursor-pointer"
        >
          <HiOutlineClipboardDocument className="w-4 h-4" />
          <span>Copy</span>
        </button>
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleShare}
            className="w-full py-3 px-4 rounded-2xl bg-[var(--home-accent)] text-[var(--home-on-accent)] text-sm font-bold flex items-center justify-center gap-2 hover:opacity-95 cursor-pointer"
          >
            <ShareIconButton onClick={handleShare} label="Share summary" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  );
}

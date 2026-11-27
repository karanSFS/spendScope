"use client";

import React, { useState, useMemo } from "react";
import { HiOutlineClipboardDocument } from "react-icons/hi2";
import {
  useCalcCurrency,
  useShareCalc,
  CalcHeader,
  CalcSegmentedTabs,
  CalcCard,
  CalcFieldRow,
  CalcActionButtons,
  CalcSummaryTable,
  ShareIconButton,
  CalcToast,
  sanitizeDecimal,
} from "@/components/calculators/v2/CalculatorShell";
import { calculateDiscount } from "@/lib/calculatorEngine";

export default function DiscountCalculator({ onBack }) {
  const { symbol, fmt } = useCalcCurrency();
  const { toast, notify, shareText } = useShareCalc();

  const [mode, setMode] = useState("after-tax");
  const [amount, setAmount] = useState("1000");
  const [discountPercent, setDiscountPercent] = useState("15");
  const [salesTaxPercent, setSalesTaxPercent] = useState("10");
  const [hasCalculated, setHasCalculated] = useState(false);

  const results = useMemo(
    () =>
      calculateDiscount({
        amount: Number(amount) || 0,
        discountPercent: Number(discountPercent) || 0,
        taxPercent: Number(salesTaxPercent) || 0,
        mode,
      }),
    [amount, discountPercent, salesTaxPercent, mode],
  );

  const handleReset = () => {
    setAmount("");
    setDiscountPercent("");
    setSalesTaxPercent("");
    setHasCalculated(false);
  };

  const handleCalculate = () => {
    if (!amount && !discountPercent && !salesTaxPercent) {
      setAmount("1000");
      setDiscountPercent("15");
      setSalesTaxPercent("10");
    }
    setHasCalculated(true);
  };

  const buildSummary = () =>
    [
      "Discount Calculation Summary",
      `• Mode: ${mode === "after-tax" ? "Discount After Tax" : "Discount Before Tax"}`,
      `• Initial Amount: ${fmt(results.initialAmount, 2)}`,
      `• Discount (${discountPercent || 0}%): ${fmt(results.savings, 2)}`,
      `• Sales Tax (${salesTaxPercent || 0}%): ${fmt(results.salesTax, 2)}`,
      `• Payable Amount: ${fmt(results.payableAmount, 2)}`,
    ].join("\n");

  const handleCopy = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(buildSummary());
      notify("Discount summary copied");
    }
  };

  const handleShare = () => {
    shareText({ title: "Discount Calculator Summary", text: buildSummary() });
  };

  return (
    <div className="space-y-4">
      <CalcHeader
        title="Discount Calculator"
        eyebrow="SAVINGS & TAX"
        onBack={onBack}
        backLabel="Calculators"
        rightAction={
          hasCalculated ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy summary"
                className="w-9 h-9 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text-secondary)] hover:text-[var(--home-accent)] flex items-center justify-center cursor-pointer"
              >
                <HiOutlineClipboardDocument className="w-4 h-4" />
              </button>
              <ShareIconButton onClick={handleShare} />
            </div>
          ) : null
        }
      />

      <CalcToast message={toast} />

      <CalcSegmentedTabs
        value={mode}
        onChange={setMode}
        options={[
          { value: "after-tax", label: "After Tax" },
          { value: "before-tax", label: "Before Tax" },
        ]}
      />

      <CalcCard className="divide-y divide-[var(--home-border)]">
        <CalcFieldRow
          label="Initial Amount"
          prefix={symbol}
          value={amount}
          onChange={(v) => setAmount(sanitizeDecimal(v))}
          onClear={() => setAmount("")}
          placeholder="1000"
        />
        <CalcFieldRow
          label="Discount (%)"
          suffix="%"
          value={discountPercent}
          onChange={(v) => {
            const val = sanitizeDecimal(v);
            if (!val || Number(val) <= 100) setDiscountPercent(val);
          }}
          onClear={() => setDiscountPercent("")}
          placeholder="15"
        />
        <CalcFieldRow
          label="Sales Tax (%)"
          suffix="%"
          value={salesTaxPercent}
          onChange={(v) => setSalesTaxPercent(sanitizeDecimal(v))}
          onClear={() => setSalesTaxPercent("")}
          placeholder="10"
        />
      </CalcCard>

      <CalcActionButtons onReset={handleReset} onCalculate={handleCalculate} />

      {hasCalculated && (
        <CalcSummaryTable
          rows={[
            { label: "Initial Amount", value: fmt(results.initialAmount, 2) },
            { label: "You Save", value: fmt(results.savings, 2), positive: true },
            { label: "Sales Tax", value: fmt(results.salesTax, 2) },
            { label: "Payable Amount", value: fmt(results.payableAmount, 2), accent: true },
          ]}
        />
      )}
    </div>
  );
}

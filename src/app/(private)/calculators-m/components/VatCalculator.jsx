"use client";

import React, { useState, useMemo } from "react";
import {
  useCalcCurrency,
  useShareCalc,
  CalcHeader,
  CalcSegmentedTabs,
  CalcCard,
  CalcFieldRow,
  CalcActionButtons,
  CalcSummaryTable,
  CalcDonutBreakdown,
  ShareIconButton,
  CalcToast,
  sanitizeDecimal,
} from "@/components/calculators/v2/CalculatorShell";
import { calculateVat } from "@/lib/calculatorEngine";

export default function VatCalculator({ onBack }) {
  const { symbol, fmt, fmtCompact } = useCalcCurrency();
  const { toast, shareText } = useShareCalc();

  const [mode, setMode] = useState("add"); // "add" | "remove"
  const [initialAmount, setInitialAmount] = useState("1000");
  const [vatRate, setVatRate] = useState("15");
  const [showDetails, setShowDetails] = useState(false);

  const data = useMemo(
    () =>
      calculateVat({
        amount: Number(initialAmount) || 0,
        rate: Number(vatRate) || 0,
        mode,
      }),
    [initialAmount, vatRate, mode],
  );

  const handleReset = () => {
    setInitialAmount("");
    setVatRate("");
    setShowDetails(false);
  };

  const handleCalculate = () => {
    if (!initialAmount && !vatRate) {
      setInitialAmount("1000");
      setVatRate("15");
    }
    setShowDetails(true);
  };

  const handleShare = () => {
    const text = [
      "VAT Calculation Details",
      `• Mode: ${mode === "add" ? "Add VAT (+)" : "Remove VAT (-)"}`,
      `• Base (Pre-Tax) Amount: ${fmt(data.baseAmount, 2)}`,
      `• Rate of VAT: ${data.rate}%`,
      `• VAT Amount: ${fmt(data.vatAmount, 2)}`,
      `• Total (Post-Tax) Amount: ${fmt(data.totalAmount, 2)}`,
    ].join("\n");
    shareText({ title: "VAT Calculator Details", text });
  };

  if (showDetails) {
    return (
      <div className="space-y-4">
        <CalcHeader
          title="VAT Summary"
          eyebrow={mode === "add" ? "EXCLUSIVE (+VAT)" : "INCLUSIVE (-VAT)"}
          onBack={() => setShowDetails(false)}
          backLabel="Edit"
          rightAction={<ShareIconButton onClick={handleShare} />}
        />
        <CalcToast message={toast} />

        <CalcSummaryTable
          rows={[
            { label: "Base (Pre-Tax) Amount", value: fmt(data.baseAmount, 2) },
            { label: `VAT Amount (${data.rate}%)`, value: fmt(data.vatAmount, 2) },
            { label: "Total (Post-Tax) Amount", value: fmt(data.totalAmount, 2), accent: true },
          ]}
        />

        <CalcDonutBreakdown
          title="VAT Split"
          centerLabel="Total Amount"
          centerValue={fmtCompact(data.totalAmount)}
          primaryLabel="Base Amount"
          primaryValue={fmt(data.baseAmount, 2)}
          primaryRatio={data.baseRatio}
          secondaryLabel="VAT Amount"
          secondaryValue={fmt(data.vatAmount, 2)}
          secondaryRatio={data.vatRatio}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CalcHeader
        title="VAT Calculator"
        eyebrow="VALUE ADDED TAX"
        onBack={onBack}
        backLabel="Calculators"
      />

      <CalcSegmentedTabs
        value={mode}
        onChange={setMode}
        options={[
          { value: "add", label: "Add VAT (+)" },
          { value: "remove", label: "Remove VAT (-)" },
        ]}
      />

      <CalcCard className="divide-y divide-[var(--home-border)]">
        <CalcFieldRow
          label={mode === "add" ? "Pre-Tax Amount" : "Gross Amount (Incl. VAT)"}
          prefix={symbol}
          value={initialAmount}
          onChange={(v) => setInitialAmount(sanitizeDecimal(v))}
          onClear={() => setInitialAmount("")}
          placeholder="1000"
        />
        <CalcFieldRow
          label="Rate of VAT (%)"
          suffix="%"
          value={vatRate}
          onChange={(v) => setVatRate(sanitizeDecimal(v))}
          onClear={() => setVatRate("")}
          placeholder="15"
        />
      </CalcCard>

      <CalcActionButtons onReset={handleReset} onCalculate={handleCalculate} />
    </div>
  );
}

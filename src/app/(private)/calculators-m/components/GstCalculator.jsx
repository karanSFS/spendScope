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
import { calculateGst } from "@/lib/calculatorEngine";

export default function GstCalculator({ onBack }) {
  const { symbol, fmt, fmtCompact } = useCalcCurrency();
  const { toast, shareText } = useShareCalc();

  const [mode, setMode] = useState("add"); // "add" | "remove"
  const [initialAmount, setInitialAmount] = useState("1000");
  const [gstRate, setGstRate] = useState("18");
  const [showDetails, setShowDetails] = useState(false);

  const data = useMemo(
    () =>
      calculateGst({
        amount: Number(initialAmount) || 0,
        rate: Number(gstRate) || 0,
        mode,
      }),
    [initialAmount, gstRate, mode],
  );

  const handleReset = () => {
    setInitialAmount("");
    setGstRate("");
    setShowDetails(false);
  };

  const handleCalculate = () => {
    if (!initialAmount && !gstRate) {
      setInitialAmount("1000");
      setGstRate("18");
    }
    setShowDetails(true);
  };

  const handleShare = () => {
    const text = [
      "GST Calculation Details",
      `• Mode: ${mode === "add" ? "Add GST (+)" : "Remove GST (-)"}`,
      `• Base (Pre-Tax) Amount: ${fmt(data.baseAmount, 2)}`,
      `• GST Rate: ${data.rate}%`,
      `• GST Amount: ${fmt(data.gstAmount, 2)}`,
      `• CGST (${data.halfRate}%): ${fmt(data.cgstAmount, 2)}`,
      `• SGST (${data.halfRate}%): ${fmt(data.sgstAmount, 2)}`,
      `• Total (Post-Tax) Amount: ${fmt(data.totalAmount, 2)}`,
    ].join("\n");
    shareText({ title: "GST Calculator Details", text });
  };

  if (showDetails) {
    return (
      <div className="space-y-4">
        <CalcHeader
          title="GST Summary"
          eyebrow={mode === "add" ? "EXCLUSIVE (+GST)" : "INCLUSIVE (-GST)"}
          onBack={() => setShowDetails(false)}
          backLabel="Edit"
          rightAction={<ShareIconButton onClick={handleShare} />}
        />
        <CalcToast message={toast} />

        <CalcSummaryTable
          rows={[
            { label: "Base (Pre-Tax) Amount", value: fmt(data.baseAmount, 2) },
            { label: `CGST (${data.halfRate}%)`, value: fmt(data.cgstAmount, 2) },
            { label: `SGST (${data.halfRate}%)`, value: fmt(data.sgstAmount, 2) },
            { label: `Total GST (${data.rate}%)`, value: fmt(data.gstAmount, 2) },
            { label: "Total (Post-Tax) Amount", value: fmt(data.totalAmount, 2), accent: true },
          ]}
        />

        <CalcDonutBreakdown
          title="Tax Split"
          centerLabel="Total Amount"
          centerValue={fmtCompact(data.totalAmount)}
          primaryLabel="Base Amount"
          primaryValue={fmt(data.baseAmount, 2)}
          primaryRatio={data.baseRatio}
          secondaryLabel="GST Amount"
          secondaryValue={fmt(data.gstAmount, 2)}
          secondaryRatio={data.gstRatio}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CalcHeader
        title="GST Calculator"
        eyebrow="GOODS & SERVICES TAX"
        onBack={onBack}
        backLabel="Calculators"
      />

      <CalcSegmentedTabs
        value={mode}
        onChange={setMode}
        options={[
          { value: "add", label: "Add GST (+)" },
          { value: "remove", label: "Remove GST (-)" },
        ]}
      />

      <CalcCard className="divide-y divide-[var(--home-border)]">
        <CalcFieldRow
          label={mode === "add" ? "Pre-Tax Amount" : "Gross Amount (Incl. GST)"}
          prefix={symbol}
          value={initialAmount}
          onChange={(v) => setInitialAmount(sanitizeDecimal(v))}
          onClear={() => setInitialAmount("")}
          placeholder="1000"
        />
        <CalcFieldRow
          label="Rate of GST (%)"
          suffix="%"
          value={gstRate}
          onChange={(v) => setGstRate(sanitizeDecimal(v))}
          onClear={() => setGstRate("")}
          placeholder="18"
        />
      </CalcCard>

      <CalcActionButtons onReset={handleReset} onCalculate={handleCalculate} />
    </div>
  );
}

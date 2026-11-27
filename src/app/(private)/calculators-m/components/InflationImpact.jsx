"use client";

import React, { useState, useMemo } from "react";
import {
  useCalcCurrency,
  useShareCalc,
  CalcHeader,
  CalcCard,
  CalcFieldRow,
  CalcActionButtons,
  CalcSummaryTable,
  ShareIconButton,
  CalcToast,
  sanitizeDecimal,
  sanitizeInt,
} from "@/components/calculators/v2/CalculatorShell";
import { calculateInflationImpact } from "@/lib/calculatorEngine";

export default function InflationImpact({ onBack }) {
  const { symbol, fmt } = useCalcCurrency();
  const { toast, shareText } = useShareCalc();

  const [initialAmount, setInitialAmount] = useState("100000");
  const [inflationRate, setInflationRate] = useState("6");
  const [period, setPeriod] = useState("10");
  const [showResults, setShowResults] = useState(false);

  const results = useMemo(
    () =>
      calculateInflationImpact({
        initialAmount: initialAmount !== "" ? Number(initialAmount) || 0 : 100000,
        inflationRate: inflationRate !== "" ? Number(inflationRate) || 0 : 6,
        years: period !== "" ? Number(period) || 10 : 10,
      }),
    [initialAmount, inflationRate, period],
  );

  const handleReset = () => {
    setInitialAmount("");
    setInflationRate("");
    setPeriod("");
    setShowResults(false);
  };

  const handleCalculate = () => {
    if (!initialAmount && !inflationRate && !period) {
      setInitialAmount("100000");
      setInflationRate("6");
      setPeriod("10");
    }
    setShowResults(true);
  };

  const handleShare = () => {
    const text = [
      "Inflation Impact Summary",
      `• Initial Amount: ${fmt(results.currentCost, 2)}`,
      `• Inflation Rate: ${results.inflationRate}% p.a.`,
      `• Period: ${results.years} Years`,
      "",
      "Future Cost Estimation:",
      `• Future Cost: ${fmt(results.futureCost, 2)}`,
      `• Price Increase: ${fmt(results.priceIncrease, 2)}`,
      "",
      "Purchasing Power Erosion:",
      `• Today's Value: ${fmt(results.todaysValue, 2)}`,
      `• Future Value: ${fmt(results.futureValue, 2)}`,
      `• Value Reduction: ${fmt(results.valueReduction, 2)}`,
    ].join("\n");
    shareText({ title: "Inflation Impact Summary", text });
  };

  return (
    <div className="space-y-4">
      <CalcHeader
        title="Inflation Impact"
        eyebrow="PURCHASING POWER"
        onBack={onBack}
        backLabel="Calculators"
        rightAction={showResults ? <ShareIconButton onClick={handleShare} /> : null}
      />

      <CalcToast message={toast} />

      <CalcCard className="divide-y divide-[var(--home-border)]">
        <CalcFieldRow
          label="Initial Amount"
          prefix={symbol}
          value={initialAmount}
          onChange={(v) => setInitialAmount(sanitizeDecimal(v))}
          onClear={() => setInitialAmount("")}
          placeholder="Enter amount"
        />
        <CalcFieldRow
          label="Inflation Rate (%)"
          suffix="%"
          value={inflationRate}
          onChange={(v) => {
            const val = sanitizeDecimal(v);
            if (!val || Number(val) <= 30) setInflationRate(val);
          }}
          onClear={() => setInflationRate("")}
          placeholder="Max 30% p.a."
        />
        <CalcFieldRow
          label="Period (Years)"
          inputMode="numeric"
          value={period}
          onChange={(v) => {
            const val = sanitizeInt(v);
            if (!val || Number(val) <= 50) setPeriod(val);
          }}
          onClear={() => setPeriod("")}
          placeholder="Max 50 years"
        />
      </CalcCard>

      <CalcActionButtons onReset={handleReset} onCalculate={handleCalculate} />

      {showResults && (
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--home-text-muted)] px-1">
              Future Cost Estimation (Price Increase)
            </p>
            <CalcSummaryTable
              rows={[
                { label: "Current Cost", value: fmt(results.currentCost, 2) },
                { label: "Future Cost", value: fmt(results.futureCost, 2), accent: true },
                { label: "Price Increase", value: fmt(results.priceIncrease, 2), negative: true },
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--home-text-muted)] px-1">
              Purchasing Power Erosion (Value of Money)
            </p>
            <CalcSummaryTable
              rows={[
                { label: "Today's Value", value: fmt(results.todaysValue, 2) },
                { label: "Future Value", value: fmt(results.futureValue, 2), accent: true },
                { label: "Value Reduction", value: fmt(results.valueReduction, 2), negative: true },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}

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
import { calculateSipWithInflation } from "@/lib/calculatorEngine";

export default function SipWithInflation({ onBack }) {
  const { symbol, fmtCompact } = useCalcCurrency();
  const { toast, shareText } = useShareCalc();

  const [monthlyAmount, setMonthlyAmount] = useState("10000");
  const [expectedReturns, setExpectedReturns] = useState("15");
  const [inflationRate, setInflationRate] = useState("6");
  const [period, setPeriod] = useState("10");

  const [hasCalculated, setHasCalculated] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const data = useMemo(
    () =>
      calculateSipWithInflation({
        monthlyAmount: monthlyAmount !== "" ? Number(monthlyAmount) || 0 : 10000,
        expectedReturnRate: expectedReturns !== "" ? Number(expectedReturns) || 0 : 15,
        inflationRate: inflationRate !== "" ? Number(inflationRate) || 0 : 6,
        years: period !== "" ? Number(period) || 10 : 10,
      }),
    [monthlyAmount, expectedReturns, inflationRate, period],
  );

  const handleReset = () => {
    setMonthlyAmount("");
    setExpectedReturns("");
    setInflationRate("");
    setPeriod("");
    setHasCalculated(false);
    setShowDetails(false);
  };

  const handleCalculate = () => {
    if (!monthlyAmount && !expectedReturns && !inflationRate && !period) {
      setMonthlyAmount("10000");
      setExpectedReturns("15");
      setInflationRate("6");
      setPeriod("10");
    }
    setHasCalculated(true);
  };

  const handleShare = () => {
    const text = [
      "Inflation Adjusted SIP Details",
      `• Monthly Amount: ${fmtCompact(data.monthlyAmount)}`,
      `• Exp. Annual Return Rate: ${data.expectedReturnRate}%`,
      `• Inflation Rate: ${data.inflationRate}%`,
      `• Period: ${data.period} Years`,
      `• Total Investment: ${fmtCompact(data.totalInvestment)}`,
      `• Nominal Future Value: ${fmtCompact(data.nominalFutureValue)}`,
      `• Real Returns (Inflation Adjusted): ${fmtCompact(data.expectedReturnsAmount)}`,
      `• Future Value (Today's Purchasing Power): ${fmtCompact(data.futureValue)}`,
    ].join("\n");
    shareText({ title: "Inflation Adjusted SIP", text });
  };

  if (showDetails) {
    return (
      <div className="space-y-4">
        <CalcHeader
          title="Inflation-Adjusted Schedule"
          eyebrow={`${data.period} YEARS @ ${data.inflationRate}% INFLATION`}
          onBack={() => setShowDetails(false)}
          backLabel="Summary"
          rightAction={<ShareIconButton onClick={handleShare} />}
        />
        <CalcToast message={toast} />

        <CalcSummaryTable
          rows={[
            { label: "Monthly Investment", value: fmtCompact(data.monthlyAmount) },
            { label: "Exp. Return Rate (%)", value: `${data.expectedReturnRate}%` },
            { label: "Inflation Rate (%)", value: `${data.inflationRate}%` },
            { label: "Period", value: `${data.period} Years` },
            { label: "Invested Amount", value: fmtCompact(data.totalInvestment) },
            {
              label: "Estimated Real Returns",
              value: fmtCompact(data.expectedReturnsAmount),
              positive: true,
            },
            { label: "Nominal Future Value", value: fmtCompact(data.nominalFutureValue) },
            {
              label: "Real Future Value",
              value: fmtCompact(data.futureValue),
              accent: true,
            },
          ]}
        />

        <CalcCard>
          <div className="grid grid-cols-4 px-3 py-2 bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-bold text-center">
            <div>Year</div>
            <div>Invested</div>
            <div>Real Gain</div>
            <div>Real Balance</div>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-[var(--home-border)]">
            {data.schedule.map((row) => (
              <div
                key={row.year}
                className="grid grid-cols-4 px-3 py-2 text-xs text-center font-mono-num text-[var(--home-text)]"
              >
                <div>{row.year}</div>
                <div>{fmtCompact(row.invested)}</div>
                <div>{fmtCompact(row.returns)}</div>
                <div>{fmtCompact(row.finalBalance)}</div>
              </div>
            ))}
          </div>
        </CalcCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CalcHeader
        title="SIP With Inflation"
        eyebrow="REAL PURCHASING POWER"
        onBack={onBack}
        backLabel="Calculators"
        rightAction={
          hasCalculated ? (
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className="px-3 py-1.5 rounded-full bg-[var(--home-track)] text-xs font-bold text-[var(--home-accent)] cursor-pointer"
            >
              Details
            </button>
          ) : null
        }
      />

      <CalcCard className="divide-y divide-[var(--home-border)]">
        <CalcFieldRow
          label="Monthly Amount"
          prefix={symbol}
          value={monthlyAmount}
          onChange={(v) => setMonthlyAmount(sanitizeDecimal(v))}
          onClear={() => setMonthlyAmount("")}
        />
        <CalcFieldRow
          label="Exp. Return Rate (%)"
          suffix="%"
          value={expectedReturns}
          onChange={(v) => setExpectedReturns(sanitizeDecimal(v))}
          onClear={() => setExpectedReturns("")}
        />
        <CalcFieldRow
          label="Inflation Rate (%)"
          suffix="%"
          value={inflationRate}
          onChange={(v) => setInflationRate(sanitizeDecimal(v))}
          onClear={() => setInflationRate("")}
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

      {hasCalculated && (
        <CalcSummaryTable
          rows={[
            { label: "Total Investment", value: fmtCompact(data.totalInvestment) },
            { label: "Nominal Future Value", value: fmtCompact(data.nominalFutureValue) },
            {
              label: "Real Returns (After Inflation)",
              value: fmtCompact(data.expectedReturnsAmount),
              positive: true,
            },
            {
              label: "Real Future Value",
              value: fmtCompact(data.futureValue),
              accent: true,
            },
          ]}
        />
      )}
    </div>
  );
}

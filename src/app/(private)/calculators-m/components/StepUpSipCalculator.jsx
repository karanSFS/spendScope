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
  CalcDonutBreakdown,
  ShareIconButton,
  CalcToast,
  sanitizeDecimal,
  sanitizeInt,
} from "@/components/calculators/v2/CalculatorShell";
import { calculateStepUpSip } from "@/lib/calculatorEngine";

export default function StepUpSipCalculator({ onBack }) {
  const { symbol, fmt, fmtCompact } = useCalcCurrency();
  const { toast, shareText } = useShareCalc();

  const [monthlyAmount, setMonthlyAmount] = useState("10000");
  const [expectedReturns, setExpectedReturns] = useState("15");
  const [annualStepUp, setAnnualStepUp] = useState("10");
  const [period, setPeriod] = useState("10");

  const [hasCalculated, setHasCalculated] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const data = useMemo(
    () =>
      calculateStepUpSip({
        monthlyAmount: monthlyAmount !== "" ? Number(monthlyAmount) || 0 : 10000,
        expectedReturnRate: expectedReturns !== "" ? Number(expectedReturns) || 0 : 15,
        annualStepUpRate: annualStepUp !== "" ? Number(annualStepUp) || 0 : 10,
        years: period !== "" ? Number(period) || 10 : 10,
      }),
    [monthlyAmount, expectedReturns, annualStepUp, period],
  );

  const handleReset = () => {
    setMonthlyAmount("");
    setExpectedReturns("");
    setAnnualStepUp("");
    setPeriod("");
    setHasCalculated(false);
    setShowDetails(false);
  };

  const handleCalculate = () => {
    if (!monthlyAmount && !expectedReturns && !annualStepUp && !period) {
      setMonthlyAmount("10000");
      setExpectedReturns("15");
      setAnnualStepUp("10");
      setPeriod("10");
    }
    setHasCalculated(true);
  };

  const handleShare = () => {
    const text = [
      "Step-Up SIP Calculation Details",
      `• Starting Monthly SIP: ${fmt(data.monthlyAmount, 2)}`,
      `• Exp. Return Rate: ${data.expectedReturns}%`,
      `• Annual Step-Up: ${data.annualStepUp}%`,
      `• Period: ${data.period} Years`,
      `• Invested Amount: ${fmt(data.totalInvestment, 2)}`,
      `• Estimated Returns: ${fmt(data.totalReturns, 2)}`,
      `• Future Value: ${fmt(data.futureValue, 2)}`,
    ].join("\n");
    shareText({ title: "Step-Up SIP Summary", text });
  };

  if (showDetails) {
    return (
      <div className="space-y-4">
        <CalcHeader
          title="Step-Up SIP Schedule"
          eyebrow={`${data.period} YEARS · ${data.annualStepUp}% STEP-UP`}
          onBack={() => setShowDetails(false)}
          backLabel="Summary"
          rightAction={<ShareIconButton onClick={handleShare} />}
        />
        <CalcToast message={toast} />

        <CalcSummaryTable
          rows={[
            { label: "Starting Monthly SIP", value: fmt(data.monthlyAmount, 2) },
            { label: "Exp. Return Rate", value: `${data.expectedReturns}%` },
            { label: "Annual Step-Up", value: `${data.annualStepUp}%` },
            { label: "Total Investment", value: fmt(data.totalInvestment, 2) },
            { label: "Estimated Returns", value: fmt(data.totalReturns, 2), positive: true },
            { label: "Future Value", value: fmt(data.futureValue, 2), accent: true },
          ]}
        />

        <CalcCard>
          <div className="grid grid-cols-4 px-3 py-2 bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-bold text-center">
            <div>Year</div>
            <div>Invested</div>
            <div>Returns</div>
            <div>Balance</div>
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
        title="Step-Up SIP"
        eyebrow="ANNUAL INCREMENT"
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
          label="Exp. Annual Returns (%)"
          suffix="%"
          value={expectedReturns}
          onChange={(v) => {
            const val = sanitizeDecimal(v);
            if (!val || Number(val) <= 50) setExpectedReturns(val);
          }}
          onClear={() => setExpectedReturns("")}
          placeholder="Ex: 15%"
        />
        <CalcFieldRow
          label="Annual Step-Up (%)"
          suffix="%"
          value={annualStepUp}
          onChange={(v) => {
            const val = sanitizeDecimal(v);
            if (!val || Number(val) <= 50) setAnnualStepUp(val);
          }}
          onClear={() => setAnnualStepUp("")}
          placeholder="Ex: 10%"
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
          placeholder="Max 50 Years"
        />
      </CalcCard>

      <CalcActionButtons onReset={handleReset} onCalculate={handleCalculate} />

      {hasCalculated && (
        <div className="space-y-4 pt-1">
          <CalcSummaryTable
            rows={[
              { label: "Total Investment", value: fmt(data.totalInvestment, 2) },
              { label: "Expected Returns", value: fmt(data.totalReturns, 2), positive: true },
              { label: "Future Value", value: fmt(data.futureValue, 2), accent: true },
            ]}
          />

          <CalcDonutBreakdown
            title="Portfolio Allocation"
            centerLabel="Total Value"
            centerValue={fmtCompact(data.futureValue)}
            primaryLabel={`Invested (${data.invPercent}%)`}
            primaryValue={fmtCompact(data.totalInvestment)}
            primaryRatio={data.invPercent / 100}
            secondaryLabel={`Returns (${data.retPercent}%)`}
            secondaryValue={fmtCompact(data.totalReturns)}
            secondaryRatio={data.retPercent / 100}
          />
        </div>
      )}
    </div>
  );
}

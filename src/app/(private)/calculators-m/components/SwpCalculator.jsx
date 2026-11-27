"use client";

import React, { useState } from "react";
import { HiChevronDown, HiChevronUp } from "react-icons/hi2";
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
} from "@/components/calculators/v2/CalculatorShell";
import { calculateSwp } from "@/lib/calculatorEngine";

export default function SwpCalculator({ onBack }) {
  const { symbol, fmtCompact } = useCalcCurrency();
  const { toast, shareText } = useShareCalc();

  const [totalInvestment, setTotalInvestment] = useState("1000000");
  const [withdrawalPerMonth, setWithdrawalPerMonth] = useState("10000");
  const [returnRate, setReturnRate] = useState("6.5");
  const [periodYears, setPeriodYears] = useState("10");

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [showBreakdown, setShowBreakdown] = useState(true);

  const handleReset = () => {
    setTotalInvestment("");
    setWithdrawalPerMonth("");
    setReturnRate("");
    setPeriodYears("");
    setResult(null);
    setError("");
  };

  const handleCalculate = () => {
    setError("");
    const P = Number(totalInvestment);
    const W = Number(withdrawalPerMonth);
    const r = Number(returnRate);
    const y = Number(periodYears);

    if (!totalInvestment || P <= 0) {
      setError("Please enter a valid total investment amount.");
      setResult(null);
      return;
    }
    if (!withdrawalPerMonth || W <= 0) {
      setError("Please enter a valid monthly withdrawal amount.");
      setResult(null);
      return;
    }
    if (returnRate === "" || !Number.isFinite(r) || r < 0) {
      setError("Please enter a valid expected return rate (0% or more).");
      setResult(null);
      return;
    }
    if (!periodYears || y <= 0) {
      setError("Please enter a valid investment period in years.");
      setResult(null);
      return;
    }

    const res = calculateSwp({
      totalInvestment: P,
      withdrawalPerMonth: W,
      annualReturn: r,
      years: y,
    });
    setResult(res);
  };

  const handleShare = () => {
    if (!result) return;
    const text = [
      "SWP Calculator Summary",
      `• Total Investment: ${fmtCompact(result.principal)}`,
      `• Monthly Withdrawal: ${fmtCompact(result.withdrawalPerMonth)}`,
      `• Expected Return: ${result.returnRate}%`,
      `• Period: ${result.periodYears} Years`,
      `• Total Withdrawn: ${fmtCompact(result.totalWithdrawn)}`,
      `• Final Value: ${fmtCompact(result.finalValue)}`,
      ...(result.isDepletedBeforeEnd
        ? [`• Corpus Depleted At: Month ${result.depletedMonth}`]
        : []),
    ].join("\n");
    shareText({ title: "SWP Calculator Details", text });
  };

  const totalForRatio = result
    ? (result.principal + result.totalReturns) || 1
    : 1;
  const pRatio = result ? result.principal / totalForRatio : 1;

  return (
    <div className="space-y-4">
      <CalcHeader
        title="SWP Calculator"
        eyebrow="SYSTEMATIC WITHDRAWAL"
        onBack={onBack}
        backLabel="Calculators"
        rightAction={result ? <ShareIconButton onClick={handleShare} /> : null}
      />

      <CalcToast message={toast} />

      {error && (
        <div className="px-4 py-2.5 rounded-2xl bg-[var(--home-destructive)]/10 border border-[var(--home-destructive)]/30 text-xs font-semibold text-[var(--home-destructive)]">
          {error}
        </div>
      )}

      <CalcCard className="divide-y divide-[var(--home-border)]">
        <CalcFieldRow
          label="Total Investment"
          prefix={symbol}
          value={totalInvestment}
          onChange={(v) => setTotalInvestment(sanitizeDecimal(v))}
          onClear={() => setTotalInvestment("")}
          placeholder="1000000"
        />
        <CalcFieldRow
          label="Monthly Withdrawal"
          prefix={symbol}
          value={withdrawalPerMonth}
          onChange={(v) => setWithdrawalPerMonth(sanitizeDecimal(v))}
          onClear={() => setWithdrawalPerMonth("")}
          placeholder="10000"
        />
        <CalcFieldRow
          label="Expected Return (%)"
          suffix="%"
          value={returnRate}
          onChange={(v) => setReturnRate(sanitizeDecimal(v))}
          onClear={() => setReturnRate("")}
          placeholder="6.5"
        />
        <CalcFieldRow
          label="Period (Years)"
          value={periodYears}
          onChange={(v) => setPeriodYears(sanitizeDecimal(v))}
          onClear={() => setPeriodYears("")}
          placeholder="10"
        />
      </CalcCard>

      <CalcActionButtons onReset={handleReset} onCalculate={handleCalculate} />

      {result && (
        <div className="space-y-4 pt-1">
          {result.isDepletedBeforeEnd && (
            <div className="px-4 py-3 rounded-2xl bg-[var(--home-destructive)]/10 border border-[var(--home-destructive)]/30 text-xs font-semibold text-[var(--home-destructive)]">
              Corpus depletes at Month {result.depletedMonth} (
              {(result.depletedMonth / 12).toFixed(1)} years) before the{" "}
              {result.periodYears}-year period ends.
            </div>
          )}

          <CalcSummaryTable
            rows={[
              { label: "Total Investment", value: fmtCompact(result.principal) },
              { label: "Total Withdrawn", value: fmtCompact(result.totalWithdrawn), accent: true },
              { label: "Interest Earned", value: fmtCompact(result.totalReturns), positive: true },
              { label: "Final Value", value: fmtCompact(result.finalValue) },
            ]}
          />

          <CalcDonutBreakdown
            title="SWP Value Split"
            centerLabel="Total Value"
            centerValue={fmtCompact(result.totalValue)}
            primaryLabel="Principal"
            primaryValue={fmtCompact(result.principal)}
            primaryRatio={pRatio}
            secondaryLabel="Returns"
            secondaryValue={fmtCompact(result.totalReturns)}
            secondaryRatio={1 - pRatio}
          />

          <CalcCard>
            <button
              type="button"
              onClick={() => setShowBreakdown((s) => !s)}
              className="w-full px-4 py-3.5 flex items-center justify-between text-xs sm:text-sm font-bold text-[var(--home-text)] cursor-pointer"
            >
              <span>Yearly Schedule</span>
              {showBreakdown ? (
                <HiChevronUp className="w-4 h-4 text-[var(--home-text-muted)]" />
              ) : (
                <HiChevronDown className="w-4 h-4 text-[var(--home-text-muted)]" />
              )}
            </button>

            {showBreakdown && (
              <div className="border-t border-[var(--home-border)]">
                <div className="grid grid-cols-4 px-3 py-2 bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-bold text-center">
                  <div>Year</div>
                  <div>Withdrawn</div>
                  <div>Returns</div>
                  <div>Closing</div>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-[var(--home-border)]">
                  {result.schedule.map((row) => (
                    <div
                      key={row.year}
                      className="grid grid-cols-4 px-3 py-2 text-xs text-center font-mono-num text-[var(--home-text)]"
                    >
                      <div>{row.year}</div>
                      <div>{fmtCompact(row.withdrawn)}</div>
                      <div>{fmtCompact(row.returns)}</div>
                      <div>{fmtCompact(row.closing)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CalcCard>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
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
  sanitizeInt,
} from "./CalculatorShell";
import { calculateLoanEligibility } from "@/lib/calculatorEngine";

const FOIR_OPTIONS = [35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95];

export default function LoanEligibleCalculator({ onBack }) {
  const { symbol, fmtCompact } = useCalcCurrency();
  const { toast, shareText } = useShareCalc();

  const [periodUnit, setPeriodUnit] = useState("yearly"); // "yearly" | "monthly"
  const [monthlyIncome, setMonthlyIncome] = useState("100000");
  const [foirPercent, setFoirPercent] = useState(50);
  const [foirOpen, setFoirOpen] = useState(false);
  const [existingEmis, setExistingEmis] = useState("0");
  const [annualRate, setAnnualRate] = useState("9");
  const [periodValue, setPeriodValue] = useState("20");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handlePeriodUnitChange = (nextUnit) => {
    if (nextUnit === periodUnit) return;
    const raw = Number(periodValue) || 0;
    if (raw > 0) {
      if (nextUnit === "monthly") {
        setPeriodValue(String(Math.min(600, Math.round(raw * 12))));
      } else {
        setPeriodValue(String(Math.max(1, Math.round(raw / 12))));
      }
    }
    setPeriodUnit(nextUnit);
  };

  const handleReset = () => {
    setMonthlyIncome("");
    setFoirPercent(35);
    setExistingEmis("0");
    setAnnualRate("");
    setPeriodValue("");
    setResult(null);
    setError("");
  };

  const handleCalculate = () => {
    setError("");
    const inc = Number(monthlyIncome) || 0;
    const emis = existingEmis.trim() === "" ? 0 : Number(existingEmis);
    const rate = Number(annualRate) || 0;
    const pVal = Number(periodValue) || 0;
    const months =
      periodUnit === "yearly" ? Math.round(pVal * 12) : Math.round(pVal);

    if (inc <= 0) {
      setError("Please enter a valid monthly income.");
      setResult(null);
      return;
    }
    if (!Number.isFinite(emis) || emis < 0) {
      setError("Existing EMIs must be 0 or greater.");
      setResult(null);
      return;
    }
    if (rate <= 0 || rate > 100) {
      setError("Please enter a valid interest rate (0–100%).");
      setResult(null);
      return;
    }
    if (months <= 0) {
      setError("Please enter a valid tenure.");
      setResult(null);
      return;
    }

    const res = calculateLoanEligibility({
      monthlyIncome: inc,
      foirPercent,
      existingEmis: emis,
      annualRate: rate,
      tenureMonths: months,
    });
    setResult(res);
  };

  const handleShare = () => {
    if (!result) return;
    const unitLabel = periodUnit === "yearly" ? "Years" : "Months";
    const text = [
      "Loan Eligibility Summary",
      `Monthly Income: ${fmtCompact(result.monthlyIncome)}`,
      `FOIR (% of Salary): ${result.foirPercent}%`,
      `Existing Monthly EMIs: ${fmtCompact(result.existingEmis)}`,
      `Interest Rate: ${result.annualRate}%`,
      `Tenure: ${periodValue} ${unitLabel}`,
      "",
      `Eligible Monthly EMI: ${fmtCompact(result.eligibleEmi)}`,
      `Eligible Loan Amount: ${fmtCompact(result.eligibleLoanAmount)}`,
    ].join("\n");
    shareText({ title: "Loan Eligibility Summary", text });
  };

  return (
    <div className="space-y-4">
      <CalcHeader
        title="Loan Eligibility"
        eyebrow="BORROWING CAPACITY"
        onBack={onBack}
        backLabel="Calculators"
        rightAction={result ? <ShareIconButton onClick={handleShare} /> : null}
      />

      <CalcToast message={toast} />

      <CalcSegmentedTabs
        value={periodUnit}
        onChange={handlePeriodUnitChange}
        options={[
          { value: "yearly", label: "Years" },
          { value: "monthly", label: "Months" },
        ]}
      />

      {error && (
        <div className="px-4 py-2.5 rounded-2xl bg-[var(--home-destructive)]/10 border border-[var(--home-destructive)]/30 text-xs font-semibold text-[var(--home-destructive)]">
          {error}
        </div>
      )}

      <CalcCard className="divide-y divide-[var(--home-border)]">
        <CalcFieldRow
          label="Gross Monthly Income"
          prefix={symbol}
          value={monthlyIncome}
          onChange={(v) => setMonthlyIncome(sanitizeDecimal(v))}
          onClear={() => setMonthlyIncome("")}
          placeholder="Enter monthly income"
        />

        {/* FOIR Selector Row */}
        <div className="px-4 py-3.5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-xs sm:text-sm font-medium text-[var(--home-text-secondary)] block">
                FOIR (% of Income)
              </span>
              <span className="text-[11px] text-[var(--home-text-muted)]">
                Fixed Obligation to Income Ratio
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFoirOpen((v) => !v)}
              className="px-3.5 py-1.5 rounded-full border border-[var(--home-border)] bg-[var(--home-track)] font-mono-num text-xs sm:text-sm font-bold text-[var(--home-accent)] cursor-pointer"
            >
              {foirPercent}%
            </button>
          </div>

          {foirOpen && (
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {FOIR_OPTIONS.map((opt) => {
                const active = opt === foirPercent;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setFoirPercent(opt);
                      setFoirOpen(false);
                    }}
                    className={`py-2 rounded-xl font-mono-num text-xs font-bold border transition-colors cursor-pointer ${
                      active
                        ? "bg-[var(--home-accent)] border-[var(--home-accent)] text-[var(--home-on-accent)]"
                        : "bg-[var(--home-background)] border-[var(--home-border)] text-[var(--home-text)]"
                    }`}
                  >
                    {opt}%
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <CalcFieldRow
          label="Existing Monthly EMIs"
          prefix={symbol}
          value={existingEmis}
          onChange={(v) => setExistingEmis(sanitizeDecimal(v))}
          onClear={() => setExistingEmis("0")}
          placeholder="0"
        />

        <CalcFieldRow
          label="Interest Rate (%)"
          suffix="%"
          value={annualRate}
          onChange={(v) => {
            const val = sanitizeDecimal(v);
            if (!val || Number(val) <= 100) setAnnualRate(val);
          }}
          onClear={() => setAnnualRate("")}
          placeholder="Ex: 9%"
        />

        <CalcFieldRow
          label={periodUnit === "yearly" ? "Tenure (Years)" : "Tenure (Months)"}
          value={periodValue}
          inputMode="numeric"
          onChange={(v) => {
            const val = sanitizeInt(v);
            const max = periodUnit === "yearly" ? 50 : 600;
            if (!val || Number(val) <= max) setPeriodValue(val);
          }}
          onClear={() => setPeriodValue("")}
          placeholder={periodUnit === "yearly" ? "Max 50 years" : "Max 600 months"}
        />
      </CalcCard>

      <CalcActionButtons onReset={handleReset} onCalculate={handleCalculate} />

      {result && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CalcCard className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--home-text-muted)]">
                Eligible Monthly EMI
              </p>
              <p className="font-mono-num text-2xl font-bold text-[var(--home-income)] mt-1">
                {fmtCompact(result.eligibleEmi)}
              </p>
            </CalcCard>

            <CalcCard className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--home-text-muted)]">
                Eligible Loan Amount
              </p>
              <p className="font-mono-num text-2xl font-bold text-[var(--home-accent)] mt-1">
                {fmtCompact(result.eligibleLoanAmount)}
              </p>
            </CalcCard>
          </div>

          <CalcSummaryTable
            rows={[
              {
                label: "Max FOIR Capacity",
                value: fmtCompact((result.monthlyIncome * result.foirPercent) / 100),
              },
              { label: "Less Existing EMIs", value: fmtCompact(result.existingEmis) },
              {
                label: "Total Tenure",
                value: `${result.tenureMonths} Months`,
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}

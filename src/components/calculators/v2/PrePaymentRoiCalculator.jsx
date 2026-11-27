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
  ShareIconButton,
  CalcToast,
  sanitizeDecimal,
} from "./CalculatorShell";
import { calculateLoanPrepayment } from "@/lib/calculatorEngine";

export default function PrePaymentRoiCalculator({ onBack }) {
  const { symbol, fmtCompact } = useCalcCurrency();
  const { toast, shareText } = useShareCalc();

  const [mode, setMode] = useState("prepayment"); // "prepayment" | "roi"
  const [principal, setPrincipal] = useState("1000000");
  const [annualRate, setAnnualRate] = useState("9");
  const [emi, setEmi] = useState("12668");
  const [prepayment, setPrepayment] = useState("200000");
  const [revisedRate, setRevisedRate] = useState("8");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    setResult(null);
    setError("");
  };

  const handleReset = () => {
    setPrincipal("");
    setAnnualRate("");
    setEmi("");
    setPrepayment("");
    setRevisedRate("");
    setResult(null);
    setError("");
  };

  const handleCalculate = () => {
    setError("");
    const res = calculateLoanPrepayment({
      mode,
      principal: Number(principal) || 0,
      annualRate: Number(annualRate) || 0,
      emi: Number(emi) || 0,
      prepayment: Number(prepayment) || 0,
      revisedAnnualRate: Number(revisedRate) || 0,
    });
    if (!res.valid) {
      setResult(null);
      setError(res.error);
      return;
    }
    setResult(res);
  };

  const handleShare = () => {
    if (!result?.valid) return;
    const { changeEmi, changeTenure } = result;
    const text = [
      mode === "prepayment"
        ? "Loan Pre-Payment Comparison"
        : "Loan ROI Change Comparison",
      "",
      "Option 1: Change Monthly EMI (Same Tenure)",
      `• New EMI: ${fmtCompact(changeEmi.newEmi)}`,
      `• Old EMI: ${fmtCompact(changeEmi.oldEmi)}`,
      `• EMI Difference: ${fmtCompact(changeEmi.emiDiff)}`,
      `• New Interest: ${fmtCompact(changeEmi.newInterest)}`,
      `• Old Interest: ${fmtCompact(changeEmi.oldInterest)}`,
      `• Interest Saved: ${fmtCompact(changeEmi.interestDiff)}`,
      "",
      "Option 2: Change Loan Tenure (Same EMI)",
      `• New Months: ${Number.isFinite(changeTenure.newMonths) ? changeTenure.newMonths.toFixed(2) : "∞"}`,
      `• Old Months: ${changeTenure.oldMonths.toFixed(2)}`,
      `• Months Saved: ${Number.isFinite(changeTenure.monthsDiff) ? changeTenure.monthsDiff.toFixed(2) : "N/A"}`,
      `• New Interest: ${Number.isFinite(changeTenure.newInterest) ? fmtCompact(changeTenure.newInterest) : "∞"}`,
      `• Old Interest: ${fmtCompact(changeTenure.oldInterest)}`,
      `• Interest Saved: ${Number.isFinite(changeTenure.interestDiff) ? fmtCompact(changeTenure.interestDiff) : "N/A"}`,
    ].join("\n");
    shareText({ title: "Pre-Payment / ROI Change Summary", text });
  };

  const renderComparisonRow = (label, newVal, oldVal, diffVal, positiveGood = true) => {
    return (
      <div className="grid grid-cols-4 gap-2 px-4 py-3 text-xs sm:text-sm items-center">
        <span className="text-[var(--home-text-secondary)] font-medium">{label}</span>
        <span className="font-mono-num font-bold text-right text-[var(--home-text)]">
          {newVal}
        </span>
        <span className="font-mono-num text-right text-[var(--home-text-secondary)]">
          {oldVal}
        </span>
        <span
          className={`font-mono-num font-bold text-right ${
            positiveGood ? "text-[var(--home-income)]" : "text-[var(--home-text)]"
          }`}
        >
          {diffVal}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <CalcHeader
        title="Pre Payment / ROI Change"
        eyebrow="LOAN OPTIMIZER"
        onBack={onBack}
        backLabel="Calculators"
        rightAction={result ? <ShareIconButton onClick={handleShare} /> : null}
      />

      <CalcToast message={toast} />

      <CalcSegmentedTabs
        value={mode}
        onChange={handleModeChange}
        options={[
          { value: "prepayment", label: "Pre Payment" },
          { value: "roi", label: "ROI Change" },
        ]}
      />

      {error && (
        <div className="px-4 py-2.5 rounded-2xl bg-[var(--home-destructive)]/10 border border-[var(--home-destructive)]/30 text-xs font-semibold text-[var(--home-destructive)]">
          {error}
        </div>
      )}

      <CalcCard className="divide-y divide-[var(--home-border)]">
        <CalcFieldRow
          label="Outstanding Amount"
          prefix={symbol}
          value={principal}
          onChange={(v) => setPrincipal(sanitizeDecimal(v))}
          onClear={() => setPrincipal("")}
          placeholder="Enter amount"
        />
        <CalcFieldRow
          label="Current Rate (%)"
          suffix="%"
          value={annualRate}
          onChange={(v) => {
            const val = sanitizeDecimal(v);
            if (!val || Number(val) <= 50) setAnnualRate(val);
          }}
          onClear={() => setAnnualRate("")}
          placeholder="Max 50%"
        />
        <CalcFieldRow
          label="Monthly EMI"
          prefix={symbol}
          value={emi}
          onChange={(v) => setEmi(sanitizeDecimal(v))}
          onClear={() => setEmi("")}
          placeholder="Enter EMI"
        />
        {mode === "prepayment" ? (
          <CalcFieldRow
            label="Pre-Payment Amount"
            prefix={symbol}
            value={prepayment}
            onChange={(v) => setPrepayment(sanitizeDecimal(v))}
            onClear={() => setPrepayment("")}
            placeholder="Lump sum amount"
          />
        ) : (
          <CalcFieldRow
            label="Revised Rate (%)"
            suffix="%"
            value={revisedRate}
            onChange={(v) => {
              const val = sanitizeDecimal(v);
              if (!val || Number(val) <= 50) setRevisedRate(val);
            }}
            onClear={() => setRevisedRate("")}
            placeholder="New interest rate"
          />
        )}
      </CalcCard>

      <CalcActionButtons onReset={handleReset} onCalculate={handleCalculate} />

      {result && (
        <div className="space-y-4 pt-1">
          {/* EMI Change Comparison */}
          <CalcCard>
            <div className="px-4 py-3 border-b border-[var(--home-border)] bg-[var(--home-track)]/60">
              <h3 className="text-xs sm:text-sm font-bold text-[var(--home-text)]">
                If You Change Monthly EMI (Same Tenure)
              </h3>
            </div>
            <div className="grid grid-cols-4 gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--home-text-muted)] border-b border-[var(--home-border)]">
              <span>Metric</span>
              <span className="text-right">New</span>
              <span className="text-right">Old</span>
              <span className="text-right">Saved / Δ</span>
            </div>
            <div className="divide-y divide-[var(--home-border)]">
              {renderComparisonRow(
                "Monthly EMI",
                fmtCompact(result.changeEmi.newEmi),
                fmtCompact(result.changeEmi.oldEmi),
                fmtCompact(result.changeEmi.emiDiff),
                result.changeEmi.emiDiff >= 0,
              )}
              {renderComparisonRow(
                "Total Interest",
                fmtCompact(result.changeEmi.newInterest),
                fmtCompact(result.changeEmi.oldInterest),
                fmtCompact(result.changeEmi.interestDiff),
                result.changeEmi.interestDiff >= 0,
              )}
            </div>
          </CalcCard>

          {/* Tenure Change Comparison */}
          <CalcCard>
            <div className="px-4 py-3 border-b border-[var(--home-border)] bg-[var(--home-track)]/60">
              <h3 className="text-xs sm:text-sm font-bold text-[var(--home-text)]">
                If You Change Loan Tenure (Same EMI)
              </h3>
            </div>
            <div className="grid grid-cols-4 gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--home-text-muted)] border-b border-[var(--home-border)]">
              <span>Metric</span>
              <span className="text-right">New</span>
              <span className="text-right">Old</span>
              <span className="text-right">Saved / Δ</span>
            </div>
            <div className="divide-y divide-[var(--home-border)]">
              {renderComparisonRow(
                "Months",
                Number.isFinite(result.changeTenure.newMonths)
                  ? result.changeTenure.newMonths.toFixed(1)
                  : "∞",
                result.changeTenure.oldMonths.toFixed(1),
                Number.isFinite(result.changeTenure.monthsDiff)
                  ? result.changeTenure.monthsDiff.toFixed(1)
                  : "N/A",
                result.changeTenure.monthsDiff >= 0,
              )}
              {renderComparisonRow(
                "Total Interest",
                Number.isFinite(result.changeTenure.newInterest)
                  ? fmtCompact(result.changeTenure.newInterest)
                  : "∞",
                fmtCompact(result.changeTenure.oldInterest),
                Number.isFinite(result.changeTenure.interestDiff)
                  ? fmtCompact(result.changeTenure.interestDiff)
                  : "N/A",
                result.changeTenure.interestDiff >= 0,
              )}
            </div>
          </CalcCard>
        </div>
      )}
    </div>
  );
}

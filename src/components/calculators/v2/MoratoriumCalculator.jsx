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
  sanitizeInt,
} from "./CalculatorShell";
import { calculateMoratorium } from "@/lib/calculatorEngine";

export default function MoratoriumCalculator({ onBack }) {
  const { symbol, fmtCompact } = useCalcCurrency();
  const { toast, shareText } = useShareCalc();

  const [periodUnit, setPeriodUnit] = useState("yearly"); // "yearly" | "monthly"
  const [principal, setPrincipal] = useState("1000000");
  const [annualRate, setAnnualRate] = useState("10");
  const [periodValue, setPeriodValue] = useState("10");
  const [moratoriumMonths, setMoratoriumMonths] = useState("6");
  const [option, setOption] = useState("keep_emi"); // "keep_emi" | "keep_tenure"
  const [paidInstallments, setPaidInstallments] = useState("0");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handlePeriodUnitChange = (nextUnit) => {
    if (nextUnit === periodUnit) return;
    const raw = Number(periodValue) || 0;
    if (raw > 0) {
      if (nextUnit === "monthly") {
        setPeriodValue(String(Math.min(360, Math.round(raw * 12))));
      } else {
        setPeriodValue(String(Math.max(1, Math.round(raw / 12))));
      }
    }
    setPeriodUnit(nextUnit);
  };

  const handleReset = () => {
    setPrincipal("");
    setAnnualRate("");
    setPeriodValue("");
    setMoratoriumMonths("");
    setPaidInstallments("0");
    setOption("keep_emi");
    setResult(null);
    setError("");
  };

  const handleCalculate = () => {
    setError("");
    const p = Number(principal) || 0;
    const r = Number(annualRate) || 0;
    const rawPeriod = Number(periodValue) || 0;
    const totalMonths = periodUnit === "yearly" ? Math.round(rawPeriod * 12) : Math.round(rawPeriod);
    const mor = Number(moratoriumMonths) || 0;
    const paid = Number(paidInstallments) || 0;

    if (p <= 0 || r <= 0 || totalMonths <= 0) {
      setError("Please enter valid loan amount, interest rate, and tenure.");
      setResult(null);
      return;
    }
    if (paid >= totalMonths) {
      setError("Paid installments must be less than total loan months.");
      setResult(null);
      return;
    }

    const res = calculateMoratorium({
      principal: p,
      annualRate: r,
      totalMonths,
      moratoriumMonths: mor,
      option,
      paidInstallments: paid,
    });
    setResult(res);
  };

  const handleShare = () => {
    if (!result) return;
    const { noMoratorium, moratorium } = result;
    const lines = [
      "Moratorium Loan Comparison",
      `Loan Amount: ${fmtCompact(Number(principal) || 0)}`,
      `Interest Rate: ${annualRate}%`,
      `Period: ${periodValue} ${periodUnit === "yearly" ? "Years" : "Months"}`,
      `Moratorium Period: ${moratoriumMonths || 0} Months`,
      `Installments Paid: ${paidInstallments || 0}`,
      `Mode: ${option === "keep_emi" ? "No Change in Monthly EMI" : "No Change in Loan Tenure"}`,
      "",
      "No Moratorium:",
      `• Principal: ${fmtCompact(noMoratorium.totalPrincipal)}`,
      `• Monthly EMI: ${fmtCompact(noMoratorium.monthlyEmi)}`,
      `• Tenure: ${noMoratorium.tenure} Months`,
      `• Total Interest: ${fmtCompact(noMoratorium.totalInterest)}`,
      `• Total Payment: ${fmtCompact(noMoratorium.totalPayment)}`,
      "",
      "Revised After Moratorium:",
      `• Compounded Principal: ${fmtCompact(moratorium.totalPrincipal)}`,
      `• Monthly EMI: ${fmtCompact(moratorium.monthlyEmi)}`,
      `• Tenure: ${moratorium.isAmortizable ? `${moratorium.tenure} Months` : "Not amortizable"}`,
      `• Total Interest: ${moratorium.isAmortizable ? fmtCompact(moratorium.totalInterest) : "N/A"}`,
      `• Total Payment: ${moratorium.isAmortizable ? fmtCompact(moratorium.totalPayment) : "N/A"}`,
    ];
    shareText({ title: "Moratorium Calculator Summary", text: lines.join("\n") });
  };

  return (
    <div className="space-y-4">
      <CalcHeader
        title="Moratorium Calculator"
        eyebrow="REPAYMENT HOLIDAY"
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
          label="Loan Amount"
          prefix={symbol}
          value={principal}
          onChange={(v) => setPrincipal(sanitizeDecimal(v))}
          onClear={() => setPrincipal("")}
          placeholder="Enter amount"
        />
        <CalcFieldRow
          label="Interest (%)"
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
          label={periodUnit === "yearly" ? "Loan Period (Years)" : "Loan Period (Months)"}
          value={periodValue}
          inputMode="numeric"
          onChange={(v) => {
            const val = sanitizeInt(v);
            const max = periodUnit === "yearly" ? 30 : 360;
            if (!val || Number(val) <= max) setPeriodValue(val);
          }}
          onClear={() => setPeriodValue("")}
          placeholder={periodUnit === "yearly" ? "Max 30 years" : "Max 360 months"}
        />
        <CalcFieldRow
          label="Moratorium Period (Months)"
          value={moratoriumMonths}
          inputMode="numeric"
          onChange={(v) => {
            const val = sanitizeInt(v);
            if (!val || Number(val) <= 60) setMoratoriumMonths(val);
          }}
          onClear={() => setMoratoriumMonths("")}
          placeholder="Max 60 months"
        />
        <CalcFieldRow
          label="Installments Already Paid"
          value={paidInstallments}
          inputMode="numeric"
          onChange={(v) => {
            const val = sanitizeInt(v);
            if (!val || Number(val) <= 360) setPaidInstallments(val);
          }}
          onClear={() => setPaidInstallments("0")}
          placeholder="0"
        />
      </CalcCard>

      <div className="space-y-1.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--home-text-muted)] px-1">
          Repayment Option
        </p>
        <CalcSegmentedTabs
          value={option}
          onChange={setOption}
          options={[
            { value: "keep_emi", label: "No Change in EMI" },
            { value: "keep_tenure", label: "No Change in Tenure" },
          ]}
        />
      </div>

      <CalcActionButtons onReset={handleReset} onCalculate={handleCalculate} />

      {result && (
        <div className="space-y-3 pt-1">
          {!result.moratorium.isAmortizable && (
            <div className="px-4 py-3 rounded-2xl bg-[var(--home-destructive)]/10 border border-[var(--home-destructive)]/30 text-xs font-semibold text-[var(--home-destructive)]">
              {result.moratorium.errorReason}
            </div>
          )}

          <CalcCard>
            <div className="grid grid-cols-3 gap-2 px-4 py-3 bg-[var(--home-track)]/70 border-b border-[var(--home-border)] text-xs font-bold text-[var(--home-text)]">
              <span>Comparison</span>
              <span className="text-right">No Moratorium</span>
              <span className="text-right text-[var(--home-accent)]">Revised Plan</span>
            </div>
            <div className="divide-y divide-[var(--home-border)]">
              {[
                {
                  label: "Principal (Compounded)",
                  no: fmtCompact(result.noMoratorium.totalPrincipal),
                  rev: fmtCompact(result.moratorium.totalPrincipal),
                },
                {
                  label: "Monthly EMI",
                  no: fmtCompact(result.noMoratorium.monthlyEmi),
                  rev: fmtCompact(result.moratorium.monthlyEmi),
                },
                {
                  label: "Tenure (Months)",
                  no: String(result.noMoratorium.tenure),
                  rev: result.moratorium.isAmortizable
                    ? String(result.moratorium.tenure)
                    : "Unpayable",
                },
                {
                  label: "Total Interest",
                  no: fmtCompact(result.noMoratorium.totalInterest),
                  rev: result.moratorium.isAmortizable
                    ? fmtCompact(result.moratorium.totalInterest)
                    : "N/A",
                },
                {
                  label: "Total Payment",
                  no: fmtCompact(result.noMoratorium.totalPayment),
                  rev: result.moratorium.isAmortizable
                    ? fmtCompact(result.moratorium.totalPayment)
                    : "N/A",
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-3 gap-2 px-4 py-3 text-xs sm:text-sm items-center"
                >
                  <span className="text-[var(--home-text-secondary)]">{row.label}</span>
                  <span className="font-mono-num text-right font-semibold text-[var(--home-text)]">
                    {row.no}
                  </span>
                  <span className="font-mono-num text-right font-bold text-[var(--home-accent)]">
                    {row.rev}
                  </span>
                </div>
              ))}
            </div>
          </CalcCard>
        </div>
      )}
    </div>
  );
}

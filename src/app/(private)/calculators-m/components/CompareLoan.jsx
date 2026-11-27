"use client";

import React, { useState, useMemo } from "react";
import {
  useCalcCurrency,
  useShareCalc,
  CalcHeader,
  CalcCard,
  CalcFieldRow,
  CalcActionButtons,
  ShareIconButton,
  CalcToast,
  sanitizeDecimal,
} from "@/components/calculators/v2/CalculatorShell";
import { compareLoans } from "@/lib/calculatorEngine";

export default function CompareLoan({ onBack }) {
  const { symbol, fmt } = useCalcCurrency();
  const { toast, shareText } = useShareCalc();

  const [loan1Amount, setLoan1Amount] = useState("100000");
  const [loan1Rate, setLoan1Rate] = useState("9.5");
  const [loan1PeriodType, setLoan1PeriodType] = useState("monthly");
  const [loan1Period, setLoan1Period] = useState("12");

  const [loan2Amount, setLoan2Amount] = useState("100000");
  const [loan2Rate, setLoan2Rate] = useState("11");
  const [loan2PeriodType, setLoan2PeriodType] = useState("monthly");
  const [loan2Period, setLoan2Period] = useState("12");

  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState("");

  const comparison = useMemo(
    () =>
      compareLoans(
        {
          principal: Number(loan1Amount) || 0,
          annualRate: Number(loan1Rate) || 0,
          periodType: loan1PeriodType,
          period: Number(loan1Period) || 0,
        },
        {
          principal: Number(loan2Amount) || 0,
          annualRate: Number(loan2Rate) || 0,
          periodType: loan2PeriodType,
          period: Number(loan2Period) || 0,
        },
      ),
    [loan1Amount, loan1Rate, loan1PeriodType, loan1Period, loan2Amount, loan2Rate, loan2PeriodType, loan2Period],
  );

  const handleReset = () => {
    setLoan1Amount("");
    setLoan1Rate("");
    setLoan1PeriodType("monthly");
    setLoan1Period("");
    setLoan2Amount("");
    setLoan2Rate("");
    setLoan2PeriodType("monthly");
    setLoan2Period("");
    setError("");
    setShowDetails(false);
  };

  const handleCalculate = () => {
    setError("");
    if (
      !Number(loan1Amount) ||
      !Number(loan1Rate) ||
      !Number(loan1Period) ||
      !Number(loan2Amount) ||
      !Number(loan2Rate) ||
      !Number(loan2Period)
    ) {
      setError("Please fill in amount, rate, and tenure for both Loan 1 and Loan 2.");
      return;
    }
    setShowDetails(true);
  };

  const handleShare = () => {
    const { loan1, loan2, differences } = comparison;
    const text = [
      "Loan Comparison Details",
      `• Loan 1: ${fmt(loan1.principal)} @ ${loan1.rate}% for ${loan1.totalMonths}m -> EMI ${fmt(loan1.emi)}, Interest ${fmt(loan1.totalInterest)}, Total ${fmt(loan1.totalPayment)}`,
      `• Loan 2: ${fmt(loan2.principal)} @ ${loan2.rate}% for ${loan2.totalMonths}m -> EMI ${fmt(loan2.emi)}, Interest ${fmt(loan2.totalInterest)}, Total ${fmt(loan2.totalPayment)}`,
      `• EMI Diff: ${fmt(differences.emiDiff)}`,
      `• Interest Diff: ${fmt(differences.interestDiff)}`,
      `• Total Diff: ${fmt(differences.paymentDiff)}`,
    ].join("\n");
    shareText({ title: "Loan Comparison", text });
  };

  if (showDetails) {
    const { loan1, loan2, differences } = comparison;
    const rows = [
      { label: "Principal", v1: fmt(loan1.principal), v2: fmt(loan2.principal), diff: "—" },
      { label: "Rate (%)", v1: `${loan1.rate}%`, v2: `${loan2.rate}%`, diff: `${Math.abs(loan1.rate - loan2.rate).toFixed(2)}%` },
      { label: "Tenure", v1: `${loan1.totalMonths}m`, v2: `${loan2.totalMonths}m`, diff: `${Math.abs(loan1.totalMonths - loan2.totalMonths)}m` },
      { label: "Monthly EMI", v1: fmt(loan1.emi), v2: fmt(loan2.emi), diff: fmt(differences.emiDiff) },
      { label: "Total Interest", v1: fmt(loan1.totalInterest), v2: fmt(loan2.totalInterest), diff: fmt(differences.interestDiff) },
      { label: "Total Payment", v1: fmt(loan1.totalPayment), v2: fmt(loan2.totalPayment), diff: fmt(differences.paymentDiff) },
    ];

    return (
      <div className="space-y-4">
        <CalcHeader
          title="Comparison Results"
          eyebrow="SIDE BY SIDE"
          onBack={() => setShowDetails(false)}
          backLabel="Edit"
          rightAction={<ShareIconButton onClick={handleShare} />}
        />
        <CalcToast message={toast} />

        {differences.lowerTotalOption !== "equal" && (
          <CalcCard className="p-3.5 text-center text-xs font-bold text-[var(--home-income)]">
            {differences.lowerTotalOption === "loan1" ? "Loan 1" : "Loan 2"} saves{" "}
            {fmt(differences.paymentDiff)} in total payment
          </CalcCard>
        )}

        <CalcCard>
          <div className="grid grid-cols-4 gap-2 px-3 py-3 bg-[var(--home-track)]/70 border-b border-[var(--home-border)] text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--home-text-muted)]">
            <span>Metric</span>
            <span className="text-right text-[var(--home-text)]">Loan 1</span>
            <span className="text-right text-[var(--home-accent)]">Loan 2</span>
            <span className="text-right">Diff</span>
          </div>
          <div className="divide-y divide-[var(--home-border)]">
            {rows.map((r) => (
              <div key={r.label} className="grid grid-cols-4 gap-2 px-3 py-3 text-xs items-center">
                <span className="text-[var(--home-text-secondary)]">{r.label}</span>
                <span className="font-mono-num font-bold text-right text-[var(--home-text)]">{r.v1}</span>
                <span className="font-mono-num font-bold text-right text-[var(--home-accent)]">{r.v2}</span>
                <span className="font-mono-num font-semibold text-right text-[var(--home-income)]">{r.diff}</span>
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
        title="Compare Loans"
        eyebrow="OFFER COMPARISON"
        onBack={onBack}
        backLabel="Calculators"
      />

      {error && (
        <div className="px-4 py-2.5 rounded-2xl bg-[var(--home-destructive)]/10 border border-[var(--home-destructive)]/30 text-xs font-semibold text-[var(--home-destructive)]">
          {error}
        </div>
      )}

      {[
        {
          label: "Loan 1",
          amount: loan1Amount,
          setAmount: setLoan1Amount,
          rate: loan1Rate,
          setRate: setLoan1Rate,
          type: loan1PeriodType,
          setType: setLoan1PeriodType,
          period: loan1Period,
          setPeriod: setLoan1Period,
        },
        {
          label: "Loan 2",
          amount: loan2Amount,
          setAmount: setLoan2Amount,
          rate: loan2Rate,
          setRate: setLoan2Rate,
          type: loan2PeriodType,
          setType: setLoan2PeriodType,
          period: loan2Period,
          setPeriod: setLoan2Period,
        },
      ].map((loan) => (
        <CalcCard key={loan.label} className="divide-y divide-[var(--home-border)]">
          <div className="px-4 py-2.5 bg-[var(--home-track)]/60 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--home-text)]">
              {loan.label}
            </span>
            <div className="flex gap-1 p-0.5 rounded-lg bg-[var(--home-card)] border border-[var(--home-border)]">
              {["monthly", "yearly"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => loan.setType(t)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer ${
                    loan.type === t
                      ? "bg-[var(--home-accent)] text-[var(--home-on-accent)]"
                      : "text-[var(--home-text-secondary)]"
                  }`}
                >
                  {t === "monthly" ? "Mo" : "Yr"}
                </button>
              ))}
            </div>
          </div>
          <CalcFieldRow
            label="Loan Amount"
            prefix={symbol}
            value={loan.amount}
            onChange={(v) => loan.setAmount(sanitizeDecimal(v))}
            onClear={() => loan.setAmount("")}
          />
          <CalcFieldRow
            label="Interest Rate (%)"
            suffix="%"
            value={loan.rate}
            onChange={(v) => loan.setRate(sanitizeDecimal(v))}
            onClear={() => loan.setRate("")}
          />
          <CalcFieldRow
            label={loan.type === "yearly" ? "Period (Years)" : "Period (Months)"}
            value={loan.period}
            onChange={(v) => loan.setPeriod(sanitizeDecimal(v))}
            onClear={() => loan.setPeriod("")}
          />
        </CalcCard>
      ))}

      <CalcActionButtons onReset={handleReset} onCalculate={handleCalculate} calculateLabel="Compare" />
    </div>
  );
}

"use client";

import React, { useState, useMemo } from "react";
import { HiChevronDown, HiChevronUp } from "react-icons/hi2";
import {
  useCalcCurrency,
  useShareCalc,
  CalcHeader,
  CalcSegmentedTabs,
  CalcCard,
  CalcFieldRow,
  CalcSummaryTable,
  CalcDonutBreakdown,
  ShareIconButton,
  CalcToast,
  sanitizeDecimal,
} from "@/components/calculators/v2/CalculatorShell";
import { calculateQuickLoan } from "@/lib/calculatorEngine";

export default function Qcalculator({ onBack }) {
  const { symbol, fmt, fmtCompact } = useCalcCurrency();
  const { toast, shareText } = useShareCalc();

  const [activeTab, setActiveTab] = useState("Amount");
  const [loanAmount, setLoanAmount] = useState("511087");
  const [interestRate, setInterestRate] = useState("6.5");
  const [periodYears, setPeriodYears] = useState("5");
  const [emi, setEmi] = useState("10000");

  const [showDetails, setShowDetails] = useState(false);
  const [showSchedule, setShowSchedule] = useState(true);

  const result = useMemo(
    () =>
      calculateQuickLoan({
        mode: activeTab,
        principal: Number(loanAmount) || 0,
        annualRate: Number(interestRate) || 0,
        periodYears: Number(periodYears) || 0,
        emi: Number(emi) || 0,
      }),
    [activeTab, loanAmount, interestRate, periodYears, emi],
  );

  const handleReset = () => {
    setLoanAmount("511087");
    setInterestRate("6.5");
    setPeriodYears("5");
    setEmi("10000");
    setShowDetails(false);
  };

  const handleShare = () => {
    const text = [
      "Quick Loan Calculator Details",
      `• Solved For: ${activeTab}`,
      `• Loan Amount: ${fmtCompact(result.principal)}`,
      `• Interest Rate: ${result.interestRate.toFixed(2)}%`,
      `• Period: ${result.totalMonths} Months (${(result.totalMonths / 12).toFixed(1)} Yrs)`,
      `• Monthly EMI: ${fmt(result.emi, 2)}`,
      `• Total Interest: ${fmt(result.totalInterest, 2)}`,
      `• Total Payment: ${fmt(result.totalPayment, 2)}`,
    ].join("\n");
    shareText({ title: "Quick Calculator Details", text });
  };

  if (showDetails) {
    const total = result.totalPayment || 1;
    const pRatio = result.principal / total;

    return (
      <div className="space-y-4">
        <CalcHeader
          title="Quick Calculator Details"
          eyebrow={`SOLVED: ${activeTab.toUpperCase()}`}
          onBack={() => setShowDetails(false)}
          backLabel="Edit"
          rightAction={<ShareIconButton onClick={handleShare} />}
        />
        <CalcToast message={toast} />

        <CalcSummaryTable
          rows={[
            { label: "Loan Amount", value: fmt(result.principal, 2), accent: activeTab === "Amount" },
            { label: "Interest Rate", value: `${result.interestRate.toFixed(2)}%`, accent: activeTab === "Interest" },
            {
              label: "Period",
              value: `${result.totalMonths} Months (${(result.totalMonths / 12).toFixed(1)} Yrs)`,
              accent: activeTab === "Period",
            },
            { label: "Monthly EMI", value: fmt(result.emi, 2), accent: activeTab === "EMI" },
            { label: "Total Interest", value: fmt(result.totalInterest, 2) },
            { label: "Total Payment", value: fmt(result.totalPayment, 2) },
          ]}
        />

        <CalcDonutBreakdown
          title="Principal vs Interest"
          centerLabel="Total Payment"
          centerValue={fmtCompact(result.totalPayment)}
          primaryLabel="Principal"
          primaryValue={fmtCompact(result.principal)}
          primaryRatio={pRatio}
          secondaryLabel="Total Interest"
          secondaryValue={fmtCompact(result.totalInterest)}
          secondaryRatio={1 - pRatio}
        />

        <CalcCard>
          <button
            type="button"
            onClick={() => setShowSchedule((s) => !s)}
            className="w-full px-4 py-3.5 flex items-center justify-between text-xs sm:text-sm font-bold text-[var(--home-text)] cursor-pointer"
          >
            <span>Repayment Schedule</span>
            {showSchedule ? (
              <HiChevronUp className="w-4 h-4 text-[var(--home-text-muted)]" />
            ) : (
              <HiChevronDown className="w-4 h-4 text-[var(--home-text-muted)]" />
            )}
          </button>

          {showSchedule && (
            <div className="border-t border-[var(--home-border)]">
              <div className="grid grid-cols-4 px-3 py-2 bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-bold text-center">
                <div>Month</div>
                <div>Principal</div>
                <div>Interest</div>
                <div>Balance</div>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[var(--home-border)]">
                {result.schedule.map((row, idx) =>
                  row.type === "yearly_total" ? (
                    <div
                      key={`yr-${row.year}-${idx}`}
                      className="grid grid-cols-4 px-3 py-2 text-xs font-bold text-center bg-[var(--home-track)] text-[var(--home-accent)] font-mono-num"
                    >
                      <div className="font-sans">Year {row.year}</div>
                      <div>{fmtCompact(row.principal)}</div>
                      <div>{fmtCompact(row.interest)}</div>
                      <div>{fmtCompact(row.balance)}</div>
                    </div>
                  ) : (
                    <div
                      key={`m-${row.month}`}
                      className="grid grid-cols-4 px-3 py-2 text-xs text-center font-mono-num text-[var(--home-text)]"
                    >
                      <div>{row.month}</div>
                      <div>{fmtCompact(row.principal)}</div>
                      <div>{fmtCompact(row.interest)}</div>
                      <div>{fmtCompact(row.balance)}</div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </CalcCard>
      </div>
    );
  }

  const solvedLabel =
    activeTab === "Amount"
      ? "Loan Amount"
      : activeTab === "EMI"
        ? "Monthly EMI"
        : activeTab === "Period"
          ? "Loan Period"
          : "Interest Rate";

  const solvedDisplay =
    activeTab === "Amount"
      ? fmtCompact(result.principal)
      : activeTab === "EMI"
        ? fmt(result.emi, 2)
        : activeTab === "Period"
          ? `${result.totalMonths} Months`
          : `${result.interestRate.toFixed(2)}%`;

  return (
    <div className="space-y-4">
      <CalcHeader
        title="Quick Calculator"
        eyebrow="SOLVE ANY VARIABLE"
        onBack={onBack}
        backLabel="Calculators"
        rightAction={
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-bold text-[var(--home-text-secondary)] hover:text-[var(--home-text)] cursor-pointer"
          >
            Reset
          </button>
        }
      />

      <CalcSegmentedTabs
        value={activeTab}
        onChange={setActiveTab}
        options={[
          { value: "EMI", label: "EMI" },
          { value: "Amount", label: "Amount" },
          { value: "Period", label: "Period" },
          { value: "Interest", label: "Interest" },
        ]}
      />

      <CalcCard className="p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--home-text-muted)]">
            Solved {solvedLabel}
          </p>
          <p className="font-mono-num text-2xl font-bold text-[var(--home-accent)] mt-0.5">
            {solvedDisplay}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowDetails(true)}
          className="px-4 py-2 rounded-2xl bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-bold cursor-pointer"
        >
          Details
        </button>
      </CalcCard>

      {result.warning && (
        <div className="px-4 py-2.5 rounded-2xl bg-[var(--home-destructive)]/10 border border-[var(--home-destructive)]/30 text-xs font-semibold text-[var(--home-destructive)]">
          {result.warning}
        </div>
      )}

      <CalcCard className="divide-y divide-[var(--home-border)]">
        {activeTab !== "Amount" && (
          <CalcFieldRow
            label="Loan Amount"
            prefix={symbol}
            value={loanAmount}
            onChange={(v) => setLoanAmount(sanitizeDecimal(v))}
            onClear={() => setLoanAmount("")}
          />
        )}
        {activeTab !== "Interest" && (
          <CalcFieldRow
            label="Interest Rate (%)"
            suffix="%"
            value={interestRate}
            onChange={(v) => setInterestRate(sanitizeDecimal(v))}
            onClear={() => setInterestRate("")}
          />
        )}
        {activeTab !== "Period" && (
          <CalcFieldRow
            label="Period (Years)"
            suffix="Yrs"
            value={periodYears}
            onChange={(v) => setPeriodYears(sanitizeDecimal(v))}
            onClear={() => setPeriodYears("")}
          />
        )}
        {activeTab !== "EMI" && (
          <CalcFieldRow
            label="Monthly EMI"
            prefix={symbol}
            value={emi}
            onChange={(v) => setEmi(sanitizeDecimal(v))}
            onClear={() => setEmi("")}
          />
        )}
      </CalcCard>

      <CalcSummaryTable
        rows={[
          { label: "Total Interest", value: fmt(result.totalInterest, 2) },
          { label: "Total Payment", value: fmt(result.totalPayment, 2) },
        ]}
      />
    </div>
  );
}

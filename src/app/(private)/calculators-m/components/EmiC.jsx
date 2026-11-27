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
  CalcActionButtons,
  CalcSummaryTable,
  CalcDonutBreakdown,
  ShareIconButton,
  CalcToast,
  sanitizeDecimal,
} from "@/components/calculators/v2/CalculatorShell";
import { calculateEmi } from "@/lib/calculatorEngine";

export default function EmiC({ onBack }) {
  const { symbol, fmt, fmtCompact } = useCalcCurrency();
  const { toast, shareText } = useShareCalc();

  const [loanAmount, setLoanAmount] = useState("200000");
  const [interestRate, setInterestRate] = useState("10");
  const [periodType, setPeriodType] = useState("monthly");
  const [period, setPeriod] = useState("12");
  const [processingFee, setProcessingFee] = useState("1");

  const [showDetails, setShowDetails] = useState(false);
  const [showSchedule, setShowSchedule] = useState(true);

  const data = useMemo(() => {
    const rawPeriod = Number(period) || 0;
    const tenureMonths = periodType === "yearly" ? rawPeriod * 12 : rawPeriod;
    return calculateEmi({
      principal: Number(loanAmount) || 0,
      annualRate: Number(interestRate) || 0,
      tenureMonths,
      processingFeePercent: Number(processingFee) || 0,
    });
  }, [loanAmount, interestRate, periodType, period, processingFee]);

  const handleReset = () => {
    setLoanAmount("200000");
    setInterestRate("10");
    setPeriodType("monthly");
    setPeriod("12");
    setProcessingFee("1");
    setShowDetails(false);
  };

  const handleShare = () => {
    const text = [
      "EMI Calculation Details",
      `• Loan Amount: ${fmt(data.principal, 2)}`,
      `• Interest Rate: ${data.interestRate}%`,
      `• Period: ${data.totalMonths} Months`,
      `• Monthly EMI: ${fmt(data.emi, 2)}`,
      `• Total Interest: ${fmt(data.totalInterest, 2)}`,
      `• Processing Fees: ${fmt(data.processingFeeAmount, 2)}`,
      `• Total Payment: ${fmt(data.totalPayment, 2)}`,
    ].join("\n");
    shareText({ title: "EMI Calculator Details", text });
  };

  if (showDetails) {
    const total = data.totalPayment || 1;
    const pRatio = data.principal / total;

    return (
      <div className="space-y-4">
        <CalcHeader
          title="EMI Details"
          eyebrow="REPAYMENT SUMMARY"
          onBack={() => setShowDetails(false)}
          backLabel="Edit"
          rightAction={<ShareIconButton onClick={handleShare} />}
        />
        <CalcToast message={toast} />

        <CalcSummaryTable
          rows={[
            { label: "Loan Amount", value: fmt(data.principal, 2) },
            { label: "Interest Rate", value: `${data.interestRate}%` },
            { label: "Period", value: `${data.totalMonths} Months` },
            { label: "Monthly EMI", value: fmt(data.emi, 2), accent: true },
            { label: "Total Interest", value: fmt(data.totalInterest, 2) },
            { label: "Processing Fees", value: fmt(data.processingFeeAmount, 2) },
            { label: "Total Payment", value: fmt(data.totalPayment, 2) },
          ]}
        />

        <CalcDonutBreakdown
          title="Loan Breakdown"
          centerLabel="Total Payable"
          centerValue={fmtCompact(data.totalPayment)}
          primaryLabel="Principal"
          primaryValue={fmtCompact(data.principal)}
          primaryRatio={pRatio}
          secondaryLabel="Total Interest"
          secondaryValue={fmtCompact(data.totalInterest)}
          secondaryRatio={1 - pRatio}
        />

        <CalcCard>
          <button
            type="button"
            onClick={() => setShowSchedule((s) => !s)}
            className="w-full px-4 py-3.5 flex items-center justify-between text-xs sm:text-sm font-bold text-[var(--home-text)] cursor-pointer"
          >
            <span>Monthly Amortization ({data.schedule.length} Months)</span>
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
                {data.schedule.map((row) => (
                  <div
                    key={row.month}
                    className="grid grid-cols-4 px-3 py-2 text-xs text-center font-mono-num text-[var(--home-text)]"
                  >
                    <div>{row.month}</div>
                    <div>{fmtCompact(row.principal)}</div>
                    <div>{fmtCompact(row.interest)}</div>
                    <div>{fmtCompact(row.balance)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CalcCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CalcHeader
        title="EMI Calculator"
        eyebrow="LOAN INSTALLMENT"
        onBack={onBack}
        backLabel="Calculators"
      />

      <CalcSegmentedTabs
        value={periodType}
        onChange={setPeriodType}
        options={[
          { value: "monthly", label: "Months" },
          { value: "yearly", label: "Years" },
        ]}
      />

      <CalcCard className="divide-y divide-[var(--home-border)]">
        <CalcFieldRow
          label="Loan Amount"
          prefix={symbol}
          value={loanAmount}
          onChange={(v) => setLoanAmount(sanitizeDecimal(v))}
          onClear={() => setLoanAmount("")}
          placeholder="Enter amount"
        />
        <CalcFieldRow
          label="Interest Rate (%)"
          suffix="%"
          value={interestRate}
          onChange={(v) => setInterestRate(sanitizeDecimal(v))}
          onClear={() => setInterestRate("")}
          placeholder="Ex: 10%"
        />
        <CalcFieldRow
          label={periodType === "yearly" ? "Tenure (Years)" : "Tenure (Months)"}
          value={period}
          onChange={(v) => setPeriod(sanitizeDecimal(v))}
          onClear={() => setPeriod("")}
          placeholder={periodType === "yearly" ? "Years" : "Months"}
        />
        <CalcFieldRow
          label="Processing Fee (%)"
          suffix="%"
          value={processingFee}
          onChange={(v) => setProcessingFee(sanitizeDecimal(v))}
          onClear={() => setProcessingFee("")}
          placeholder="0"
        />
      </CalcCard>

      <CalcActionButtons onReset={handleReset} onCalculate={() => setShowDetails(true)} />

      <CalcCard className="p-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--home-text-muted)]">
            Monthly EMI Preview
          </p>
          <p className="font-mono-num text-xl font-bold text-[var(--home-accent)] mt-0.5">
            {fmt(data.emi, 2)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowDetails(true)}
          className="px-3.5 py-2 rounded-full bg-[var(--home-track)] text-xs font-bold text-[var(--home-text)] hover:opacity-85 cursor-pointer"
        >
          View Breakdown
        </button>
      </CalcCard>
    </div>
  );
}

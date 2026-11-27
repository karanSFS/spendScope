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
  sanitizeInt,
} from "@/components/calculators/v2/CalculatorShell";
import { calculateRd } from "@/lib/calculatorEngine";

export default function RdCalculator({ onBack }) {
  const { symbol, fmt, fmtCompact } = useCalcCurrency();
  const { toast, shareText } = useShareCalc();

  const [monthlyAmount, setMonthlyAmount] = useState("5000");
  const [interestRate, setInterestRate] = useState("6.5");
  const [periodType, setPeriodType] = useState("Monthly");
  const [period, setPeriod] = useState("12");
  const [showDetails, setShowDetails] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(true);

  const data = useMemo(() => {
    const rawPeriod = Number(period) || 12;
    const tenureMonths = periodType === "Yearly" ? rawPeriod * 12 : rawPeriod;
    return calculateRd({
      monthlyDeposit: Number(monthlyAmount) || 0,
      annualRate: Number(interestRate) || 0,
      tenureMonths,
    });
  }, [monthlyAmount, interestRate, periodType, period]);

  const handleReset = () => {
    setMonthlyAmount("");
    setInterestRate("");
    setPeriodType("Monthly");
    setPeriod("");
    setShowDetails(false);
  };

  const handleCalculate = () => {
    if (!monthlyAmount && !interestRate && !period) {
      setMonthlyAmount("5000");
      setInterestRate("6.5");
      setPeriod("12");
    }
    setShowDetails(true);
  };

  const handleShare = () => {
    const text = [
      "Recurring Deposit (RD) Summary",
      `• Monthly Deposit: ${fmt(data.monthlyDeposit, 2)}`,
      `• Tenure: ${data.totalMonths} Months`,
      `• Interest Rate: ${data.interestRate}%`,
      `• Total Investment: ${fmt(data.principal, 2)}`,
      `• Total Interest: ${fmt(data.totalInterest, 2)}`,
      `• Maturity Amount: ${fmt(data.maturityAmount, 2)}`,
      `• Maturity Date: ${data.maturityDate}`,
    ].join("\n");
    shareText({ title: "RD Calculator Details", text });
  };

  if (showDetails) {
    const total = data.maturityAmount || 1;
    const pRatio = data.principal / total;

    return (
      <div className="space-y-4">
        <CalcHeader
          title="RD Details"
          eyebrow="RECURRING DEPOSIT"
          onBack={() => setShowDetails(false)}
          backLabel="Edit"
          rightAction={<ShareIconButton onClick={handleShare} />}
        />
        <CalcToast message={toast} />

        <CalcSummaryTable
          rows={[
            { label: "Monthly Deposit", value: fmt(data.monthlyDeposit, 2) },
            { label: "Tenure", value: `${data.totalMonths} Months` },
            { label: "Total Investment", value: fmt(data.principal, 2) },
            { label: "Interest Rate", value: `${data.interestRate}%` },
            { label: "Total Interest", value: fmt(data.totalInterest, 2), positive: true },
            { label: "Maturity Amount", value: fmt(data.maturityAmount, 2), accent: true },
            { label: "Maturity Date", value: data.maturityDate },
          ]}
        />

        <CalcDonutBreakdown
          title="RD Split"
          centerLabel="Maturity Value"
          centerValue={fmtCompact(data.maturityAmount)}
          primaryLabel="Invested"
          primaryValue={fmtCompact(data.principal)}
          primaryRatio={pRatio}
          secondaryLabel="Interest"
          secondaryValue={fmtCompact(data.totalInterest)}
          secondaryRatio={1 - pRatio}
        />

        <CalcCard>
          <button
            type="button"
            onClick={() => setShowBreakdown((s) => !s)}
            className="w-full px-4 py-3.5 flex items-center justify-between text-xs sm:text-sm font-bold text-[var(--home-text)] cursor-pointer"
          >
            <span>Yearly Breakdown</span>
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
                <div>Invested</div>
                <div>Interest</div>
                <div>Closing</div>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[var(--home-border)]">
                {data.schedule.map((row) => (
                  <div
                    key={row.year}
                    className="grid grid-cols-4 px-3 py-2 text-xs text-center font-mono-num text-[var(--home-text)]"
                  >
                    <div>{row.year}</div>
                    <div>{fmtCompact(row.invested)}</div>
                    <div>{fmtCompact(row.interest)}</div>
                    <div>{fmtCompact(row.closing)}</div>
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
        title="RD Calculator"
        eyebrow="RECURRING DEPOSIT"
        onBack={onBack}
        backLabel="Calculators"
      />

      <CalcSegmentedTabs
        value={periodType}
        onChange={setPeriodType}
        options={[
          { value: "Monthly", label: "Months" },
          { value: "Yearly", label: "Years" },
        ]}
      />

      <CalcCard className="divide-y divide-[var(--home-border)]">
        <CalcFieldRow
          label="Monthly Amount"
          prefix={symbol}
          value={monthlyAmount}
          onChange={(v) => setMonthlyAmount(sanitizeDecimal(v))}
          onClear={() => setMonthlyAmount("")}
          placeholder="5000"
        />
        <CalcFieldRow
          label="Interest Rate (%)"
          suffix="%"
          value={interestRate}
          onChange={(v) => setInterestRate(sanitizeDecimal(v))}
          onClear={() => setInterestRate("")}
          placeholder="6.5"
        />
        <CalcFieldRow
          label={periodType === "Yearly" ? "Period (Years)" : "Period (Months)"}
          inputMode="numeric"
          value={period}
          onChange={(v) => setPeriod(sanitizeInt(v))}
          onClear={() => setPeriod("")}
          placeholder={periodType === "Yearly" ? "Years" : "Months"}
        />
      </CalcCard>

      <CalcActionButtons onReset={handleReset} onCalculate={handleCalculate} />
    </div>
  );
}

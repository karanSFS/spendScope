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
import { calculateFd } from "@/lib/calculatorEngine";

const DEPOSIT_TYPES = [
  { value: "Reinvestment/Cumulative", label: "Cumulative" },
  { value: "Quarterly Payout", label: "Quarterly" },
  { value: "Monthly Payout", label: "Monthly" },
  { value: "Short Term", label: "Short Term" },
];

export default function FdCalculator({ onBack }) {
  const { symbol, fmt, fmtCompact } = useCalcCurrency();
  const { toast, shareText } = useShareCalc();

  const [depositType, setDepositType] = useState("Reinvestment/Cumulative");
  const [amount, setAmount] = useState("100000");
  const [interestRate, setInterestRate] = useState("7");
  const [years, setYears] = useState("5");
  const [months, setMonths] = useState("");
  const [days, setDays] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(true);

  const isShortTerm = depositType === "Short Term";

  const handleDepositTypeChange = (nextType) => {
    setDepositType(nextType);
    if (nextType === "Short Term") {
      setYears("");
      setMonths("");
      if (!days) setDays("180");
    } else if (!years && !months && !days) {
      setYears("5");
    }
  };

  const data = useMemo(
    () =>
      calculateFd({
        principal: amount !== "" ? Number(amount) || 0 : 100000,
        annualRate: interestRate !== "" ? Number(interestRate) || 0 : 7,
        depositType,
        years: Number(years) || 0,
        months: Number(months) || 0,
        days: Number(days) || 0,
      }),
    [amount, interestRate, depositType, years, months, days],
  );

  const handleReset = () => {
    setDepositType("Reinvestment/Cumulative");
    setAmount("100000");
    setInterestRate("7");
    setYears("5");
    setMonths("");
    setDays("");
    setShowDetails(false);
  };

  const handleCalculate = () => {
    if (!amount && !interestRate) {
      setAmount("100000");
      setInterestRate("7");
      if (isShortTerm) setDays("180");
      else setYears("5");
    }
    setShowDetails(true);
  };

  const handleShare = () => {
    const text = [
      "Fixed Deposit (FD) Summary",
      `• Deposit Type: ${depositType}`,
      `• Principal: ${fmt(data.principal, 2)}`,
      `• Interest Rate: ${data.interestRate}%`,
      `• Maturity Amount: ${fmt(data.maturityAmount, 2)}`,
      `• Total Interest: ${fmt(data.totalInterest, 2)}`,
      `• Maturity Date: ${data.maturityDate}`,
    ].join("\n");
    shareText({ title: "FD Calculator Details", text });
  };

  if (showDetails) {
    const total = data.maturityAmount || 1;
    const pRatio = data.principal / total;

    return (
      <div className="space-y-4">
        <CalcHeader
          title="FD Details"
          eyebrow={depositType.toUpperCase()}
          onBack={() => setShowDetails(false)}
          backLabel="Edit"
          rightAction={<ShareIconButton onClick={handleShare} />}
        />
        <CalcToast message={toast} />

        <CalcSummaryTable
          rows={[
            { label: "Total Investment", value: fmt(data.principal, 2) },
            { label: "Interest Rate", value: `${data.interestRate}%` },
            ...(data.periodicPayout > 0
              ? [
                  {
                    label:
                      depositType === "Monthly Payout"
                        ? "Monthly Interest Payout"
                        : "Quarterly Interest Payout",
                    value: fmt(data.periodicPayout, 2),
                    accent: true,
                  },
                ]
              : []),
            { label: "Total Interest", value: fmt(data.totalInterest, 2), positive: true },
            { label: "Maturity Amount", value: fmt(data.maturityAmount, 2), accent: true },
            { label: "Maturity Date", value: data.maturityDate },
          ]}
        />

        <CalcDonutBreakdown
          title="Maturity Split"
          centerLabel="Maturity Value"
          centerValue={fmtCompact(data.maturityAmount)}
          primaryLabel="Principal"
          primaryValue={fmtCompact(data.principal)}
          primaryRatio={pRatio}
          secondaryLabel="Total Interest"
          secondaryValue={fmtCompact(data.totalInterest)}
          secondaryRatio={1 - pRatio}
        />

        {!isShortTerm && (
          <CalcCard>
            <button
              type="button"
              onClick={() => setShowBreakdown((s) => !s)}
              className="w-full px-4 py-3.5 flex items-center justify-between text-xs sm:text-sm font-bold text-[var(--home-text)] cursor-pointer"
            >
              <span>Yearly Growth Schedule ({data.schedule.length} Years)</span>
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
                  <div>Opening</div>
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
                      <div>{fmtCompact(row.opening)}</div>
                      <div>{fmtCompact(row.interest)}</div>
                      <div>{fmtCompact(row.closing)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CalcCard>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CalcHeader
        title="FD Calculator"
        eyebrow="FIXED DEPOSIT"
        onBack={onBack}
        backLabel="Calculators"
      />

      <CalcSegmentedTabs
        value={depositType}
        onChange={handleDepositTypeChange}
        options={DEPOSIT_TYPES}
      />

      <CalcCard className="divide-y divide-[var(--home-border)]">
        <CalcFieldRow
          label="Deposit Amount"
          prefix={symbol}
          value={amount}
          onChange={(v) => setAmount(sanitizeDecimal(v))}
          onClear={() => setAmount("")}
          placeholder="100000"
        />
        <CalcFieldRow
          label="Interest Rate (%)"
          suffix="%"
          value={interestRate}
          onChange={(v) => setInterestRate(sanitizeDecimal(v))}
          onClear={() => setInterestRate("")}
          placeholder="7.0"
        />
        <CalcFieldRow
          label="Years"
          inputMode="numeric"
          disabled={isShortTerm}
          value={isShortTerm ? "" : years}
          onChange={(v) => {
            const val = sanitizeInt(v);
            if (!val || Number(val) <= 50) setYears(val);
          }}
          onClear={() => setYears("")}
          placeholder={isShortTerm ? "Locked (Days only)" : "Max 50"}
        />
        <CalcFieldRow
          label="Months"
          inputMode="numeric"
          disabled={isShortTerm}
          value={isShortTerm ? "" : months}
          onChange={(v) => {
            const val = sanitizeInt(v);
            if (!val || Number(val) <= 11) setMonths(val);
          }}
          onClear={() => setMonths("")}
          placeholder={isShortTerm ? "Locked (Days only)" : "0–11"}
        />
        <CalcFieldRow
          label="Days"
          inputMode="numeric"
          value={days}
          onChange={(v) => {
            const val = sanitizeInt(v);
            if (!val || Number(val) <= 3650) setDays(val);
          }}
          onClear={() => setDays("")}
          placeholder={isShortTerm ? "e.g., 180 days" : "0"}
        />
      </CalcCard>

      <CalcActionButtons onReset={handleReset} onCalculate={handleCalculate} />
    </div>
  );
}

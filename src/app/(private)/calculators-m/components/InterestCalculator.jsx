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
import { calculateInterest } from "@/lib/calculatorEngine";
import { toLocalDateKey, parseLocalDate } from "@/lib/dateUtils";

const COMPOUND_INTERVALS = [
  "None",
  "Annually",
  "Semi-Annually",
  "Quarterly",
  "Monthly",
  "Daily",
];

export default function InterestCalculator({ onBack }) {
  const { symbol, fmt, fmtCompact } = useCalcCurrency();
  const { toast, shareText } = useShareCalc();

  const today = toLocalDateKey(new Date());
  const nextYearDate = new Date();
  nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);
  const nextYear = toLocalDateKey(nextYearDate);

  const [activeTab, setActiveTab] = useState("Period");
  const [amount, setAmount] = useState("10000");
  const [interestType, setInterestType] = useState("Yearly");
  const [interestRate, setInterestRate] = useState("6");
  const [compoundInterval, setCompoundInterval] = useState("None");
  const [years, setYears] = useState("5");
  const [months, setMonths] = useState("");
  const [days, setDays] = useState("");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(nextYear);

  const [showDetails, setShowDetails] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(true);

  const data = useMemo(() => {
    let totalYears = 1;
    if (activeTab === "Period") {
      const y = Number(years) || 0;
      const m = Number(months) || 0;
      const d = Number(days) || 0;
      totalYears = y === 0 && m === 0 && d === 0 ? 1 : y + m / 12 + d / 365;
    } else {
      const start = parseLocalDate(fromDate);
      const end = parseLocalDate(toDate);
      const diffDays = Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
      totalYears = diffDays / 365;
    }

    return calculateInterest({
      principal: amount !== "" ? Number(amount) || 0 : 10000,
      rate: interestRate !== "" ? Number(interestRate) || 0 : 6,
      rateType: interestType,
      compoundInterval,
      totalYears,
    });
  }, [
    activeTab,
    amount,
    interestRate,
    interestType,
    compoundInterval,
    years,
    months,
    days,
    fromDate,
    toDate,
  ]);

  const handleReset = () => {
    setAmount("10000");
    setInterestType("Yearly");
    setInterestRate("6");
    setCompoundInterval("None");
    setYears("5");
    setMonths("");
    setDays("");
    setFromDate(today);
    setToDate(nextYear);
    setShowDetails(false);
  };

  const handleShare = () => {
    const text = [
      "Interest Calculation Summary",
      `• Principal: ${fmt(data.principal, 2)}`,
      `• Rate: ${data.rate}% (${data.rateType})`,
      `• Compounding: ${data.compoundInterval}`,
      `• Tenure: ${data.totalYears.toFixed(2)} Years`,
      `• Total Interest: ${fmt(data.totalInterest, 2)}`,
      `• Total Amount: ${fmt(data.totalAmount, 2)}`,
    ].join("\n");
    shareText({ title: "Interest Calculator Details", text });
  };

  if (showDetails) {
    const total = data.totalAmount || 1;
    const pRatio = data.principal / total;

    return (
      <div className="space-y-4">
        <CalcHeader
          title="Interest Summary"
          eyebrow={compoundInterval === "None" ? "SIMPLE INTEREST" : `${compoundInterval.toUpperCase()} COMPOUND`}
          onBack={() => setShowDetails(false)}
          backLabel="Edit"
          rightAction={<ShareIconButton onClick={handleShare} />}
        />
        <CalcToast message={toast} />

        <CalcSummaryTable
          rows={[
            { label: "Principal Amount", value: fmt(data.principal, 2) },
            { label: "Interest Rate", value: `${data.rate}% (${data.rateType})` },
            { label: "Compounding", value: data.compoundInterval },
            { label: "Total Interest", value: fmt(data.totalInterest, 2), positive: true },
            { label: "Total Amount", value: fmt(data.totalAmount, 2), accent: true },
          ]}
        />

        <CalcDonutBreakdown
          title="Growth Breakdown"
          centerLabel="Total Value"
          centerValue={fmtCompact(data.totalAmount)}
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
            onClick={() => setShowBreakdown((s) => !s)}
            className="w-full px-4 py-3.5 flex items-center justify-between text-xs sm:text-sm font-bold text-[var(--home-text)] cursor-pointer"
          >
            <span>Yearly Schedule ({data.schedule.length} Years)</span>
            {showBreakdown ? (
              <HiChevronUp className="w-4 h-4 text-[var(--home-text-muted)]" />
            ) : (
              <HiChevronDown className="w-4 h-4 text-[var(--home-text-muted)]" />
            )}
          </button>

          {showBreakdown && (
            <div className="border-t border-[var(--home-border)]">
              <div className="grid grid-cols-3 px-3 py-2 bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-bold text-center">
                <div>Year</div>
                <div>Cumulative Interest</div>
                <div>Total Balance</div>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[var(--home-border)]">
                {data.schedule.map((row) => (
                  <div
                    key={row.year}
                    className="grid grid-cols-3 px-3 py-2 text-xs text-center font-mono-num text-[var(--home-text)]"
                  >
                    <div>{row.year}</div>
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
        title="Interest Calculator"
        eyebrow="SIMPLE & COMPOUND"
        onBack={onBack}
        backLabel="Calculators"
      />

      <CalcSegmentedTabs
        value={activeTab}
        onChange={setActiveTab}
        options={[
          { value: "Period", label: "By Period" },
          { value: "Date", label: "Between Dates" },
        ]}
      />

      <CalcCard className="divide-y divide-[var(--home-border)]">
        <CalcFieldRow
          label="Principal Amount"
          prefix={symbol}
          value={amount}
          onChange={(v) => setAmount(sanitizeDecimal(v))}
          onClear={() => setAmount("")}
        />

        <div className="px-4 py-3 flex items-center justify-between gap-2">
          <span className="text-xs sm:text-sm font-medium text-[var(--home-text-secondary)]">
            Rate Type
          </span>
          <div className="flex gap-1 p-0.5 rounded-xl bg-[var(--home-track)]">
            {["Yearly", "Monthly"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setInterestType(t)}
                className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  interestType === t
                    ? "bg-[var(--home-accent)] text-[var(--home-on-accent)]"
                    : "text-[var(--home-text-secondary)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <CalcFieldRow
          label="Interest Rate (%)"
          suffix="%"
          value={interestRate}
          onChange={(v) => setInterestRate(sanitizeDecimal(v))}
          onClear={() => setInterestRate("")}
        />

        <div className="px-4 py-3 flex items-center justify-between gap-2">
          <span className="text-xs sm:text-sm font-medium text-[var(--home-text-secondary)]">
            Compounding
          </span>
          <select
            value={compoundInterval}
            onChange={(e) => setCompoundInterval(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-track)] text-xs font-bold text-[var(--home-text)] outline-none"
          >
            {COMPOUND_INTERVALS.map((ci) => (
              <option key={ci} value={ci}>
                {ci}
              </option>
            ))}
          </select>
        </div>

        {activeTab === "Period" ? (
          <>
            <CalcFieldRow
              label="Years"
              inputMode="numeric"
              value={years}
              onChange={(v) => setYears(sanitizeInt(v))}
              onClear={() => setYears("")}
            />
            <CalcFieldRow
              label="Months"
              inputMode="numeric"
              value={months}
              onChange={(v) => setMonths(sanitizeInt(v))}
              onClear={() => setMonths("")}
            />
            <CalcFieldRow
              label="Days"
              inputMode="numeric"
              value={days}
              onChange={(v) => setDays(sanitizeInt(v))}
              onClear={() => setDays("")}
            />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <label className="text-xs sm:text-sm font-medium text-[var(--home-text-secondary)]">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-[var(--home-track)] px-3 py-1.5 rounded-xl font-mono-num text-xs font-semibold text-[var(--home-text)]"
              />
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <label className="text-xs sm:text-sm font-medium text-[var(--home-text-secondary)]">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-[var(--home-track)] px-3 py-1.5 rounded-xl font-mono-num text-xs font-semibold text-[var(--home-text)]"
              />
            </div>
          </>
        )}
      </CalcCard>

      <CalcActionButtons onReset={handleReset} onCalculate={() => setShowDetails(true)} />
    </div>
  );
}

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
import { calculatePpf } from "@/lib/calculatorEngine";

const FREQUENCIES = [
  { value: "Yearly", label: "Yearly" },
  { value: "Half Yearly", label: "Half Yearly" },
  { value: "Quarterly", label: "Quarterly" },
  { value: "Monthly", label: "Monthly" },
];

export default function PpfCalculator({ onBack }) {
  const { symbol, fmt, fmtCompact } = useCalcCurrency();
  const { toast, shareText } = useShareCalc();

  const [frequency, setFrequency] = useState("Yearly");
  const [investment, setInvestment] = useState("10000");
  const [interestRate, setInterestRate] = useState("7.1");
  const [period, setPeriod] = useState("15");
  const [showDetails, setShowDetails] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [warning, setWarning] = useState("");

  const data = useMemo(
    () =>
      calculatePpf({
        depositAmount: Number(investment) || 0,
        annualRate: Number(interestRate) || 0,
        frequency,
        years: Number(period) || 15,
      }),
    [frequency, investment, interestRate, period],
  );

  const handleReset = () => {
    setFrequency("Yearly");
    setInvestment("10000");
    setInterestRate("7.1");
    setPeriod("15");
    setWarning("");
    setShowDetails(false);
  };

  const handleCalculate = () => {
    const rawPeriod = Number(period) || 0;
    if (rawPeriod < 15) {
      setPeriod("15");
      setWarning("PPF requires a minimum 15-year lock-in period (adjusted to 15 years).");
    } else {
      setWarning("");
    }
    setShowDetails(true);
  };

  const handleShare = () => {
    const text = [
      "PPF Calculation Details",
      `• Frequency: ${data.frequency}`,
      `• Deposit per Period: ${fmt(data.depositAmount, 2)}`,
      `• Period: ${data.tenureYears} Years`,
      `• Interest Rate: ${data.interestRate}%`,
      `• Total Investment: ${fmt(data.principal, 2)}`,
      `• Total Interest: ${fmt(data.totalInterest, 2)}`,
      `• Maturity Amount: ${fmt(data.maturityAmount, 2)}`,
      `• Maturity Date: ${data.maturityDate}`,
    ].join("\n");
    shareText({ title: "PPF Calculator Details", text });
  };

  if (showDetails) {
    const total = data.maturityAmount || 1;
    const pRatio = data.principal / total;

    return (
      <div className="space-y-4">
        <CalcHeader
          title="PPF Details"
          eyebrow={`${data.frequency.toUpperCase()} · ANNUAL COMPOUNDING`}
          onBack={() => setShowDetails(false)}
          backLabel="Edit"
          rightAction={<ShareIconButton onClick={handleShare} />}
        />
        <CalcToast message={toast} />

        {warning && (
          <div className="px-4 py-2.5 rounded-2xl bg-[var(--home-accent)]/15 border border-[var(--home-accent)]/40 text-xs font-semibold text-[var(--home-accent)]">
            {warning}
          </div>
        )}

        <CalcSummaryTable
          rows={[
            { label: "Frequency", value: data.frequency },
            { label: "Annual Investment", value: fmt(data.annualInvestment, 2) },
            { label: "Tenure", value: `${data.tenureYears} Years` },
            { label: "Total Investment", value: fmt(data.principal, 2) },
            { label: "Interest Rate", value: `${data.interestRate}%` },
            { label: "Total Interest", value: fmt(data.totalInterest, 2), positive: true },
            { label: "Maturity Amount", value: fmt(data.maturityAmount, 2), accent: true },
            { label: "Maturity Date", value: data.maturityDate },
          ]}
        />

        <CalcDonutBreakdown
          title="PPF Maturity Split"
          centerLabel="Maturity Value"
          centerValue={fmtCompact(data.maturityAmount)}
          primaryLabel="Invested"
          primaryValue={fmtCompact(data.principal)}
          primaryRatio={pRatio}
          secondaryLabel="Interest Earned"
          secondaryValue={fmtCompact(data.totalInterest)}
          secondaryRatio={1 - pRatio}
        />

        <CalcCard>
          <button
            type="button"
            onClick={() => setShowBreakdown((s) => !s)}
            className="w-full px-4 py-3.5 flex items-center justify-between text-xs sm:text-sm font-bold text-[var(--home-text)] cursor-pointer"
          >
            <span>Yearly PPF Schedule ({data.tenureYears} Years)</span>
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
                <div>Deposited</div>
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
        title="PPF Calculator"
        eyebrow="PUBLIC PROVIDENT FUND"
        onBack={onBack}
        backLabel="Calculators"
      />

      <CalcSegmentedTabs
        value={frequency}
        onChange={setFrequency}
        options={FREQUENCIES}
      />

      {Number(period) > 0 && Number(period) < 15 && (
        <div className="px-4 py-2.5 rounded-2xl bg-[var(--home-accent)]/15 border border-[var(--home-accent)]/40 text-xs font-semibold text-[var(--home-accent)]">
          Minimum PPF tenure is 15 years (enforced on Calculate).
        </div>
      )}

      <CalcCard className="divide-y divide-[var(--home-border)]">
        <CalcFieldRow
          label={`${frequency} Deposit`}
          prefix={symbol}
          value={investment}
          onChange={(v) => setInvestment(sanitizeDecimal(v))}
          onClear={() => setInvestment("")}
          placeholder="10000"
        />
        <CalcFieldRow
          label="Interest Rate (%)"
          suffix="%"
          value={interestRate}
          onChange={(v) => setInterestRate(sanitizeDecimal(v))}
          onClear={() => setInterestRate("")}
          placeholder="7.1"
        />
        <CalcFieldRow
          label="Period (Min 15 Yrs)"
          inputMode="numeric"
          value={period}
          onChange={(v) => {
            const val = sanitizeInt(v);
            if (!val || Number(val) <= 50) setPeriod(val);
          }}
          onClear={() => setPeriod("15")}
          placeholder="15–50 Years"
        />
      </CalcCard>

      <CalcActionButtons onReset={handleReset} onCalculate={handleCalculate} />
    </div>
  );
}

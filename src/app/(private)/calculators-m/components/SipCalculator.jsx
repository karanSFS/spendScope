"use client";

import React, { useState, useMemo } from "react";
import { HiChevronDown, HiChevronUp } from "react-icons/hi2";
import {
  useCalcCurrency,
  useShareCalc,
  CalcHeader,
  CalcSegmentedTabs,
  CalcCard,
  CalcSummaryTable,
  CalcDonutBreakdown,
  ShareIconButton,
  CalcToast,
  sanitizeDecimal,
  sanitizeInt,
} from "@/components/calculators/v2/CalculatorShell";
import { calculateSip } from "@/lib/calculatorEngine";

export default function SipCalculator({ onBack }) {
  const { symbol, fmtCompact } = useCalcCurrency();
  const { toast, shareText } = useShareCalc();

  const [activeTab, setActiveTab] = useState("sip");
  const [sipAmount, setSipAmount] = useState(25000);
  const [lumpsumAmount, setLumpsumAmount] = useState(100000);
  const [expectedReturn, setExpectedReturn] = useState(12);
  const [timePeriod, setTimePeriod] = useState(10);
  const [showSchedule, setShowSchedule] = useState(false);

  const amountMax = activeTab === "sip" ? 200000 : 2000000;
  const amountStep = activeTab === "sip" ? 500 : 5000;
  const currentAmount = activeTab === "sip" ? sipAmount : lumpsumAmount;

  const setAmount = (val) => {
    const num = Math.max(0, Math.min(amountMax, Number(val) || 0));
    if (activeTab === "sip") setSipAmount(num);
    else setLumpsumAmount(num);
  };

  const data = useMemo(
    () =>
      calculateSip({
        mode: activeTab,
        amount: currentAmount,
        annualReturn: expectedReturn,
        years: timePeriod,
      }),
    [activeTab, currentAmount, expectedReturn, timePeriod],
  );

  const handleReset = () => {
    setSipAmount(25000);
    setLumpsumAmount(100000);
    setExpectedReturn(12);
    setTimePeriod(10);
  };

  const handleShare = () => {
    const text = [
      `${activeTab === "sip" ? "SIP" : "Lumpsum"} Investment Summary`,
      `• ${activeTab === "sip" ? "Monthly SIP" : "Investment"}: ${fmtCompact(currentAmount)}`,
      `• Expected Return: ${expectedReturn}% p.a.`,
      `• Period: ${timePeriod} Years`,
      `• Invested Amount: ${fmtCompact(data.investedAmount)}`,
      `• Estimated Returns: ${fmtCompact(data.estReturns)}`,
      `• Total Value: ${fmtCompact(data.totalValue)}`,
    ].join("\n");
    shareText({ title: "SIP Calculator Summary", text });
  };

  const total = data.totalValue || 1;
  const invRatio = data.investedAmount / total;

  return (
    <div className="space-y-4">
      <CalcHeader
        title="SIP Calculator"
        eyebrow="WEALTH PROJECTION"
        onBack={onBack}
        backLabel="Calculators"
        rightAction={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-bold text-[var(--home-text-secondary)] hover:text-[var(--home-text)] cursor-pointer"
            >
              Reset
            </button>
            <ShareIconButton onClick={handleShare} />
          </div>
        }
      />

      <CalcToast message={toast} />

      <CalcSegmentedTabs
        value={activeTab}
        onChange={setActiveTab}
        options={[
          { value: "sip", label: "Monthly SIP" },
          { value: "lumpsum", label: "Lumpsum" },
        ]}
      />

      <CalcCard className="p-4 sm:p-5 space-y-5">
        {/* Amount Slider + Direct Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-[var(--home-text-secondary)]">
              {activeTab === "sip" ? "Monthly Investment" : "Total Investment"}
            </span>
            <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-[var(--home-track)]">
              <span className="text-xs font-bold text-[var(--home-text-muted)]">
                {symbol}
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={String(currentAmount)}
                onChange={(e) => setAmount(sanitizeInt(e.target.value))}
                className="w-24 text-right bg-transparent outline-none font-mono-num text-sm font-bold text-[var(--home-text)]"
              />
            </div>
          </div>
          <input
            type="range"
            min={activeTab === "sip" ? 500 : 1000}
            max={amountMax}
            step={amountStep}
            value={Math.min(amountMax, currentAmount)}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full accent-[var(--home-accent)] cursor-pointer"
          />
        </div>

        {/* Return Rate Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-[var(--home-text-secondary)]">
              Expected Return Rate (p.a.)
            </span>
            <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-[var(--home-track)]">
              <input
                type="text"
                inputMode="decimal"
                value={String(expectedReturn)}
                onChange={(e) => {
                  const val = sanitizeDecimal(e.target.value);
                  setExpectedReturn(Math.min(50, Number(val) || 0));
                }}
                className="w-14 text-right bg-transparent outline-none font-mono-num text-sm font-bold text-[var(--home-text)]"
              />
              <span className="text-xs font-bold text-[var(--home-text-muted)]">%</span>
            </div>
          </div>
          <input
            type="range"
            min={1}
            max={35}
            step={0.5}
            value={Math.min(35, expectedReturn)}
            onChange={(e) => setExpectedReturn(Number(e.target.value))}
            className="w-full accent-[var(--home-accent)] cursor-pointer"
          />
        </div>

        {/* Time Period Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-[var(--home-text-secondary)]">
              Time Period
            </span>
            <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-[var(--home-track)]">
              <input
                type="text"
                inputMode="numeric"
                value={String(timePeriod)}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(40, Number(sanitizeInt(e.target.value)) || 1));
                  setTimePeriod(val);
                }}
                className="w-12 text-right bg-transparent outline-none font-mono-num text-sm font-bold text-[var(--home-text)]"
              />
              <span className="text-xs font-bold text-[var(--home-text-muted)]">Yrs</span>
            </div>
          </div>
          <input
            type="range"
            min={1}
            max={40}
            step={1}
            value={timePeriod}
            onChange={(e) => setTimePeriod(Number(e.target.value))}
            className="w-full accent-[var(--home-accent)] cursor-pointer"
          />
        </div>
      </CalcCard>

      <CalcSummaryTable
        rows={[
          { label: "Invested Amount", value: fmtCompact(data.investedAmount) },
          { label: "Estimated Returns", value: fmtCompact(data.estReturns), positive: true },
          { label: "Total Wealth", value: fmtCompact(data.totalValue), accent: true },
        ]}
      />

      <CalcDonutBreakdown
        title="Wealth Allocation"
        centerLabel="Total Value"
        centerValue={fmtCompact(data.totalValue)}
        primaryLabel="Invested"
        primaryValue={fmtCompact(data.investedAmount)}
        primaryRatio={invRatio}
        secondaryLabel="Est. Returns"
        secondaryValue={fmtCompact(data.estReturns)}
        secondaryRatio={1 - invRatio}
      />

      <CalcCard>
        <button
          type="button"
          onClick={() => setShowSchedule((s) => !s)}
          className="w-full px-4 py-3.5 flex items-center justify-between text-xs sm:text-sm font-bold text-[var(--home-text)] cursor-pointer"
        >
          <span>Yearly Projection ({timePeriod} Years)</span>
          {showSchedule ? (
            <HiChevronUp className="w-4 h-4 text-[var(--home-text-muted)]" />
          ) : (
            <HiChevronDown className="w-4 h-4 text-[var(--home-text-muted)]" />
          )}
        </button>

        {showSchedule && (
          <div className="border-t border-[var(--home-border)]">
            <div className="grid grid-cols-4 px-3 py-2 bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-bold text-center">
              <div>Year</div>
              <div>Invested</div>
              <div>Returns</div>
              <div>Total</div>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-[var(--home-border)]">
              {data.schedule.map((row) => (
                <div
                  key={row.year}
                  className="grid grid-cols-4 px-3 py-2 text-xs text-center font-mono-num text-[var(--home-text)]"
                >
                  <div>{row.year}</div>
                  <div>{fmtCompact(row.invested)}</div>
                  <div>{fmtCompact(row.returns)}</div>
                  <div>{fmtCompact(row.total)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CalcCard>
    </div>
  );
}

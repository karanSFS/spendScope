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
import { calculateStp } from "@/lib/calculatorEngine";

export default function StpCalculator({ onBack }) {
  const { symbol, fmtCompact } = useCalcCurrency();
  const { toast, shareText } = useShareCalc();

  const [investmentAmount, setInvestmentAmount] = useState("100000");
  const [stpAmount, setStpAmount] = useState("5000");
  const [transferorRate, setTransferorRate] = useState("6");
  const [transfereeRate, setTransfereeRate] = useState("12");
  const [periodType, setPeriodType] = useState("Yearly");
  const [period, setPeriod] = useState("2");

  const [hasCalculated, setHasCalculated] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(true);

  const data = useMemo(() => {
    const numP = Number(period) || 1;
    const totalMonths = periodType === "Yearly" ? numP * 12 : numP;
    return calculateStp({
      investmentAmount: Number(investmentAmount) || 0,
      stpAmount: Number(stpAmount) || 0,
      transferorRate: Number(transferorRate) || 0,
      transfereeRate: Number(transfereeRate) || 0,
      totalMonths,
    });
  }, [investmentAmount, stpAmount, transferorRate, transfereeRate, periodType, period]);

  const handleReset = () => {
    setInvestmentAmount("");
    setStpAmount("");
    setTransferorRate("");
    setTransfereeRate("");
    setPeriodType("Yearly");
    setPeriod("");
    setHasCalculated(false);
  };

  const handleCalculate = () => {
    if (!investmentAmount && !stpAmount && !period) {
      setInvestmentAmount("100000");
      setStpAmount("5000");
      setTransferorRate("6");
      setTransfereeRate("12");
      setPeriod("2");
    }
    setHasCalculated(true);
  };

  const handleShare = () => {
    const text = [
      "STP Calculator Details",
      `• Initial Investment: ${fmtCompact(data.principal)}`,
      `• Monthly STP: ${fmtCompact(data.stpAmount)}`,
      `• Transferor Rate: ${data.transferorRate}%`,
      `• Transferee Rate: ${data.transfereeRate}%`,
      `• Total Transferred: ${fmtCompact(data.totalTransferred)}`,
      `• Total Profit: ${fmtCompact(data.totalProfit)}`,
      `• Transferor Balance: ${fmtCompact(data.balanceTransferor)}`,
      `• Transferee Balance: ${fmtCompact(data.balanceTransferee)}`,
    ].join("\n");
    shareText({ title: "STP Calculator Summary", text });
  };

  const total = data.totalValue || 1;
  const sourceRatio = data.balanceTransferor / total;

  return (
    <div className="space-y-4">
      <CalcHeader
        title="STP Calculator"
        eyebrow="SYSTEMATIC TRANSFER"
        onBack={onBack}
        backLabel="Calculators"
        rightAction={hasCalculated ? <ShareIconButton onClick={handleShare} /> : null}
      />

      <CalcToast message={toast} />

      <CalcSegmentedTabs
        value={periodType}
        onChange={setPeriodType}
        options={[
          { value: "Yearly", label: "Years" },
          { value: "Monthly", label: "Months" },
        ]}
      />

      <CalcCard className="divide-y divide-[var(--home-border)]">
        <CalcFieldRow
          label="Investment Amount"
          prefix={symbol}
          value={investmentAmount}
          onChange={(v) => setInvestmentAmount(sanitizeDecimal(v))}
          onClear={() => setInvestmentAmount("")}
        />
        <CalcFieldRow
          label="Monthly STP Amount"
          prefix={symbol}
          value={stpAmount}
          onChange={(v) => setStpAmount(sanitizeDecimal(v))}
          onClear={() => setStpAmount("")}
        />
        <CalcFieldRow
          label="Transferor Return (%)"
          suffix="%"
          value={transferorRate}
          onChange={(v) => setTransferorRate(sanitizeDecimal(v))}
          onClear={() => setTransferorRate("")}
        />
        <CalcFieldRow
          label="Transferee Return (%)"
          suffix="%"
          value={transfereeRate}
          onChange={(v) => setTransfereeRate(sanitizeDecimal(v))}
          onClear={() => setTransfereeRate("")}
        />
        <CalcFieldRow
          label={periodType === "Yearly" ? "Period (Years)" : "Period (Months)"}
          inputMode="numeric"
          value={period}
          onChange={(v) => setPeriod(sanitizeInt(v))}
          onClear={() => setPeriod("")}
        />
      </CalcCard>

      <CalcActionButtons onReset={handleReset} onCalculate={handleCalculate} />

      {hasCalculated && (
        <div className="space-y-4 pt-1">
          <CalcSummaryTable
            rows={[
              { label: "Total Amount Transferred", value: fmtCompact(data.totalTransferred) },
              { label: "Transferor Balance", value: fmtCompact(data.balanceTransferor) },
              { label: "Transferee Balance", value: fmtCompact(data.balanceTransferee), accent: true },
              { label: "Total Profit", value: fmtCompact(data.totalProfit), positive: true },
              { label: "Combined Total Value", value: fmtCompact(data.totalValue) },
            ]}
          />

          <CalcDonutBreakdown
            title="Fund Split"
            centerLabel="Combined Value"
            centerValue={fmtCompact(data.totalValue)}
            primaryLabel="Transferor Fund"
            primaryValue={fmtCompact(data.balanceTransferor)}
            primaryRatio={sourceRatio}
            secondaryLabel="Transferee Fund"
            secondaryValue={fmtCompact(data.balanceTransferee)}
            secondaryRatio={1 - sourceRatio}
          />

          <CalcCard>
            <button
              type="button"
              onClick={() => setShowBreakdown((s) => !s)}
              className="w-full px-4 py-3.5 flex items-center justify-between text-xs sm:text-sm font-bold text-[var(--home-text)] cursor-pointer"
            >
              <span>Yearly Schedule</span>
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
                  <div>Transferred</div>
                  <div>Source</div>
                  <div>Target</div>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-[var(--home-border)]">
                  {data.schedule.map((row) => (
                    <div
                      key={row.year}
                      className="grid grid-cols-4 px-3 py-2 text-xs text-center font-mono-num text-[var(--home-text)]"
                    >
                      <div>{row.year}</div>
                      <div>{fmtCompact(row.transferred)}</div>
                      <div>{fmtCompact(row.transferorBalance)}</div>
                      <div>{fmtCompact(row.transfereeBalance)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CalcCard>
        </div>
      )}
    </div>
  );
}

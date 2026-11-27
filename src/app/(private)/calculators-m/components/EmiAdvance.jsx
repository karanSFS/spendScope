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
import { calculateEmiAdvance } from "@/lib/calculatorEngine";

export default function EmiAdvance({ onBack }) {
  const { symbol, fmt, fmtCompact } = useCalcCurrency();
  const { toast, shareText } = useShareCalc();

  const [paymentTiming, setPaymentTiming] = useState("advance"); // "advance" | "arrears"
  const [loanAmount, setLoanAmount] = useState("500000");
  const [interestRate, setInterestRate] = useState("10");
  const [periodType, setPeriodType] = useState("yearly");
  const [period, setPeriod] = useState("5");
  const [feeType, setFeeType] = useState("percent");
  const [processingFee, setProcessingFee] = useState("1");
  const [gstRate, setGstRate] = useState("18");

  const [showDetails, setShowDetails] = useState(false);
  const [showSchedule, setShowSchedule] = useState(true);

  const data = useMemo(() => {
    const rawPeriod = Number(period) || 0;
    const tenureMonths = periodType === "yearly" ? rawPeriod * 12 : rawPeriod;
    return calculateEmiAdvance({
      principal: Number(loanAmount) || 0,
      annualRate: Number(interestRate) || 0,
      tenureMonths,
      timing: paymentTiming,
      feeType,
      processingFee: Number(processingFee) || 0,
      gstPercent: Number(gstRate) || 0,
    });
  }, [loanAmount, interestRate, periodType, period, paymentTiming, feeType, processingFee, gstRate]);

  const handleReset = () => {
    setPaymentTiming("advance");
    setLoanAmount("500000");
    setInterestRate("10");
    setPeriodType("yearly");
    setPeriod("5");
    setFeeType("percent");
    setProcessingFee("1");
    setGstRate("18");
    setShowDetails(false);
  };

  const handleShare = () => {
    const text = [
      "EMI in Advance Details",
      `• Timing: ${paymentTiming === "advance" ? "EMI in Advance (Annuity Due)" : "EMI in Arrears"}`,
      `• Loan Amount: ${fmt(data.principal, 2)}`,
      `• Interest Rate: ${data.interestRate}%`,
      `• Tenure: ${data.totalMonths} Months`,
      `• Monthly EMI: ${fmt(data.emi, 2)}`,
      `• Processing Fee: ${fmt(data.feeAmount, 2)}`,
      `• Total Interest: ${fmt(data.totalInterest, 2)}`,
      `• GST on Interest: ${fmt(data.totalGst, 2)}`,
      `• Total Payment: ${fmt(data.totalPayment, 2)}`,
    ].join("\n");
    shareText({ title: "EMI in Advance Details", text });
  };

  if (showDetails) {
    const total = data.totalPayment || 1;
    const pRatio = data.principal / total;

    return (
      <div className="space-y-4">
        <CalcHeader
          title="EMI in Advance Details"
          eyebrow={paymentTiming === "advance" ? "ANNUITY DUE" : "ARREARS"}
          onBack={() => setShowDetails(false)}
          backLabel="Edit"
          rightAction={<ShareIconButton onClick={handleShare} />}
        />
        <CalcToast message={toast} />

        <CalcSummaryTable
          rows={[
            { label: "Loan Amount", value: fmt(data.principal, 2) },
            { label: "Interest Rate", value: `${data.interestRate}%` },
            { label: "Tenure", value: `${data.totalMonths} Months` },
            { label: "Monthly EMI", value: fmt(data.emi, 2), accent: true },
            { label: "Processing Fee", value: fmt(data.feeAmount, 2) },
            { label: "Total Interest", value: fmt(data.totalInterest, 2) },
            { label: "Total GST", value: fmt(data.totalGst, 2) },
            { label: "Total Payment", value: fmt(data.totalPayment, 2) },
          ]}
        />

        <CalcDonutBreakdown
          title="Loan Allocation"
          centerLabel="Total Payment"
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
            <span>Amortization Breakdown</span>
            {showSchedule ? (
              <HiChevronUp className="w-4 h-4 text-[var(--home-text-muted)]" />
            ) : (
              <HiChevronDown className="w-4 h-4 text-[var(--home-text-muted)]" />
            )}
          </button>

          {showSchedule && (
            <div className="border-t border-[var(--home-border)]">
              <div className="grid grid-cols-5 px-2.5 py-2 bg-[var(--home-accent)] text-[var(--home-on-accent)] text-[11px] font-bold text-center">
                <div>Mo</div>
                <div>Principal</div>
                <div>Interest</div>
                <div>GST</div>
                <div>Balance</div>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[var(--home-border)]">
                {data.schedule.map((row, idx) =>
                  row.type === "yearly_total" ? (
                    <div
                      key={`yr-${row.year}-${idx}`}
                      className="grid grid-cols-5 px-2.5 py-2 text-[11px] font-bold text-center bg-[var(--home-track)] text-[var(--home-accent)] font-mono-num"
                    >
                      <div className="font-sans">Yr {row.year}</div>
                      <div>{fmtCompact(row.principal)}</div>
                      <div>{fmtCompact(row.interest)}</div>
                      <div>{fmtCompact(row.gst)}</div>
                      <div>{fmtCompact(row.balance)}</div>
                    </div>
                  ) : (
                    <div
                      key={`m-${row.month}`}
                      className="grid grid-cols-5 px-2.5 py-2 text-[11px] text-center font-mono-num text-[var(--home-text)]"
                    >
                      <div>{row.isAdvance ? `${row.month}*` : row.month}</div>
                      <div>{fmtCompact(row.principal)}</div>
                      <div>{fmtCompact(row.interest)}</div>
                      <div>{fmtCompact(row.gst)}</div>
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

  return (
    <div className="space-y-4">
      <CalcHeader
        title="EMI in Advance"
        eyebrow="ANNUITY DUE & FEES"
        onBack={onBack}
        backLabel="Calculators"
      />

      <CalcSegmentedTabs
        value={paymentTiming}
        onChange={setPaymentTiming}
        options={[
          { value: "advance", label: "EMI in Advance" },
          { value: "arrears", label: "EMI in Arrears" },
        ]}
      />

      <CalcCard className="divide-y divide-[var(--home-border)]">
        <CalcFieldRow
          label="Loan Amount"
          prefix={symbol}
          value={loanAmount}
          onChange={(v) => setLoanAmount(sanitizeDecimal(v))}
          onClear={() => setLoanAmount("")}
        />
        <CalcFieldRow
          label="Interest Rate (%)"
          suffix="%"
          value={interestRate}
          onChange={(v) => setInterestRate(sanitizeDecimal(v))}
          onClear={() => setInterestRate("")}
        />
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-[var(--home-text-secondary)]">
              Period Unit
            </span>
            <div className="flex gap-1 p-0.5 rounded-xl bg-[var(--home-track)]">
              {["yearly", "monthly"].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setPeriodType(u)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    periodType === u
                      ? "bg-[var(--home-accent)] text-[var(--home-on-accent)]"
                      : "text-[var(--home-text-secondary)]"
                  }`}
                >
                  {u === "yearly" ? "Years" : "Months"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <CalcFieldRow
          label={periodType === "yearly" ? "Period (Years)" : "Period (Months)"}
          value={period}
          onChange={(v) => setPeriod(sanitizeDecimal(v))}
          onClear={() => setPeriod("")}
        />
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs sm:text-sm font-medium text-[var(--home-text-secondary)]">
            Processing Fee Type
          </span>
          <div className="flex gap-1 p-0.5 rounded-xl bg-[var(--home-track)]">
            {[
              { id: "percent", label: "%" },
              { id: "amount", label: symbol },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFeeType(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  feeType === f.id
                    ? "bg-[var(--home-accent)] text-[var(--home-on-accent)]"
                    : "text-[var(--home-text-secondary)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <CalcFieldRow
          label={feeType === "percent" ? "Processing Fee (%)" : "Processing Fee"}
          prefix={feeType === "amount" ? symbol : ""}
          suffix={feeType === "percent" ? "%" : ""}
          value={processingFee}
          onChange={(v) => setProcessingFee(sanitizeDecimal(v))}
          onClear={() => setProcessingFee("")}
        />
        <CalcFieldRow
          label="GST on Interest (%)"
          suffix="%"
          value={gstRate}
          onChange={(v) => setGstRate(sanitizeDecimal(v))}
          onClear={() => setGstRate("")}
        />
      </CalcCard>

      <CalcActionButtons onReset={handleReset} onCalculate={() => setShowDetails(true)} />
    </div>
  );
}

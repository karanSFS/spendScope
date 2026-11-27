"use client";

import React, { useState, useMemo } from "react";
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineCalendarDays,
  HiOutlineDocumentText,
} from "react-icons/hi2";
import useLoanProfiles from "@/hooks/useLoanProfiles";
import { useCalcCurrency, useShareCalc, CalcHeader, CalcCard, CalcSummaryTable, ShareIconButton, CalcToast, sanitizeDecimal, sanitizeInt } from "./CalculatorShell";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import AppLoader from "@/components/shared/AppLoader";
import {
  calculateLoanEmi,
  calculateLoanProfileMetrics,
  buildLoanAmortizationSchedule,
  formatCalcMoney,
} from "@/lib/calculatorEngine";
import { toLocalDateKey, parseLocalDate } from "@/lib/dateUtils";

function formatDisplayDate(dateKey) {
  if (!dateKey) return "—";
  return parseLocalDate(dateKey).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(dateKey) {
  if (!dateKey) return "—";
  const d = parseLocalDate(dateKey);
  const mon = d.toLocaleDateString("en-US", { month: "short" });
  const yr = String(d.getFullYear()).slice(-2);
  return `${d.getDate()} ${mon} '${yr}`;
}

function defaultDates() {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
  return {
    loanDate: toLocalDateKey(today),
    firstEmiDate: toLocalDateKey(nextMonth),
  };
}

export default function LoanProfileCalculator({ onBack }) {
  const { loans, loading, createLoan, removeLoan } = useLoanProfiles();
  const { currencyCode, symbol } = useCalcCurrency();
  const { toast, notify, shareText } = useShareCalc();

  const [view, setView] = useState("list"); // "list" | "create" | "detail" | "schedule"
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const initDates = defaultDates();
  const [name, setName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [tenureMonths, setTenureMonths] = useState("");
  const [processingFees, setProcessingFees] = useState("");
  const [loanDate, setLoanDate] = useState(initDates.loanDate);
  const [firstEmiDate, setFirstEmiDate] = useState(initDates.firstEmiDate);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedLoan = useMemo(
    () => loans.find((l) => l.id === selectedLoanId) || null,
    [loans, selectedLoanId],
  );

  const aggregateStats = useMemo(() => {
    let totalAmount = 0;
    let totalEmi = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    for (const loan of loans) {
      const m = calculateLoanProfileMetrics(loan);
      totalAmount += Number(loan.principal_amount) || 0;
      totalEmi += m.emiAmount;
      totalPaid += m.totalPaid;
      totalOutstanding += m.outstandingPrincipal;
    }
    return {
      totalAmount,
      totalEmi,
      totalPaid,
      totalOutstanding,
    };
  }, [loans]);

  const liveFormEmi = useMemo(() => {
    const p = Number(principalAmount) || 0;
    const r = Number(interestRate) || 0;
    const n = Number(tenureMonths) || 0;
    return calculateLoanEmi(p, r, n);
  }, [principalAmount, interestRate, tenureMonths]);

  const resetForm = () => {
    const d = defaultDates();
    setName("");
    setAccountName("");
    setBankName("");
    setPrincipalAmount("");
    setInterestRate("");
    setTenureMonths("");
    setProcessingFees("");
    setLoanDate(d.loanDate);
    setFirstEmiDate(d.firstEmiDate);
    setFormError("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    const res = await createLoan({
      name,
      account_name: accountName,
      bank_name: bankName,
      principal_amount: principalAmount,
      interest_rate: interestRate,
      tenure_months: tenureMonths,
      processing_fees: processingFees || 0,
      loan_date: loanDate,
      first_emi_date: firstEmiDate,
      currency_code: currencyCode,
    });
    setSaving(false);

    if (!res.success) {
      setFormError(res.error || "Unable to save loan profile.");
      return;
    }
    resetForm();
    notify("Loan profile saved");
    setView("list");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await removeLoan(deleteTarget.id);
    setDeleting(false);
    if (selectedLoanId === deleteTarget.id) {
      setSelectedLoanId(null);
      setView("list");
    }
    setDeleteTarget(null);
    notify("Loan profile deleted");
  };

  // ==================== SCHEDULE VIEW ====================
  if (view === "schedule" && selectedLoan) {
    const loanCurr = selectedLoan.currency_code || currencyCode;
    const metrics = calculateLoanProfileMetrics(selectedLoan);
    const scheduleRows = buildLoanAmortizationSchedule(selectedLoan);
    const fmtLoan = (val, dec = 0) => formatCalcMoney(val, loanCurr, dec);

    const handleShareSchedule = () => {
      const monthLines = scheduleRows
        .filter((r) => r.type === "month")
        .slice(0, 60)
        .map(
          (r) =>
            `${formatShortDate(r.date)} | Principal: ${fmtLoan(r.principal)} | Interest: ${fmtLoan(r.interest)} | Balance: ${fmtLoan(r.balance)}`,
        );
      shareText({
        title: `Loan Schedule - ${selectedLoan.name}`,
        text: [
          `Loan Schedule: ${selectedLoan.name}`,
          `Monthly EMI: ${fmtLoan(metrics.emiAmount, 2)}`,
          "",
          ...monthLines,
        ].join("\n"),
      });
    };

    return (
      <div className="space-y-4">
        <CalcHeader
          title="Amortization Schedule"
          eyebrow={selectedLoan.name}
          onBack={() => setView("detail")}
          backLabel="Details"
          rightAction={<ShareIconButton onClick={handleShareSchedule} />}
        />
        <CalcToast message={toast} />

        <CalcSummaryTable
          rows={[
            { label: "Loan Amount", value: fmtLoan(selectedLoan.principal_amount, 2) },
            { label: "Interest Rate", value: `${selectedLoan.interest_rate}%` },
            { label: "Total Months", value: `${selectedLoan.tenure_months}` },
            { label: "Monthly EMI", value: fmtLoan(metrics.emiAmount, 2), accent: true },
            { label: "Total Interest", value: fmtLoan(metrics.totalInterest, 2) },
            { label: "Processing Fee", value: fmtLoan(metrics.processingFees, 2) },
            { label: "Total Payment", value: fmtLoan(metrics.totalPayment, 2) },
          ]}
        />

        <CalcCard>
          <div className="grid grid-cols-4 px-3 py-3 bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-bold text-center">
            <div>Month</div>
            <div>Principal</div>
            <div>Interest</div>
            <div>Balance</div>
          </div>
          <div className="max-h-[420px] overflow-y-auto divide-y divide-[var(--home-border)]">
            {scheduleRows.map((row, idx) =>
              row.type === "yearly_total" ? (
                <div
                  key={`yr-${row.year}-${idx}`}
                  className="grid grid-cols-4 px-3 py-2.5 text-xs font-bold text-center bg-[var(--home-track)] text-[var(--home-accent)] font-mono-num"
                >
                  <div className="font-sans">Total ({row.year})</div>
                  <div>{fmtLoan(row.principal)}</div>
                  <div>{fmtLoan(row.interest)}</div>
                  <div>{fmtLoan(row.balance)}</div>
                </div>
              ) : (
                <div
                  key={`m-${row.month}`}
                  className="grid grid-cols-4 px-3 py-2 text-xs text-center text-[var(--home-text)] font-mono-num"
                >
                  <div className="font-sans text-[var(--home-text-secondary)]">
                    {formatShortDate(row.date)}
                  </div>
                  <div>{fmtLoan(row.principal)}</div>
                  <div>{fmtLoan(row.interest)}</div>
                  <div>{fmtLoan(row.balance)}</div>
                </div>
              ),
            )}
          </div>
        </CalcCard>
      </div>
    );
  }

  // ==================== DETAIL VIEW ====================
  if (view === "detail" && selectedLoan) {
    const loanCurr = selectedLoan.currency_code || currencyCode;
    const metrics = calculateLoanProfileMetrics(selectedLoan);
    const fmtLoan = (val, dec = 2) => formatCalcMoney(val, loanCurr, dec);

    const handleShareLoan = () => {
      shareText({
        title: `Loan Details - ${selectedLoan.name}`,
        text: [
          selectedLoan.name,
          `Loan A/C No: ${selectedLoan.account_name || "—"}`,
          `Bank Name: ${selectedLoan.bank_name || "—"}`,
          `Loan Amount: ${fmtLoan(selectedLoan.principal_amount)}`,
          `Interest Rate: ${selectedLoan.interest_rate}%`,
          `Tenure: ${selectedLoan.tenure_months} months`,
          `Monthly EMI: ${fmtLoan(metrics.emiAmount)}`,
          `Paid EMIs: ${metrics.elapsedMonths}/${selectedLoan.tenure_months}`,
          `Principal Paid: ${fmtLoan(metrics.principalPaid)}`,
          `Interest Paid: ${fmtLoan(metrics.interestPaid)}`,
          `Outstanding Principal: ${fmtLoan(metrics.outstandingPrincipal)}`,
          `Total Payment: ${fmtLoan(metrics.totalPayment)}`,
        ].join("\n"),
      });
    };

    return (
      <div className="space-y-4">
        <CalcHeader
          title={selectedLoan.name}
          eyebrow={selectedLoan.bank_name || "Loan Profile"}
          onBack={() => setView("list")}
          backLabel="Loans"
          rightAction={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(selectedLoan)}
                aria-label="Delete loan"
                className="w-9 h-9 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-destructive)] flex items-center justify-center hover:opacity-85 cursor-pointer"
              >
                <HiOutlineTrash className="w-4 h-4" />
              </button>
              <ShareIconButton onClick={handleShareLoan} />
            </div>
          }
        />
        <CalcToast message={toast} />

        <CalcSummaryTable
          rows={[
            { label: "Loan A/C No", value: selectedLoan.account_name || "—" },
            { label: "Bank Name", value: selectedLoan.bank_name || "—" },
            { label: "Loan Amount", value: fmtLoan(selectedLoan.principal_amount) },
            { label: "Interest Rate", value: `${selectedLoan.interest_rate}%` },
            { label: "Tenure", value: `${selectedLoan.tenure_months} months` },
            { label: "Monthly EMI", value: fmtLoan(metrics.emiAmount), accent: true },
            { label: "Processing Fees", value: fmtLoan(metrics.processingFees) },
            { label: "Loan Date", value: formatDisplayDate(selectedLoan.loan_date) },
            { label: "First EMI Date", value: formatDisplayDate(selectedLoan.first_emi_date) },
            { label: "Last EMI Date", value: formatDisplayDate(metrics.lastEmiDate) },
            {
              label: "Elapsed Installments",
              value: `${metrics.elapsedMonths} / ${selectedLoan.tenure_months}`,
            },
            { label: "Principal Paid", value: fmtLoan(metrics.principalPaid), positive: true },
            { label: "Interest Paid", value: fmtLoan(metrics.interestPaid) },
            { label: "Total Paid", value: fmtLoan(metrics.totalPaid), positive: true },
            { label: "Outstanding Principal", value: fmtLoan(metrics.outstandingPrincipal) },
            { label: "Outstanding Interest", value: fmtLoan(metrics.outstandingInterest) },
            { label: "Outstanding Total", value: fmtLoan(metrics.outstandingTotal) },
            { label: "Total Interest", value: fmtLoan(metrics.totalInterest) },
            { label: "Total Loan Payment", value: fmtLoan(metrics.totalPayment) },
          ]}
        />

        <button
          type="button"
          onClick={() => setView("schedule")}
          className="w-full py-3.5 px-4 rounded-2xl bg-[var(--home-accent)] text-[var(--home-on-accent)] text-sm font-bold flex items-center justify-center gap-2 shadow-xs hover:opacity-95 cursor-pointer"
        >
          <HiOutlineCalendarDays className="w-4 h-4" />
          <span>View Repayment Schedule</span>
        </button>

        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title="Delete Loan Profile"
          message={`Delete "${deleteTarget?.name}" from your saved loan profiles?`}
          confirmLabel="Delete"
          destructive
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      </div>
    );
  }

  // ==================== CREATE VIEW ====================
  if (view === "create") {
    return (
      <form onSubmit={handleSave} className="space-y-4">
        <CalcHeader
          title="Add Loan Profile"
          eyebrow={`LOAN DETAILS (${currencyCode})`}
          onBack={() => {
            resetForm();
            setView("list");
          }}
          backLabel="Loans"
          rightAction={
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-bold text-[var(--home-text-secondary)] hover:text-[var(--home-text)] cursor-pointer"
            >
              Reset
            </button>
          }
        />

        {formError && (
          <div className="px-4 py-2.5 rounded-2xl bg-[var(--home-destructive)]/10 border border-[var(--home-destructive)]/30 text-xs font-semibold text-[var(--home-destructive)]">
            {formError}
          </div>
        )}

        <CalcCard className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--home-text-muted)]">
              Estimated Monthly EMI
            </p>
            <p className="font-mono-num text-xl font-bold text-[var(--home-accent)] mt-0.5">
              {liveFormEmi > 0
                ? formatCalcMoney(liveFormEmi, currencyCode, 2)
                : formatCalcMoney(0, currencyCode, 2)}
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-[var(--home-track)] text-xs font-semibold text-[var(--home-text-secondary)]">
            {currencyCode}
          </span>
        </CalcCard>

        <CalcCard className="divide-y divide-[var(--home-border)]">
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <label htmlFor="lp-name" className="text-xs sm:text-sm font-medium text-[var(--home-text-secondary)]">
              Loan Name
            </label>
            <input
              id="lp-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Home Loan"
              className="w-full max-w-[210px] text-right bg-transparent outline-none text-sm font-semibold text-[var(--home-text)] placeholder:text-[var(--home-text-muted)]"
            />
          </div>

          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <label htmlFor="lp-ac-no" className="text-xs sm:text-sm font-medium text-[var(--home-text-secondary)]">
              Loan A/C No
            </label>
            <input
              id="lp-ac-no"
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g., HL-2026-01"
              className="w-full max-w-[210px] text-right bg-transparent outline-none text-sm font-semibold text-[var(--home-text)] placeholder:text-[var(--home-text-muted)]"
            />
          </div>

          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <label htmlFor="lp-bank" className="text-xs sm:text-sm font-medium text-[var(--home-text-secondary)]">
              Bank Name
            </label>
            <input
              id="lp-bank"
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g., HDFC Bank"
              className="w-full max-w-[210px] text-right bg-transparent outline-none text-sm font-semibold text-[var(--home-text)] placeholder:text-[var(--home-text-muted)]"
            />
          </div>

          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <label htmlFor="lp-amount" className="text-xs sm:text-sm font-medium text-[var(--home-text-secondary)]">
              Loan Amount ({symbol})
            </label>
            <input
              id="lp-amount"
              type="text"
              inputMode="decimal"
              value={principalAmount}
              onChange={(e) => setPrincipalAmount(sanitizeDecimal(e.target.value))}
              placeholder="2500000"
              className="w-full max-w-[180px] text-right bg-transparent outline-none font-mono-num text-sm font-semibold text-[var(--home-text)] placeholder:text-[var(--home-text-muted)]"
            />
          </div>

          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <label htmlFor="lp-rate" className="text-xs sm:text-sm font-medium text-[var(--home-text-secondary)]">
              Interest Rate (%)
            </label>
            <input
              id="lp-rate"
              type="text"
              inputMode="decimal"
              value={interestRate}
              onChange={(e) => setInterestRate(sanitizeDecimal(e.target.value))}
              placeholder="Max 30%"
              className="w-full max-w-[180px] text-right bg-transparent outline-none font-mono-num text-sm font-semibold text-[var(--home-text)] placeholder:text-[var(--home-text-muted)]"
            />
          </div>

          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <label htmlFor="lp-tenure" className="text-xs sm:text-sm font-medium text-[var(--home-text-secondary)]">
              Tenure (Months)
            </label>
            <input
              id="lp-tenure"
              type="text"
              inputMode="numeric"
              value={tenureMonths}
              onChange={(e) => setTenureMonths(sanitizeInt(e.target.value))}
              placeholder="Max 600"
              className="w-full max-w-[180px] text-right bg-transparent outline-none font-mono-num text-sm font-semibold text-[var(--home-text)] placeholder:text-[var(--home-text-muted)]"
            />
          </div>

          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <label htmlFor="lp-fees" className="text-xs sm:text-sm font-medium text-[var(--home-text-secondary)]">
              Processing Fees ({symbol})
            </label>
            <input
              id="lp-fees"
              type="text"
              inputMode="decimal"
              value={processingFees}
              onChange={(e) => setProcessingFees(sanitizeDecimal(e.target.value))}
              placeholder="Optional (0)"
              className="w-full max-w-[180px] text-right bg-transparent outline-none font-mono-num text-sm font-semibold text-[var(--home-text)] placeholder:text-[var(--home-text-muted)]"
            />
          </div>

          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <label htmlFor="lp-loan-date" className="text-xs sm:text-sm font-medium text-[var(--home-text-secondary)]">
              Loan Date
            </label>
            <input
              id="lp-loan-date"
              type="date"
              value={loanDate}
              onChange={(e) => setLoanDate(e.target.value)}
              className="bg-[var(--home-track)] px-3 py-1.5 rounded-xl font-mono-num text-xs sm:text-sm font-semibold text-[var(--home-text)] outline-none"
            />
          </div>

          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <label htmlFor="lp-first-emi" className="text-xs sm:text-sm font-medium text-[var(--home-text-secondary)]">
              First EMI Date
            </label>
            <input
              id="lp-first-emi"
              type="date"
              value={firstEmiDate}
              onChange={(e) => setFirstEmiDate(e.target.value)}
              className="bg-[var(--home-track)] px-3 py-1.5 rounded-xl font-mono-num text-xs sm:text-sm font-semibold text-[var(--home-text)] outline-none"
            />
          </div>
        </CalcCard>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 px-4 rounded-2xl bg-[var(--home-accent)] text-[var(--home-on-accent)] text-sm font-bold shadow-xs hover:opacity-95 disabled:opacity-60 cursor-pointer"
        >
          {saving ? "Saving..." : "Save Loan Profile"}
        </button>
      </form>
    );
  }

  // ==================== LISTING VIEW ====================
  return (
    <div className="space-y-4">
      <CalcHeader
        title="My Loan Profile"
        eyebrow="LOAN TRACKER"
        onBack={onBack}
        backLabel="Calculators"
        rightAction={
          <button
            type="button"
            onClick={() => setView("create")}
            aria-label="Add loan"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-bold hover:opacity-95 cursor-pointer"
          >
            <HiOutlinePlus className="w-4 h-4" />
            <span>Add Loan</span>
          </button>
        }
      />

      <CalcToast message={toast} />

      {loading ? (
        <CalcCard>
          <AppLoader variant="compact" label="Loading saved loan profiles" />
        </CalcCard>
      ) : loans.length === 0 ? (
        <CalcCard className="p-8 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--home-track)] text-[var(--home-accent)] flex items-center justify-center">
            <HiOutlineDocumentText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--home-text)]">
              No loan profiles yet
            </h3>
            <p className="text-xs text-[var(--home-text-muted)] mt-1">
              Save your home, auto, or personal loans to track paid EMIs, outstanding balance, and schedules.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setView("create")}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-bold cursor-pointer"
          >
            <HiOutlinePlus className="w-4 h-4" />
            <span>Add Your First Loan</span>
          </button>
        </CalcCard>
      ) : (
        <>
          <CalcCard className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--home-text-muted)]">
                Total Loan
              </p>
              <p className="font-mono-num text-sm sm:text-base font-bold text-[var(--home-text)] mt-0.5">
                {formatCalcMoney(aggregateStats.totalAmount, currencyCode, 0)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--home-text-muted)]">
                Total EMI
              </p>
              <p className="font-mono-num text-sm sm:text-base font-bold text-[var(--home-accent)] mt-0.5">
                {formatCalcMoney(aggregateStats.totalEmi, currencyCode, 0)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--home-text-muted)]">
                Total Paid
              </p>
              <p className="font-mono-num text-sm sm:text-base font-bold text-[var(--home-income)] mt-0.5">
                {formatCalcMoney(aggregateStats.totalPaid, currencyCode, 0)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--home-text-muted)]">
                Outstanding
              </p>
              <p className="font-mono-num text-sm sm:text-base font-bold text-[var(--home-expense)] mt-0.5">
                {formatCalcMoney(aggregateStats.totalOutstanding, currencyCode, 0)}
              </p>
            </div>
          </CalcCard>

          <div className="space-y-2.5">
            {loans.map((loan) => {
              const lCurr = loan.currency_code || currencyCode;
              const m = calculateLoanProfileMetrics(loan);
              return (
                <CalcCard
                  key={loan.id}
                  className="p-4 flex items-center justify-between gap-3 hover:border-[var(--home-accent)]/60 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLoanId(loan.id);
                      setView("detail");
                    }}
                    className="flex-1 text-left min-w-0 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-bold text-[var(--home-text)] truncate">
                        {loan.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--home-track)] text-[var(--home-text-secondary)]">
                        {loan.interest_rate}%
                      </span>
                    </div>
                    <p className="text-xs text-[var(--home-text-muted)] mt-0.5 truncate">
                      {loan.bank_name || "Loan"} · A/C {loan.account_name || "—"} ·{" "}
                      {m.elapsedMonths}/{loan.tenure_months} EMIs
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs">
                      <span className="font-mono-num font-semibold text-[var(--home-text)]">
                        EMI: {formatCalcMoney(m.emiAmount, lCurr, 0)}
                      </span>
                      <span className="font-mono-num text-[var(--home-text-secondary)]">
                        Bal: {formatCalcMoney(m.outstandingPrincipal, lCurr, 0)}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(loan)}
                    aria-label={`Delete ${loan.name}`}
                    className="w-9 h-9 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] text-[var(--home-destructive)] flex items-center justify-center hover:opacity-85 shrink-0 cursor-pointer"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </CalcCard>
              );
            })}
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Loan Profile"
        message={`Delete "${deleteTarget?.name}" from your saved loan profiles?`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

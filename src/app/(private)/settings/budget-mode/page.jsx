"use client";

import React, { useState, useEffect, useMemo } from "react";
import useAccounts from "@/hooks/useAccounts";
import { SPENDING_PERIODS, getScaledBudget } from "@/lib/budgetMath";
import { formatMoney, getCurrencySymbol } from "@/utils/currencies";
import SettingsSubpageHeader from "@/components/settings/SettingsSubpageHeader";

export default function BudgetModeSettingsPage() {
  const { activeAccount, updateAccount } = useAccounts();
  const currencyCode = activeAccount?.currency_code || "INR";
  const symbol = getCurrencySymbol(currencyCode);

  const [budgetMode, setBudgetMode] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [includeIncome, setIncludeIncome] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (activeAccount) {
      setBudgetMode(Boolean(activeAccount.budget_mode));
      setBudgetAmount(
        activeAccount.budget_amount != null
          ? String(activeAccount.budget_amount)
          : "",
      );
      setIncludeIncome(Boolean(activeAccount.include_income));
    }
  }, [activeAccount]);

  const numericCap = Number(budgetAmount);
  const previewRows = useMemo(() => {
    if (!budgetMode || !Number.isFinite(numericCap) || numericCap <= 0) {
      return [];
    }
    const basePeriod = activeAccount?.spending_period || "Monthly";
    return SPENDING_PERIODS.map((target) => ({
      period: target,
      amount: getScaledBudget(numericCap, basePeriod, target),
    }));
  }, [budgetMode, numericCap, activeAccount?.spending_period]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!activeAccount?.id) return;
    setError("");
    setSavedMsg("");

    if (budgetMode && (!Number.isFinite(numericCap) || numericCap <= 0)) {
      setError("Enter a valid positive budget cap when Budget Mode is enabled.");
      return;
    }

    setSaving(true);
    try {
      await updateAccount(activeAccount.id, {
        budget_mode: budgetMode,
        budget_amount:
          budgetAmount !== "" && Number.isFinite(numericCap)
            ? numericCap
            : null,
        include_income: includeIncome,
      });
      setSavedMsg("Budget Mode settings saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <SettingsSubpageHeader
        title="Budget Mode"
        description={`Track spending against a recurring ${activeAccount?.spending_period || "Monthly"} budget cap.`}
        activeAccount={activeAccount}
      />

      {savedMsg && (
        <div className="p-3.5 rounded-2xl border border-[var(--home-income)]/40 bg-[var(--home-income-soft)] text-xs font-semibold text-[var(--home-income)]">
          {savedMsg}
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl border border-[var(--home-destructive)]/40 bg-[var(--home-card)] text-xs font-semibold text-[var(--home-destructive)]">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <div className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 sm:p-6 space-y-5">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <span className="text-sm font-bold text-[var(--home-text)] block">
                Enable Budget Mode
              </span>
              <span className="text-xs text-[var(--home-text-muted)]">
                Replaces Income bar baseline on Overview with your configured budget limit.
              </span>
            </div>
            <input
              type="checkbox"
              aria-label="Enable Budget Mode"
              checked={budgetMode}
              onChange={(e) => setBudgetMode(e.target.checked)}
              className="w-5 h-5 accent-[var(--home-accent)] cursor-pointer shrink-0"
            />
          </label>

          <div>
            <label
              htmlFor="budget-cap-amount"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1.5"
            >
              {activeAccount?.spending_period || "Monthly"} Budget Cap ({currencyCode})
            </label>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)]">
              <span className="font-display text-lg text-[var(--home-text-muted)]">
                {symbol}
              </span>
              <input
                id="budget-cap-amount"
                type="number"
                min="0"
                step="0.01"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="25000"
                disabled={!budgetMode}
                className="w-full bg-transparent font-mono-num text-base font-bold focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <label className="flex items-center justify-between gap-4 pt-2 border-t border-[var(--home-border)] cursor-pointer">
            <div>
              <span className="text-sm font-bold text-[var(--home-text)] block">
                Include Income
              </span>
              <span className="text-xs text-[var(--home-text-muted)]">
                Adds recorded period income on top of your scaled budget cap (Budget + Income).
              </span>
            </div>
            <input
              type="checkbox"
              aria-label="Include Income"
              checked={includeIncome}
              disabled={!budgetMode}
              onChange={(e) => setIncludeIncome(e.target.checked)}
              className="w-5 h-5 accent-[var(--home-accent)] cursor-pointer shrink-0 disabled:opacity-40"
            />
          </label>
        </div>

        {previewRows.length > 0 && (
          <div className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--home-text-muted)]">
              Automatic Period Scaling Preview
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {previewRows.map((row) => (
                <div
                  key={row.period}
                  className="p-3 rounded-2xl bg-[var(--home-background)] border border-[var(--home-border)]"
                >
                  <span className="text-[11px] font-semibold text-[var(--home-text-muted)] block">
                    {row.period}
                  </span>
                  <span className="font-mono-num text-sm font-bold text-[var(--home-text)]">
                    {formatMoney(row.amount, currencyCode)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !activeAccount}
          className="w-full sm:w-auto px-8 py-3 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-sm font-semibold cursor-pointer disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Budget Mode"}
        </button>
      </form>
    </div>
  );
}

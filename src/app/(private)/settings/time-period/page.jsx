"use client";

import React, { useState, useEffect } from "react";
import { HiCheck } from "react-icons/hi2";
import useAccounts from "@/hooks/useAccounts";
import { SPENDING_PERIODS } from "@/lib/budgetMath";
import CurrencySelect from "@/components/CurrencySelect";
import SettingsSubpageHeader from "@/components/settings/SettingsSubpageHeader";

const PERIOD_DESCRIPTIONS = {
  Daily: "Resets every day — great for strict daily allowance tracking.",
  Weekly: "Sunday through Saturday weekly spending rhythm.",
  Monthly: "Calendar month (1st to end of month) — classic salary cycle.",
  Yearly: "Full calendar year overview for long-term cashflow.",
};

export default function TimePeriodSettingsPage() {
  const { activeAccount, updateAccount } = useAccounts();
  const [period, setPeriod] = useState("Monthly");
  const [currency, setCurrency] = useState("INR");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    if (activeAccount) {
      setPeriod(activeAccount.spending_period || "Monthly");
      setCurrency(activeAccount.currency_code || "INR");
    }
  }, [activeAccount]);

  const handleSave = async () => {
    if (!activeAccount?.id) return;
    setSaving(true);
    setSavedMsg("");
    try {
      await updateAccount(activeAccount.id, {
        spending_period: period,
        currency_code: currency,
      });
      setSavedMsg("Time period and currency settings updated.");
    } finally {
      setSaving(false);
    }
  };

  const currencyChanged =
    activeAccount && currency !== (activeAccount.currency_code || "INR");

  return (
    <div className="space-y-6 max-w-2xl">
      <SettingsSubpageHeader
        title="Time Period & Currency"
        description="Set the default overview period and display currency for your active account."
        activeAccount={activeAccount}
      />

      {savedMsg && (
        <div className="p-3.5 rounded-2xl border border-[var(--home-income)]/40 bg-[var(--home-income-soft)] text-xs font-semibold text-[var(--home-income)]">
          {savedMsg}
        </div>
      )}

      {/* Default Spending Period */}
      <section className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 sm:p-6 space-y-4">
        <h2 className="font-display text-lg text-[var(--home-text)]">
          Default Spending Period
        </h2>
        <div className="space-y-2">
          {SPENDING_PERIODS.map((p) => {
            const selected = period === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                  selected
                    ? "border-[var(--home-accent)] bg-[var(--home-background)]"
                    : "border-[var(--home-border)] bg-[var(--home-card)] hover:border-[var(--home-accent)]/50"
                }`}
              >
                <div>
                  <span className="text-sm font-bold text-[var(--home-text)] block">
                    {p}
                  </span>
                  <span className="text-xs text-[var(--home-text-muted)]">
                    {PERIOD_DESCRIPTIONS[p]}
                  </span>
                </div>
                {selected && (
                  <HiCheck className="w-5 h-5 text-[var(--home-accent)] shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Account Currency */}
      <section className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 sm:p-6 space-y-3">
        <h2 className="font-display text-lg text-[var(--home-text)]">
          Account Currency
        </h2>
        <p className="text-xs text-[var(--home-text-secondary)] leading-relaxed p-3 rounded-2xl border border-[var(--home-border)] bg-[var(--home-background)]">
          Changing currency updates the display symbol for{" "}
          <strong>{activeAccount?.name || "this account"}</strong> only.
          Existing transaction and budget amounts are{" "}
          <strong>not converted</strong> across exchange rates.
        </p>
        <CurrencySelect value={currency} onChange={setCurrency} />
        {currencyChanged && (
          <p className="text-xs font-semibold text-[var(--home-accent)]">
            Pending change: {activeAccount.currency_code || "INR"} → {currency} (amounts stay numerically unchanged)
          </p>
        )}
      </section>

      <button
        type="button"
        disabled={saving || !activeAccount}
        onClick={handleSave}
        className="w-full sm:w-auto px-8 py-3 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-sm font-semibold cursor-pointer disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Preferences"}
      </button>
    </div>
  );
}

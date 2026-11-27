"use client";

import React, { useState, useEffect } from "react";
import useAccounts from "@/hooks/useAccounts";
import SettingsSubpageHeader from "@/components/settings/SettingsSubpageHeader";

export default function HideTransactionsSettingsPage() {
  const { activeAccount, updateAccount } = useAccounts();
  const [hidden, setHidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    if (activeAccount) {
      setHidden(Boolean(activeAccount.hide_transactions));
    }
  }, [activeAccount]);

  const handleToggle = async (nextVal) => {
    if (!activeAccount?.id) return;
    setHidden(nextVal);
    setSaving(true);
    setSavedMsg("");
    try {
      await updateAccount(activeAccount.id, { hide_transactions: nextVal });
      setSavedMsg(
        nextVal
          ? "Balances and transaction lists are now masked by default."
          : "Balances and transaction lists are now visible.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <SettingsSubpageHeader
        title="Hide Transactions"
        description="Protect balances and recent entries from shoulder-surfing on Overview and Transactions."
        activeAccount={activeAccount}
      />

      {savedMsg && (
        <div className="p-3.5 rounded-2xl border border-[var(--home-income)]/40 bg-[var(--home-income-soft)] text-xs font-semibold text-[var(--home-income)]">
          {savedMsg}
        </div>
      )}

      <div className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 sm:p-6 space-y-4">
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <span className="text-sm font-bold text-[var(--home-text)] block">
              Mask Transactions for {activeAccount?.name || "Active Account"}
            </span>
            <span className="text-xs text-[var(--home-text-muted)] leading-relaxed block mt-0.5">
              When enabled, net balance, income, expenses, and transaction rows show privacy masks until you tap Reveal.
            </span>
          </div>
          <input
            type="checkbox"
            aria-label="Hide Transactions"
            checked={hidden}
            disabled={saving || !activeAccount}
            onChange={(e) => handleToggle(e.target.checked)}
            className="w-5 h-5 accent-[var(--home-accent)] cursor-pointer shrink-0"
          />
        </label>
      </div>
    </div>
  );
}

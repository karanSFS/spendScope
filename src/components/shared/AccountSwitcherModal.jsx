"use client";

import React, { useState } from "react";
import { HiXMark, HiPlus, HiCheck } from "react-icons/hi2";
import { AVATAR_KEYS } from "@/lib/defaultSeeds";
import { SPENDING_PERIODS } from "@/lib/budgetMath";
import AvatarBadge from "./AvatarBadge";
import CurrencySelect from "@/components/CurrencySelect";

export default function AccountSwitcherModal({
  open,
  accounts = [],
  activeAccountId,
  onSelectAccount,
  onCreateAccount,
  onClose,
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [avatarKey, setAvatarKey] = useState("user_pf");
  const [currencyCode, setCurrencyCode] = useState("INR");
  const [spendingPeriod, setSpendingPeriod] = useState("Monthly");
  const [budgetMode, setBudgetMode] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const resetForm = () => {
    setName("");
    setAvatarKey("user_pf");
    setCurrencyCode("INR");
    setSpendingPeriod("Monthly");
    setBudgetMode(false);
    setBudgetAmount("");
    setError("");
    setCreating(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Account name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await onCreateAccount?.({
        name: name.trim(),
        avatarKey,
        currencyCode,
        spendingPeriod,
        budgetMode,
        budgetAmount: budgetMode && budgetAmount ? Number(budgetAmount) : null,
        activate: true,
      });
      if (res?.success === false) {
        setError(res.error || "Unable to create account.");
        return;
      }
      resetForm();
      onClose?.();
    } catch (err) {
      setError(err?.message || "Unable to create account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Switch or create account"
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={() => {
        resetForm();
        onClose?.();
      }}
    >
      <div
        className="w-full max-w-md max-h-[88vh] flex flex-col rounded-[28px] border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[var(--home-border)] flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg text-[var(--home-text)]">
              {creating ? "New Account" : "Select Account"}
            </h3>
            <p className="text-xs text-[var(--home-text-muted)]">
              Each account keeps its own currency, period, budget &amp; buckets
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose?.();
            }}
            aria-label="Close account switcher"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] cursor-pointer"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {!creating ? (
            <>
              <div className="space-y-2">
                {accounts.map((acc) => {
                  const selected = acc.id === activeAccountId;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        onSelectAccount?.(acc.id);
                        onClose?.();
                      }}
                      className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        selected
                          ? "border-[var(--home-accent)] bg-[var(--home-background)] shadow-xs"
                          : "border-[var(--home-border)] bg-[var(--home-card)] hover:border-[var(--home-accent)]/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AvatarBadge
                          avatarKey={acc.avatar_key || "user_pf"}
                          name={acc.name}
                          size={40}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold truncate">
                              {acc.name}
                            </span>
                            {acc.is_default && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--home-track)] text-[var(--home-text-secondary)]">
                                Default
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-[var(--home-text-muted)]">
                            {acc.currency_code || "INR"} ·{" "}
                            {acc.spending_period || "Monthly"}
                            {acc.budget_mode ? " · Budget Mode" : ""}
                          </span>
                        </div>
                      </div>
                      {selected && (
                        <HiCheck className="w-5 h-5 text-[var(--home-accent)] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCreating(true)}
                className="w-full py-3 px-4 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-sm font-semibold inline-flex items-center justify-center gap-2 hover:opacity-95 cursor-pointer"
              >
                <HiPlus className="w-4 h-4" />
                <span>Add Account</span>
              </button>
            </>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <div className="p-3 rounded-2xl border border-[var(--home-destructive)]/40 bg-[var(--home-background)] text-xs font-semibold text-[var(--home-destructive)]">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1.5">
                  Avatar
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_KEYS.map((key) => {
                    const active = key === avatarKey;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAvatarKey(key)}
                        className={`rounded-full p-0.5 border-2 cursor-pointer transition-transform ${
                          active
                            ? "border-[var(--home-accent)] scale-110"
                            : "border-transparent opacity-75 hover:opacity-100"
                        }`}
                      >
                        <AvatarBadge avatarKey={key} size={36} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="new-account-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
                >
                  Account Name
                </label>
                <input
                  id="new-account-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Personal Card, Family Cash"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-sm focus:outline-none focus:border-[var(--home-accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1">
                  Account Currency
                </label>
                <CurrencySelect
                  value={currencyCode}
                  onChange={setCurrencyCode}
                  roundedClass="rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1">
                  Default Period
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {SPENDING_PERIODS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSpendingPeriod(p)}
                      className={`py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                        spendingPeriod === p
                          ? "bg-[var(--home-accent)] text-[var(--home-on-accent)] border-[var(--home-accent)]"
                          : "bg-[var(--home-background)] text-[var(--home-text-secondary)] border-[var(--home-border)]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between p-3 rounded-2xl border border-[var(--home-border)] bg-[var(--home-background)] cursor-pointer">
                <div>
                  <span className="text-xs font-bold block">
                    Enable Budget Mode
                  </span>
                  <span className="text-[11px] text-[var(--home-text-muted)]">
                    Compare spending against a recurring budget cap
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={budgetMode}
                  onChange={(e) => setBudgetMode(e.target.checked)}
                  className="w-4 h-4 accent-[var(--home-accent)]"
                />
              </label>

              {budgetMode && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1">
                    {spendingPeriod} Budget Cap
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    placeholder="25000"
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-sm font-mono-num focus:outline-none focus:border-[var(--home-accent)]"
                  />
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2.5 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] text-xs font-semibold cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Creating…" : "Create Account"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

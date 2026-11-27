"use client";

import React, { useState } from "react";
import { HiOutlineExclamationTriangle } from "react-icons/hi2";
import useAuth from "@/hooks/useAuth";
import useAccounts from "@/hooks/useAccounts";
import { resetUserData } from "@/services/resetService";
import { verifyUserPassword } from "@/services/authService";
import SettingsSubpageHeader from "@/components/settings/SettingsSubpageHeader";

export default function ResetDataSettingsPage() {
  const { userId, email, isAuthenticated } = useAuth();
  const { activeAccount } = useAccounts();

  const [keepAccounts, setKeepAccounts] = useState(true);
  const [keepCategories, setKeepCategories] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const describeOutcome = () => {
    if (keepAccounts && keepCategories) {
      return "Deletes all transactions, spend buckets, and bucket entries while preserving your accounts and categories.";
    }
    if (!keepAccounts && !keepCategories) {
      return "Deletes all transactions, buckets, custom accounts, and custom categories, then re-seeds 1 Default account and 21 default categories.";
    }
    if (!keepCategories) {
      return "Deletes all transactions, buckets, and categories (keeps accounts), then re-seeds 21 default categories.";
    }
    return "Deletes all transactions, buckets, and accounts (keeps categories), then re-seeds 1 Default account.";
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if (isAuthenticated && email && password) {
      const check = await verifyUserPassword(email, password);
      if (!check.isValid) {
        setError(check.error || "Incorrect password.");
        return;
      }
    } else if (confirmText.trim().toUpperCase() !== "RESET") {
      setError('Type "RESET" to confirm permanent deletion.');
      return;
    }

    setResetting(true);
    try {
      const res = await resetUserData({
        ownerId: userId,
        keepAccounts,
        keepCategories,
      });
      if (!res?.success) {
        setError(res?.error || "Reset failed.");
        return;
      }
      setConfirmOpen(false);
      setConfirmText("");
      setPassword("");
      setNotice("Selected data was reset cleanly.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <SettingsSubpageHeader
        title="Reset Data"
        description="Choose exactly what to keep before wiping transactions and buckets."
        activeAccount={activeAccount}
      />

      {notice && (
        <div className="p-3.5 rounded-2xl border border-[var(--home-income)]/40 bg-[var(--home-income-soft)] text-xs font-semibold text-[var(--home-income)]">
          {notice}
        </div>
      )}

      <div className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 sm:p-6 space-y-5">
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <span className="text-sm font-bold text-[var(--home-text)] block">
              Keep Accounts
            </span>
            <span className="text-xs text-[var(--home-text-muted)]">
              Preserve your configured accounts, currencies, and budget rules
            </span>
          </div>
          <input
            type="checkbox"
            aria-label="Keep Accounts"
            checked={keepAccounts}
            onChange={(e) => setKeepAccounts(e.target.checked)}
            className="w-5 h-5 accent-[var(--home-accent)] cursor-pointer shrink-0"
          />
        </label>

        <div className="border-t border-[var(--home-border)]" />

        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <span className="text-sm font-bold text-[var(--home-text)] block">
              Keep Categories
            </span>
            <span className="text-xs text-[var(--home-text-muted)]">
              Preserve custom categories, icons, and colors
            </span>
          </div>
          <input
            type="checkbox"
            aria-label="Keep Categories"
            checked={keepCategories}
            onChange={(e) => setKeepCategories(e.target.checked)}
            className="w-5 h-5 accent-[var(--home-accent)] cursor-pointer shrink-0"
          />
        </label>

        <div className="p-4 rounded-2xl border border-[var(--home-destructive)]/30 bg-[var(--home-background)] text-xs text-[var(--home-text-secondary)] leading-relaxed flex items-start gap-2.5">
          <HiOutlineExclamationTriangle className="w-4 h-4 text-[var(--home-destructive)] shrink-0 mt-0.5" />
          <span>{describeOutcome()}</span>
        </div>

        <button
          type="button"
          onClick={() => {
            setError("");
            setConfirmText("");
            setPassword("");
            setConfirmOpen(true);
          }}
          className="px-6 py-3 rounded-full bg-[var(--home-destructive)] text-white text-xs sm:text-sm font-semibold cursor-pointer hover:opacity-95"
        >
          Reset Selected Data
        </button>
      </div>

      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Data Reset"
          className="fixed inset-0 z-[9999] bg-black/55 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => !resetting && setConfirmOpen(false)}
        >
          <form
            onSubmit={handleConfirmReset}
            className="w-full max-w-md rounded-[28px] border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text)] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-xl text-[var(--home-destructive)]">
              Confirm Permanent Reset
            </h3>
            <p className="text-xs text-[var(--home-text-secondary)] leading-relaxed">
              {describeOutcome()}
            </p>

            {error && (
              <div className="p-3 rounded-2xl border border-[var(--home-destructive)]/40 bg-[var(--home-background)] text-xs font-semibold text-[var(--home-destructive)]">
                {error}
              </div>
            )}

            {isAuthenticated && email ? (
              <div>
                <label
                  htmlFor="reset-password-confirm"
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
                >
                  Enter Account Password (or leave blank &amp; type RESET below)
                </label>
                <input
                  id="reset-password-confirm"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Account password"
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-sm mb-2 focus:outline-none focus:border-[var(--home-accent)]"
                />
                {!password && (
                  <input
                    type="text"
                    aria-label="Type RESET to confirm"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder='Type "RESET" to confirm'
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-sm focus:outline-none focus:border-[var(--home-accent)]"
                  />
                )}
              </div>
            ) : (
              <div>
                <label
                  htmlFor="reset-confirm-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
                >
                  Type RESET to confirm
                </label>
                <input
                  id="reset-confirm-input"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="RESET"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-sm font-mono-num focus:outline-none focus:border-[var(--home-accent)]"
                />
              </div>
            )}

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                disabled={resetting}
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resetting}
                className="flex-[2] py-2.5 rounded-full bg-[var(--home-destructive)] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {resetting ? "Resetting…" : "Confirm Reset"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

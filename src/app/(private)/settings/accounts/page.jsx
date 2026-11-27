"use client";

import React, { useState, useEffect } from "react";
import {
  HiPlus,
  HiOutlineArrowsRightLeft,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineStar,
  HiCheck,
  HiXMark,
} from "react-icons/hi2";
import useAccounts from "@/hooks/useAccounts";
import { AVATAR_KEYS } from "@/lib/defaultSeeds";
import { SPENDING_PERIODS } from "@/lib/budgetMath";
import { toLocalDateKey } from "@/lib/dateUtils";
import SettingsSubpageHeader from "@/components/settings/SettingsSubpageHeader";
import AvatarBadge from "@/components/shared/AvatarBadge";
import CurrencySelect from "@/components/CurrencySelect";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { SkeletonGrid } from "@/components/shared/Skeleton";

export default function AccountsSettingsPage() {
  const {
    accounts,
    activeAccount,
    activeAccountId,
    switchAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    transferFunds,
    loading: accountsLoading,
  } = useAccounts();

  // Create / Edit account modal
  const [accModalOpen, setAccModalOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState(null);
  const [accName, setAccName] = useState("");
  const [accAvatar, setAccAvatar] = useState("user_pf");
  const [accCurrency, setAccCurrency] = useState("INR");
  const [accPeriod, setAccPeriod] = useState("Monthly");
  const [accSaving, setAccSaving] = useState(false);
  const [accError, setAccError] = useState("");

  // Transfer Money modal
  const [transferOpen, setTransferOpen] = useState(false);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDate, setTransferDate] = useState(toLocalDateKey(new Date()));
  const [transferNote, setTransferNote] = useState("");
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [notice, setNotice] = useState("");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (accounts.length >= 2 && (!fromId || !toId)) {
      const first = activeAccountId || accounts[0].id;
      const other = accounts.find((a) => a.id !== first)?.id || accounts[1].id;
      setFromId(first);
      setToId(other);
    }
  }, [accounts, activeAccountId, fromId, toId]);

  const openCreateModal = () => {
    setEditingAcc(null);
    setAccName("");
    setAccAvatar("user_pf");
    setAccCurrency("INR");
    setAccPeriod("Monthly");
    setAccError("");
    setAccModalOpen(true);
  };

  const openEditModal = (acc) => {
    setEditingAcc(acc);
    setAccName(acc.name || "");
    setAccAvatar(acc.avatar_key || "user_pf");
    setAccCurrency(acc.currency_code || "INR");
    setAccPeriod(acc.spending_period || "Monthly");
    setAccError("");
    setAccModalOpen(true);
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setAccError("");
    if (!accName.trim()) {
      setAccError("Account name is required.");
      return;
    }
    setAccSaving(true);
    try {
      const res = editingAcc
        ? await updateAccount(editingAcc.id, {
            name: accName.trim(),
            avatar_key: accAvatar,
            currency_code: accCurrency,
            spending_period: accPeriod,
          })
        : await createAccount({
            name: accName.trim(),
            avatarKey: accAvatar,
            currencyCode: accCurrency,
            spendingPeriod: accPeriod,
          });
      if (!res?.success) {
        setAccError(res?.error || "Unable to save account.");
        return;
      }
      setAccModalOpen(false);
      setNotice(
        editingAcc ? `Updated "${accName.trim()}".` : `Created "${accName.trim()}".`,
      );
    } finally {
      setAccSaving(false);
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setTransferError("");
    const amt = Number(transferAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setTransferError("Enter a valid transfer amount greater than zero.");
      return;
    }
    if (fromId === toId) {
      setTransferError("Source and destination accounts must be different.");
      return;
    }
    setTransferSaving(true);
    try {
      const res = await transferFunds({
        fromAccountId: fromId,
        toAccountId: toId,
        amount: amt,
        date: transferDate,
        note: transferNote,
      });
      if (!res?.success) {
        setTransferError(res?.error || "Transfer failed.");
        return;
      }
      setTransferOpen(false);
      setTransferAmount("");
      setTransferNote("");
      const fromName = accounts.find((a) => a.id === fromId)?.name || "Source";
      const toName = accounts.find((a) => a.id === toId)?.name || "Destination";
      setNotice(
        `Transferred ${amt} from "${fromName}" to "${toName}" (excluded from income/expense totals).`,
      );
    } finally {
      setTransferSaving(false);
    }
  };

  const fromAcc = accounts.find((a) => a.id === fromId);
  const toAcc = accounts.find((a) => a.id === toId);
  const crossCurrencyTransfer =
    fromAcc &&
    toAcc &&
    (fromAcc.currency_code || "INR") !== (toAcc.currency_code || "INR");

  return (
    <div className="space-y-6">
      <SettingsSubpageHeader
        title="Accounts & Transfers"
        description="Manage multiple wallets, currency & avatars, or record neutral transfers between accounts."
        activeAccount={activeAccount}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={accounts.length < 2}
              onClick={() => {
                setTransferError("");
                setTransferOpen(true);
              }}
              className="h-10 px-4 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] text-xs font-semibold inline-flex items-center gap-1.5 hover:border-[var(--home-accent)] disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed"
            >
              <HiOutlineArrowsRightLeft className="w-4 h-4" />
              <span>Transfer Money</span>
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="h-10 px-4 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <HiPlus className="w-4 h-4" />
              <span>New Account</span>
            </button>
          </div>
        }
      />

      {notice && (
        <div className="p-3.5 rounded-2xl border border-[var(--home-income)]/40 bg-[var(--home-income-soft)] text-xs font-semibold text-[var(--home-income)]">
          {notice}
        </div>
      )}

      {accounts.length < 2 && (
        <div className="rounded-[22px] border border-[var(--home-border)] bg-[var(--home-card)] p-4 text-xs text-[var(--home-text-secondary)]">
          Create a second account to transfer money between accounts.
        </div>
      )}

      {accountsLoading ? (
        <SkeletonGrid
          items={2}
          label="Loading accounts"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          itemClassName="h-40"
        />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map((acc) => {
          const isActive = acc.id === activeAccountId;
          return (
            <div
              key={acc.id}
              className={`rounded-[24px] border p-5 space-y-4 transition-colors ${
                isActive
                  ? "border-[var(--home-accent)] bg-[var(--home-card)]"
                  : "border-[var(--home-border)] bg-[var(--home-card)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <AvatarBadge
                    avatarKey={acc.avatar_key || "user_pf"}
                    name={acc.name}
                    size={46}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display text-lg text-[var(--home-text)] truncate">
                        {acc.name}
                      </h3>
                      {acc.is_default && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--home-track)] text-[var(--home-text-secondary)]">
                          Default
                        </span>
                      )}
                      {isActive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--home-income-soft)] text-[var(--home-income)]">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--home-text-muted)] mt-0.5">
                      {acc.currency_code || "INR"} ·{" "}
                      {acc.spending_period || "Monthly"}
                      {acc.budget_mode ? " · Budget Mode" : ""}
                      {acc.hide_transactions ? " · Hidden" : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    aria-label={`Edit ${acc.name}`}
                    onClick={() => openEditModal(acc)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] cursor-pointer"
                  >
                    <HiOutlinePencilSquare className="w-4 h-4" />
                  </button>
                  {accounts.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Delete ${acc.name}`}
                      onClick={() => setDeleteTarget(acc)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-destructive)] hover:bg-[var(--home-track)] cursor-pointer"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                {!isActive && (
                  <button
                    type="button"
                    onClick={() => switchAccount(acc.id)}
                    className="flex-1 py-2 px-3 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] text-xs font-semibold hover:border-[var(--home-accent)] cursor-pointer"
                  >
                    Switch Active
                  </button>
                )}
                {isActive && (
                  <span className="flex-1 py-2 px-3 rounded-full bg-[var(--home-background)] border border-[var(--home-border)] text-xs font-semibold text-center text-[var(--home-income)] inline-flex items-center justify-center gap-1">
                    <HiCheck className="w-3.5 h-3.5" />
                    <span>Currently Active</span>
                  </span>
                )}
                {!acc.is_default && (
                  <button
                    type="button"
                    onClick={() => updateAccount(acc.id, { is_default: true })}
                    className="py-2 px-3 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] text-xs font-semibold inline-flex items-center gap-1 hover:border-[var(--home-accent)] cursor-pointer"
                  >
                    <HiOutlineStar className="w-3.5 h-3.5" />
                    <span>Set Default</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Create / Edit Account Modal */}
      {accModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editingAcc ? "Edit Account" : "New Account"}
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setAccModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[28px] border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text)] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl">
                {editingAcc ? "Edit Account" : "New Account"}
              </h3>
              <button
                type="button"
                onClick={() => setAccModalOpen(false)}
                aria-label="Close modal"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:bg-[var(--home-track)] cursor-pointer"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            {accError && (
              <div className="p-3 rounded-2xl border border-[var(--home-destructive)]/40 bg-[var(--home-background)] text-xs font-semibold text-[var(--home-destructive)]">
                {accError}
              </div>
            )}

            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1.5">
                  Avatar
                </span>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_KEYS.map((key) => {
                    const selected = key === accAvatar;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAccAvatar(key)}
                        className={`rounded-full p-0.5 border-2 cursor-pointer transition-transform ${
                          selected
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
                  htmlFor="settings-account-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
                >
                  Account Name
                </label>
                <input
                  id="settings-account-name"
                  type="text"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  required
                  placeholder="Personal, Joint, Travel..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-sm focus:outline-none focus:border-[var(--home-accent)]"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1">
                  Account Currency
                </span>
                {editingAcc && accCurrency !== editingAcc.currency_code && (
                  <p className="text-[11px] text-[var(--home-accent)] mb-1.5">
                    Display symbol only — existing amounts are not converted.
                  </p>
                )}
                <CurrencySelect
                  value={accCurrency}
                  onChange={setAccCurrency}
                />
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1">
                  Default Period
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {SPENDING_PERIODS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAccPeriod(p)}
                      className={`py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                        accPeriod === p
                          ? "bg-[var(--home-accent)] text-[var(--home-on-accent)] border-[var(--home-accent)]"
                          : "bg-[var(--home-background)] text-[var(--home-text-secondary)] border-[var(--home-border)]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setAccModalOpen(false)}
                  className="flex-1 py-2.5 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={accSaving}
                  className="flex-[2] py-2.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {accSaving
                    ? "Saving…"
                    : editingAcc
                      ? "Save Account"
                      : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Money Modal */}
      {transferOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Transfer Money Between Accounts"
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setTransferOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[28px] border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text)] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl">Transfer Money</h3>
              <button
                type="button"
                onClick={() => setTransferOpen(false)}
                aria-label="Close transfer modal"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:bg-[var(--home-track)] cursor-pointer"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[var(--home-text-secondary)] leading-relaxed">
              Creates a paired neutral debit and credit entry. Works whether Budget Mode is enabled or off, and never skews income or expense reports.
            </p>

            {transferError && (
              <div className="p-3 rounded-2xl border border-[var(--home-destructive)]/40 bg-[var(--home-background)] text-xs font-semibold text-[var(--home-destructive)]">
                {transferError}
              </div>
            )}

            <form onSubmit={handleTransferSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="transfer-from"
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
                >
                  From Account
                </label>
                <select
                  id="transfer-from"
                  value={fromId}
                  onChange={(e) => setFromId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-sm focus:outline-none focus:border-[var(--home-accent)]"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency_code || "INR"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="transfer-to"
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
                >
                  To Account
                </label>
                <select
                  id="transfer-to"
                  value={toId}
                  onChange={(e) => setToId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-sm focus:outline-none focus:border-[var(--home-accent)]"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency_code || "INR"})
                    </option>
                  ))}
                </select>
              </div>

              {crossCurrencyTransfer && (
                <p className="text-[11px] text-[var(--home-accent)] p-2.5 rounded-xl bg-[var(--home-background)] border border-[var(--home-border)]">
                  Source ({fromAcc.currency_code}) and destination ({toAcc.currency_code}) currencies differ — the same numeric amount is recorded on both accounts without FX conversion.
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="transfer-amount"
                    className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
                  >
                    Amount
                  </label>
                  <input
                    id="transfer-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="500"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] font-mono-num text-sm focus:outline-none focus:border-[var(--home-accent)]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="transfer-date"
                    className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
                  >
                    Date
                  </label>
                  <input
                    id="transfer-date"
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-sm focus:outline-none focus:border-[var(--home-accent)]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="transfer-note"
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
                >
                  Note (Optional)
                </label>
                <input
                  id="transfer-note"
                  type="text"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="Monthly savings sweep..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-sm focus:outline-none focus:border-[var(--home-accent)]"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferOpen(false)}
                  className="flex-1 py-2.5 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferSaving}
                  className="flex-[2] py-2.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {transferSaving ? "Transferring…" : "Confirm Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete Account "${deleteTarget?.name || ""}"?`}
        description="This permanently removes this account and all transactions and spend buckets stored under it."
        confirmLabel="Delete Account"
        destructive
        loading={deleting}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          try {
            await deleteAccount(deleteTarget.id);
            setDeleteTarget(null);
          } finally {
            setDeleting(false);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

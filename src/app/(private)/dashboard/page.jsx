"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  HiPlus,
  HiOutlineChartPie,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineArrowRight,
  HiOutlineArrowsRightLeft,
} from "react-icons/hi2";
import useAccounts from "@/hooks/useAccounts";
import useTransactions from "@/hooks/useTransactions";
import useCategories from "@/hooks/useCategories";
import { formatMoney } from "@/utils/currencies";
import {
  getPeriodBounds,
  toLocalDateKey,
  parseLocalDate,
} from "@/lib/dateUtils";
import { computeSpendingSummary } from "@/lib/budgetMath";
import PeriodFilterBar from "@/components/shared/PeriodFilterBar";
import ProportionalBar from "@/components/shared/ProportionalBar";
import CategoryIcon from "@/components/shared/CategoryIcon";
import AvatarBadge from "@/components/shared/AvatarBadge";
import AccountSwitcherModal from "@/components/shared/AccountSwitcherModal";
import TransactionFormModal from "@/components/transactions/TransactionFormModal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import EmptyStateCard from "@/components/shared/EmptyStateCard";

export default function DashboardPage() {
  const {
    accounts,
    activeAccount,
    activeAccountId,
    switchAccount,
    createAccount,
  } = useAccounts();

  const {
    transactions,
    loading: txLoading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions({ accountId: activeAccountId });

  const { categories, createCategory } = useCategories();

  const currencyCode = activeAccount?.currency_code || "INR";

  const [period, setPeriod] = useState("Monthly");
  const [anchorDate, setAnchorDate] = useState(() => toLocalDateKey(new Date()));
  const [customRange, setCustomRange] = useState(null);
  const [initializedPeriodForAccount, setInitializedPeriodForAccount] =
    useState(null);

  const [revealHidden, setRevealHidden] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Sync default spending_period when switching accounts
  useEffect(() => {
    if (
      activeAccount?.id &&
      activeAccount.id !== initializedPeriodForAccount
    ) {
      setPeriod(activeAccount.spending_period || "Monthly");
      setInitializedPeriodForAccount(activeAccount.id);
      setRevealHidden(false);
    }
  }, [activeAccount, initializedPeriodForAccount]);

  const { startKey, endKey, customDays } = useMemo(() => {
    if (period === "Custom") {
      if (customRange?.[0] && customRange?.[1]) {
        const s = parseLocalDate(customRange[0]);
        const e = parseLocalDate(customRange[1]);
        const diffDays = Math.max(
          1,
          Math.round((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000)) + 1,
        );
        return {
          startKey: customRange[0],
          endKey: customRange[1],
          customDays: diffDays,
        };
      }
      const bounds = getPeriodBounds("Monthly", anchorDate);
      return {
        startKey: toLocalDateKey(bounds.start),
        endKey: toLocalDateKey(bounds.end),
        customDays: 30,
      };
    }
    const bounds = getPeriodBounds(period, anchorDate);
    return {
      startKey: toLocalDateKey(bounds.start),
      endKey: toLocalDateKey(bounds.end),
      customDays: null,
    };
  }, [period, anchorDate, customRange]);

  const periodTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        const d = tx.date;
        if (!d) return false;
        return d >= startKey && d <= endKey;
      })
      .sort((a, b) => {
        const dCmp = String(b.date || "").localeCompare(String(a.date || ""));
        if (dCmp !== 0) return dCmp;
        return String(b.created_at || "").localeCompare(
          String(a.created_at || ""),
        );
      });
  }, [transactions, startKey, endKey]);

  const summary = useMemo(
    () =>
      computeSpendingSummary({
        transactions: periodTransactions,
        categories,
        account: activeAccount,
        activeFilter: period,
        customDays,
      }),
    [periodTransactions, categories, activeAccount, period, customDays],
  );

  const isHiddenMasked = Boolean(activeAccount?.hide_transactions) && !revealHidden;

  const displayMoney = (val, opts) =>
    isHiddenMasked ? "••••••" : formatMoney(val, currencyCode, opts);

  const handleSaveTx = async (payload) => {
    if (payload.id) {
      return await updateTransaction(payload.id, payload);
    }
    return await addTransaction(payload);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTransaction(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setAccountModalOpen(true)}
            className="rounded-full p-0.5 border border-[var(--home-border)] hover:border-[var(--home-accent)] transition-colors cursor-pointer shrink-0"
            title="Switch or add account"
          >
            <AvatarBadge
              avatarKey={activeAccount?.avatar_key || "user_pf"}
              name={activeAccount?.name || "Default"}
              size={46}
            />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-[var(--home-text)] truncate">
                {activeAccount?.name || "Default"}
              </h1>
              <button
                type="button"
                onClick={() => setAccountModalOpen(true)}
                className="text-xs font-semibold px-2.5 py-1 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text-secondary)] hover:text-[var(--home-text)] cursor-pointer shrink-0"
              >
                Switch
              </button>
            </div>
            <p className="text-xs sm:text-sm text-[var(--home-text-secondary)]">
              {currencyCode} · {activeAccount?.spending_period || "Monthly"}
              {summary.isBudgetMode
                ? ` · Budget ${formatMoney(activeAccount?.budget_amount || 0, currencyCode)}`
                : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {activeAccount?.hide_transactions && (
            <button
              type="button"
              onClick={() => setRevealHidden((v) => !v)}
              className="h-10 px-3.5 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] text-xs font-semibold text-[var(--home-text-secondary)] hover:text-[var(--home-text)] inline-flex items-center gap-1.5 cursor-pointer"
            >
              {revealHidden ? (
                <>
                  <HiOutlineEyeSlash className="w-4 h-4" />
                  <span>Mask</span>
                </>
              ) : (
                <>
                  <HiOutlineEye className="w-4 h-4" />
                  <span>Reveal</span>
                </>
              )}
            </button>
          )}
          <Link
            href="/analytics"
            aria-label="Open Analytics"
            className="h-10 w-10 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] flex items-center justify-center text-[var(--home-text-secondary)] hover:text-[var(--home-text)] hover:border-[var(--home-accent)] transition-colors"
            title="Analytics"
          >
            <HiOutlineChartPie className="w-5 h-5" />
          </Link>
          <button
            type="button"
            onClick={() => {
              setEditingTx(null);
              setTxModalOpen(true);
            }}
            className="h-10 px-5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
          >
            <HiPlus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Period Filter & Navigation */}
      <PeriodFilterBar
        period={period}
        onPeriodChange={(next) => {
          setPeriod(next);
          if (next === "Custom" && !customRange) {
            setCustomRange([startKey, endKey]);
          }
        }}
        anchorDate={anchorDate}
        onAnchorChange={setAnchorDate}
        customRange={customRange}
        onCustomRangeChange={setCustomRange}
      />

      {/* Hero Summary Card */}
      <section className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 sm:p-7 space-y-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--home-text-muted)] block mb-1">
              {summary.isBudgetMode ? "Remaining Balance" : "Net Balance"}
            </span>
            <p
              className={`font-display text-3xl sm:text-4xl tracking-tight tabular-nums ${
                summary.netBalance < 0
                  ? "text-[var(--home-destructive)]"
                  : "text-[var(--home-text)]"
              }`}
            >
              {displayMoney(summary.netBalance)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
            <div className="rounded-2xl p-3.5 bg-[var(--home-income-soft)] border border-[var(--home-border)]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--home-income)] block">
                {summary.topLabel}
              </span>
              <span className="font-mono-num text-base sm:text-lg font-bold text-[var(--home-income)] block mt-0.5">
                {displayMoney(summary.effectiveTopAmount)}
              </span>
            </div>

            <div
              className="rounded-2xl p-3.5 border border-[var(--home-border)]"
              style={{ backgroundColor: "var(--add-operator-key-bg)" }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--home-expense)] block">
                Expenses
              </span>
              <span className="font-mono-num text-base sm:text-lg font-bold text-[var(--home-expense)] block mt-0.5">
                {displayMoney(summary.totalExpense)}
              </span>
            </div>
          </div>
        </div>

        {/* Dual-Weight Proportional Bar */}
        <div className="space-y-1.5">
          <ProportionalBar
            leftPct={summary.topBarPct}
            rightPct={summary.expenseBarPct}
            height={10}
          />
          <div className="flex items-center justify-between text-[11px] text-[var(--home-text-muted)]">
            <span>
              {summary.topLabel}: {summary.topBarPct}%
            </span>
            <span>Expenses: {summary.expenseBarPct}%</span>
          </div>
        </div>

        {summary.transferCount > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-[var(--home-border)] text-xs text-[var(--home-text-secondary)]">
            <span className="inline-flex items-center gap-1.5">
              <HiOutlineArrowsRightLeft className="w-3.5 h-3.5 text-[var(--home-accent)]" />
              <span>
                {summary.transferCount} neutral transfer entry(s) excluded from totals
              </span>
            </span>
            <Link
              href="/transactions?type=transfer"
              className="font-semibold text-[var(--home-accent)] hover:underline"
            >
              View transfers →
            </Link>
          </div>
        )}
      </section>

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Where it went */}
        <section className="lg:col-span-5 rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-[var(--home-text)]">
              Where it went
            </h2>
            <Link
              href="/analytics"
              className="text-xs font-semibold text-[var(--home-accent)] hover:underline"
            >
              Charts →
            </Link>
          </div>

          {summary.categoryBreakdown.length === 0 ? (
            <p className="text-xs sm:text-sm text-[var(--home-text-muted)] py-6 text-center">
              No expenses recorded in this period yet.
            </p>
          ) : (
            <div className="space-y-3.5">
              {summary.categoryBreakdown.map((item) => (
                <Link
                  key={item.categoryId || item.name}
                  href={
                    item.categoryId
                      ? `/transactions?category=${item.categoryId}`
                      : "/transactions"
                  }
                  className="block group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CategoryIcon
                        iconKey={item.iconKey}
                        color={item.color}
                        size={16}
                        withBadge
                        badgeSize={32}
                      />
                      <span className="text-xs sm:text-sm font-semibold text-[var(--home-text)] truncate group-hover:text-[var(--home-accent)] transition-colors">
                        {item.name}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono-num text-xs sm:text-sm font-bold text-[var(--home-text)] block">
                        {displayMoney(item.amount)}
                      </span>
                      <span className="text-[11px] font-mono-num text-[var(--home-text-muted)]">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--home-track)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(4, item.percentage)}%`,
                        backgroundColor: item.barColor,
                      }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* RIGHT: Recent Activity */}
        <section className="lg:col-span-7 rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-[var(--home-text)]">
              Recent Activity
            </h2>
            <Link
              href="/transactions"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--home-accent)] hover:underline"
            >
              <span>All Transactions</span>
              <HiOutlineArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {txLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-2xl bg-[var(--home-track)]/60 animate-pulse"
                />
              ))}
            </div>
          ) : isHiddenMasked && periodTransactions.length > 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--home-border)] bg-[var(--home-background)] p-8 text-center space-y-3">
              <p className="text-sm font-semibold text-[var(--home-text)]">
                Transactions are hidden for privacy
              </p>
              <p className="text-xs text-[var(--home-text-muted)]">
                {periodTransactions.length} entries recorded in this period.
              </p>
              <button
                type="button"
                onClick={() => setRevealHidden(true)}
                className="px-4 py-2 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold cursor-pointer"
              >
                Reveal Temporarily
              </button>
            </div>
          ) : periodTransactions.length === 0 ? (
            <EmptyStateCard
              icon={<HiPlus className="w-6 h-6" />}
              title="No transactions yet"
              description="Log your first expense or income for this period to see live spending breakdowns."
              actionLabel="Add Transaction"
              onAction={() => {
                setEditingTx(null);
                setTxModalOpen(true);
              }}
            />
          ) : (
            <div className="divide-y divide-[var(--home-border)]">
              {periodTransactions.slice(0, 10).map((tx) => {
                const isIncome = tx.kind === "income" || tx.type === "Income";
                const isTransfer = Boolean(tx.transfer_group_id);
                return (
                  <div
                    key={tx.id}
                    className="min-h-[60px] py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CategoryIcon
                        iconKey={tx.category_icon}
                        color={tx.color_code}
                        size={18}
                        withBadge
                        badgeSize={40}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[var(--home-text)] truncate">
                            {tx.category}
                          </span>
                          {isTransfer && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--home-track)] text-[var(--home-text-muted)]">
                              Transfer
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--home-text-muted)] truncate">
                          {tx.date}
                          {tx.note ? ` · ${tx.note}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-mono-num text-sm font-bold ${
                          isTransfer
                            ? "text-[var(--home-text-secondary)]"
                            : isIncome
                              ? "text-[var(--home-income)]"
                              : "text-[var(--home-expense)]"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {displayMoney(tx.amount)}
                      </span>

                      {!isTransfer && (
                        <button
                          type="button"
                          aria-label="Edit transaction"
                          onClick={() => {
                            setEditingTx(tx);
                            setTxModalOpen(true);
                          }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] cursor-pointer"
                        >
                          <HiOutlinePencilSquare className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label="Delete transaction"
                        onClick={() => setDeleteTarget(tx)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-destructive)] hover:bg-[var(--home-track)] cursor-pointer"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Mobile Floating Add Button */}
      <button
        type="button"
        onClick={() => {
          setEditingTx(null);
          setTxModalOpen(true);
        }}
        aria-label="Quick Add Transaction"
        className="lg:hidden fixed bottom-20 right-4 z-20 w-14 h-14 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] shadow-xl flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
      >
        <HiPlus className="w-6 h-6" />
      </button>

      <AccountSwitcherModal
        open={accountModalOpen}
        accounts={accounts}
        activeAccountId={activeAccountId}
        onSelectAccount={switchAccount}
        onCreateAccount={createAccount}
        onClose={() => setAccountModalOpen(false)}
      />

      <TransactionFormModal
        open={txModalOpen}
        initialTransaction={editingTx}
        categories={categories}
        currencyCode={currencyCode}
        onSave={handleSaveTx}
        onCreateCategory={createCategory}
        onClose={() => {
          setTxModalOpen(false);
          setEditingTx(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={
          deleteTarget?.transfer_group_id
            ? "Delete Account Transfer?"
            : "Delete Transaction?"
        }
        description={
          deleteTarget?.transfer_group_id
            ? "This removes both the source debit and destination credit entry for this transfer."
            : "This action permanently deletes this transaction entry."
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

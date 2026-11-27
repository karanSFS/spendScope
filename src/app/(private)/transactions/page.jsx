"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  HiPlus,
  HiMagnifyingGlass,
  HiOutlineFunnel,
  HiOutlineArrowUpTray,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineEyeSlash,
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
import PeriodFilterBar, {
  formatPeriodLabel,
} from "@/components/shared/PeriodFilterBar";
import CategoryIcon from "@/components/shared/CategoryIcon";
import TransactionFormModal from "@/components/transactions/TransactionFormModal";
import TransactionFiltersDrawer from "@/components/transactions/TransactionFiltersDrawer";
import ExportModal from "@/components/transactions/ExportModal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import EmptyStateCard from "@/components/shared/EmptyStateCard";

function TransactionsContent() {
  const searchParams = useSearchParams();
  const { activeAccount, activeAccountId } = useAccounts();
  const {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions({ accountId: activeAccountId });
  const { categories, createCategory } = useCategories();

  const currencyCode = activeAccount?.currency_code || "INR";

  const [period, setPeriod] = useState("Monthly");
  const [anchorDate, setAnchorDate] = useState(() => toLocalDateKey(new Date()));
  const [customRange, setCustomRange] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [revealHidden, setRevealHidden] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Respect optional deep-link query params (?type=transfer or ?category=<id>)
  useEffect(() => {
    const paramType = searchParams?.get("type");
    const paramCat = searchParams?.get("category");
    if (paramType) setTypeFilter(paramType);
    if (paramCat) setSelectedCategoryIds([paramCat]);
  }, [searchParams]);

  useEffect(() => {
    if (activeAccount?.spending_period) {
      setPeriod(activeAccount.spending_period);
    }
    setRevealHidden(false);
  }, [activeAccount?.id, activeAccount?.spending_period]);

  const { startKey, endKey } = useMemo(() => {
    if (period === "All") {
      return { startKey: null, endKey: null };
    }
    if (period === "Custom") {
      if (customRange?.[0] && customRange?.[1]) {
        return { startKey: customRange[0], endKey: customRange[1] };
      }
      const b = getPeriodBounds("Monthly", anchorDate);
      return {
        startKey: toLocalDateKey(b.start),
        endKey: toLocalDateKey(b.end),
      };
    }
    const bounds = getPeriodBounds(period, anchorDate);
    return {
      startKey: toLocalDateKey(bounds.start),
      endKey: toLocalDateKey(bounds.end),
    };
  }, [period, anchorDate, customRange]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions
      .filter((tx) => {
        if (startKey && endKey && (tx.date < startKey || tx.date > endKey)) {
          return false;
        }
        if (typeFilter === "expense") {
          if (tx.transfer_group_id || tx.kind !== "expense") return false;
        } else if (typeFilter === "income") {
          if (tx.transfer_group_id || tx.kind !== "income") return false;
        } else if (typeFilter === "transfer") {
          if (!tx.transfer_group_id) return false;
        }
        if (selectedCategoryIds.length > 0) {
          if (!tx.category_id || !selectedCategoryIds.includes(tx.category_id)) {
            return false;
          }
        }
        if (q) {
          const hay = `${tx.category || ""} ${tx.note || ""} ${tx.amount || ""} ${tx.date || ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dCmp = String(b.date || "").localeCompare(String(a.date || ""));
        if (dCmp !== 0) return dCmp;
        return String(b.created_at || "").localeCompare(
          String(a.created_at || ""),
        );
      });
  }, [
    transactions,
    startKey,
    endKey,
    typeFilter,
    selectedCategoryIds,
    searchQuery,
  ]);

  const { totalIn, totalOut, transferCount } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    let tr = 0;
    for (const tx of filteredTransactions) {
      if (tx.transfer_group_id) {
        tr++;
        continue;
      }
      const amt = Number(tx.amount) || 0;
      if (tx.kind === "income") inc += amt;
      else exp += amt;
    }
    return { totalIn: inc, totalOut: exp, transferCount: tr };
  }, [filteredTransactions]);

  const groupedByDate = useMemo(() => {
    const groups = new Map();
    const todayKey = toLocalDateKey(new Date());
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yesterdayKey = toLocalDateKey(yest);

    for (const tx of filteredTransactions) {
      const key = tx.date || todayKey;
      let label = key;
      if (key === todayKey) label = "Today";
      else if (key === yesterdayKey) label = "Yesterday";
      else {
        label = parseLocalDate(key).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
      if (!groups.has(key)) {
        groups.set(key, { dateKey: key, label, items: [] });
      }
      groups.get(key).items.push(tx);
    }
    return Array.from(groups.values());
  }, [filteredTransactions]);

  const isHiddenMasked =
    Boolean(activeAccount?.hide_transactions) && !revealHidden;

  const periodLabel =
    period === "All"
      ? "All Time"
      : formatPeriodLabel(period, anchorDate, customRange);

  const handleToggleCategory = (catId) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId)
        ? prev.filter((id) => id !== catId)
        : [...prev, catId],
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-[var(--home-text)]">
            Transactions
          </h1>
          <p className="text-xs sm:text-sm text-[var(--home-text-secondary)]">
            {activeAccount?.name || "Default"} · {filteredTransactions.length}{" "}
            {filteredTransactions.length === 1 ? "entry" : "entries"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeAccount?.hide_transactions && (
            <button
              type="button"
              onClick={() => setRevealHidden((v) => !v)}
              className="h-10 px-3.5 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
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
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="h-10 px-4 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] text-xs font-semibold inline-flex items-center gap-1.5 hover:border-[var(--home-accent)] cursor-pointer"
          >
            <HiOutlineArrowUpTray className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingTx(null);
              setTxModalOpen(true);
            }}
            className="h-10 px-5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <HiPlus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Period Bar (includes All option) */}
      <PeriodFilterBar
        period={period}
        onPeriodChange={(next) => {
          setPeriod(next);
          if (next === "Custom" && !customRange) {
            const b = getPeriodBounds("Monthly", anchorDate);
            setCustomRange([toLocalDateKey(b.start), toLocalDateKey(b.end)]);
          }
        }}
        anchorDate={anchorDate}
        onAnchorChange={setAnchorDate}
        customRange={customRange}
        onCustomRangeChange={setCustomRange}
        modes={["Daily", "Weekly", "Monthly", "Yearly", "Custom", "All"]}
      />

      {/* Search + Filter + Summary Pills */}
      <div className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-full border border-[var(--home-border)] bg-[var(--home-background)]">
            <HiMagnifyingGlass className="w-4 h-4 text-[var(--home-text-muted)] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search note, category, amount, date..."
              className="w-full bg-transparent text-xs sm:text-sm text-[var(--home-text)] placeholder-[var(--home-text-muted)] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className={`h-10 px-4 rounded-full border text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer ${
              typeFilter !== "all" || selectedCategoryIds.length > 0
                ? "border-[var(--home-accent)] bg-[var(--home-track)] text-[var(--home-text)]"
                : "border-[var(--home-border)] bg-[var(--home-background)] text-[var(--home-text-secondary)]"
            }`}
          >
            <HiOutlineFunnel className="w-4 h-4" />
            <span>
              Filters
              {selectedCategoryIds.length > 0
                ? ` (${selectedCategoryIds.length})`
                : typeFilter !== "all"
                  ? ` (${typeFilter})`
                  : ""}
            </span>
          </button>
        </div>

        {/* Count + In / Out summary pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-[var(--home-track)] text-[var(--home-text)] font-semibold">
            {filteredTransactions.length}{" "}
            {filteredTransactions.length === 1 ? "entry" : "entries"}
          </span>
          <span className="px-3 py-1 rounded-full bg-[var(--home-income-soft)] text-[var(--home-income)] font-mono-num font-bold">
            +In {isHiddenMasked ? "••••••" : formatMoney(totalIn, currencyCode)}
          </span>
          <span
            className="px-3 py-1 rounded-full text-[var(--home-expense)] font-mono-num font-bold"
            style={{ backgroundColor: "var(--add-operator-key-bg)" }}
          >
            -Out {isHiddenMasked ? "••••••" : formatMoney(totalOut, currencyCode)}
          </span>
          {transferCount > 0 && (
            <span className="px-3 py-1 rounded-full border border-[var(--home-border)] text-[var(--home-text-muted)] font-semibold">
              {transferCount} transfers
            </span>
          )}
        </div>
      </div>

      {/* Ledger List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded-2xl bg-[var(--home-card)] border border-[var(--home-border)] animate-pulse"
            />
          ))}
        </div>
      ) : isHiddenMasked && filteredTransactions.length > 0 ? (
        <div className="rounded-[24px] border border-dashed border-[var(--home-border)] bg-[var(--home-card)] p-10 text-center space-y-3">
          <h3 className="font-display text-lg">Transactions Hidden</h3>
          <p className="text-xs sm:text-sm text-[var(--home-text-muted)]">
            Hide Transactions is turned on for {activeAccount?.name}. Reveal entries temporarily to inspect or edit them.
          </p>
          <button
            type="button"
            onClick={() => setRevealHidden(true)}
            className="px-5 py-2.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold cursor-pointer"
          >
            Reveal Transactions
          </button>
        </div>
      ) : groupedByDate.length === 0 ? (
        <EmptyStateCard
          title="No matching transactions"
          description="Try clearing search filters or add a new expense or income entry."
          actionLabel="Add Transaction"
          onAction={() => {
            setEditingTx(null);
            setTxModalOpen(true);
          }}
        />
      ) : (
        <div className="space-y-4">
          {groupedByDate.map((group) => (
            <div
              key={group.dateKey}
              className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] overflow-hidden"
            >
              <div className="px-5 py-2.5 bg-[var(--home-background)]/60 border-b border-[var(--home-border)] flex items-center justify-between text-xs font-bold text-[var(--home-text-secondary)]">
                <span>{group.label}</span>
                <span>{group.items.length}</span>
              </div>

              <div className="divide-y divide-[var(--home-border)] px-4 sm:px-5">
                {group.items.map((tx) => {
                  const isIncome = tx.kind === "income";
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
                          {tx.note && (
                            <p className="text-xs text-[var(--home-text-muted)] truncate">
                              {tx.note}
                            </p>
                          )}
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
                          {formatMoney(tx.amount, currencyCode)}
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
            </div>
          ))}
        </div>
      )}

      <TransactionFiltersDrawer
        open={filtersOpen}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        selectedCategoryIds={selectedCategoryIds}
        onToggleCategoryId={handleToggleCategory}
        categories={categories}
        onClearAll={() => {
          setTypeFilter("all");
          setSelectedCategoryIds([]);
        }}
        onClose={() => setFiltersOpen(false)}
      />

      <ExportModal
        open={exportOpen}
        transactions={filteredTransactions}
        accountName={activeAccount?.name || "Default"}
        periodLabel={periodLabel}
        currencyCode={currencyCode}
        onClose={() => setExportOpen(false)}
      />

      <TransactionFormModal
        open={txModalOpen}
        initialTransaction={editingTx}
        categories={categories}
        currencyCode={currencyCode}
        onSave={async (payload) =>
          payload.id
            ? await updateTransaction(payload.id, payload)
            : await addTransaction(payload)
        }
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
            ? "Both sides of this account transfer will be removed."
            : "This permanently deletes this transaction record."
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          try {
            await deleteTransaction(deleteTarget.id);
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

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-[var(--home-text-muted)]">
          Loading transactions…
        </div>
      }
    >
      <TransactionsContent />
    </Suspense>
  );
}

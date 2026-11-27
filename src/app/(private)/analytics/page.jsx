"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineArrowLeft,
} from "react-icons/hi2";
import useAccounts from "@/hooks/useAccounts";
import useTransactions from "@/hooks/useTransactions";
import useCategories from "@/hooks/useCategories";
import { formatMoney } from "@/utils/currencies";
import { HOME_CATEGORY_PALETTE } from "@/lib/budgetMath";
import CategoryIcon from "@/components/shared/CategoryIcon";
import {
  Skeleton,
  SkeletonBars,
  SkeletonStats,
  SkeletonRegion,
} from "@/components/shared/Skeleton";

function ChartLoader() {
  return (
    <SkeletonRegion label="Loading chart" className="w-full h-full">
      <Skeleton className="w-full h-full min-h-[200px]" rounded="rounded-2xl" />
    </SkeletonRegion>
  );
}

const MonthlyDonutChart = dynamic(
  () =>
    import("@/components/analytics/AnalyticsCharts").then(
      (m) => m.MonthlyDonutChart,
    ),
  {
    ssr: false,
    loading: () => <ChartLoader />,
  },
);

const YearlyCashflowBarChart = dynamic(
  () =>
    import("@/components/analytics/AnalyticsCharts").then(
      (m) => m.YearlyCashflowBarChart,
    ),
  {
    ssr: false,
    loading: () => <ChartLoader />,
  },
);

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function AnalyticsPage() {
  const {
    activeAccount,
    activeAccountId,
    loading: accountsLoading,
  } = useAccounts();
  const { transactions, loading: txLoading } = useTransactions({
    accountId: activeAccountId,
  });
  const { categories, loading: catsLoading } = useCategories();
  const loading = accountsLoading || txLoading || catsLoading;

  const currencyCode = activeAccount?.currency_code || "INR";
  const now = new Date();

  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-11
  const [activeSliceIdx, setActiveSliceIdx] = useState(null);

  const monthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;

  const shiftMonth = (delta) => {
    const d = new Date(selectedYear, selectedMonth + delta, 1);
    setSelectedYear(d.getFullYear());
    setSelectedMonth(d.getMonth());
    setActiveSliceIdx(null);
  };

  const monthlyExpenses = useMemo(() => {
    const catById = new Map();
    const catByName = new Map();
    for (const c of categories) {
      catById.set(c.id, c);
      catByName.set(`${(c.name || "").toLowerCase()}|${c.kind}`, c);
    }

    const grouped = new Map();
    let totalMinor = 0;

    for (const tx of transactions) {
      if (tx.transfer_group_id) continue;
      if (tx.kind !== "expense") continue;
      if (!String(tx.date || "").startsWith(monthPrefix)) continue;

      const amtMinor = Math.round((Number(tx.amount) || 0) * 100);
      if (amtMinor <= 0) continue;
      totalMinor += amtMinor;

      const catObj =
        (tx.category_id && catById.get(tx.category_id)) ||
        catByName.get(`${String(tx.category || "").toLowerCase()}|expense`);

      const key = catObj?.id || tx.category || "Other";
      const cur = grouped.get(key) || {
        key,
        name: catObj?.name || tx.category || "Other",
        iconKey: catObj?.icon_key || catObj?.icon || tx.category_icon || "other",
        color: catObj?.color_code || catObj?.color || tx.color_code || "#78909C",
        valueMinor: 0,
      };
      cur.valueMinor += amtMinor;
      grouped.set(key, cur);
    }

    const slices = Array.from(grouped.values())
      .sort((a, b) => b.valueMinor - a.valueMinor)
      .map((item, idx) => ({
        ...item,
        value: item.valueMinor / 100,
        chartColor: HOME_CATEGORY_PALETTE[idx % HOME_CATEGORY_PALETTE.length],
        percentage:
          totalMinor > 0 ? Math.round((item.valueMinor / totalMinor) * 1000) / 10 : 0,
      }));

    return { slices, total: totalMinor / 100 };
  }, [transactions, categories, monthPrefix]);

  const yearlyBars = useMemo(() => {
    const months = MONTH_LABELS.map((label, idx) => ({
      month: label,
      monthIdx: idx,
      incomeMinor: 0,
      expenseMinor: 0,
      income: 0,
      expense: 0,
    }));

    const yearPrefix = `${selectedYear}-`;
    for (const tx of transactions) {
      if (tx.transfer_group_id) continue;
      if (!String(tx.date || "").startsWith(yearPrefix)) continue;
      const m = Number(String(tx.date).slice(5, 7)) - 1;
      if (m < 0 || m > 11) continue;
      const amtMinor = Math.round((Number(tx.amount) || 0) * 100);
      if (tx.kind === "income") {
        months[m].incomeMinor += amtMinor;
      } else {
        months[m].expenseMinor += amtMinor;
      }
    }

    let totalIncomeMinor = 0;
    let totalExpenseMinor = 0;
    for (const row of months) {
      row.income = row.incomeMinor / 100;
      row.expense = row.expenseMinor / 100;
      totalIncomeMinor += row.incomeMinor;
      totalExpenseMinor += row.expenseMinor;
    }

    return {
      months,
      totalIncome: totalIncomeMinor / 100,
      totalExpense: totalExpenseMinor / 100,
    };
  }, [transactions, selectedYear]);

  const focusedSlice =
    activeSliceIdx !== null ? monthlyExpenses.slices[activeSliceIdx] : null;

  const monthTitle = new Date(selectedYear, selectedMonth, 1).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            aria-label="Back to Overview"
            className="w-10 h-10 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] flex items-center justify-center text-[var(--home-text-secondary)] hover:text-[var(--home-text)]"
          >
            <HiOutlineArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl text-[var(--home-text)]">
              Analytics
            </h1>
            <p className="text-xs sm:text-sm text-[var(--home-text-secondary)]">
              {activeAccount?.name || "Default"} · {currencyCode} · Transfers excluded
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: Monthly Expense Donut */}
      <section className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-[var(--home-text)]">
              Monthly Expense Breakdown
            </h2>
            <p className="text-xs text-[var(--home-text-muted)]">
              Click or tap any slice to inspect its share
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="w-9 h-9 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] flex items-center justify-center hover:border-[var(--home-accent)] cursor-pointer"
            >
              <HiOutlineChevronLeft className="w-4 h-4" />
            </button>
            <span className="min-w-[140px] text-center text-xs sm:text-sm font-bold text-[var(--home-text)]">
              {monthTitle}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="w-9 h-9 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] flex items-center justify-center hover:border-[var(--home-accent)] cursor-pointer"
            >
              <HiOutlineChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-5 flex justify-center">
              <Skeleton className="h-[240px] w-[240px]" rounded="rounded-full" />
            </div>
            <div className="lg:col-span-7">
              <SkeletonBars rows={4} label="Loading monthly breakdown" />
            </div>
          </div>
        ) : monthlyExpenses.slices.length === 0 ? (
          <div className="py-14 text-center space-y-2">
            <p className="font-display text-lg text-[var(--home-text)]">
              No expenses in {monthTitle}
            </p>
            <p className="text-xs text-[var(--home-text-muted)]">
              Add expenses in this month or switch months using the arrows above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-5 relative h-[280px]">
              <MonthlyDonutChart
                slices={monthlyExpenses.slices}
                activeSliceIdx={activeSliceIdx}
                onSliceToggle={(idx) =>
                  setActiveSliceIdx((cur) => (cur === idx ? null : idx))
                }
                currencyCode={currencyCode}
              />

              {/* Center interactive display */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--home-text-muted)] max-w-[120px] truncate">
                  {focusedSlice ? focusedSlice.name : "Total Expense"}
                </span>
                <span className="font-mono-num text-lg sm:text-xl font-bold text-[var(--home-text)]">
                  {formatMoney(
                    focusedSlice ? focusedSlice.value : monthlyExpenses.total,
                    currencyCode,
                  )}
                </span>
                {focusedSlice && (
                  <span className="text-[11px] font-semibold text-[var(--home-accent)]">
                    {focusedSlice.percentage}%
                  </span>
                )}
              </div>
            </div>

            <div className="lg:col-span-7 space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {monthlyExpenses.slices.map((slice, idx) => {
                const active = activeSliceIdx === idx;
                return (
                  <button
                    key={slice.key}
                    type="button"
                    onClick={() =>
                      setActiveSliceIdx((cur) => (cur === idx ? null : idx))
                    }
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      active
                        ? "border-[var(--home-accent)] bg-[var(--home-track)]"
                        : "border-[var(--home-border)] bg-[var(--home-background)] hover:border-[var(--home-accent)]/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: slice.chartColor }}
                      />
                      <CategoryIcon
                        iconKey={slice.iconKey}
                        color={slice.color}
                        size={16}
                        withBadge
                        badgeSize={32}
                      />
                      <span className="text-xs sm:text-sm font-semibold text-[var(--home-text)] truncate">
                        {slice.name}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono-num text-xs sm:text-sm font-bold text-[var(--home-text)] block">
                        {formatMoney(slice.value, currencyCode)}
                      </span>
                      <span className="font-mono-num text-[11px] text-[var(--home-text-muted)]">
                        {slice.percentage}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* SECTION 2: Yearly 12-Month Income vs Expense */}
      <section className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-[var(--home-text)]">
              Yearly Cashflow ({selectedYear})
            </h2>
            <p className="text-xs text-[var(--home-text-muted)]">
              Monthly Income vs Expense across all 12 months
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedYear((y) => y - 1)}
              aria-label="Previous year"
              className="w-9 h-9 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] flex items-center justify-center hover:border-[var(--home-accent)] cursor-pointer"
            >
              <HiOutlineChevronLeft className="w-4 h-4" />
            </button>
            <span className="min-w-[70px] text-center font-mono-num text-sm font-bold text-[var(--home-text)]">
              {selectedYear}
            </span>
            <button
              type="button"
              onClick={() => setSelectedYear((y) => y + 1)}
              aria-label="Next year"
              className="w-9 h-9 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] flex items-center justify-center hover:border-[var(--home-accent)] cursor-pointer"
            >
              <HiOutlineChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Yearly Summary Strip */}
        {loading ? (
          <SkeletonStats items={3} />
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl p-3.5 bg-[var(--home-income-soft)] border border-[var(--home-border)]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--home-income)] block">
              Yearly Income
            </span>
            <span className="font-mono-num text-base font-bold text-[var(--home-income)]">
              {formatMoney(yearlyBars.totalIncome, currencyCode)}
            </span>
          </div>
          <div
            className="rounded-2xl p-3.5 border border-[var(--home-border)]"
            style={{ backgroundColor: "var(--add-operator-key-bg)" }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--home-expense)] block">
              Yearly Expense
            </span>
            <span className="font-mono-num text-base font-bold text-[var(--home-expense)]">
              {formatMoney(yearlyBars.totalExpense, currencyCode)}
            </span>
          </div>
          <div className="rounded-2xl p-3.5 bg-[var(--home-background)] border border-[var(--home-border)]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--home-text-muted)] block">
              Yearly Net
            </span>
            <span className="font-mono-num text-base font-bold text-[var(--home-text)]">
              {formatMoney(
                yearlyBars.totalIncome - yearlyBars.totalExpense,
                currencyCode,
              )}
            </span>
          </div>
        </div>

        )}

        <div className="h-[300px] w-full">
          {loading ? (
            <ChartLoader />
          ) : (
            <YearlyCashflowBarChart
              months={yearlyBars.months}
              currencyCode={currencyCode}
            />
          )}
        </div>
      </section>
    </div>
  );
}

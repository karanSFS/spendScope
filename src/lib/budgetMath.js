/**
 * Budget scaling & spending summary helpers matching spend_scope_android's
 * SpendingFragment.kt (computed in integer minor units to prevent BigDecimal.div truncation).
 */

export const SPENDING_PERIODS = ["Daily", "Weekly", "Monthly", "Yearly"];
export const FILTER_MODES = ["Daily", "Weekly", "Monthly", "Yearly", "Custom"];

const PERIOD_FACTORS = {
  Daily: {
    Daily: [1, 1],
    Weekly: [7, 1],
    Monthly: [30, 1],
    Yearly: [365, 1],
  },
  Weekly: {
    Daily: [1, 7],
    Weekly: [1, 1],
    Monthly: [4, 1],
    Yearly: [52, 1],
  },
  Monthly: {
    Daily: [1, 30],
    Weekly: [1, 4],
    Monthly: [1, 1],
    Yearly: [12, 1],
  },
  Yearly: {
    Daily: [1, 365],
    Weekly: [1, 52],
    Monthly: [1, 12],
    Yearly: [1, 1],
  },
};

export const HOME_CATEGORY_PALETTE = [
  "var(--home-category-1)",
  "var(--home-category-2)",
  "var(--home-category-3)",
  "var(--home-category-4)",
  "var(--home-category-5)",
  "var(--home-category-6)",
];

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Scales a configured budget amount from `accountPeriod` to `activeFilter`
 * using integer minor units (cents/paise).
 */
export function getScaledBudget(
  budgetAmount,
  accountPeriod = "Monthly",
  activeFilter = "Monthly",
  customDays = null,
) {
  const num = Number(budgetAmount);
  if (!Number.isFinite(num) || num <= 0) return 0;

  const minorUnits = Math.round(num * 100);
  const src = PERIOD_FACTORS[accountPeriod] ? accountPeriod : "Monthly";

  if (activeFilter === "Custom" && Number.isFinite(customDays) && customDays > 0) {
    const [dailyNum, dailyDen] = PERIOD_FACTORS[src].Daily;
    const scaledMinor = (minorUnits * dailyNum * customDays) / dailyDen;
    return round2(scaledMinor / 100);
  }

  const pair = PERIOD_FACTORS[src]?.[activeFilter];
  if (!pair) return 0;
  const [mul, div] = pair;
  return round2((minorUnits * mul) / div / 100);
}

/**
 * Computes spending summary totals, bar proportions, and sorted category breakdown
 * from filtered transactions and active account budget settings.
 */
export function computeSpendingSummary({
  transactions = [],
  categories = [],
  account = null,
  activeFilter = "Monthly",
  customDays = null,
} = {}) {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  let totalIncomeMinor = 0;
  let totalExpenseMinor = 0;
  let transferCount = 0;
  let transferVolumeMinor = 0;
  const expenseByCategory = new Map();

  for (const tx of transactions) {
    const amountMinor = Math.round((Number(tx.amount) || 0) * 100);
    if (tx.transfer_group_id) {
      transferCount += 1;
      if (tx.kind === "expense") {
        transferVolumeMinor += amountMinor;
      }
      continue;
    }

    const kind = String(tx.kind || tx.type || "expense").toLowerCase();
    if (kind === "income") {
      totalIncomeMinor += amountMinor;
    } else {
      totalExpenseMinor += amountMinor;
      const catId = tx.category_id || "__uncategorized__";
      const cat = tx.category_id ? categoryMap.get(tx.category_id) : null;
      const existing = expenseByCategory.get(catId) || {
        categoryId: tx.category_id || null,
        name: cat?.name || tx.category || "Uncategorized",
        iconKey: cat?.icon_key || tx.category_icon || "other",
        color: cat?.color || tx.color_code || "#C88856",
        amountMinor: 0,
        count: 0,
      };
      existing.amountMinor += amountMinor;
      existing.count += 1;
      expenseByCategory.set(catId, existing);
    }
  }

  const totalIncome = round2(totalIncomeMinor / 100);
  const totalExpense = round2(totalExpenseMinor / 100);

  const budgetMode = Boolean(account?.budget_mode);
  const includeIncome = Boolean(account?.include_income);
  const hasValidBudget =
    budgetMode &&
    account?.budget_amount != null &&
    account?.budget_amount !== "" &&
    Number(account.budget_amount) > 0;

  const scaledBudget = hasValidBudget
    ? getScaledBudget(
        account.budget_amount,
        account.spending_period || "Monthly",
        activeFilter,
        customDays,
      )
    : 0;

  let effectiveTopAmount = totalIncome;
  let topLabel = "Income";

  if (budgetMode) {
    if (includeIncome) {
      effectiveTopAmount = round2(totalIncome + scaledBudget);
      topLabel = hasValidBudget ? "Budget + Income" : "Income";
    } else {
      effectiveTopAmount = scaledBudget;
      topLabel = "Budget";
    }
  }

  const netBalance = round2(effectiveTopAmount - totalExpense);

  const totalWeight = effectiveTopAmount + totalExpense;
  const topBarPct =
    totalWeight > 0 ? Math.round((effectiveTopAmount / totalWeight) * 1000) / 10 : 0;
  const expenseBarPct =
    totalWeight > 0 ? Math.round((totalExpense / totalWeight) * 1000) / 10 : 0;

  const categoryBreakdown = Array.from(expenseByCategory.values())
    .sort((a, b) => b.amountMinor - a.amountMinor)
    .map((entry, idx) => {
      const amount = round2(entry.amountMinor / 100);
      const pct =
        totalExpenseMinor > 0
          ? Math.round((entry.amountMinor / totalExpenseMinor) * 1000) / 10
          : 0;
      return {
        ...entry,
        amount,
        percentage: pct,
        barColor: HOME_CATEGORY_PALETTE[idx % HOME_CATEGORY_PALETTE.length],
      };
    });

  return {
    totalIncome,
    totalExpense,
    scaledBudget,
    effectiveTopAmount,
    topLabel,
    netBalance,
    topBarPct,
    expenseBarPct,
    categoryBreakdown,
    transferCount,
    transferVolume: round2(transferVolumeMinor / 100),
    isBudgetMode: budgetMode,
    includeIncome,
  };
}

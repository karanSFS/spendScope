import { describe, it, expect } from "vitest";
import {
  getScaledBudget,
  computeSpendingSummary,
  HOME_CATEGORY_PALETTE,
} from "@/lib/budgetMath";

describe("budgetMath.getScaledBudget", () => {
  it("scales Monthly budget accurately across all periods using integer minor units", () => {
    expect(getScaledBudget(3000, "Monthly", "Daily")).toBe(100);
    expect(getScaledBudget(4000, "Monthly", "Weekly")).toBe(1000);
    expect(getScaledBudget(5000, "Monthly", "Monthly")).toBe(5000);
    expect(getScaledBudget(5000, "Monthly", "Yearly")).toBe(60000);
    expect(getScaledBudget(100, "Monthly", "Yearly")).toBe(1200);
  });

  it("scales Daily, Weekly, Yearly configured periods across all filters cleanly", () => {
    expect(getScaledBudget(100, "Daily", "Weekly")).toBe(700);
    expect(getScaledBudget(100, "Daily", "Monthly")).toBe(3000);
    expect(getScaledBudget(100, "Daily", "Yearly")).toBe(36500);

    expect(getScaledBudget(700, "Weekly", "Daily")).toBe(100);
    expect(getScaledBudget(500, "Weekly", "Monthly")).toBe(2000);
    expect(getScaledBudget(100, "Weekly", "Yearly")).toBe(5200);

    expect(getScaledBudget(36500, "Yearly", "Daily")).toBe(100);
    expect(getScaledBudget(5200, "Yearly", "Weekly")).toBe(100);
    expect(getScaledBudget(12000, "Yearly", "Monthly")).toBe(1000);
  });

  it("handles Custom day ranges and avoids premature truncation", () => {
    // 100 / 12 = 8.333... -> rounds cleanly to 8.33 (not truncated to 8.00)
    expect(getScaledBudget(100, "Yearly", "Monthly")).toBe(8.33);
    expect(getScaledBudget(3000, "Monthly", "Custom", 10)).toBe(1000);
    expect(getScaledBudget(0, "Monthly", "Monthly")).toBe(0);
    expect(getScaledBudget(-50, "Monthly", "Monthly")).toBe(0);
  });
});

describe("budgetMath.computeSpendingSummary", () => {
  const categories = [
    { id: "c-food", name: "Food", icon_key: "food", color: "#E57373" },
    { id: "c-rent", name: "Rent", icon_key: "home", color: "#64B5F6" },
    { id: "c-sal", name: "Salary", icon_key: "salary", color: "#81C784" },
  ];

  const txs = [
    {
      id: "t1",
      kind: "income",
      amount: 5000,
      category_id: "c-sal",
      category: "Salary",
    },
    {
      id: "t2",
      kind: "expense",
      amount: 1200,
      category_id: "c-rent",
      category: "Rent",
    },
    {
      id: "t3",
      kind: "expense",
      amount: 300,
      category_id: "c-food",
      category: "Food",
    },
    // Paired neutral transfer rows must NOT affect income/expense totals!
    {
      id: "t4",
      kind: "expense",
      amount: 900,
      transfer_group_id: "grp-1",
      category: "Account Transfer",
    },
  ];

  it("excludes transfer_group_id rows from income/expense totals and sorts breakdown descending", () => {
    const res = computeSpendingSummary({
      transactions: txs,
      categories,
      account: { budget_mode: false, include_income: false },
      activeFilter: "Monthly",
    });

    expect(res.totalIncome).toBe(5000);
    expect(res.totalExpense).toBe(1500);
    expect(res.effectiveTopAmount).toBe(5000);
    expect(res.topLabel).toBe("Income");
    expect(res.netBalance).toBe(3500);
    expect(res.transferCount).toBe(1);
    expect(res.transferVolume).toBe(900);

    expect(res.categoryBreakdown).toHaveLength(2);
    expect(res.categoryBreakdown[0].name).toBe("Rent");
    expect(res.categoryBreakdown[0].percentage).toBe(80);
    expect(res.categoryBreakdown[0].barColor).toBe(HOME_CATEGORY_PALETTE[0]);
    expect(res.categoryBreakdown[1].name).toBe("Food");
    expect(res.categoryBreakdown[1].percentage).toBe(20);
    expect(res.categoryBreakdown[1].barColor).toBe(HOME_CATEGORY_PALETTE[1]);
  });

  it("computes Budget Mode alone vs Budget Mode + Include Income accurately", () => {
    const budgetOnly = computeSpendingSummary({
      transactions: txs,
      categories,
      account: {
        budget_mode: true,
        budget_amount: 4000,
        spending_period: "Monthly",
        include_income: false,
      },
      activeFilter: "Weekly",
    });

    expect(budgetOnly.scaledBudget).toBe(1000);
    expect(budgetOnly.topLabel).toBe("Budget");
    expect(budgetOnly.effectiveTopAmount).toBe(1000);
    expect(budgetOnly.netBalance).toBe(-500);

    const budgetPlusIncome = computeSpendingSummary({
      transactions: txs,
      categories,
      account: {
        budget_mode: true,
        budget_amount: 4000,
        spending_period: "Monthly",
        include_income: true,
      },
      activeFilter: "Weekly",
    });

    expect(budgetPlusIncome.topLabel).toBe("Budget + Income");
    expect(budgetPlusIncome.effectiveTopAmount).toBe(6000);
    expect(budgetPlusIncome.netBalance).toBe(4500);
  });
});

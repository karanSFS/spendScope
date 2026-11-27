"use client";

import React, { useState } from "react";
import Link from "next/link";
import CategoryIcon from "@/components/shared/CategoryIcon";

const EXPENSE_CATEGORIES = [
  { name: "Housing", iconKey: "housing", color: "#327da0" },
  { name: "Utilities", iconKey: "utilities", color: "#0f4d92" },
  { name: "Dining Out", iconKey: "dining", color: "#fd5800" },
  { name: "Groceries", iconKey: "groceries", color: "#39a78e" },
  { name: "Health", iconKey: "health_wellness", color: "#bdda57" },
  { name: "Entertainment", iconKey: "entertainment", color: "#e5841b" },
  { name: "Education", iconKey: "education", color: "#b43332" },
  { name: "Other", iconKey: "other", color: "#af002a" },
];

const INCOME_CATEGORIES = [
  { name: "Salary", iconKey: "salary", color: "#327da0" },
  { name: "Freelance", iconKey: "freelance", color: "#39a78e" },
  { name: "Business", iconKey: "business_income", color: "#0f4d92" },
  { name: "Interest", iconKey: "interest_income", color: "#6C7555" },
  { name: "Investments", iconKey: "savings_investments", color: "#C88856" },
  { name: "Other Income", iconKey: "other_income", color: "#7E6A55" },
];

export default function CategoriesSection() {
  const [kind, setKind] = useState("expense");
  const visibleCategories =
    kind === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <section
      id="categories"
      className="scroll-mt-20 py-14 md:py-20 bg-[var(--home-background)]"
    >
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-[28px] p-6 sm:p-10 lg:p-12 border border-[var(--home-border)] bg-[var(--home-card)] shadow-2xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-5">
              <span className="text-xs font-bold tracking-[0.14em] uppercase block mb-2.5 text-[var(--home-accent)]">
                SPENDING CATEGORIES
              </span>
              <h2 className="font-display text-3xl sm:text-4xl tracking-tight leading-snug mb-4 text-[var(--home-text)]">
                Organize Every Entry
                <br />
                by Category
              </h2>
              <p className="text-sm sm:text-base leading-relaxed mb-6 max-w-md text-[var(--home-text-secondary)]">
                Start with 21 ready-to-use Expense &amp; Income categories, 96
                crisp vector icons, drag-to-reorder priority, and a 3-mode
                custom color studio.
              </p>
              <Link
                href="/categories"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] text-[var(--home-text)] text-sm font-semibold hover:border-[var(--home-accent)] hover:-translate-y-0.5 transition-all"
              >
                <span>Open Categories Manager</span>
                <span>→</span>
              </Link>
            </div>

            <div className="lg:col-span-7 space-y-4">
              {/* Expense / Income Interactive Toggle */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div
                  role="tablist"
                  aria-label="Preview category type"
                  className="inline-flex items-center p-1 rounded-[22px] bg-[var(--home-track)] border border-[var(--home-border)]"
                >
                  {[
                    { id: "expense", label: "Expense (15)" },
                    { id: "income", label: "Income (6)" },
                  ].map((tab) => {
                    const active = kind === tab.id;
                    return (
                      <button
                        key={tab.id}
                        role="tab"
                        aria-selected={active}
                        type="button"
                        onClick={() => setKind(tab.id)}
                        className={`px-4 py-1.5 rounded-[18px] text-xs font-semibold transition-all cursor-pointer ${
                          active
                            ? "bg-[var(--home-card)] text-[var(--home-text)] shadow-xs"
                            : "text-[var(--home-text-secondary)] hover:text-[var(--home-text)]"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs text-[var(--home-text-muted)]">
                  Click any tile to customize
                </span>
              </div>

              <div
                className={`grid gap-3.5 ${
                  kind === "expense"
                    ? "grid-cols-2 sm:grid-cols-4"
                    : "grid-cols-2 sm:grid-cols-3"
                }`}
              >
                {visibleCategories.map((cat) => (
                  <Link
                    key={cat.name}
                    href="/categories"
                    className="group flex flex-col items-center gap-2.5 p-3.5 rounded-2xl border border-[var(--home-border)] bg-[var(--home-background)] hover:border-[var(--home-accent)] hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200"
                  >
                    <CategoryIcon
                      iconKey={cat.iconKey}
                      color={cat.color}
                      size={22}
                      withBadge
                      badgeSize={48}
                    />
                    <span className="text-xs font-semibold text-center text-[var(--home-text)] group-hover:text-[var(--home-accent)] transition-colors">
                      {cat.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

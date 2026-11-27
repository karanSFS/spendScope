"use client";

import React from "react";
import Link from "next/link";
import CategoryIcon from "@/components/shared/CategoryIcon";

const categories = [
  { name: "Housing", iconKey: "housing", color: "#327da0" },
  { name: "Utilities", iconKey: "utilities", color: "#0f4d92" },
  { name: "Dining Out", iconKey: "dining", color: "#fd5800" },
  { name: "Groceries", iconKey: "groceries", color: "#39a78e" },
  { name: "Health", iconKey: "health_wellness", color: "#bdda57" },
  { name: "Entertainment", iconKey: "entertainment", color: "#e5841b" },
  { name: "Education", iconKey: "education", color: "#b43332" },
  { name: "Other", iconKey: "other", color: "#af002a" },
];

export default function CategoriesSection() {
  return (
    <section
      id="categories"
      className="scroll-mt-20 py-10 md:py-14 bg-[var(--home-background)]"
    >
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-[28px] p-6 sm:p-10 border border-[var(--home-border)] bg-[var(--home-card)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <span className="text-xs font-bold tracking-[0.14em] uppercase block mb-2 text-[var(--home-accent)]">
                SPENDING CATEGORIES
              </span>
              <h2 className="font-display text-3xl sm:text-4xl tracking-tight leading-snug mb-4 text-[var(--home-text)]">
                Organize Your Expenses
                <br />
                by Category
              </h2>
              <p className="text-sm sm:text-base leading-relaxed mb-6 max-w-md text-[var(--home-text-secondary)]">
                Pre-seeded with the exact 15 expense and 6 income categories from SpendScope Android, complete with 96 crisp vector icons and custom color palettes.
              </p>
              <Link
                href="/categories"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] text-[var(--home-text)] text-sm font-semibold hover:border-[var(--home-accent)] transition-colors"
              >
                <span>Open Categories Manager</span>
                <span>→</span>
              </Link>
            </div>

            <div className="grid grid-cols-2 xs:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.name}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-[var(--home-border)] bg-[var(--home-background)]"
                >
                  <CategoryIcon
                    iconKey={cat.iconKey}
                    color={cat.color}
                    size={22}
                    withBadge
                    badgeSize={48}
                  />
                  <span className="text-xs font-semibold text-center text-[var(--home-text)]">
                    {cat.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

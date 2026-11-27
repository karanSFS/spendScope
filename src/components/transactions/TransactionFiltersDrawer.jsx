"use client";

import React from "react";
import { HiXMark } from "react-icons/hi2";
import CategoryIcon from "@/components/shared/CategoryIcon";

export default function TransactionFiltersDrawer({
  open,
  typeFilter = "all",
  onTypeFilterChange,
  selectedCategoryIds = [],
  onToggleCategoryId,
  categories = [],
  onClearAll,
  onClose,
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Filter transactions"
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-[2px] flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm h-full bg-[var(--home-card)] border-l border-[var(--home-border)] text-[var(--home-text)] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[var(--home-border)] flex items-center justify-between">
          <h3 className="font-display text-lg">Filter Transactions</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] cursor-pointer"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Type Filter */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--home-text-muted)] block">
              Transaction Type
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "all", label: "All Entries" },
                { id: "expense", label: "Expenses Only" },
                { id: "income", label: "Income Only" },
                { id: "transfer", label: "Transfers Only" },
              ].map((t) => {
                const active = typeFilter === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onTypeFilterChange?.(t.id)}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-semibold border cursor-pointer transition-colors ${
                      active
                        ? "bg-[var(--home-accent)] text-[var(--home-on-accent)] border-[var(--home-accent)]"
                        : "bg-[var(--home-background)] text-[var(--home-text-secondary)] border-[var(--home-border)]"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Multi-Category Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--home-text-muted)]">
                Categories ({selectedCategoryIds.length || "All"})
              </span>
              {selectedCategoryIds.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-xs font-semibold text-[var(--home-accent)] hover:underline cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const selected = selectedCategoryIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onToggleCategoryId?.(cat.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-all ${
                      selected
                        ? "border-[var(--home-accent)] bg-[var(--home-track)] text-[var(--home-text)]"
                        : "border-[var(--home-border)] bg-[var(--home-background)] text-[var(--home-text-secondary)]"
                    }`}
                  >
                    <CategoryIcon
                      iconKey={cat.icon_key || cat.icon || "other"}
                      color={cat.color || cat.color_code || "#C88856"}
                      size={14}
                    />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--home-border)] flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClearAll}
            className="flex-1 py-2.5 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] text-xs font-semibold cursor-pointer"
          >
            Reset Filters
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

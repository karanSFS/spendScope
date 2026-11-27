"use client";

import React from "react";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";
import { FILTER_MODES } from "@/lib/budgetMath";
import { parseLocalDate, toLocalDateKey, getPeriodBounds } from "@/lib/dateUtils";

export function shiftAnchorDate(period, anchorDateKey, delta) {
  const d = parseLocalDate(anchorDateKey);
  if (period === "Daily") {
    d.setDate(d.getDate() + delta);
  } else if (period === "Weekly") {
    d.setDate(d.getDate() + delta * 7);
  } else if (period === "Yearly") {
    d.setFullYear(d.getFullYear() + delta);
  } else {
    d.setMonth(d.getMonth() + delta);
  }
  return toLocalDateKey(d);
}

export function formatPeriodLabel(period, anchorDateKey, customRange) {
  if (period === "Custom") {
    if (customRange?.[0] && customRange?.[1]) {
      const s = parseLocalDate(customRange[0]);
      const e = parseLocalDate(customRange[1]);
      return `${s.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} – ${e.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
    }
    return "Select custom range";
  }

  const d = parseLocalDate(anchorDateKey);
  if (period === "Daily") {
    const todayKey = toLocalDateKey(new Date());
    if (toLocalDateKey(d) === todayKey) {
      return `Today, ${d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`;
    }
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (period === "Weekly") {
    const { start, end } = getPeriodBounds("Weekly", d);
    return `${start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} – ${end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }

  if (period === "Yearly") {
    return String(d.getFullYear());
  }

  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function PeriodFilterBar({
  period = "Monthly",
  onPeriodChange,
  anchorDate,
  onAnchorChange,
  customRange = null,
  onCustomRangeChange,
  modes = FILTER_MODES,
}) {
  const label = formatPeriodLabel(period, anchorDate, customRange);
  const todayKey = toLocalDateKey(new Date());
  const startVal = customRange?.[0] || anchorDate || todayKey;
  const endVal = customRange?.[1] || todayKey;

  const handleStartChange = (val) => {
    if (!val) return;
    const nextEnd = endVal < val ? val : endVal;
    onCustomRangeChange?.([val, nextEnd]);
  };

  const handleEndChange = (val) => {
    if (!val) return;
    const nextStart = startVal > val ? val : startVal;
    onCustomRangeChange?.([nextStart, val]);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Segmented Period Track */}
      <div
        role="tablist"
        aria-label="Spending period"
        className="inline-flex items-center p-1 rounded-[22px] bg-[var(--home-track)] border border-[var(--home-border)] overflow-x-auto max-w-full"
      >
        {modes.map((m) => {
          const active = period === m;
          return (
            <button
              key={m}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => onPeriodChange?.(m)}
              className={`px-3.5 py-1.5 rounded-[18px] text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                active
                  ? "bg-[var(--home-card)] text-[var(--home-text)] shadow-xs"
                  : "text-[var(--home-text-secondary)] hover:text-[var(--home-text)]"
              }`}
            >
              {m}
            </button>
          );
        })}
      </div>

      {/* Period Navigation or Native Custom Range Picker */}
      {period === "Custom" ? (
        <div className="inline-flex flex-wrap sm:flex-nowrap items-center gap-1.5 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] px-3 py-1.5 w-full sm:w-auto justify-between sm:justify-end">
          <input
            type="date"
            aria-label="Custom range start date"
            value={startVal}
            onChange={(e) => handleStartChange(e.target.value)}
            className="min-w-0 flex-1 sm:flex-initial bg-transparent font-mono-num text-xs font-semibold text-[var(--home-text)] outline-none"
          />
          <span className="text-xs text-[var(--home-text-muted)] shrink-0">–</span>
          <input
            type="date"
            aria-label="Custom range end date"
            value={endVal}
            onChange={(e) => handleEndChange(e.target.value)}
            className="min-w-0 flex-1 sm:flex-initial bg-transparent font-mono-num text-xs font-semibold text-[var(--home-text)] outline-none"
          />
        </div>
      ) : (
        <div className="inline-flex items-center justify-between sm:justify-end gap-1.5 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] px-2 py-1">
          <button
            type="button"
            aria-label="Previous period"
            onClick={() =>
              onAnchorChange?.(shiftAnchorDate(period, anchorDate, -1))
            }
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-secondary)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] cursor-pointer"
          >
            <HiChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold px-2 text-[var(--home-text)] whitespace-nowrap">
            {label}
          </span>
          <button
            type="button"
            aria-label="Next period"
            onClick={() =>
              onAnchorChange?.(shiftAnchorDate(period, anchorDate, 1))
            }
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-secondary)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] cursor-pointer"
          >
            <HiChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

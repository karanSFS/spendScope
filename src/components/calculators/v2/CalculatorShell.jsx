"use client";

import React, { useId, useState, useCallback } from "react";
import {
  HiOutlineArrowLeft,
  HiOutlineShare,
  HiOutlineXMark,
  HiOutlineCheck,
} from "react-icons/hi2";
import useAccounts from "@/hooks/useAccounts";
import { formatCalcMoney, getCalcCurrencySymbol } from "@/lib/calculatorEngine";

export function useCalcCurrency(explicitCurrency = null) {
  const { activeAccount } = useAccounts();
  const currencyCode = (
    explicitCurrency ||
    activeAccount?.currency_code ||
    "INR"
  ).toUpperCase();
  const symbol = getCalcCurrencySymbol(currencyCode);

  const fmt = useCallback(
    (value, decimals = 2) => formatCalcMoney(value, currencyCode, decimals),
    [currencyCode],
  );

  const fmtCompact = useCallback(
    (value) => formatCalcMoney(Math.round(Number(value) || 0), currencyCode, 0),
    [currencyCode],
  );

  return {
    currencyCode,
    symbol,
    fmt,
    fmtCompact,
  };
}

export function useShareCalc() {
  const [toast, setToast] = useState("");

  const notify = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2400);
  }, []);

  const shareText = useCallback(
    async ({ title, text }) => {
      if (!text) return;
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title, text });
          return;
        } catch (err) {
          if (err?.name === "AbortError") return;
        }
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(text);
          notify("Copied summary to clipboard");
          return;
        } catch {
          // ignore
        }
      }
      notify("Ready to copy");
    },
    [notify],
  );

  return { toast, notify, shareText };
}

export function sanitizeDecimal(val) {
  const cleaned = String(val ?? "").replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 2) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

export function sanitizeInt(val) {
  return String(val ?? "").replace(/[^0-9]/g, "");
}

export function CalcHeader({
  title,
  eyebrow,
  onBack,
  backLabel = "Back",
  rightAction = null,
}) {
  return (
    <div className="flex items-center justify-between gap-2 pb-1">
      <div className="min-w-[76px] flex justify-start">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] text-xs font-semibold text-[var(--home-accent)] hover:opacity-85 transition-opacity cursor-pointer"
          >
            <HiOutlineArrowLeft className="w-3.5 h-3.5" />
            <span>{backLabel}</span>
          </button>
        ) : null}
      </div>

      <div className="text-center min-w-0">
        {eyebrow && (
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--home-text-muted)]">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-lg sm:text-xl text-[var(--home-text)] truncate">
          {title}
        </h2>
      </div>

      <div className="min-w-[76px] flex justify-end">{rightAction}</div>
    </div>
  );
}

export function ShareIconButton({ onClick, label = "Share" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-9 h-9 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text-secondary)] hover:text-[var(--home-accent)] flex items-center justify-center transition-colors cursor-pointer"
    >
      <HiOutlineShare className="w-4 h-4" />
    </button>
  );
}

export function CalcToast({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[var(--home-income)] text-white text-xs font-semibold shadow-xs">
      <HiOutlineCheck className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function CalcSegmentedTabs({ options, value, onChange }) {
  return (
    <div
      className="grid gap-1 p-1 rounded-[20px] border border-[var(--home-border)] bg-[var(--home-track)]"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`py-2 px-2.5 rounded-[16px] text-xs sm:text-sm font-semibold transition-all cursor-pointer truncate ${
              isActive
                ? "bg-[var(--home-accent)] text-[var(--home-on-accent)] shadow-xs"
                : "text-[var(--home-text-secondary)] hover:text-[var(--home-text)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function CalcCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-3xl border border-[var(--home-border)] bg-[var(--home-card)] overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

export function CalcFieldRow({
  label,
  value,
  onChange,
  placeholder = "0",
  prefix = "",
  suffix = "",
  inputMode = "decimal",
  disabled = false,
  onClear,
  maxLength,
  testId,
}) {
  const inputId = useId();
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3.5 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <label
        htmlFor={inputId}
        className="text-xs sm:text-sm font-medium text-[var(--home-text-secondary)] shrink-0"
      >
        {label}
      </label>
      <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0">
        {prefix && value !== "" && (
          <span className="text-xs sm:text-sm font-semibold text-[var(--home-text-muted)]">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          type="text"
          inputMode={inputMode}
          value={value}
          disabled={disabled}
          maxLength={maxLength}
          data-testid={testId}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full max-w-[175px] text-right bg-transparent outline-none font-mono-num text-sm sm:text-base font-semibold text-[var(--home-text)] placeholder:text-[var(--home-text-muted)] disabled:cursor-not-allowed"
        />
        {suffix && (
          <span className="text-xs font-semibold text-[var(--home-text-muted)]">
            {suffix}
          </span>
        )}
        {onClear && value !== "" && !disabled && (
          <button
            type="button"
            onClick={onClear}
            aria-label={`Clear ${label}`}
            className="p-0.5 rounded-full text-[var(--home-text-muted)] hover:text-[var(--home-text)] cursor-pointer shrink-0"
          >
            <HiOutlineXMark className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function CalcActionButtons({ onReset, onCalculate, calculateLabel = "Calculate" }) {
  return (
    <div className="grid grid-cols-2 gap-3 pt-1">
      <button
        type="button"
        onClick={onReset}
        className="w-full py-3 px-4 rounded-2xl border border-[var(--home-border)] bg-[var(--home-card)] text-sm font-bold text-[var(--home-text)] hover:bg-[var(--home-track)] transition-colors cursor-pointer"
      >
        Reset
      </button>
      <button
        type="button"
        onClick={onCalculate}
        className="w-full py-3 px-4 rounded-2xl bg-[var(--home-accent)] text-[var(--home-on-accent)] text-sm font-bold shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
      >
        {calculateLabel}
      </button>
    </div>
  );
}

export function CalcSummaryTable({ rows }) {
  return (
    <CalcCard className="divide-y divide-[var(--home-border)]">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-4 px-4 py-3"
        >
          <span className="text-xs sm:text-sm text-[var(--home-text-secondary)]">
            {row.label}
          </span>
          <span
            className={`font-mono-num text-xs sm:text-sm font-bold text-right ${
              row.accent
                ? "text-[var(--home-accent)]"
                : row.positive
                  ? "text-[var(--home-income)]"
                  : row.negative
                    ? "text-[var(--home-destructive)]"
                    : "text-[var(--home-text)]"
            }`}
          >
            {row.value}
          </span>
        </div>
      ))}
    </CalcCard>
  );
}

export function CalcDonutBreakdown({
  title = "Breakdown",
  centerLabel,
  centerValue,
  primaryLabel,
  primaryValue,
  primaryRatio,
  secondaryLabel,
  secondaryValue,
  secondaryRatio,
  primaryColor = "var(--home-income)",
  secondaryColor = "var(--home-expense)",
}) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const clampedPrimary = Math.min(1, Math.max(0, Number(primaryRatio) || 0));
  const clampedSecondary = Math.min(
    1 - clampedPrimary,
    Math.max(0, Number(secondaryRatio) || 1 - clampedPrimary),
  );
  const firstDash = clampedPrimary * circumference;
  const secondDash = clampedSecondary * circumference;

  return (
    <CalcCard className="p-5 flex flex-col items-center">
      {title && (
        <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--home-text-muted)] mb-4">
          {title}
        </h3>
      )}

      <div className="relative w-44 h-44 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="var(--home-track)"
            strokeWidth="22"
            fill="transparent"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke={primaryColor}
            strokeWidth="22"
            strokeDasharray={`${firstDash} ${circumference}`}
            strokeDashoffset="0"
            fill="transparent"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke={secondaryColor}
            strokeWidth="22"
            strokeDasharray={`${secondDash} ${circumference}`}
            strokeDashoffset={-firstDash}
            fill="transparent"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
          <span className="text-[11px] font-medium text-[var(--home-text-muted)]">
            {centerLabel}
          </span>
          <span className="font-mono-num text-sm sm:text-base font-bold text-[var(--home-accent)] truncate max-w-[110px]">
            {centerValue}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-[320px] mt-5 pt-4 border-t border-[var(--home-border)]">
        <div className="flex flex-col items-center text-center min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: primaryColor }}
            />
            <span className="text-xs text-[var(--home-text-secondary)] truncate">
              {primaryLabel}
            </span>
          </div>
          <span className="font-mono-num text-xs sm:text-sm font-bold text-[var(--home-text)] mt-0.5 truncate max-w-full">
            {primaryValue}
          </span>
        </div>

        <div className="flex flex-col items-center text-center min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: secondaryColor }}
            />
            <span className="text-xs text-[var(--home-text-secondary)] truncate">
              {secondaryLabel}
            </span>
          </div>
          <span className="font-mono-num text-xs sm:text-sm font-bold text-[var(--home-text)] mt-0.5 truncate max-w-full">
            {secondaryValue}
          </span>
        </div>
      </div>
    </CalcCard>
  );
}

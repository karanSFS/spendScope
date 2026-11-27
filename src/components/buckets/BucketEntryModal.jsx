"use client";

import React, { useState, useEffect } from "react";
import { HiXMark } from "react-icons/hi2";
import { getCurrencySymbol } from "@/utils/currencies";
import { toLocalDateKey } from "@/lib/dateUtils";
import {
  evaluateExpression,
  formatExpressionResult,
  sanitizeExpressionInput,
} from "@/lib/expressionParser";
import CalculatorKeypad from "@/components/transactions/CalculatorKeypad";

export default function BucketEntryModal({
  open,
  initialEntry = null,
  defaultKind = "expense",
  currencyCode = "INR",
  onSave,
  onClose,
}) {
  const isEditing = Boolean(initialEntry?.id);
  const symbol = getCurrencySymbol(currencyCode);

  const [kind, setKind] = useState(defaultKind);
  const [expression, setExpression] = useState("");
  const [date, setDate] = useState(toLocalDateKey(new Date()));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (initialEntry) {
      setKind(initialEntry.kind === "fund" ? "fund" : "expense");
      setExpression(
        initialEntry.amount != null ? String(initialEntry.amount) : "",
      );
      setDate(initialEntry.date || toLocalDateKey(new Date()));
      setNote(initialEntry.note || "");
    } else {
      setKind(defaultKind === "fund" ? "fund" : "expense");
      setExpression("");
      setDate(toLocalDateKey(new Date()));
      setNote("");
    }
  }, [open, initialEntry, defaultKind]);

  if (!open) return null;

  const handleEvaluate = () => {
    try {
      const val = evaluateExpression(expression);
      setExpression(val > 0 ? formatExpressionResult(val) : "");
      setError("");
    } catch (err) {
      setError(err?.message || "Invalid calculation");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    let numericAmount = 0;
    try {
      numericAmount = evaluateExpression(expression);
    } catch (err) {
      setError(err?.message || "Enter a valid amount.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    setSaving(true);
    try {
      const res = await onSave?.({
        id: initialEntry?.id || null,
        kind,
        amount: numericAmount,
        date,
        note: note.trim(),
      });
      if (res?.success === false) {
        setError(res.error || "Failed to save entry.");
        return;
      }
      onClose?.();
    } catch (err) {
      setError(err?.message || "Failed to save entry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? "Edit Bucket Entry" : "Add Bucket Entry"}
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: "var(--add-sheet-bg)" }}
        className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-t-[28px] sm:rounded-[28px] border border-[var(--home-border)] text-[var(--home-text)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[var(--home-border)] flex items-center justify-between">
          <h3 className="font-display text-xl">
            {isEditing ? "Edit Bucket Entry" : "Add Bucket Entry"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close entry modal"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] cursor-pointer"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 custom-scrollbar"
        >
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-[22px] bg-[var(--home-track)] border border-[var(--home-border)]">
            {[
              { id: "fund", label: "Add Fund" },
              { id: "expense", label: "Add Expense" },
            ].map((tab) => {
              const active = kind === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setKind(tab.id)}
                  className={`py-2 rounded-[18px] text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    active
                      ? tab.id === "fund"
                        ? "bg-[var(--home-income)] text-white shadow-xs"
                        : "bg-[var(--home-expense)] text-white shadow-xs"
                      : "text-[var(--home-text-secondary)] hover:text-[var(--home-text)]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {error && (
            <div className="p-3 rounded-2xl border border-[var(--home-destructive)]/40 bg-[var(--home-background)] text-xs font-semibold text-[var(--home-destructive)]">
              {error}
            </div>
          )}

          <div className="rounded-[22px] border border-[var(--home-border)] bg-[var(--home-card)] p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--home-text-muted)] block mb-1">
              Amount ({currencyCode})
            </span>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl text-[var(--home-text-muted)]">
                {symbol}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={expression}
                onChange={(e) => {
                  const cleaned = sanitizeExpressionInput(e.target.value);
                  if (/^[0-9+\-*/.]*$/.test(cleaned)) {
                    setExpression(cleaned);
                    if (error) setError("");
                  }
                }}
                placeholder="0.00"
                className="w-full bg-transparent font-mono-num text-2xl sm:text-3xl font-bold text-[var(--home-text)] focus:outline-none"
              />
            </div>
          </div>

          <CalculatorKeypad
            expression={expression}
            onChangeExpression={setExpression}
            onEvaluate={handleEvaluate}
            onClear={() => setExpression("")}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="bucket-entry-date"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
              >
                Date
              </label>
              <input
                id="bucket-entry-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-card)] text-xs sm:text-sm focus:outline-none focus:border-[var(--home-accent)]"
              />
            </div>
            <div>
              <label
                htmlFor="bucket-entry-note"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
              >
                Note (Optional)
              </label>
              <input
                id="bucket-entry-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ticket, hotel, deposit..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-card)] text-xs sm:text-sm focus:outline-none focus:border-[var(--home-accent)]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[2] py-3 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {saving
                ? "Saving…"
                : isEditing
                  ? "Save Entry"
                  : kind === "fund"
                    ? "Add Fund"
                    : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

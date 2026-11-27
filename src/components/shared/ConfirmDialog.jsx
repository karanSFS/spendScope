"use client";

import React from "react";
import { HiOutlineExclamationTriangle, HiXMark } from "react-icons/hi2";

export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  description = "",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={() => !loading && onCancel?.()}
    >
      <div
        className="w-full max-w-sm rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text)] p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              destructive
                ? "bg-[var(--home-destructive)]/10 text-[var(--home-destructive)]"
                : "bg-[var(--home-track)] text-[var(--home-accent)]"
            }`}
          >
            <HiOutlineExclamationTriangle className="w-6 h-6" />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => onCancel?.()}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] cursor-pointer"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <h3 className="font-display text-lg text-[var(--home-text)]">
            {title}
          </h3>
          {description && (
            <p className="text-xs sm:text-sm text-[var(--home-text-secondary)] leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => onCancel?.()}
            className="px-4 py-2.5 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] text-xs font-semibold text-[var(--home-text-secondary)] hover:text-[var(--home-text)] cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => onConfirm?.()}
            className={`px-5 py-2.5 rounded-full text-xs font-semibold text-[var(--home-on-accent)] cursor-pointer transition-opacity disabled:opacity-50 ${
              destructive
                ? "bg-[var(--home-destructive)]"
                : "bg-[var(--home-accent)]"
            }`}
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

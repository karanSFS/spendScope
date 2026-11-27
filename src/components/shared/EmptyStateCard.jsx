"use client";

import React from "react";

export default function EmptyStateCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}) {
  return (
    <div
      className={`rounded-[24px] border border-dashed border-[var(--home-border)] bg-[var(--home-card)] p-8 text-center flex flex-col items-center justify-center space-y-3 ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-[var(--home-track)] flex items-center justify-center text-[var(--home-accent)]">
          {icon}
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        <h3 className="font-display text-lg text-[var(--home-text)]">{title}</h3>
        {description && (
          <p className="text-xs sm:text-sm text-[var(--home-text-secondary)] leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 px-5 py-2.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs sm:text-sm font-semibold hover:opacity-95 transition-opacity cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

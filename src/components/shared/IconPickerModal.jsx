"use client";

import React, { useState, useMemo } from "react";
import { HiXMark, HiMagnifyingGlass } from "react-icons/hi2";
import { ICON_GROUPS } from "@/lib/defaultSeeds";
import CategoryIcon from "./CategoryIcon";

export default function IconPickerModal({
  open,
  selectedIconKey = "other",
  accentColor = "#C88856",
  onSelect,
  onClose,
  title = "Choose Icon",
}) {
  const [search, setSearch] = useState("");

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ICON_GROUPS;
    return ICON_GROUPS.map((group) => ({
      ...group,
      icons: group.icons.filter(
        (key) =>
          key.toLowerCase().includes(q) ||
          group.label.toLowerCase().includes(q),
      ),
    })).filter((g) => g.icons.length > 0);
  }, [search]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-[28px] border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[var(--home-border)] flex items-center justify-between gap-3">
          <h3 className="font-display text-lg text-[var(--home-text)]">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close icon picker"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] cursor-pointer"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-[var(--home-border)] bg-[var(--home-background)]">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-[var(--home-border)] bg-[var(--home-card)]">
            <HiMagnifyingGlass className="w-4 h-4 text-[var(--home-text-muted)] shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search icons (food, travel, bills, money)..."
              className="w-full bg-transparent text-xs sm:text-sm text-[var(--home-text)] placeholder-[var(--home-text-muted)] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 custom-scrollbar">
          {filteredGroups.length === 0 ? (
            <p className="text-center text-xs text-[var(--home-text-muted)] py-8">
              No icons match &ldquo;{search}&rdquo;.
            </p>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.id} className="space-y-2.5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--home-text-muted)]">
                  {group.label}
                </h4>
                <div className="grid grid-cols-5 xs:grid-cols-6 sm:grid-cols-7 gap-2">
                  {group.icons.map((iconKey) => {
                    const selected = iconKey === selectedIconKey;
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => {
                          onSelect?.(iconKey);
                          onClose?.();
                        }}
                        title={iconKey.replace(/_/g, " ")}
                        className={`h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer border ${
                          selected
                            ? "border-[var(--home-accent)] bg-[var(--home-track)] scale-105 shadow-xs"
                            : "border-[var(--home-border)] bg-[var(--home-background)] hover:border-[var(--home-accent)]/60"
                        }`}
                      >
                        <CategoryIcon
                          iconKey={iconKey}
                          color={
                            selected ? accentColor : "var(--home-text)"
                          }
                          size={22}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

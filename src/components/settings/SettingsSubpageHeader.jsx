"use client";

import React from "react";
import Link from "next/link";
import { HiOutlineArrowLeft } from "react-icons/hi2";
import AvatarBadge from "@/components/shared/AvatarBadge";

export default function SettingsSubpageHeader({
  title,
  description,
  activeAccount = null,
  action = null,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        <Link
          href="/settings"
          aria-label="Back to Settings"
          className="w-10 h-10 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] flex items-center justify-center text-[var(--home-text-secondary)] hover:text-[var(--home-text)] shrink-0 mt-0.5 sm:mt-0"
        >
          <HiOutlineArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl text-[var(--home-text)] truncate">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-[var(--home-text-secondary)] mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 self-start sm:self-auto">
        {activeAccount && (
          <div className="h-9 px-3 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] inline-flex items-center gap-2 text-xs font-semibold">
            <AvatarBadge
              avatarKey={activeAccount.avatar_key || "user_pf"}
              name={activeAccount.name}
              size={22}
            />
            <span className="truncate max-w-[120px]">{activeAccount.name}</span>
            <span className="font-mono-num text-[var(--home-text-muted)]">
              {activeAccount.currency_code || "INR"}
            </span>
          </div>
        )}
        {action}
      </div>
    </div>
  );
}

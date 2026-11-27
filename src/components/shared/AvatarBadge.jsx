"use client";

import React from "react";
import { AVATAR_KEYS } from "@/lib/defaultSeeds";

const AVATAR_SET = new Set(AVATAR_KEYS);

export function resolveAvatarKey(avatarKey) {
  if (!avatarKey) return "user_pf";
  const cleaned = String(avatarKey).trim();
  return AVATAR_SET.has(cleaned) ? cleaned : "user_pf";
}

export default function AvatarBadge({
  avatarKey = "user_pf",
  name = "SpendScope",
  size = 36,
  className = "",
}) {
  const safeKey = resolveAvatarKey(avatarKey);
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full overflow-hidden border border-[var(--home-border)] bg-[var(--home-track)] shrink-0 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      title={name}
    >
      <img
        src={`/avatars/${safeKey}.png`}
        alt={name || "User avatar"}
        width={size}
        height={size}
        className="w-full h-full object-cover"
      />
    </span>
  );
}

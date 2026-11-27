"use client";

import React from "react";
import { ICON_GROUPS } from "@/lib/defaultSeeds";

const VALID_ICONS = new Set([
  "housing",
  "utilities",
  "dining",
  "transportation",
  "groceries",
  "health_wellness",
  "education",
  "entertainment",
  "shopping",
  "insurance",
  "savings_investments",
  "family_children",
  "travel",
  "debt_payments",
  "other",
  "salary",
  "transfer",
  "business_income",
  "freelance",
  "interest_income",
  "other_income",
  ...ICON_GROUPS.flatMap((g) => g.icons),
]);

export function resolveIconKey(iconKey) {
  if (!iconKey) return "other";
  const cleaned = String(iconKey)
    .trim()
    .toLowerCase()
    .replace(/^ic_category_/, "")
    .replace(/\.svg$/, "")
    .replace(/[^a-z0-9_]/g, "");
  return VALID_ICONS.has(cleaned) ? cleaned : "other";
}

export default function CategoryIcon({
  iconKey = "other",
  color = "#C88856",
  size = 20,
  withBadge = false,
  badgeSize = 40,
  className = "",
}) {
  const safeKey = resolveIconKey(iconKey);
  const src = `/icons/${safeKey}.svg`;
  const iconColor = color || "var(--home-accent)";

  const maskEl = (
    <span
      aria-hidden="true"
      className={withBadge ? "inline-block shrink-0" : `inline-block shrink-0 ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: iconColor,
        WebkitMaskImage: `url("${src}")`,
        maskImage: `url("${src}")`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );

  if (!withBadge) return maskEl;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-2xl shrink-0 ${className}`}
      style={{
        width: `${badgeSize}px`,
        height: `${badgeSize}px`,
        backgroundColor: `${iconColor}1F`,
        border: `1px solid ${iconColor}33`,
      }}
    >
      {maskEl}
    </span>
  );
}

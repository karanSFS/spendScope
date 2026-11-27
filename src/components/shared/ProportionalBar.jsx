"use client";

import React from "react";

export default function ProportionalBar({
  leftPct = 0,
  rightPct = 0,
  leftColor = "var(--home-income)",
  rightColor = "var(--home-expense)",
  trackColor = "var(--home-track)",
  height = 10,
  className = "",
}) {
  const safeLeft = Math.max(0, Math.min(100, Number(leftPct) || 0));
  const safeRight = Math.max(0, Math.min(100 - safeLeft, Number(rightPct) || 0));

  return (
    <div
      className={`w-full rounded-full overflow-hidden flex ${className}`}
      style={{ height: `${height}px`, backgroundColor: trackColor }}
    >
      {safeLeft > 0 && (
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${safeLeft}%`,
            backgroundColor: leftColor,
          }}
        />
      )}
      {safeRight > 0 && (
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${safeRight}%`,
            backgroundColor: rightColor,
          }}
        />
      )}
    </div>
  );
}

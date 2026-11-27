import React from "react";

/**
 * Skeleton placeholders shown until local/cloud data has arrived.
 * Pure markup (no hooks) so they are safe in Suspense / loading.jsx fallbacks.
 */

export function Skeleton({ className = "", style, rounded = "rounded-lg" }) {
  return (
    <div
      aria-hidden="true"
      className={`ss-skeleton ${rounded} ${className}`}
      style={style}
    />
  );
}

/** Wrap a skeleton region so assistive tech announces a single "loading" state. */
export function SkeletonRegion({ label = "Loading", className = "", children }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
      className={className}
    >
      {children}
    </div>
  );
}

const CARD =
  "rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)]";

export function SkeletonCard({ className = "", children }) {
  return <div className={`${CARD} ${className}`}>{children}</div>;
}

/** Generic row: round badge + two text lines + trailing amount. */
export function SkeletonListRow({ trailing = true }) {
  return (
    <div className="min-h-[60px] py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Skeleton className="h-10 w-10 shrink-0" rounded="rounded-full" />
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton className="h-3.5 w-1/2 max-w-[160px]" />
          <Skeleton className="h-3 w-1/3 max-w-[110px]" />
        </div>
      </div>
      {trailing && <Skeleton className="h-4 w-16 shrink-0" />}
    </div>
  );
}

export function SkeletonList({ rows = 5, label = "Loading" }) {
  return (
    <SkeletonRegion
      label={label}
      className="divide-y divide-[var(--home-border)]"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonListRow key={i} />
      ))}
    </SkeletonRegion>
  );
}

/** Category-breakdown style rows (icon, label, amount, progress bar). */
export function SkeletonBars({ rows = 4, label = "Loading" }) {
  return (
    <SkeletonRegion label={label} className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1">
              <Skeleton className="h-8 w-8 shrink-0" rounded="rounded-full" />
              <Skeleton className="h-3.5 w-24" />
            </div>
            <Skeleton className="h-3.5 w-14" />
          </div>
          <Skeleton className="h-2 w-full" rounded="rounded-full" />
        </div>
      ))}
    </SkeletonRegion>
  );
}

/** Grid of cards (buckets, categories, accounts). */
export function SkeletonGrid({
  items = 6,
  label = "Loading",
  className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
  itemClassName = "h-32",
}) {
  return (
    <SkeletonRegion label={label} className={className}>
      {Array.from({ length: items }).map((_, i) => (
        <Skeleton key={i} className={itemClassName} rounded="rounded-[20px]" />
      ))}
    </SkeletonRegion>
  );
}

/** Page title block (heading + subtitle). */
export function SkeletonTitle({ className = "" }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      <Skeleton className="h-8 w-48 max-w-full" />
      <Skeleton className="h-3.5 w-64 max-w-full" />
    </div>
  );
}

/** Dashboard hero (balance + two stat tiles + bar). */
export function SkeletonHero() {
  return (
    <SkeletonRegion label="Loading summary">
      <SkeletonCard className="p-5 sm:p-7 space-y-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-48" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
            <Skeleton className="h-[68px]" rounded="rounded-2xl" />
            <Skeleton className="h-[68px]" rounded="rounded-2xl" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-full" rounded="rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </div>
      </SkeletonCard>
    </SkeletonRegion>
  );
}

/** Period tab bar + navigator placeholder. */
export function SkeletonFilterBar() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
    >
      <Skeleton className="h-11 w-full sm:w-[340px]" rounded="rounded-2xl" />
      <Skeleton className="h-11 w-full sm:w-[220px]" rounded="rounded-full" />
    </div>
  );
}

/** Small stat tile (analytics / settings summaries). */
export function SkeletonStats({ items = 3 }) {
  return (
    <SkeletonRegion
      label="Loading summary"
      className="grid grid-cols-1 sm:grid-cols-3 gap-3"
    >
      {Array.from({ length: items }).map((_, i) => (
        <Skeleton key={i} className="h-20" rounded="rounded-2xl" />
      ))}
    </SkeletonRegion>
  );
}

/** Chart block. */
export function SkeletonChart({ className = "h-64" }) {
  return (
    <SkeletonRegion label="Loading chart">
      <Skeleton className={`w-full ${className}`} rounded="rounded-2xl" />
    </SkeletonRegion>
  );
}

export default Skeleton;

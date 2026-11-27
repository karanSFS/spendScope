import React from "react";
import {
  Skeleton,
  SkeletonTitle,
  SkeletonFilterBar,
  SkeletonHero,
  SkeletonCard,
  SkeletonList,
  SkeletonRegion,
} from "./Skeleton";

/**
 * Generic private-page skeleton used for route-level loading.jsx and Suspense
 * fallbacks, before the page's own data hooks have mounted.
 */
export default function PageSkeleton({ label = "Loading" }) {
  return (
    <SkeletonRegion label={label} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Skeleton className="h-[50px] w-[50px] shrink-0" rounded="rounded-full" />
          <SkeletonTitle />
        </div>
        <Skeleton className="h-10 w-36 hidden sm:block" rounded="rounded-full" />
      </div>
      <SkeletonFilterBar />
      <SkeletonHero />
      <SkeletonCard className="px-4 sm:px-6 py-2">
        <SkeletonList rows={4} label={label} />
      </SkeletonCard>
    </SkeletonRegion>
  );
}

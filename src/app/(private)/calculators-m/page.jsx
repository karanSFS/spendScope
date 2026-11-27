"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RedirectToCalculators() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    router.replace(query ? `/calculators?${query}` : "/calculators");
  }, [router, searchParams]);

  return (
    <div className="p-8 text-center text-xs text-[var(--home-text-muted)]">
      Redirecting to Calculators...
    </div>
  );
}

export default function CalculatorsMLegacyRedirect() {
  return (
    <Suspense fallback={null}>
      <RedirectToCalculators />
    </Suspense>
  );
}

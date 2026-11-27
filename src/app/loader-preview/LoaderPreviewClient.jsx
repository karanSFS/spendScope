"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import AppLoader from "@/components/shared/AppLoader";
import PageSkeleton from "@/components/shared/PageSkeleton";
import {
  SkeletonList,
  SkeletonBars,
  SkeletonGrid,
} from "@/components/shared/Skeleton";
import { changeTheme } from "@/redux/slices/themeSlice";

const DURATION_OPTIONS = [3, 5, 10];

export default function LoaderPreviewClient() {
  const dispatch = useDispatch();
  const isDark = useSelector((s) => s?.themeSlice?.mode) === "dark";
  const [fullScreen, setFullScreen] = useState(false);
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    if (!fullScreen) return undefined;
    const t = setTimeout(() => setFullScreen(false), seconds * 1000);
    const onKey = (e) => e.key === "Escape" && setFullScreen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [fullScreen, seconds]);

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 z-50 cursor-pointer"
        onClick={() => setFullScreen(false)}
        title="Click or press Esc to close"
      >
        <AppLoader />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--home-background)] text-[var(--home-text)] px-5 py-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--home-text-muted)]">
              Dev only
            </p>
            <h1 className="font-display text-3xl">Loader preview</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => dispatch(changeTheme())}
              className="rounded-full border border-[var(--home-border)] bg-[var(--home-card)] px-4 py-2 text-xs font-bold cursor-pointer"
            >
              Switch to {isDark ? "Light" : "Dark"}
            </button>
            <Link
              href="/this-page-does-not-exist"
              className="rounded-full border border-[var(--home-border)] bg-[var(--home-card)] px-4 py-2 text-xs font-bold"
            >
              Preview 404
            </Link>
          </div>
        </header>

        <section className="rounded-3xl border border-[var(--home-border)] bg-[var(--home-card)] p-5 space-y-4">
          <div>
            <h2 className="font-bold">Full-screen (page)</h2>
            <p className="text-xs text-[var(--home-text-secondary)]">
              Shown at app startup and while checking device security.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {DURATION_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeconds(s)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold border cursor-pointer ${
                  seconds === s
                    ? "bg-[var(--home-accent)] border-[var(--home-accent)] text-[var(--home-on-accent)]"
                    : "border-[var(--home-border)] bg-[var(--home-background)]"
                }`}
              >
                {s}s
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFullScreen(true)}
              data-testid="show-fullscreen-loader"
              className="rounded-full bg-[var(--home-accent)] px-5 py-2 text-xs font-bold text-[var(--home-on-accent)] cursor-pointer"
            >
              Show full-screen loader
            </button>
          </div>
          <p className="text-[11px] text-[var(--home-text-muted)]">
            Click anywhere or press Esc to close it early.
          </p>
        </section>

        <section className="rounded-3xl border border-[var(--home-border)] bg-[var(--home-card)] p-5">
          <h2 className="font-bold">Section</h2>
          <p className="text-xs text-[var(--home-text-secondary)]">
            Route / Suspense fallbacks (calculators, settings, transactions, bucket detail).
          </p>
          <AppLoader variant="section" label="Loading settings" />
        </section>

        <section
          data-testid="skeleton-preview"
          className="rounded-3xl border border-[var(--home-border)] bg-[var(--home-background)] p-5 space-y-5"
        >
          <div>
            <h2 className="font-bold">Skeletons</h2>
            <p className="text-xs text-[var(--home-text-secondary)]">
              Shown on every section until local / cloud data has arrived.
            </p>
          </div>
          <PageSkeleton label="Loading dashboard" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-[var(--home-border)] bg-[var(--home-card)] p-5">
              <SkeletonBars rows={4} />
            </div>
            <div className="rounded-3xl border border-[var(--home-border)] bg-[var(--home-card)] px-5 py-2">
              <SkeletonList rows={4} />
            </div>
          </div>
          <SkeletonGrid items={4} className="grid grid-cols-1 md:grid-cols-2 gap-4" itemClassName="h-32" />
        </section>

        <section className="rounded-3xl border border-[var(--home-border)] bg-[var(--home-card)] p-5">
          <h2 className="font-bold">Compact</h2>
          <p className="text-xs text-[var(--home-text-secondary)]">
            Lists, charts and lazy panels (transactions list, analytics charts, loan profiles).
          </p>
          <AppLoader variant="compact" label="Loading transactions" />
        </section>
      </div>
    </main>
  );
}

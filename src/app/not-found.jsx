import React from "react";
import Link from "next/link";
import {
  HiOutlineHome,
  HiOutlineSquares2X2,
  HiOutlineMagnifyingGlass,
} from "react-icons/hi2";

export const metadata = {
  title: "Page not found — SpendScope",
};

const FLOATING_COINS = [
  { top: "12%", left: "10%", size: 34, delay: "0s", rot: "-12deg", tone: "accent" },
  { top: "22%", right: "12%", size: 26, delay: "0.8s", rot: "10deg", tone: "income" },
  { bottom: "18%", left: "16%", size: 22, delay: "1.4s", rot: "6deg", tone: "income" },
  { bottom: "26%", right: "9%", size: 38, delay: "0.4s", rot: "-8deg", tone: "accent" },
];

export default function NotFound() {
  return (
    <main
      data-testid="not-found-page"
      className="relative min-h-screen w-full overflow-hidden flex items-center justify-center px-5 py-12 bg-[var(--home-background)] text-[var(--home-text)]"
    >
      {/* Ambient glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-80 w-[36rem] max-w-full rounded-full blur-3xl opacity-25"
        style={{ background: "var(--home-accent)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full blur-3xl opacity-20"
        style={{ background: "var(--home-income)" }}
      />

      {/* Floating coins */}
      {FLOATING_COINS.map((c, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="ss-float absolute hidden sm:block rounded-full"
          style={{
            top: c.top,
            bottom: c.bottom,
            left: c.left,
            right: c.right,
            width: c.size,
            height: c.size,
            animationDelay: c.delay,
            "--ss-rot": c.rot,
            background:
              c.tone === "accent" ? "var(--home-accent)" : "var(--home-income)",
            opacity: 0.85,
            boxShadow: "inset 0 -4px 0 rgba(0,0,0,0.15)",
          }}
        />
      ))}

      <div className="relative w-full max-w-xl text-center ss-fade-up">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--home-text-secondary)]">
          <HiOutlineMagnifyingGlass className="h-3.5 w-3.5" />
          Error 404
        </p>

        <h1 className="mt-5 font-display leading-none select-none">
          <span className="text-[7.5rem] sm:text-[10rem] tracking-tight">
            4
            <span
              className="inline-block ss-float"
              style={{ color: "var(--home-accent)" }}
            >
              0
            </span>
            4
          </span>
        </h1>

        <h2 className="mt-2 font-display text-2xl sm:text-3xl">
          This page wandered off the budget
        </h2>
        <p className="mt-3 text-sm sm:text-base text-[var(--home-text-secondary)] max-w-md mx-auto">
          We couldn&apos;t find what you were looking for. The link may be
          broken, or the page may have moved.
        </p>

        {/* Lost receipt card */}
        <div className="mt-8 mx-auto max-w-sm rounded-3xl border border-dashed border-[var(--home-border)] bg-[var(--home-card)] p-5 text-left shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--home-text-muted)]">
              Receipt
            </span>
            <span className="font-mono-num text-[11px] text-[var(--home-text-muted)]">
              #404
            </span>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--home-text-secondary)]">Item</span>
              <span className="font-semibold">Requested page</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--home-text-secondary)]">Amount</span>
              <span className="font-mono-num font-semibold">0.00</span>
            </div>
            <div className="border-t border-dashed border-[var(--home-border)] pt-2 flex items-center justify-between">
              <span className="text-[var(--home-text-secondary)]">Status</span>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                style={{
                  color: "var(--home-destructive)",
                  background:
                    "color-mix(in srgb, var(--home-destructive) 14%, transparent)",
                }}
              >
                Not found
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--home-accent)] px-6 py-3 text-sm font-bold text-[var(--home-on-accent)] shadow-sm transition-all hover:opacity-90 hover:-translate-y-0.5"
          >
            <HiOutlineHome className="h-4 w-4" />
            Back to Home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] px-6 py-3 text-sm font-bold text-[var(--home-text)] transition-all hover:border-[var(--home-accent)] hover:-translate-y-0.5"
          >
            <HiOutlineSquares2X2 className="h-4 w-4" />
            Open Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

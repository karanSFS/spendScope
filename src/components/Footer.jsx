"use client";

import React from "react";
import Link from "next/link";
import { SpendScopeLogo } from "./Header";

export default function Footer() {
  return (
    <footer className="w-full py-8 border-t border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text-secondary)]">
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <SpendScopeLogo className="w-7 h-7 group-hover:scale-105 transition-transform" />
          <span className="font-display text-xl tracking-tight">
            <span className="text-[var(--home-accent)]">Spend</span>
            <span className="text-[var(--home-text)]">Scope</span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center justify-center gap-5 sm:gap-8 text-xs sm:text-sm font-semibold">
          <Link href="/" className="hover:text-[var(--home-text)] transition-colors">
            Home
          </Link>
          <Link
            href="/dashboard"
            className="hover:text-[var(--home-text)] transition-colors"
          >
            Guest Workspace
          </Link>
          <Link
            href="/calculators"
            className="hover:text-[var(--home-text)] transition-colors"
          >
            Calculators
          </Link>
          <Link
            href="/privacy-policy"
            className="hover:text-[var(--home-text)] transition-colors"
          >
            Privacy Policy
          </Link>
        </nav>

        <span className="text-xs text-[var(--home-text-muted)]">
          © 2026 SpendScope. Private &amp; Calm Personal Finance.
        </span>
      </div>
    </footer>
  );
}

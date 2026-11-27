"use client";

import React from "react";
import Link from "next/link";
import { SpendScopeLogo } from "./Header";

const FOOTER_COLUMNS = [
  {
    heading: "Workspace",
    links: [
      { label: "Spending Overview", href: "/dashboard" },
      { label: "Transactions", href: "/transactions" },
      { label: "Analytics & Charts", href: "/analytics" },
      { label: "Spend Buckets", href: "/spend-bucket" },
      { label: "Categories Manager", href: "/categories" },
    ],
  },
  {
    heading: "Calculators",
    links: [
      {
        label: "EMI Calculator",
        href: "/calculators?type=emi-calculator&category=emi",
      },
      {
        label: "SIP Calculator",
        href: "/calculators?type=sip-calculator&category=sip",
      },
      {
        label: "Loan Profile",
        href: "/calculators?type=loan-profile&category=loan",
      },
      {
        label: "Currency Converter",
        href: "/calculators?type=currency-converter&category=other",
      },
      { label: "All 24 Calculators →", href: "/calculators" },
    ],
  },
  {
    heading: "Account & Privacy",
    links: [
      { label: "Guest Workspace", href: "/dashboard" },
      { label: "Sign In", href: "/sign-in" },
      { label: "Create Cloud Account", href: "/signup" },
      { label: "Privacy Policy", href: "/privacy-policy" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="w-full border-t border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text-secondary)]">
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 pb-10 border-b border-[var(--home-border)]">
          {/* Brand Column */}
          <div className="lg:col-span-5 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <SpendScopeLogo className="w-8 h-8 group-hover:scale-105 transition-transform" />
              <span className="font-display text-2xl tracking-tight">
                <span className="text-[var(--home-accent)]">Spend</span>
                <span className="text-[var(--home-text)]">Scope</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed max-w-sm text-[var(--home-text-secondary)]">
              Calm, local-first expense tracking, named Spend Buckets, and 24
              precision financial calculators — built for quiet clarity on Web
              and Android.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold border border-[var(--home-border)] bg-[var(--home-background)] text-[var(--home-income)]">
                Local-First Guest Mode
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold border border-[var(--home-border)] bg-[var(--home-background)] text-[var(--home-text-secondary)]">
                Zero Ads · Zero Trackers
              </span>
            </div>
          </div>

          {/* Link Columns */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.heading} className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--home-text)]">
                  {col.heading}
                </h3>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-xs sm:text-sm font-medium text-[var(--home-text-secondary)] hover:text-[var(--home-accent)] transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Trust Strip */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--home-text-muted)]">
          <span>
            © 2026 SpendScope. Private &amp; Calm Personal Finance.
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy-policy"
              className="hover:text-[var(--home-text)] transition-colors"
            >
              Privacy Policy
            </Link>
            <span aria-hidden="true">·</span>
            <Link
              href="/calculators"
              className="hover:text-[var(--home-text)] transition-colors"
            >
              24 Calculators
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

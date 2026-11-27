"use client";

import React from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import {
  HiOutlineArrowLeft,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineShieldCheck,
  HiOutlineCloudArrowUp,
  HiOutlineCalculator,
} from "react-icons/hi2";
import { SpendScopeLogo } from "@/components/Header";
import { changeTheme } from "@/redux/slices/themeSlice";

const HIGHLIGHTS = [
  {
    icon: HiOutlineCloudArrowUp,
    title: "Seamless Web, Android & iOS Sync",
    desc: "Keep accounts, categories, transactions, and Spend Buckets aligned across devices.",
  },
  {
    icon: HiOutlineShieldCheck,
    title: "Row-Level Security by Default",
    desc: "Strict per-user Postgres policies — zero third-party ads or analytics trackers.",
  },
  {
    icon: HiOutlineCalculator,
    title: "24 Calculators + Local OCR",
    desc: "Model loans, SIPs, and scan receipts directly in your browser without uploads.",
  },
];

export default function AuthSplitShell({
  eyebrow = "SPENDSCOPE CLOUD",
  headline = "Calm, private clarity for every account.",
  subtitle = "Start locally in Guest Mode anytime, or sign in to back up and sync privately across Web, Android and iOS.",
  children,
}) {
  const dispatch = useDispatch();
  const isDark = useSelector((state) => state?.themeSlice?.mode === "dark");

  return (
    <div className="min-h-screen w-full flex flex-col bg-[var(--home-background)] text-[var(--home-text)]">
      {/* Top Utility Bar */}
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[var(--home-text-secondary)] hover:text-[var(--home-text)] transition-colors"
        >
          <HiOutlineArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <button
          type="button"
          onClick={() => dispatch(changeTheme(isDark ? "light" : "dark"))}
          className="w-9 h-9 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] flex items-center justify-center text-[var(--home-text-secondary)] hover:text-[var(--home-text)] cursor-pointer transition-colors"
          aria-label="Toggle Light/Dark theme"
        >
          {isDark ? (
            <HiOutlineSun className="w-4 h-4" />
          ) : (
            <HiOutlineMoon className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Main Split Content */}
      <main className="flex-1 w-full max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Brand & Trust Panel (Desktop) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-between rounded-[28px] border border-[var(--home-border)] bg-[var(--home-card)] p-9 relative overflow-hidden shadow-2xs">
            <div
              className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20 blur-3xl"
              style={{ background: "var(--home-accent)" }}
            />
            <div className="relative z-10 space-y-6">
              <Link href="/" className="inline-flex items-center gap-2.5">
                <SpendScopeLogo className="w-8 h-8" />
                <span className="font-display text-2xl tracking-tight">
                  <span className="text-[var(--home-accent)]">Spend</span>
                  <span className="text-[var(--home-text)]">Scope</span>
                </span>
              </Link>

              <div className="space-y-3">
                <span className="text-xs font-bold tracking-[0.14em] uppercase text-[var(--home-accent)] block">
                  {eyebrow}
                </span>
                <h2 className="font-display text-3xl xl:text-4xl leading-tight text-[var(--home-text)]">
                  {headline}
                </h2>
                <p className="text-sm text-[var(--home-text-secondary)] leading-relaxed max-w-md">
                  {subtitle}
                </p>
              </div>

              <div className="space-y-3.5 pt-2">
                {HIGHLIGHTS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="flex items-start gap-3.5 p-3.5 rounded-2xl border border-[var(--home-border)] bg-[var(--home-background)]/80"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[var(--home-card)] border border-[var(--home-border)] text-[var(--home-accent)] flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-[var(--home-text)]">
                          {item.title}
                        </h3>
                        <p className="text-xs text-[var(--home-text-secondary)] leading-relaxed mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative z-10 pt-6 mt-6 border-t border-[var(--home-border)] flex items-center justify-between text-xs text-[var(--home-text-muted)]">
              <span>Local-first · Zero tracking</span>
              <Link
                href="/privacy-policy"
                className="font-semibold text-[var(--home-accent)] hover:underline"
              >
                Privacy Policy →
              </Link>
            </div>
          </div>

          {/* Right Auth Form Column */}
          <div className="lg:col-span-6 flex justify-center">{children}</div>
        </div>
      </main>
    </div>
  );
}

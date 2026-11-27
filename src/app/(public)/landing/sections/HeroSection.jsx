"use client";

import React from "react";
import Link from "next/link";
import { HiChevronDown, HiOutlineCamera, HiOutlineArchiveBox } from "react-icons/hi2";
import { IoCheckmarkCircle, IoWifi, IoChevronForward } from "react-icons/io5";
import { FaBatteryThreeQuarters } from "react-icons/fa6";
import { SpendScopeLogo } from "@/components/Header";
import CategoryIcon from "@/components/shared/CategoryIcon";
import useAuth from "@/hooks/useAuth";

const HERO_METRICS = [
  { value: "24", label: "Financial Calculators", note: "Loans, SIP, GST & FX" },
  { value: "100%", label: "Offline Guest Mode", note: "Stored in your browser" },
  { value: "0", label: "Ads or Trackers", note: "Private by architecture" },
  { value: "Web + Android", label: "Optional Cloud Sync", note: "Row-level encrypted sync" },
];

export default function HeroSection() {
  const { continueAsGuest, isAuthenticated } = useAuth();

  return (
    <section
      id="home"
      className="relative scroll-mt-20 pt-10 pb-14 md:pt-16 md:pb-20 lg:py-20 overflow-hidden bg-[var(--home-background)]"
    >
      {/* Subtle warm radial accents */}
      <div
        className="absolute -top-28 right-[6%] w-[420px] h-[420px] rounded-full opacity-20 pointer-events-none blur-3xl"
        style={{ background: "var(--home-accent)" }}
      />
      <div
        className="absolute bottom-12 left-[2%] w-[300px] h-[300px] rounded-full opacity-15 pointer-events-none blur-3xl"
        style={{ background: "var(--home-income)" }}
      />

      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12 md:space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-6 space-y-6 z-10">
            <div className="inline-flex flex-wrap items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-accent)] shadow-2xs">
              <span>Private by Default</span>
              <span className="w-1 h-1 rounded-full bg-[var(--home-accent)]" />
              <span>Syncs with Android</span>
              <span className="w-1 h-1 rounded-full bg-[var(--home-accent)]" />
              <span>Free Guest Mode</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-[56px] tracking-tight leading-[1.06] text-[var(--home-text)]">
              Calm Control Over
              <br />
              <span className="text-[var(--home-accent)]">
                Every Rupee &amp; Goal
              </span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg max-w-xl leading-relaxed text-[var(--home-text-secondary)]">
              Track daily expenses, organize named Spend Buckets, monitor
              multi-account balances, and run 24 precision financial calculators
              — right away in Guest Mode or synced privately to your cloud
              account.
            </p>

            {/* Primary CTA + Secondary CTA */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-sm sm:text-base font-semibold shadow-md hover:opacity-95 hover:-translate-y-0.5 transition-all"
                >
                  <span>Open Workspace</span>
                  <span>→</span>
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={continueAsGuest}
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-sm sm:text-base font-semibold shadow-md hover:opacity-95 hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    <span>Continue as Guest</span>
                    <span>→</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(
                          new CustomEvent("open-auth-modal", {
                            detail: "signup",
                          }),
                        );
                      }
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text)] text-sm sm:text-base font-semibold hover:border-[var(--home-accent)] hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    <span>Create Cloud Account</span>
                  </button>
                </>
              )}
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-xs sm:text-sm text-[var(--home-text-secondary)]">
              {[
                "Works offline in Guest Mode",
                "On-device receipt OCR & voice",
                "Zero third-party ads",
              ].map((text) => (
                <div key={text} className="flex items-center gap-1.5">
                  <IoCheckmarkCircle className="w-4 h-4 shrink-0 text-[var(--home-income)]" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN — Theme-Aware Editorial Mobile Preview + Floating Micro-Cards */}
          <div className="lg:col-span-6 relative flex items-center justify-center py-2">
            {/* Soft radial halo behind phone */}
            <div
              className="absolute w-[310px] h-[310px] rounded-full opacity-25 blur-3xl pointer-events-none"
              style={{ background: "var(--home-accent)" }}
            />

            {/* Floating Left Micro-Card (Spend Bucket) */}
            <div className="hidden sm:flex items-center gap-2.5 absolute left-0 xl:left-4 top-20 z-20 rounded-2xl border border-[var(--home-border)] bg-[var(--home-card)]/95 backdrop-blur-md px-3.5 py-2.5 shadow-lg max-w-[215px]">
              <div className="w-9 h-9 rounded-xl bg-[var(--home-income-soft)] text-[var(--home-income)] flex items-center justify-center shrink-0">
                <HiOutlineArchiveBox className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-[var(--home-text)] block truncate">
                  Goa Trip Bucket
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-14 h-1.5 rounded-full bg-[var(--home-track)] overflow-hidden">
                    <div className="h-full w-3/4 rounded-full bg-[var(--home-income)]" />
                  </div>
                  <span className="font-mono-num text-[10px] font-bold text-[var(--home-income)]">
                    75%
                  </span>
                </div>
              </div>
            </div>

            {/* Floating Right Micro-Card (On-Device OCR) */}
            <div className="hidden sm:flex items-center gap-2.5 absolute right-0 xl:right-4 bottom-20 z-20 rounded-2xl border border-[var(--home-border)] bg-[var(--home-card)]/95 backdrop-blur-md px-3.5 py-2.5 shadow-lg max-w-[210px]">
              <div className="w-9 h-9 rounded-xl bg-[var(--add-operator-key-bg)] text-[var(--home-accent)] flex items-center justify-center shrink-0">
                <HiOutlineCamera className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-[var(--home-text)] block truncate">
                  Receipt Scanned
                </span>
                <span className="font-mono-num text-[10px] font-semibold text-[var(--home-text-secondary)]">
                  Dining Out · ₹850.00
                </span>
              </div>
            </div>

            {/* Theme-Aware Phone Device Frame */}
            <div className="w-[276px] xs:w-[294px] sm:w-[312px] bg-[#24201C] dark:bg-[#120F0D] p-[8px] rounded-[42px] shadow-2xl border-2 border-[#3A342D] relative z-10 ring-1 ring-black/10">
              <div className="bg-[var(--home-background)] text-[var(--home-text)] rounded-[34px] overflow-hidden flex flex-col h-[560px] select-none border border-[var(--home-border)]">
                {/* Dynamic Island */}
                <div className="pt-2.5 pb-1 flex justify-center">
                  <div className="w-[74px] h-[20px] bg-[#1A1714] rounded-full flex items-center justify-end px-2">
                    <div className="w-[6px] h-[6px] rounded-full bg-[#3A342D]" />
                  </div>
                </div>

                {/* Status Bar */}
                <div className="px-5 py-0.5 flex items-center justify-between text-[10px] font-semibold text-[var(--home-text-secondary)]">
                  <span>12:26</span>
                  <div className="flex items-center gap-1">
                    <IoWifi className="w-3 h-3" />
                    <FaBatteryThreeQuarters className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* App Header */}
                <div className="px-4 pt-2 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <SpendScopeLogo className="w-5 h-5" />
                    <span className="font-display text-xs">
                      <span className="text-[var(--home-accent)]">Spend</span>
                      <span className="text-[var(--home-text)]">Scope</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center gap-0.5 bg-[var(--home-card)] border border-[var(--home-border)] px-2 py-0.5 rounded-full text-[10px] font-semibold text-[var(--home-text-secondary)]">
                      This Month
                      <HiChevronDown className="w-2.5 h-2.5" />
                    </span>
                    <img
                      src="/avatars/user_pf.png"
                      alt="Profile avatar"
                      className="w-6 h-6 rounded-full border border-[var(--home-border)]"
                    />
                  </div>
                </div>

                {/* Hero Card */}
                <div className="px-3.5 pt-1">
                  <div className="bg-[var(--home-card)] rounded-[20px] p-3.5 border border-[var(--home-border)]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[var(--home-text-secondary)] font-semibold">
                        Net Balance
                      </span>
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[var(--home-income-soft)] text-[var(--home-income)]">
                        Primary Account
                      </span>
                    </div>
                    <p className="font-mono-num text-[22px] font-bold text-[var(--home-text)]">
                      ₹12,450.00
                    </p>
                    <div className="mt-2 h-2 rounded-full bg-[var(--home-track)] overflow-hidden">
                      <div className="h-full w-[52%] rounded-full bg-[var(--home-accent)]" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2.5 text-[10px]">
                      <div className="rounded-xl bg-[var(--home-income-soft)] px-2.5 py-1.5">
                        <span className="text-[var(--home-text-secondary)] block">
                          Income
                        </span>
                        <span className="font-mono-num font-bold text-[var(--home-income)]">
                          +₹25,000
                        </span>
                      </div>
                      <div className="rounded-xl bg-[var(--add-operator-key-bg)] px-2.5 py-1.5">
                        <span className="text-[var(--home-text-secondary)] block">
                          Expense
                        </span>
                        <span className="font-mono-num font-bold text-[var(--home-expense)]">
                          -₹12,550
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Transactions */}
                <div className="px-3.5 pt-3 flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[11px] font-bold text-[var(--home-text)]">
                      Recent Activity
                    </h3>
                    <span className="text-[9px] font-semibold text-[var(--home-accent)] flex items-center gap-0.5">
                      History <IoChevronForward className="w-2.5 h-2.5" />
                    </span>
                  </div>
                  <div className="space-y-2">
                    {[
                      {
                        label: "Groceries",
                        icon: "groceries",
                        color: "#39a78e",
                        amount: "-₹2,450",
                        tone: "var(--home-expense)",
                      },
                      {
                        label: "Salary",
                        icon: "salary",
                        color: "#327da0",
                        amount: "+₹25,000",
                        tone: "var(--home-income)",
                      },
                      {
                        label: "Dining Out",
                        icon: "dining",
                        color: "#fd5800",
                        amount: "-₹850",
                        tone: "var(--home-expense)",
                      },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between bg-[var(--home-card)] border border-[var(--home-border)] rounded-2xl px-2.5 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <CategoryIcon
                            iconKey={row.icon}
                            color={row.color}
                            size={15}
                            withBadge
                            badgeSize={28}
                          />
                          <span className="text-[11px] font-semibold text-[var(--home-text)]">
                            {row.label}
                          </span>
                        </div>
                        <span
                          className="font-mono-num text-[11px] font-bold"
                          style={{ color: row.tone }}
                        >
                          {row.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Tab Preview */}
                <div className="bg-[var(--home-card)] border-t border-[var(--home-border)] px-3 py-2 grid grid-cols-4 text-center text-[9px] font-semibold text-[var(--home-text-muted)]">
                  <span className="text-[var(--home-accent)]">Home</span>
                  <span>History</span>
                  <span>Analytics</span>
                  <span>Buckets</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Metric Trust Strip */}
        {/* <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-2">
          {HERO_METRICS.map((item) => (
            <div
              key={item.label}
              className="rounded-[22px] border border-[var(--home-border)] bg-[var(--home-card)]/90 px-4 py-4 sm:px-5 sm:py-5 flex flex-col justify-between"
            >
              <span className="font-display text-2xl sm:text-3xl text-[var(--home-accent)] leading-none">
                {item.value}
              </span>
              <div className="mt-2">
                <p className="text-xs sm:text-sm font-bold text-[var(--home-text)]">
                  {item.label}
                </p>
                <p className="text-[11px] text-[var(--home-text-muted)] mt-0.5">
                  {item.note}
                </p>
              </div>
            </div>
          ))}
        </div> */}
      </div>
    </section>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { HiChevronDown } from "react-icons/hi2";
import { IoCheckmarkCircle, IoWifi, IoChevronForward } from "react-icons/io5";
import { FaBatteryThreeQuarters } from "react-icons/fa6";
import { SpendScopeLogo } from "@/components/Header";
import CategoryIcon from "@/components/shared/CategoryIcon";
import useAuth from "@/hooks/useAuth";

export default function HeroSection() {
  const { continueAsGuest, isAuthenticated } = useAuth();

  return (
    <section
      id="home"
      className="relative scroll-mt-20 pt-8 pb-12 md:pt-12 md:pb-16 overflow-hidden bg-[var(--home-background)]"
    >
      {/* Subtle warm radial accents */}
      <div
        className="absolute -top-24 right-[8%] w-[380px] h-[380px] rounded-full opacity-20 pointer-events-none blur-3xl"
        style={{ background: "var(--home-accent)" }}
      />
      <div
        className="absolute bottom-6 left-[3%] w-[260px] h-[260px] rounded-full opacity-15 pointer-events-none blur-3xl"
        style={{ background: "var(--home-income)" }}
      />

      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-8 items-center">
          {/* LEFT COLUMN */}
          <div className="space-y-5 z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-accent)]">
              <span>Local-First Privacy</span>
              <span className="w-1 h-1 rounded-full bg-[var(--home-accent)]" />
              <span>Android Parity</span>
              <span className="w-1 h-1 rounded-full bg-[var(--home-accent)]" />
              <span>Optional Sync</span>
            </div>

            <h1 className="font-display text-3xl xs:text-4xl sm:text-5xl lg:text-[54px] tracking-tight leading-[1.08] text-[var(--home-text)]">
              Calm Control Over
              <br />
              <span className="text-[var(--home-accent)]">
                Every Rupee &amp; Goal
              </span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg max-w-lg leading-relaxed text-[var(--home-text-secondary)]">
              Track daily expenses, organize named Spend Buckets, monitor
              multi-account balances, and run 24 financial calculators — right
              away in Guest Mode or synced privately to your account.
            </p>

            {/* Primary CTA + Guest CTA */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-sm sm:text-base font-semibold shadow-md hover:opacity-95 transition-opacity"
                >
                  <span>Open Workspace</span>
                  <span>→</span>
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={continueAsGuest}
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-sm sm:text-base font-semibold shadow-md hover:opacity-95 transition-opacity cursor-pointer"
                  >
                    <span>Continue as Guest</span>
                    <span>→</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(
                          new CustomEvent("open-auth-modal", { detail: "signup" }),
                        );
                      }
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text)] text-sm sm:text-base font-semibold hover:border-[var(--home-accent)] transition-colors cursor-pointer"
                  >
                    <span>Create Cloud Account</span>
                  </button>
                </>
              )}
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-5 pt-2 text-xs sm:text-sm text-[var(--home-text-secondary)]">
              {[
                "Works offline in Guest Mode",
                "Zero third-party ads",
                "Synced with Android app",
              ].map((text) => (
                <div key={text} className="flex items-center gap-1.5">
                  <IoCheckmarkCircle className="w-4 h-4 shrink-0 text-[var(--home-income)]" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN — Editorial Mobile Preview */}
          <div className="relative flex items-center justify-center px-2 sm:px-6">
            <div className="w-[270px] xs:w-[290px] sm:w-[310px] bg-[#24201C] p-[8px] rounded-[42px] shadow-2xl border-2 border-[#3A342D] relative">
              <div className="bg-[#F5EDDE] text-[#2B2827] rounded-[34px] overflow-hidden flex flex-col h-[560px] select-none border border-[#E1DACD]">
                {/* Dynamic Island */}
                <div className="pt-2.5 pb-1 flex justify-center">
                  <div className="w-[74px] h-[20px] bg-[#1A1714] rounded-full flex items-center justify-end px-2">
                    <div className="w-[6px] h-[6px] rounded-full bg-[#3A342D]" />
                  </div>
                </div>

                {/* Status Bar */}
                <div className="px-5 py-0.5 flex items-center justify-between text-[10px] font-semibold text-[#68635D]">
                  <span>12:26</span>
                  <div className="flex items-center gap-1">
                    <IoWifi className="w-3 h-3" />
                    <FaBatteryThreeQuarters className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* App Header */}
                <div className="px-4 pt-2 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <SpendScopeLogo className="w-5 h-5" color="#C88856" />
                    <span className="font-display text-xs">
                      <span className="text-[#C88856]">Spend</span>
                      <span className="text-[#2B2827]">Scope</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center gap-0.5 bg-[#FBF7EF] border border-[#E1DACD] px-2 py-0.5 rounded-full text-[10px] font-semibold text-[#68635D]">
                      This Month
                      <HiChevronDown className="w-2.5 h-2.5" />
                    </span>
                    <img
                      src="/avatars/user_pf.png"
                      alt="Profile avatar"
                      className="w-6 h-6 rounded-full border border-[#E1DACD]"
                    />
                  </div>
                </div>

                {/* Hero Card */}
                <div className="px-3.5 pt-1">
                  <div className="bg-[#FBF7EF] rounded-[20px] p-3.5 border border-[#E1DACD]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[#68635D] font-semibold">
                        Net Balance
                      </span>
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#EEF3DF] text-[#6C7555]">
                        Primary Account
                      </span>
                    </div>
                    <p className="font-mono-num text-[22px] font-bold text-[#2B2827]">
                      ₹12,450.00
                    </p>
                    <div className="mt-2 h-2 rounded-full bg-[#E5DECE] overflow-hidden">
                      <div className="h-full w-[52%] rounded-full bg-[#C88856]" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2.5 text-[10px]">
                      <div className="rounded-xl bg-[#EEF3DF] px-2.5 py-1.5">
                        <span className="text-[#68635D] block">Income</span>
                        <span className="font-mono-num font-bold text-[#6C7555]">
                          +₹25,000
                        </span>
                      </div>
                      <div className="rounded-xl bg-[#FBEEE7] px-2.5 py-1.5">
                        <span className="text-[#68635D] block">Expense</span>
                        <span className="font-mono-num font-bold text-[#966031]">
                          -₹12,550
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Transactions */}
                <div className="px-3.5 pt-3 flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[11px] font-bold text-[#2B2827]">
                      Recent Activity
                    </h3>
                    <span className="text-[9px] font-semibold text-[#C88856] flex items-center gap-0.5">
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
                        tone: "#966031",
                      },
                      {
                        label: "Salary",
                        icon: "salary",
                        color: "#327da0",
                        amount: "+₹25,000",
                        tone: "#6C7555",
                      },
                      {
                        label: "Dining Out",
                        icon: "dining",
                        color: "#fd5800",
                        amount: "-₹850",
                        tone: "#966031",
                      },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between bg-[#FBF7EF] border border-[#E1DACD] rounded-2xl px-2.5 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <CategoryIcon
                            iconKey={row.icon}
                            color={row.color}
                            size={15}
                            withBadge
                            badgeSize={28}
                          />
                          <span className="text-[11px] font-semibold text-[#2B2827]">
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
                <div className="bg-[#FBF7EF] border-t border-[#E1DACD] px-3 py-2 grid grid-cols-4 text-center text-[9px] font-semibold text-[#938C7F]">
                  <span className="text-[#C88856]">Home</span>
                  <span>History</span>
                  <span>Analytics</span>
                  <span>Buckets</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

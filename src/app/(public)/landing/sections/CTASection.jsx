"use client";

import React from "react";
import Link from "next/link";
import useAuth from "@/hooks/useAuth";

export default function CTASection() {
  const { continueAsGuest, isAuthenticated } = useAuth();

  return (
    <section
      id="about"
      className="scroll-mt-20 py-14 md:py-20 bg-[var(--home-background)]"
    >
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="relative overflow-hidden rounded-[28px] p-8 sm:p-12 lg:p-14 text-[var(--home-on-accent)] shadow-xl border border-white/15"
          style={{
            background:
              "linear-gradient(135deg, var(--home-accent) 0%, #9E6337 100%)",
          }}
        >
          {/* Decorative editorial glows */}
          <div className="pointer-events-none absolute -top-20 -right-16 w-72 h-72 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 w-64 h-64 rounded-full bg-black/15 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-xl space-y-3">
              <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.14em] uppercase opacity-90">
                <span>YOUR FINANCIAL WORKSPACE</span>
                <span aria-hidden="true">·</span>
                <span>NO SIGN-UP WALL</span>
              </span>
              <h2 className="font-display text-3xl sm:text-4xl leading-tight">
                Start in Guest Mode now, back up to Cloud whenever you choose
              </h2>
              <p className="text-sm sm:text-base opacity-90 leading-relaxed">
                Your local workspace creates a primary account and 21 default
                categories immediately — zero credit card, zero tracking
                scripts.
              </p>
            </div>

            <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-3">
                {isAuthenticated ? (
                  <Link
                    href="/dashboard"
                    className="px-7 py-3.5 rounded-full bg-[var(--home-card)] text-[var(--home-text)] font-semibold text-sm shadow-md hover:opacity-95 hover:-translate-y-0.5 transition-all"
                  >
                    Open Workspace →
                  </Link>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={continueAsGuest}
                      className="px-7 py-3.5 rounded-full bg-[var(--home-card)] text-[var(--home-text)] font-semibold text-sm shadow-md hover:opacity-95 hover:-translate-y-0.5 transition-all cursor-pointer"
                    >
                      Continue as Guest →
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
                      className="px-6 py-3.5 rounded-full border-2 border-white/70 text-white font-semibold text-sm hover:bg-white/15 hover:-translate-y-0.5 transition-all cursor-pointer"
                    >
                      Create Account
                    </button>
                  </>
                )}
              </div>
              <span className="text-xs text-white/80 font-medium">
                100% free locally · Optional encrypted cloud sync
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

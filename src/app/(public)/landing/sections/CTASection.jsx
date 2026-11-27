"use client";

import React from "react";
import Link from "next/link";
import useAuth from "@/hooks/useAuth";

export default function CTASection() {
  const { continueAsGuest, isAuthenticated } = useAuth();

  return (
    <section id="about" className="scroll-mt-20 py-10 md:py-14 bg-[var(--home-background)]">
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-[28px] p-8 sm:p-12 bg-[var(--home-accent)] text-[var(--home-on-accent)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 shadow-lg">
          <div className="max-w-xl space-y-3">
            <span className="text-xs font-bold tracking-[0.14em] uppercase opacity-85 block">
              YOUR FINANCIAL WORKSPACE
            </span>
            <h2 className="font-display text-3xl sm:text-4xl leading-tight">
              Start in Guest Mode now, back up to Cloud whenever you choose
            </h2>
            <p className="text-sm sm:text-base opacity-90 leading-relaxed">
              Your local workspace creates a primary account and 21 default categories immediately — zero sign-up wall, zero tracking scripts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="px-7 py-3.5 rounded-full bg-[var(--home-card)] text-[var(--home-text)] font-semibold text-sm hover:opacity-95 transition-opacity"
              >
                Open Workspace →
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={continueAsGuest}
                  className="px-7 py-3.5 rounded-full bg-[var(--home-card)] text-[var(--home-text)] font-semibold text-sm hover:opacity-95 transition-opacity cursor-pointer"
                >
                  Continue as Guest →
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
                  className="px-6 py-3.5 rounded-full border-2 border-white/60 text-white font-semibold text-sm hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Create Account
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

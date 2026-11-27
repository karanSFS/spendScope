"use client";

import React, { useState } from "react";
import {
  IoTrendingUp,
  IoDocumentText,
  IoWallet,
  IoLayers,
  IoMic,
  IoLockClosed,
} from "react-icons/io5";

const features = [
  {
    Icon: IoTrendingUp,
    title: "Track Income & Expenses",
    desc: "Fast calculator-keypad entry with Budget Mode and instant balance feedback.",
  },
  {
    Icon: IoDocumentText,
    title: "Visual Analytics & Exports",
    desc: "Category ring charts, 12-month bars, and instant CSV/PDF reports.",
  },
  {
    Icon: IoWallet,
    title: "Named Spend Buckets",
    desc: "Allocate funds for trips, projects, or sinking funds with drag-and-drop ordering.",
  },
  {
    Icon: IoLayers,
    title: "Multi-Account & Transfers",
    desc: "Track cash, bank, and card accounts separately with neutral account transfers.",
  },
  {
    Icon: IoMic,
    title: "On-Device Receipt OCR & Voice",
    desc: "Parse receipts locally in your browser or dictate entries hands-free.",
  },
  {
    Icon: IoLockClosed,
    title: "Private & App-Lock Ready",
    desc: "Optional device PIN + WebAuthn passkey lock, with private Row-Level Security sync.",
  },
];

const TOTAL_SAMPLE_EXPENSE = 12550;

const PIE_SEGMENTS = [
  { label: "Housing", pct: 38, amount: 4769, color: "var(--home-category-1)" },
  {
    label: "Dining Out",
    pct: 18,
    amount: 2259,
    color: "var(--home-category-2)",
  },
  {
    label: "Groceries",
    pct: 15,
    amount: 1883,
    color: "var(--home-category-3)",
  },
  {
    label: "Utilities",
    pct: 12,
    amount: 1506,
    color: "var(--home-category-4)",
  },
  { label: "Other", pct: 17, amount: 2133, color: "var(--home-category-5)" },
];

export default function FeaturesSection() {
  const [activeIdx, setActiveIdx] = useState(null);

  let cumulativeOffset = 0;
  const arcs = PIE_SEGMENTS.map((seg, idx) => {
    const arc = {
      ...seg,
      idx,
      dasharray: `${seg.pct} ${100 - seg.pct}`,
      offset: -cumulativeOffset,
    };
    cumulativeOffset += seg.pct;
    return arc;
  });

  const activeSeg = activeIdx !== null ? PIE_SEGMENTS[activeIdx] : null;
  const formatInr = (num) =>
    `₹${Number(num).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;

  return (
    <section
      id="features"
      className="scroll-mt-20 py-16 md:py-22 bg-[var(--home-card)] border-t border-[var(--home-border)]"
    >
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* LEFT — Interactive Donut Card */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="rounded-[28px] p-6 sm:p-8 border border-[var(--home-border)] bg-[var(--home-background)] max-w-[430px] w-full shadow-2xs">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <span className="text-xs font-semibold text-[var(--home-text-muted)] block mb-0.5">
                    {activeSeg ? activeSeg.label : "This Month Total Expense"}
                  </span>
                  <p className="font-mono-num text-3xl font-bold text-[var(--home-text)]">
                    {activeSeg
                      ? formatInr(activeSeg.amount)
                      : formatInr(TOTAL_SAMPLE_EXPENSE)}
                  </p>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[var(--home-card)] border border-[var(--home-border)] text-[var(--home-accent)]">
                  {activeSeg ? `${activeSeg.pct}% share` : "Interactive"}
                </span>
              </div>

              <div className="flex flex-col xs:flex-row items-center gap-6">
                <div className="w-[144px] h-[144px] relative shrink-0">
                  <svg
                    viewBox="0 0 36 36"
                    className="w-full h-full"
                    style={{ transform: "rotate(-90deg)" }}
                  >
                    {arcs.map((arc) => {
                      const isDimmed =
                        activeIdx !== null && activeIdx !== arc.idx;
                      return (
                        <circle
                          key={arc.label}
                          cx="18"
                          cy="18"
                          r="15.9155"
                          fill="none"
                          stroke={arc.color}
                          strokeWidth={activeIdx === arc.idx ? "5.2" : "4.4"}
                          strokeDasharray={arc.dasharray}
                          strokeDashoffset={arc.offset}
                          opacity={isDimmed ? 0.35 : 1}
                          onMouseEnter={() => setActiveIdx(arc.idx)}
                          onMouseLeave={() => setActiveIdx(null)}
                          onClick={() =>
                            setActiveIdx((cur) =>
                              cur === arc.idx ? null : arc.idx,
                            )
                          }
                          className="cursor-pointer transition-all duration-200"
                        />
                      );
                    })}
                  </svg>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--home-text-muted)] truncate max-w-[78px]">
                      {activeSeg ? activeSeg.label : "Total"}
                    </span>
                    <span className="font-mono-num text-sm font-bold text-[var(--home-text)]">
                      {activeSeg ? `${activeSeg.pct}%` : "100%"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 flex-1 w-full">
                  {PIE_SEGMENTS.map((seg, idx) => {
                    const isFocused = activeIdx === idx;
                    return (
                      <button
                        key={seg.label}
                        type="button"
                        onMouseEnter={() => setActiveIdx(idx)}
                        onMouseLeave={() => setActiveIdx(null)}
                        onClick={() =>
                          setActiveIdx((cur) => (cur === idx ? null : idx))
                        }
                        className={`w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
                          isFocused
                            ? "bg-[var(--home-card)] border border-[var(--home-accent)]/50"
                            : "border border-transparent hover:bg-[var(--home-card)]/70"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: seg.color }}
                          />
                          <span className="text-[var(--home-text-secondary)] font-medium">
                            {seg.label}
                          </span>
                        </div>
                        <span className="font-mono-num font-bold text-[var(--home-text)]">
                          {seg.pct}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 p-3.5 rounded-2xl border border-[var(--home-border)] bg-[var(--home-card)]">
                <h4 className="text-xs font-bold mb-1 text-[var(--home-text)]">
                  SpendScope Insight
                </h4>
                <p className="text-xs leading-relaxed text-[var(--home-text-secondary)]">
                  Transfers between your own accounts stay neutral so your true
                  spending and income remain accurate.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT — Structured Bento Feature Cards */}
          <div className="lg:col-span-7">
            <span className="text-xs font-bold tracking-[0.14em] uppercase block mb-2.5 text-[var(--home-accent)]">
              POWERFUL FEATURES
            </span>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight leading-snug mb-3 text-[var(--home-text)]">
              Everything You Need
              <br />
              for Calm Money Clarity
            </h2>
            <p className="text-sm sm:text-base leading-relaxed mb-7 max-w-lg text-[var(--home-text-secondary)]">
              Designed for speed and quiet focus on desktop, tablet, and phone
              screens alike.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {features.map((feat) => (
                <div
                  key={feat.title}
                  className="rounded-2xl border border-[var(--home-border)] bg-[var(--home-background)]/80 hover:border-[var(--home-accent)]/60 hover:-translate-y-0.5 transition-all duration-200 p-4 flex items-start gap-3.5"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[var(--home-card)] border border-[var(--home-border)] text-[var(--home-accent)]">
                    <feat.Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold mb-1 text-[var(--home-text)]">
                      {feat.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-[var(--home-text-secondary)]">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

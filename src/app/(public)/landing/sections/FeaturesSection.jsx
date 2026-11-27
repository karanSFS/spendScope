"use client";

import React from "react";
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

export default function FeaturesSection() {
  const pieSegments = [
    { label: "Housing", pct: 38, color: "var(--home-category-1)" },
    { label: "Dining Out", pct: 18, color: "var(--home-category-2)" },
    { label: "Groceries", pct: 15, color: "var(--home-category-3)" },
    { label: "Utilities", pct: 12, color: "var(--home-category-4)" },
    { label: "Other", pct: 17, color: "var(--home-category-5)" },
  ];

  let cumulativeOffset = 0;
  const arcs = pieSegments.map((seg) => {
    const arc = {
      ...seg,
      dasharray: `${seg.pct} ${100 - seg.pct}`,
      offset: -cumulativeOffset,
    };
    cumulativeOffset += seg.pct;
    return arc;
  });

  return (
    <section
      id="features"
      className="scroll-mt-20 py-10 md:py-14 bg-[var(--home-card)] border-t border-[var(--home-border)]"
    >
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* LEFT — Donut Card */}
          <div className="flex justify-center">
            <div className="rounded-[26px] p-6 sm:p-8 border border-[var(--home-border)] bg-[var(--home-background)] max-w-[410px] w-full">
              <div className="mb-5">
                <span className="text-xs font-semibold text-[var(--home-text-muted)] block mb-0.5">
                  This Month Total Expense
                </span>
                <p className="font-mono-num text-3xl font-bold text-[var(--home-text)]">
                  ₹12,550.00
                </p>
              </div>

              <div className="flex flex-col xs:flex-row items-center gap-6">
                <div className="w-[132px] h-[132px] relative shrink-0">
                  <svg
                    viewBox="0 0 36 36"
                    className="w-full h-full"
                    style={{ transform: "rotate(-90deg)" }}
                  >
                    {arcs.map((arc) => (
                      <circle
                        key={arc.label}
                        cx="18"
                        cy="18"
                        r="15.9155"
                        fill="none"
                        stroke={arc.color}
                        strokeWidth="4.5"
                        strokeDasharray={arc.dasharray}
                        strokeDashoffset={arc.offset}
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-[66px] h-[66px] rounded-full bg-[var(--home-background)]" />
                  </div>
                </div>

                <div className="space-y-2.5 flex-1 w-full">
                  {pieSegments.map((seg) => (
                    <div
                      key={seg.label}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: seg.color }}
                        />
                        <span className="text-[var(--home-text-secondary)]">
                          {seg.label}
                        </span>
                      </div>
                      <span className="font-mono-num font-bold text-[var(--home-text)]">
                        {seg.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 p-3.5 rounded-2xl border border-[var(--home-border)] bg-[var(--home-card)]">
                <h4 className="text-xs font-bold mb-1 text-[var(--home-text)]">
                  SpendScope Insight
                </h4>
                <p className="text-xs leading-relaxed text-[var(--home-text-secondary)]">
                  Transfers between your own accounts stay neutral so your true spending and income remain accurate.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT — Feature List */}
          <div>
            <span className="text-xs font-bold tracking-[0.14em] uppercase block mb-2 text-[var(--home-accent)]">
              POWERFUL FEATURES
            </span>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight leading-snug mb-4 text-[var(--home-text)]">
              Everything You Need
              <br />
              for Calm Money Clarity
            </h2>
            <p className="text-sm sm:text-base leading-relaxed mb-7 max-w-md text-[var(--home-text-secondary)]">
              Designed for speed and quiet focus on desktop, tablet, and phone screens alike.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              {features.map((feat) => (
                <div key={feat.title} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[var(--home-background)] border border-[var(--home-border)] text-[var(--home-accent)]">
                    <feat.Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold mb-0.5 text-[var(--home-text)]">
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

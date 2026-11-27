"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  HiCalculator,
  HiArrowTrendingUp,
  HiBuildingLibrary,
  HiReceiptPercent,
  HiSquares2X2,
  HiArrowRight,
  HiSparkles,
} from "react-icons/hi2";
import {
  BsCalculatorFill,
  BsPiggyBankFill,
  BsFileCheckFill,
  BsCashStack,
  BsReceipt,
  BsArrowRepeat,
  BsBarChartLineFill,
  BsCurrencyExchange,
  BsSafe2Fill,
  BsGraphUpArrow,
  BsTranslate,
  BsCheckCircleFill,
} from "react-icons/bs";

export default function CalculatorsSection() {
  const [activeFilter, setActiveFilter] = useState("all");

  const allCalculators = [
    {
      id: "sip-calculator",
      title: "SIP Calculator",
      category: "sip",
      categoryName: "Investments",
      badge: "High Growth",
      icon: <BsBarChartLineFill className="w-5 h-5" />,
      desc: "Simulate systematic investments with monthly compounding & long-term wealth returns.",
      link: "/calculators?type=sip-calculator&category=sip",
      popular: true,
    },
    {
      id: "step-up-sip",
      title: "Step-Up SIP",
      category: "sip",
      categoryName: "Investments",
      badge: "Wealth Booster",
      icon: <BsGraphUpArrow className="w-5 h-5" />,
      desc: "Boost your SIP annually with salary increments to build exponential corpus.",
      link: "/calculators?type=step-up-sip&category=sip",
      popular: true,
    },
    {
      id: "emi-calculator",
      title: "EMI Calculator",
      category: "emi",
      categoryName: "Loans",
      badge: "Essential",
      icon: <BsCalculatorFill className="w-5 h-5" />,
      desc: "Plan home, car & personal loan monthly EMIs with principal-interest breakdown.",
      link: "/calculators?type=emi-calculator&category=emi",
      popular: true,
    },
    {
      id: "compare-loans",
      title: "Compare Loans",
      category: "emi",
      categoryName: "Loans",
      badge: "Smart Compare",
      icon: <BsFileCheckFill className="w-5 h-5" />,
      desc: "Put two loan offers side-by-side to find the lowest interest outflow & tenure.",
      link: "/calculators?type=compare-loans&category=emi",
      popular: false,
    },
    {
      id: "fd-calculator",
      title: "FD Calculator",
      category: "banking",
      categoryName: "Banking",
      badge: "Guaranteed",
      icon: <BsPiggyBankFill className="w-5 h-5" />,
      desc: "Compute quarterly compound interest & final maturity on Fixed Bank Deposits.",
      link: "/calculators?type=fd-calculator&category=banking",
      popular: true,
    },
    {
      id: "ppf-calculator",
      title: "PPF Calculator",
      category: "banking",
      categoryName: "Banking",
      badge: "Tax-Free EEE",
      icon: <BsSafe2Fill className="w-5 h-5" />,
      desc: "Calculate 15-year Public Provident Fund interest & guaranteed maturity.",
      link: "/calculators?type=ppf-calculator&category=banking",
      popular: false,
    },
    {
      id: "gst-calculator",
      title: "GST Calculator",
      category: "tax",
      categoryName: "Tax & Tools",
      badge: "Quick Math",
      icon: <BsReceipt className="w-5 h-5" />,
      desc: "Calculate inclusive and exclusive Goods & Services Tax for any tax slab.",
      link: "/calculators?type=gst-calculator&category=gst-vat",
      popular: true,
    },
    {
      id: "currency-converter",
      title: "Currency Converter",
      category: "tax",
      categoryName: "Tax & Tools",
      badge: "Global FX",
      icon: <BsCurrencyExchange className="w-5 h-5" />,
      desc: "Offline-friendly conversions across major world currencies with active rates.",
      link: "/calculators?type=currency-converter&category=other",
      popular: false,
    },
    {
      id: "amount-to-word",
      title: "Amount to Words",
      category: "tax",
      categoryName: "Tax & Tools",
      badge: "Cheque Ready",
      icon: <BsTranslate className="w-5 h-5" />,
      desc: "Convert numbers into clean words for cheques, invoices, and vouchers.",
      link: "/calculators?type=amount-to-word&category=other",
      popular: false,
    },
    {
      id: "cash-note-counter",
      title: "Cash Note Counter",
      category: "tax",
      categoryName: "Tax & Tools",
      badge: "Daily Cash",
      icon: <BsCashStack className="w-5 h-5" />,
      desc: "Tally daily currency denominations with automatic total balance.",
      link: "/calculators?type=cash-note-counter&category=other",
      popular: false,
    },
    {
      id: "rd-calculator",
      title: "RD Calculator",
      category: "banking",
      categoryName: "Banking",
      badge: "Savings",
      icon: <BsArrowRepeat className="w-5 h-5" />,
      desc: "Calculate cumulative returns on recurring monthly deposits at fixed rates.",
      link: "/calculators?type=rd-calculator&category=banking",
      popular: false,
    },
    {
      id: "swp-calculator",
      title: "SWP Calculator",
      category: "sip",
      categoryName: "Investments",
      badge: "Pension Plan",
      icon: <BsCashStack className="w-5 h-5" />,
      desc: "Plan regular monthly cash withdrawals from mutual fund investments.",
      link: "/calculators?type=swp-calculator&category=sip",
      popular: false,
    },
  ];

  const filteredCalculators = useMemo(() => {
    if (activeFilter === "all") return allCalculators;
    if (activeFilter === "popular") return allCalculators.filter((c) => c.popular);
    return allCalculators.filter((c) => c.category === activeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  return (
    <section
      id="calculators"
      className="relative scroll-mt-20 py-12 md:py-16 bg-[var(--home-card)] border-y border-[var(--home-border)]"
    >
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 border border-[var(--home-border)] bg-[var(--home-background)] text-[var(--home-accent)]">
            <HiSparkles className="w-4 h-4" />
            <span>Financial Planning Suite</span>
          </div>

          <h2 className="font-display text-2xl xs:text-3xl sm:text-4xl tracking-tight text-[var(--home-text)] mb-3">
            Calculate &amp; Plan With{" "}
            <span className="text-[var(--home-accent)]">
              24 Precision Calculators
            </span>
          </h2>

          <p className="text-sm sm:text-base text-[var(--home-text-secondary)]">
            Model SIPs, compare loan offers, check affordability &amp; interest saved, and convert currencies — no account required.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { id: "all", label: "Featured", icon: HiSquares2X2 },
            { id: "popular", label: "Top Picks", icon: HiSparkles },
            { id: "sip", label: "Investments", icon: HiArrowTrendingUp },
            { id: "emi", label: "Loans & EMI", icon: HiCalculator },
            { id: "banking", label: "Banking", icon: HiBuildingLibrary },
            { id: "tax", label: "Tax & Utilities", icon: HiReceiptPercent },
          ].map((filter) => {
            const isSelected = activeFilter === filter.id;
            const IconComponent = filter.icon;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-[var(--home-accent)] text-[var(--home-on-accent)] border-[var(--home-accent)]"
                    : "bg-[var(--home-background)] text-[var(--home-text-secondary)] border-[var(--home-border)] hover:text-[var(--home-text)]"
                }`}
              >
                <IconComponent className="w-3.5 h-3.5" />
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCalculators.map((calc) => (
            <Link
              key={calc.id}
              href={calc.link}
              className="group rounded-[22px] p-5 border border-[var(--home-border)] bg-[var(--home-background)] hover:border-[var(--home-accent)] transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--home-card)] border border-[var(--home-border)] text-[var(--home-accent)]">
                    {calc.icon}
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--home-track)] text-[var(--home-text-secondary)]">
                    {calc.badge}
                  </span>
                </div>

                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--home-accent)] block mb-0.5">
                  {calc.categoryName}
                </span>
                <h3 className="text-base font-bold text-[var(--home-text)] mb-1.5">
                  {calc.title}
                </h3>
                <p className="text-xs leading-relaxed text-[var(--home-text-secondary)] line-clamp-2">
                  {calc.desc}
                </p>
              </div>

              <div className="pt-3.5 mt-4 border-t border-[var(--home-border)] flex items-center justify-between text-xs font-semibold">
                <span className="text-[var(--home-text-muted)] text-[11px]">
                  Open calculator
                </span>
                <span className="inline-flex items-center gap-1 text-[var(--home-accent)] group-hover:translate-x-0.5 transition-transform">
                  <span>Launch</span>
                  <HiArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="rounded-[22px] p-6 border border-[var(--home-border)] bg-[var(--home-background)] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--home-income)]">
              <BsCheckCircleFill className="w-3.5 h-3.5" />
              <span>All 24 Financial Calculators Ready</span>
            </div>
            <h4 className="font-display text-xl text-[var(--home-text)]">
              Includes Loan Eligibility, Moratorium, Interest Saved &amp; Loan Profiles
            </h4>
          </div>
          <Link
            href="/calculators"
            className="px-6 py-3 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] font-semibold text-sm inline-flex items-center gap-2 shrink-0 hover:opacity-95 transition-opacity"
          >
            <span>Browse All 24 Calculators</span>
            <HiArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

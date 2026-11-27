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

const CATEGORY_ICON_STYLES = {
  sip: "bg-[var(--home-income-soft)] text-[var(--home-income)] border-[var(--home-income)]/20",
  emi: "bg-[var(--add-operator-key-bg)] text-[var(--home-accent)] border-[var(--home-accent)]/20",
  banking:
    "bg-[var(--home-track)] text-[var(--home-text)] border-[var(--home-border)]",
  tax: "bg-[var(--home-card)] text-[var(--home-expense)] border-[var(--home-border)]",
};

function formatInrCompact(val) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(val));
}

export default function CalculatorsSection() {
  const [activeFilter, setActiveFilter] = useState("all");

  // Compact live EMI preview state
  const [loanAmount, setLoanAmount] = useState(2500000);
  const [annualRate, setAnnualRate] = useState(8.5);
  const [tenureYears, setTenureYears] = useState(15);

  const liveEmiPreview = useMemo(() => {
    const r = annualRate / 12 / 100;
    const n = tenureYears * 12;
    if (r <= 0 || n <= 0) {
      return { emi: loanAmount / Math.max(1, n), totalInterest: 0 };
    }
    const pow = Math.pow(1 + r, n);
    const emi = (loanAmount * r * pow) / (pow - 1);
    const totalPayment = emi * n;
    return {
      emi,
      totalInterest: Math.max(0, totalPayment - loanAmount),
    };
  }, [loanAmount, annualRate, tenureYears]);

  const allCalculators = [
    {
      id: "sip-calculator",
      title: "SIP Calculator",
      category: "sip",
      categoryName: "Investments",
      badge: "High Growth",
      hint: "Monthly compounding",
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
      hint: "Annual % step-up",
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
      hint: "Amortization schedule",
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
      hint: "Side-by-side offers",
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
      hint: "Quarterly compounding",
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
      hint: "15-yr compounding",
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
      hint: "Add / Remove GST",
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
      hint: "32 live currencies",
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
      hint: "30+ country formats",
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
      hint: "Denomination tally",
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
      hint: "Recurring deposits",
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
      hint: "Depletion check",
      icon: <BsCashStack className="w-5 h-5" />,
      desc: "Plan regular monthly withdrawals from investments with remaining balance projections.",
      link: "/calculators?type=swp-calculator&category=sip",
      popular: false,
    },
  ];

  const filteredCalculators = useMemo(() => {
    if (activeFilter === "all") return allCalculators.slice(0, 8);
    if (activeFilter === "popular")
      return allCalculators.filter((c) => c.popular);
    return allCalculators.filter((c) => c.category === activeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  return (
    <section
      id="calculators"
      className="relative scroll-mt-20 py-16 md:py-22 bg-[var(--home-card)] border-y border-[var(--home-border)]"
    >
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 border border-[var(--home-border)] bg-[var(--home-background)] text-[var(--home-accent)]">
            <HiSparkles className="w-4 h-4" />
            <span>Financial Planning Suite</span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-[var(--home-text)] mb-3">
            Calculate &amp; Plan With{" "}
            <span className="text-[var(--home-accent)]">
              24 Precision Calculators
            </span>
          </h2>

          <p className="text-sm sm:text-base text-[var(--home-text-secondary)]">
            Model SIPs, compare loan offers, check affordability &amp; interest
            saved, and convert currencies — no account required.
          </p>
        </div>

        {/* Compact Live EMI Slider Preview */}
        <div className="rounded-[24px] p-5 sm:p-6 border border-[var(--home-border)] bg-[var(--home-background)] shadow-2xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--home-accent)]">
                  Live EMI Preview
                </span>
                <span className="text-xs text-[var(--home-text-muted)]">
                  Drag to estimate instantly
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <label
                      htmlFor="landing-emi-amount"
                      className="font-semibold text-[var(--home-text-secondary)]"
                    >
                      Loan Amount
                    </label>
                    <span className="font-mono-num font-bold text-[var(--home-text)]">
                      {formatInrCompact(loanAmount)}
                    </span>
                  </div>
                  <input
                    id="landing-emi-amount"
                    type="range"
                    min={100000}
                    max={10000000}
                    step={100000}
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    className="w-full accent-[var(--home-accent)] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <label
                      htmlFor="landing-emi-rate"
                      className="font-semibold text-[var(--home-text-secondary)]"
                    >
                      Interest Rate
                    </label>
                    <span className="font-mono-num font-bold text-[var(--home-text)]">
                      {annualRate.toFixed(1)}%
                    </span>
                  </div>
                  <input
                    id="landing-emi-rate"
                    type="range"
                    min={6}
                    max={16}
                    step={0.25}
                    value={annualRate}
                    onChange={(e) => setAnnualRate(Number(e.target.value))}
                    className="w-full accent-[var(--home-accent)] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <label
                      htmlFor="landing-emi-tenure"
                      className="font-semibold text-[var(--home-text-secondary)]"
                    >
                      Tenure
                    </label>
                    <span className="font-mono-num font-bold text-[var(--home-text)]">
                      {tenureYears} yrs
                    </span>
                  </div>
                  <input
                    id="landing-emi-tenure"
                    type="range"
                    min={1}
                    max={30}
                    step={1}
                    value={tenureYears}
                    onChange={(e) => setTenureYears(Number(e.target.value))}
                    className="w-full accent-[var(--home-accent)] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 rounded-2xl border border-[var(--home-border)] bg-[var(--home-card)] p-4 flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center lg:items-start xl:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--home-text-muted)] block">
                  Estimated Monthly EMI
                </span>
                <p className="font-mono-num text-2xl sm:text-3xl font-bold text-[var(--home-text)]">
                  {formatInrCompact(liveEmiPreview.emi)}
                  <span className="text-xs font-sans font-medium text-[var(--home-text-muted)]">
                    /mo
                  </span>
                </p>
                <p className="text-xs text-[var(--home-text-secondary)]">
                  Total interest:{" "}
                  <span className="font-mono-num font-semibold text-[var(--home-expense)]">
                    {formatInrCompact(liveEmiPreview.totalInterest)}
                  </span>
                </p>
              </div>
              <Link
                href="/calculators?type=emi-calculator&category=emi"
                className="px-4 py-2.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 hover:opacity-95 transition-opacity"
              >
                <span>Open Full EMI</span>
                <HiArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
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
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-[var(--home-accent)] text-[var(--home-on-accent)] border-[var(--home-accent)] shadow-xs"
                    : "bg-[var(--home-background)] text-[var(--home-text-secondary)] border-[var(--home-border)] hover:text-[var(--home-text)] hover:border-[var(--home-accent)]/50"
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
              className="group rounded-[22px] p-5 border border-[var(--home-border)] bg-[var(--home-background)] hover:border-[var(--home-accent)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                      CATEGORY_ICON_STYLES[calc.category] ||
                      CATEGORY_ICON_STYLES.tax
                    }`}
                  >
                    {calc.icon}
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--home-track)] text-[var(--home-text-secondary)]">
                    {calc.badge}
                  </span>
                </div>

                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--home-accent)] block mb-0.5">
                  {calc.categoryName}
                </span>
                <h3 className="text-base font-bold text-[var(--home-text)] mb-1.5 group-hover:text-[var(--home-accent)] transition-colors">
                  {calc.title}
                </h3>
                <p className="text-xs leading-relaxed text-[var(--home-text-secondary)] line-clamp-2">
                  {calc.desc}
                </p>
              </div>

              <div className="pt-3.5 mt-4 border-t border-[var(--home-border)] flex items-center justify-between text-xs font-semibold">
                <span className="text-[var(--home-text-muted)] text-[11px]">
                  {calc.hint}
                </span>
                <span className="inline-flex items-center gap-1 text-[var(--home-accent)] group-hover:translate-x-0.5 transition-transform">
                  <span>Launch</span>
                  <HiArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="rounded-[24px] p-6 border border-[var(--home-border)] bg-[var(--home-background)] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--home-income)]">
              <BsCheckCircleFill className="w-3.5 h-3.5" />
              <span>All 24 Financial Calculators Ready</span>
            </div>
            <h4 className="font-display text-xl text-[var(--home-text)]">
              Includes Loan Eligibility, Moratorium, Interest Saved &amp; Loan
              Profiles
            </h4>
          </div>
          <Link
            href="/calculators"
            className="px-6 py-3 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] font-semibold text-sm inline-flex items-center gap-2 shrink-0 hover:opacity-95 hover:-translate-y-0.5 transition-all shadow-sm"
          >
            <span>Browse All 24 Calculators</span>
            <HiArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import {
  HiMagnifyingGlass,
  HiXMark,
  HiBuildingLibrary,
  HiArrowTrendingUp,
  HiReceiptPercent,
  HiCurrencyDollar,
  HiSquares2X2,
  HiCalculator,
  HiChevronRight,
  HiBriefcase,
  HiArrowsRightLeft,
  HiPauseCircle,
  HiCheckBadge,
  HiBanknotes,
  HiLanguage,
  HiTag,
  HiGlobeAlt,
  HiClock,
  HiCreditCard,
  HiScale,
  HiSparkles,
  HiPercentBadge,
  HiPresentationChartLine,
} from "react-icons/hi2";
import { useAccounts } from "@/hooks/useAccounts";
import { getCurrencySymbol } from "@/utils/currencies";
import AppLoader from "@/components/shared/AppLoader";

function CalcToolSkeleton() {
  return <AppLoader variant="section" label="Opening calculator" />;
}

const dynamicCalc = (loader) =>
  dynamic(loader, { ssr: false, loading: () => <CalcToolSkeleton /> });

// EMI (4)
const EmiC = dynamicCalc(() => import("@/app/(private)/calculators-m/components/EmiC"));
const Qcalculator = dynamicCalc(() => import("@/app/(private)/calculators-m/components/Qcalculator"));
const EmiAdvance = dynamicCalc(() => import("@/app/(private)/calculators-m/components/EmiAdvance"));
const CompareLoan = dynamicCalc(() => import("@/app/(private)/calculators-m/components/CompareLoan"));

// Banking (5)
const FdCalculator = dynamicCalc(() => import("@/app/(private)/calculators-m/components/FdCalculator"));
const RdCalculator = dynamicCalc(() => import("@/app/(private)/calculators-m/components/RdCalculator"));
const PpfCalculator = dynamicCalc(() => import("@/app/(private)/calculators-m/components/PpfCalculator"));
const InterestCalculator = dynamicCalc(() => import("@/app/(private)/calculators-m/components/InterestCalculator"));
const InflationImpact = dynamicCalc(() => import("@/app/(private)/calculators-m/components/InflationImpact"));

// SIP (5)
const SipCalculator = dynamicCalc(() => import("@/app/(private)/calculators-m/components/SipCalculator"));
const SwpCalculator = dynamicCalc(() => import("@/app/(private)/calculators-m/components/SwpCalculator"));
const StpCalculator = dynamicCalc(() => import("@/app/(private)/calculators-m/components/StpCalculator"));
const StepUpSipCalculator = dynamicCalc(() => import("@/app/(private)/calculators-m/components/StepUpSipCalculator"));
const SipWithInflation = dynamicCalc(() => import("@/app/(private)/calculators-m/components/SipWithInflation"));

// GST & VAT (2)
const GstCalculator = dynamicCalc(() => import("@/app/(private)/calculators-m/components/GstCalculator"));
const VatCalculator = dynamicCalc(() => import("@/app/(private)/calculators-m/components/VatCalculator"));

// Loan (4 - v2 parity)
const LoanProfileCalculator = dynamicCalc(() => import("@/components/calculators/v2/LoanProfileCalculator"));
const PrePaymentRoiCalculator = dynamicCalc(() => import("@/components/calculators/v2/PrePaymentRoiCalculator"));
const MoratoriumCalculator = dynamicCalc(() => import("@/components/calculators/v2/MoratoriumCalculator"));
const LoanEligibleCalculator = dynamicCalc(() => import("@/components/calculators/v2/LoanEligibleCalculator"));

// Other (4)
const CashNoteCounter = dynamicCalc(() => import("@/app/(private)/calculators-m/components/CashNoteCounter"));
const AmountToWord = dynamicCalc(() => import("@/app/(private)/calculators-m/components/AmountToWord"));
const DiscountCalculator = dynamicCalc(() => import("@/app/(private)/calculators-m/components/DiscountCalculator"));
const CurrencyConverter = dynamicCalc(() => import("@/app/(private)/calculators-m/components/CurrencyConverter"));

export const CALCULATOR_CATEGORIES = [
  {
    id: "emi",
    category: "EMI",
    icon: HiCalculator,
    description: "Loan installment & amortization schedule calculators",
    items: [
      {
        id: "emi-calculator",
        title: "EMI Calculator",
        shortTitle: "EMI",
        icon: HiCalculator,
        description: "Monthly EMI, total interest & full amortization breakdown",
      },
      {
        id: "quick-calculator",
        title: "Quick Calculator",
        shortTitle: "Quick Calc",
        icon: HiClock,
        description: "Solve for EMI, Amount, Interest Rate, or Tenure instantly",
      },
      {
        id: "emi-in-advance",
        title: "EMI in Advance",
        shortTitle: "Advance EMI",
        icon: HiCreditCard,
        description: "Annuity-due EMI starting on day one",
      },
      {
        id: "compare-loans",
        title: "Compare Loans",
        shortTitle: "Compare",
        icon: HiScale,
        description: "Side-by-side Loan 1 vs Loan 2 cost comparison",
      },
    ],
  },
  {
    id: "banking",
    category: "Banking",
    icon: HiBuildingLibrary,
    description: "Deposits, savings, interest & inflation impact tools",
    items: [
      {
        id: "fd-calculator",
        title: "FD Calculator",
        shortTitle: "FD",
        icon: HiBuildingLibrary,
        description: "Fixed Deposit maturity, quarterly compounding & schedule",
      },
      {
        id: "rd-calculator",
        title: "RD Calculator",
        shortTitle: "RD",
        icon: HiArrowsRightLeft,
        description: "Recurring Deposit monthly installments & quarterly returns",
      },
      {
        id: "ppf-calculator",
        title: "PPF Calculator",
        shortTitle: "PPF",
        icon: HiCheckBadge,
        description: "Public Provident Fund annual compounding (15-50 yrs)",
      },
      {
        id: "interest-calculator",
        title: "Interest Calculator",
        shortTitle: "Interest",
        icon: HiPercentBadge,
        description: "Simple & compound interest breakdown over any duration",
      },
      {
        id: "inflation-impact",
        title: "Inflation Impact",
        shortTitle: "Inflation",
        icon: HiPresentationChartLine,
        description: "Future cost projection & purchasing power erosion",
      },
    ],
  },
  {
    id: "sip",
    category: "SIP",
    icon: HiArrowTrendingUp,
    description: "Systematic investment, withdrawal & inflation planners",
    items: [
      {
        id: "sip-calculator",
        title: "SIP Calculator",
        shortTitle: "SIP",
        icon: HiArrowTrendingUp,
        description: "Mutual fund SIP wealth growth & yearly breakdown",
      },
      {
        id: "swp-calculator",
        title: "SWP Calculator",
        shortTitle: "SWP",
        icon: HiBanknotes,
        description: "Systematic Withdrawal Plan sustainability & balance",
      },
      {
        id: "stp-calculator",
        title: "STP Calculator",
        shortTitle: "STP",
        icon: HiArrowsRightLeft,
        description: "Systematic Transfer Plan across source & target funds",
      },
      {
        id: "step-up-sip",
        title: "Step-Up SIP",
        shortTitle: "Step-Up",
        icon: HiSparkles,
        description: "SIP with annual percentage step-up increments",
      },
      {
        id: "sip-with-inflation",
        title: "SIP With Inflation",
        shortTitle: "SIP + Infl.",
        icon: HiPresentationChartLine,
        description: "Real inflation-adjusted mutual fund projections",
      },
    ],
  },
  {
    id: "gst-vat",
    category: "GST & VAT",
    icon: HiReceiptPercent,
    description: "Inclusive and exclusive tax breakdown tools",
    items: [
      {
        id: "gst-calculator",
        title: "GST Calculator",
        shortTitle: "GST",
        icon: HiReceiptPercent,
        description: "Add or remove GST with CGST & SGST 50/50 split",
      },
      {
        id: "vat-calculator",
        title: "VAT Calculator",
        shortTitle: "VAT",
        icon: HiReceiptPercent,
        description: "Add or remove VAT for invoices & goods",
      },
    ],
  },
  {
    id: "loan",
    category: "Loan",
    icon: HiCurrencyDollar,
    description: "Loan tracker, prepayment, moratorium & eligibility planners",
    items: [
      {
        id: "loan-profile",
        title: "Loan Profile",
        shortTitle: "Loan Profile",
        icon: HiBriefcase,
        description: "Save active loans, track paid EMIs & view amortization",
      },
      {
        id: "pre-payment-roi-change",
        title: "Pre Payment/ ROI Change",
        shortTitle: "Prepay / ROI",
        icon: HiArrowsRightLeft,
        description: "Measure EMI or tenure savings from prepayment & ROI cut",
      },
      {
        id: "moratorium-calculator",
        title: "Moratorium Calculator",
        shortTitle: "Moratorium",
        icon: HiPauseCircle,
        description: "Simulate payment holiday interest compounding impact",
      },
      {
        id: "loan-eligible-calculator",
        title: "Loan Eligible Calculator",
        shortTitle: "Eligibility",
        icon: HiCheckBadge,
        description: "Borrowing capacity based on income, FOIR & existing EMIs",
      },
    ],
  },
  {
    id: "other",
    category: "Other",
    icon: HiSquares2X2,
    description: "Cash notes, cheque words, discounts & FX converter",
    items: [
      {
        id: "cash-note-counter",
        title: "Cash Note Counter",
        shortTitle: "Cash Counter",
        icon: HiBanknotes,
        description: "Currency-aware denomination tally + total in words",
      },
      {
        id: "amount-to-word",
        title: "Amount To Word",
        shortTitle: "To Words",
        icon: HiLanguage,
        description: "Indian & International cheque word formatting",
      },
      {
        id: "discount-calculator",
        title: "Discount Calculator",
        shortTitle: "Discount",
        icon: HiTag,
        description: "Final payable price before or after sales tax",
      },
      {
        id: "currency-converter",
        title: "Currency Converter",
        shortTitle: "FX Convert",
        icon: HiGlobeAlt,
        description: "Live multi-currency FX conversion with offline rates",
      },
    ],
  },
];

export const ALL_CALCULATORS = CALCULATOR_CATEGORIES.flatMap((cat) =>
  cat.items.map((item) => ({
    ...item,
    categoryId: cat.id,
    categoryName: cat.category,
  })),
);

function renderTool(calculatorId, onBack) {
  switch (calculatorId) {
    case "emi-calculator":
      return <EmiC onBack={onBack} />;
    case "quick-calculator":
      return <Qcalculator onBack={onBack} />;
    case "emi-in-advance":
      return <EmiAdvance onBack={onBack} />;
    case "compare-loans":
      return <CompareLoan onBack={onBack} />;
    case "fd-calculator":
      return <FdCalculator onBack={onBack} />;
    case "rd-calculator":
      return <RdCalculator onBack={onBack} />;
    case "ppf-calculator":
      return <PpfCalculator onBack={onBack} />;
    case "interest-calculator":
      return <InterestCalculator onBack={onBack} />;
    case "inflation-impact":
      return <InflationImpact onBack={onBack} />;
    case "sip-calculator":
      return <SipCalculator onBack={onBack} />;
    case "swp-calculator":
      return <SwpCalculator onBack={onBack} />;
    case "stp-calculator":
      return <StpCalculator onBack={onBack} />;
    case "step-up-sip":
      return <StepUpSipCalculator onBack={onBack} />;
    case "sip-with-inflation":
      return <SipWithInflation onBack={onBack} />;
    case "gst-calculator":
      return <GstCalculator onBack={onBack} />;
    case "vat-calculator":
      return <VatCalculator onBack={onBack} />;
    case "loan-profile":
      return <LoanProfileCalculator onBack={onBack} />;
    case "pre-payment-roi-change":
      return <PrePaymentRoiCalculator onBack={onBack} />;
    case "moratorium-calculator":
      return <MoratoriumCalculator onBack={onBack} />;
    case "loan-eligible-calculator":
      return <LoanEligibleCalculator onBack={onBack} />;
    case "cash-note-counter":
      return <CashNoteCounter onBack={onBack} />;
    case "amount-to-word":
      return <AmountToWord onBack={onBack} />;
    case "discount-calculator":
      return <DiscountCalculator onBack={onBack} />;
    case "currency-converter":
      return <CurrencyConverter onBack={onBack} />;
    default:
      return <EmiC onBack={onBack} />;
  }
}

function CalculatorHubContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { accounts, activeAccount, switchAccount } = useAccounts();

  const typeParam = searchParams.get("type");
  const categoryParam = searchParams.get("category");

  const [activeCategoryId, setActiveCategoryId] = useState("emi");
  const [activeCalculatorId, setActiveCalculatorId] = useState("emi-calculator");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileShowTool, setMobileShowTool] = useState(Boolean(typeParam));
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileViewport(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (typeParam) {
      const found = ALL_CALCULATORS.find((c) => c.id === typeParam);
      if (found) {
        setActiveCategoryId(found.categoryId);
        setActiveCalculatorId(found.id);
        setMobileShowTool(true);
        return;
      }
    }
    if (categoryParam) {
      const cat = CALCULATOR_CATEGORIES.find((c) => c.id === categoryParam);
      if (cat) {
        setActiveCategoryId(cat.id);
        setActiveCalculatorId(cat.items[0]?.id || "emi-calculator");
      }
    }
    if (!typeParam) {
      setMobileShowTool(false);
    }
  }, [typeParam, categoryParam]);

  const activeCategory = useMemo(
    () =>
      CALCULATOR_CATEGORIES.find((c) => c.id === activeCategoryId) ||
      CALCULATOR_CATEGORIES[0],
    [activeCategoryId],
  );

  const navigateToTool = (calcId, catId) => {
    setActiveCategoryId(catId);
    setActiveCalculatorId(calcId);
    setMobileShowTool(true);
    setSearchQuery("");
    router.replace(`/calculators?type=${calcId}&category=${catId}`, {
      scroll: false,
    });
  };

  const handleCategorySelect = (catId) => {
    const cat = CALCULATOR_CATEGORIES.find((c) => c.id === catId);
    if (!cat || cat.items.length === 0) return;
    navigateToTool(cat.items[0].id, cat.id);
  };

  const handleBackToMobileGrid = () => {
    setMobileShowTool(false);
    router.replace("/calculators", { scroll: false });
  };

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return ALL_CALCULATORS.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.categoryName.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const filteredMobileCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return CALCULATOR_CATEGORIES;
    return CALCULATOR_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          cat.category.toLowerCase().includes(q),
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [searchQuery]);

  const activeCurrencyCode = activeAccount?.currency_code || "INR";
  const activeSymbol = getCurrencySymbol(activeCurrencyCode);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 pb-12">
      {/* Top Editorial Hub Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[var(--home-border)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-[var(--home-text)]">
              Financial Calculators
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)]">
              {ALL_CALCULATORS.length} Tools
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--home-text-secondary)]">
            Every EMI, banking, SIP, tax, loan tracker, and currency tool in one workspace.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Active Account Currency Pill / Switcher */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-[var(--home-border)] bg-[var(--home-card)]">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--home-text-muted)]">
              Currency
            </span>
            {accounts.length > 1 ? (
              <select
                aria-label="Active account currency"
                data-testid="calculator-account-switcher"
                value={activeAccount?.id || ""}
                onChange={(e) => switchAccount(e.target.value)}
                className="text-xs font-bold text-[var(--home-text)] bg-transparent outline-none cursor-pointer"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency_code || "INR"})
                  </option>
                ))}
              </select>
            ) : (
              <span
                data-testid="calculator-currency-badge"
                className="text-xs font-bold text-[var(--home-accent)] font-mono-num"
              >
                {activeCurrencyCode} ({activeSymbol})
              </span>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <HiMagnifyingGlass className="w-4 h-4 text-[var(--home-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search calculators..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-2xl border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text)] placeholder-[var(--home-text-muted)] outline-none focus:border-[var(--home-accent)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--home-text-muted)] hover:text-[var(--home-text)] cursor-pointer"
              >
                <HiXMark className="w-4 h-4" />
              </button>
            )}

            {/* Desktop Dropdown Search */}
            {searchQuery && (
              <div className="hidden md:block absolute left-0 right-0 top-full mt-1.5 p-2 rounded-2xl border border-[var(--home-border)] bg-[var(--home-card)] shadow-xl z-40 max-h-72 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <p className="text-center py-4 text-xs text-[var(--home-text-muted)]">
                    No calculators match &ldquo;{searchQuery}&rdquo;
                  </p>
                ) : (
                  <div className="space-y-1">
                    {searchResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigateToTool(item.id, item.categoryId)}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-[var(--home-track)] flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--home-text)] truncate">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-[var(--home-text-muted)] truncate">
                            {item.description}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] shrink-0">
                          {item.categoryName}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE (< md): Tile Launcher Grid when no tool is opened */}
      {!mobileShowTool && (
        <div className="md:hidden space-y-6">
          {filteredMobileCategories.length === 0 ? (
            <div className="rounded-3xl border border-[var(--home-border)] bg-[var(--home-card)] p-8 text-center">
              <p className="text-sm font-medium text-[var(--home-text-muted)]">
                No calculators found for &ldquo;{searchQuery}&rdquo;
              </p>
            </div>
          ) : (
            filteredMobileCategories.map((cat) => (
              <section key={cat.id} className="space-y-2.5">
                <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--home-text-muted)] px-1">
                  {cat.category}
                </h2>
                <div className="grid grid-cols-3 gap-2.5">
                  {cat.items.map((item) => {
                    const ToolIcon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigateToTool(item.id, cat.id)}
                        className="rounded-2xl border border-[var(--home-border)] bg-[var(--home-card)] p-3 flex flex-col items-center justify-center text-center gap-2 hover:border-[var(--home-accent)] active:scale-[0.98] transition-all cursor-pointer min-h-[104px]"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[var(--home-track)] text-[var(--home-accent)] flex items-center justify-center">
                          <ToolIcon className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold leading-tight text-[var(--home-text)] line-clamp-2">
                          {item.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      )}

      {/* UNIFIED WORKSPACE (Single Calculator Mount Across All Breakpoints) */}
      <div
        className={
          mobileShowTool
            ? "grid grid-cols-1 md:grid-cols-12 gap-5 items-start"
            : "hidden md:grid md:grid-cols-12 gap-5 items-start"
        }
      >
        <aside className="hidden md:block md:col-span-3">
          <div className="rounded-3xl border border-[var(--home-border)] bg-[var(--home-card)] p-3 space-y-1.5">
            <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--home-text-muted)]">
              Categories
            </p>
            <nav className="space-y-1">
              {CALCULATOR_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                      isActive
                        ? "bg-[var(--home-accent)] text-[var(--home-on-accent)] shadow-xs"
                        : "text-[var(--home-text-secondary)] hover:bg-[var(--home-track)] hover:text-[var(--home-text)]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{cat.category}</span>
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <span
                        className={`text-[10px] font-mono-num px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? "bg-white/20 text-[var(--home-on-accent)]"
                            : "bg-[var(--home-track)] text-[var(--home-text-muted)]"
                        }`}
                      >
                        {cat.items.length}
                      </span>
                      <HiChevronRight className="w-3.5 h-3.5 opacity-75" />
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="md:col-span-9 space-y-4">
          {/* Desktop Sub-Category Tabs */}
          <div className="hidden md:block rounded-3xl border border-[var(--home-border)] bg-[var(--home-card)] p-1.5">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {activeCategory.items.map((item) => {
                const isSelected = activeCalculatorId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateToTool(item.id, activeCategory.id)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[var(--home-accent)] text-[var(--home-on-accent)] shadow-xs"
                        : "text-[var(--home-text-secondary)] hover:bg-[var(--home-track)] hover:text-[var(--home-text)]"
                    }`}
                  >
                    {item.title}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-w-3xl">
            {renderTool(
              activeCalculatorId,
              isMobileViewport ? handleBackToMobileGrid : undefined,
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function CalculatorsPage() {
  return (
    <Suspense
      fallback={<AppLoader variant="section" label="Loading calculators" />}
    >
      <CalculatorHubContent />
    </Suspense>
  );
}

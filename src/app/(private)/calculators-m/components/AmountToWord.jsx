"use client";

import React, { useState, useMemo } from "react";
import { HiOutlineClipboardDocument, HiMagnifyingGlass } from "react-icons/hi2";
import {
  useCalcCurrency,
  useShareCalc,
  CalcHeader,
  CalcCard,
  ShareIconButton,
  CalcToast,
  sanitizeDecimal,
} from "@/components/calculators/v2/CalculatorShell";
import {
  COUNTRIES_REGISTRY,
  findCountryByCurrencyCode,
  convertAmountToWords,
} from "@/lib/calculatorEngine";

export default function AmountToWord({ onBack }) {
  const { currencyCode } = useCalcCurrency();
  const { toast, notify, shareText } = useShareCalc();

  const defaultCountry = useMemo(
    () => findCountryByCurrencyCode(currencyCode),
    [currencyCode],
  );

  const [amount, setAmount] = useState("125000");
  const [selectedCountryId, setSelectedCountryId] = useState("active"); // "active" | "all" | country.id
  const [withOnlySuffix, setWithOnlySuffix] = useState(true);
  const [chequeUppercase, setChequeUppercase] = useState(false);
  const [filterText, setFilterText] = useState("");

  const activeCountry = useMemo(() => {
    if (selectedCountryId === "active") return defaultCountry;
    if (selectedCountryId === "all") return null;
    return (
      COUNTRIES_REGISTRY.find((c) => c.id === selectedCountryId) ||
      defaultCountry
    );
  }, [selectedCountryId, defaultCountry]);

  const visibleCountries = useMemo(() => {
    if (activeCountry) return [activeCountry];
    const q = filterText.trim().toLowerCase();
    if (!q) return COUNTRIES_REGISTRY;
    return COUNTRIES_REGISTRY.filter(
      (c) =>
        c.country.toLowerCase().includes(q) ||
        c.currencyCode.toLowerCase().includes(q) ||
        c.formatName.toLowerCase().includes(q),
    );
  }, [activeCountry, filterText]);

  const formatWords = (countryConfig) => {
    const words = convertAmountToWords(amount, countryConfig, withOnlySuffix);
    return chequeUppercase ? words.toUpperCase() : words;
  };

  const handleQuickAdd = (delta) => {
    const current = Number(amount) || 0;
    setAmount(String(current + delta));
  };

  const handleCopy = async (text) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      notify("Copied words to clipboard");
    }
  };

  return (
    <div className="space-y-4">
      <CalcHeader
        title="Amount to Word"
        eyebrow="CHEQUE & WORDS CONVERTER"
        onBack={onBack}
        backLabel="Calculators"
        rightAction={
          <button
            type="button"
            onClick={() => setAmount("")}
            className="text-xs font-bold text-[var(--home-text-secondary)] hover:text-[var(--home-text)] cursor-pointer"
          >
            Clear
          </button>
        }
      />

      <CalcToast message={toast} />

      <CalcCard className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--home-text-muted)]">
            Numeric Amount
          </span>
          <select
            value={selectedCountryId}
            onChange={(e) => setSelectedCountryId(e.target.value)}
            className="px-3 py-1 rounded-full border border-[var(--home-border)] bg-[var(--home-track)] text-xs font-bold text-[var(--home-text)] outline-none"
          >
            <option value="active">
              {defaultCountry.flag} Active ({defaultCountry.currencyCode})
            </option>
            <option value="all">🌐 All Countries</option>
            {COUNTRIES_REGISTRY.map((c) => (
              <option key={c.id} value={c.id}>
                {c.flag} {c.country} ({c.currencyCode})
              </option>
            ))}
          </select>
        </div>

        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(sanitizeDecimal(e.target.value))}
          placeholder="Enter numeric amount"
          className="w-full px-4 py-3 rounded-2xl border border-[var(--home-border)] bg-[var(--home-background)] font-mono-num text-xl font-bold text-[var(--home-text)] outline-none focus:border-[var(--home-accent)]"
        />

        <div className="flex flex-wrap gap-1.5">
          {[100, 500, 1000, 10000, 100000].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handleQuickAdd(val)}
              className="px-2.5 py-1 rounded-full border border-[var(--home-border)] bg-[var(--home-track)] font-mono-num text-[11px] font-bold text-[var(--home-text)] hover:opacity-80 cursor-pointer"
            >
              +{val.toLocaleString("en-IN")}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-[var(--home-border)]">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--home-text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={withOnlySuffix}
              onChange={(e) => setWithOnlySuffix(e.target.checked)}
              className="accent-[var(--home-accent)]"
            />
            <span>Append &ldquo;Only&rdquo;</span>
          </label>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--home-text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={chequeUppercase}
              onChange={(e) => setChequeUppercase(e.target.checked)}
              className="accent-[var(--home-accent)]"
            />
            <span>ALL CAPS (Cheque)</span>
          </label>
        </div>
      </CalcCard>

      {selectedCountryId === "all" && (
        <div className="relative">
          <HiMagnifyingGlass className="w-4 h-4 text-[var(--home-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter countries or currencies..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-[var(--home-border)] bg-[var(--home-card)] text-xs font-medium text-[var(--home-text)] outline-none"
          />
        </div>
      )}

      <div className="space-y-3">
        {visibleCountries.map((country) => {
          const words = formatWords(country);
          return (
            <CalcCard key={country.id} className="p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{country.flag}</span>
                  <div>
                    <p className="text-xs font-bold text-[var(--home-text)]">
                      {country.country}
                    </p>
                    <p className="text-[11px] text-[var(--home-text-muted)]">
                      {country.formatName} · {country.currencyCode}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopy(words)}
                    aria-label="Copy words"
                    className="w-8 h-8 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] text-[var(--home-text-secondary)] hover:text-[var(--home-accent)] flex items-center justify-center cursor-pointer"
                  >
                    <HiOutlineClipboardDocument className="w-4 h-4" />
                  </button>
                  <ShareIconButton
                    onClick={() =>
                      shareText({
                        title: `Amount in Words (${country.currencyCode})`,
                        text: `${country.symbol}${amount || 0}\n${words}`,
                      })
                    }
                  />
                </div>
              </div>
              <p className="text-sm sm:text-base font-semibold text-[var(--home-accent)] leading-relaxed">
                {words}
              </p>
            </CalcCard>
          );
        })}
      </div>
    </div>
  );
}

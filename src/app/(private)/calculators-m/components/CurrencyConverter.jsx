"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  HiArrowsUpDown,
  HiChevronDown,
  HiMagnifyingGlass,
  HiXMark,
} from "react-icons/hi2";
import {
  useCalcCurrency,
  CalcHeader,
  CalcCard,
  sanitizeDecimal,
} from "@/components/calculators/v2/CalculatorShell";
import {
  FX_CURRENCIES,
  DEFAULT_FX_RATES,
  convertCurrency,
} from "@/lib/calculatorEngine";

export default function CurrencyConverter({ onBack }) {
  const { currencyCode } = useCalcCurrency();

  const [amount, setAmount] = useState("100");
  const [fromCode, setFromCode] = useState(
    currencyCode === "USD" ? "EUR" : "USD",
  );
  const [toCode, setToCode] = useState(currencyCode || "INR");
  const [exchangeRates, setExchangeRates] = useState(DEFAULT_FX_RATES);
  const [pickerTarget, setPickerTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState("Offline baseline");

  useEffect(() => {
    let active = true;
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.rates) {
          setExchangeRates((prev) => ({ ...prev, ...data.rates }));
          const d = new Date(data.time_last_update_utc || Date.now());
          setLastUpdated(
            d.toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          );
        }
      })
      .catch(() => {
        // Offline rates fallback remains silent
      });
    return () => {
      active = false;
    };
  }, []);

  const fromCurrency = useMemo(
    () =>
      FX_CURRENCIES.find((c) => c.code === fromCode) || {
        code: fromCode,
        flag: "🌐",
        name: fromCode,
        symbol: fromCode,
      },
    [fromCode],
  );

  const toCurrency = useMemo(
    () =>
      FX_CURRENCIES.find((c) => c.code === toCode) || {
        code: toCode,
        flag: "🌐",
        name: toCode,
        symbol: toCode,
      },
    [toCode],
  );

  const fx = useMemo(
    () =>
      convertCurrency({
        amount: Number(amount) || 0,
        fromCode,
        toCode,
        rates: exchangeRates,
      }),
    [amount, fromCode, toCode, exchangeRates],
  );

  const filteredCurrencies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return FX_CURRENCIES;
    return FX_CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const handleSwap = () => {
    setFromCode(toCode);
    setToCode(fromCode);
  };

  const handlePickCurrency = (code) => {
    if (pickerTarget === "from") {
      if (code === toCode) setToCode(fromCode);
      setFromCode(code);
    } else if (pickerTarget === "to") {
      if (code === fromCode) setFromCode(toCode);
      setToCode(code);
    }
    setPickerTarget(null);
    setSearchQuery("");
  };

  return (
    <div className="space-y-4">
      <CalcHeader
        title="Currency Converter"
        eyebrow="EXCHANGE RATES"
        onBack={onBack}
        backLabel="Calculators"
      />

      <CalcCard className="p-5 space-y-5">
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--home-text-muted)]">
            Amount
          </span>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPickerTarget("from")}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-[var(--home-border)] bg-[var(--home-track)] hover:opacity-85 cursor-pointer"
            >
              <span className="text-xl leading-none">{fromCurrency.flag}</span>
              <span className="text-sm font-bold text-[var(--home-text)]">
                {fromCurrency.code}
              </span>
              <HiChevronDown className="w-4 h-4 text-[var(--home-text-muted)]" />
            </button>

            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(sanitizeDecimal(e.target.value))}
              placeholder="0"
              className="w-40 px-3.5 py-2.5 rounded-2xl border border-[var(--home-border)] bg-[var(--home-background)] text-right font-mono-num text-base font-bold text-[var(--home-text)] outline-none focus:border-[var(--home-accent)]"
            />
          </div>
        </div>

        <div className="relative flex items-center justify-center py-1">
          <div className="w-full h-px bg-[var(--home-border)]" />
          <button
            type="button"
            onClick={handleSwap}
            aria-label="Swap currencies"
            className="absolute w-10 h-10 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] flex items-center justify-center shadow-xs hover:scale-105 transition-transform cursor-pointer"
          >
            <HiArrowsUpDown className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--home-text-muted)]">
            Converted Amount
          </span>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPickerTarget("to")}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-[var(--home-border)] bg-[var(--home-track)] hover:opacity-85 cursor-pointer"
            >
              <span className="text-xl leading-none">{toCurrency.flag}</span>
              <span className="text-sm font-bold text-[var(--home-text)]">
                {toCurrency.code}
              </span>
              <HiChevronDown className="w-4 h-4 text-[var(--home-text-muted)]" />
            </button>

            <div className="w-40 px-3.5 py-2.5 rounded-2xl bg-[var(--home-track)] text-right font-mono-num text-base font-bold text-[var(--home-accent)] truncate">
              {amount ? fx.formattedResult : "0.00"}
            </div>
          </div>
        </div>
      </CalcCard>

      <CalcCard className="p-4 text-center space-y-1.5">
        <p className="text-xs text-[var(--home-text-muted)]">
          Rates updated: {lastUpdated}
        </p>
        <p className="font-mono-num text-xl sm:text-2xl font-bold text-[var(--home-accent)]">
          {amount || 0} {fromCurrency.code} = {fx.formattedResult} {toCurrency.code}
        </p>
        <p className="font-mono-num text-xs text-[var(--home-text-secondary)]">
          1 {fromCurrency.code} = {fx.unitRate.toFixed(4)} {toCurrency.code}
        </p>
      </CalcCard>

      {pickerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-[var(--home-border)] bg-[var(--home-card)] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--home-border)]">
              <h3 className="text-base font-bold text-[var(--home-text)]">
                Select {pickerTarget === "from" ? "Source" : "Target"} Currency
              </h3>
              <button
                type="button"
                onClick={() => {
                  setPickerTarget(null);
                  setSearchQuery("");
                }}
                className="w-8 h-8 rounded-full bg-[var(--home-track)] flex items-center justify-center text-[var(--home-text-secondary)] cursor-pointer"
              >
                <HiXMark className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-[var(--home-border)]">
              <div className="relative">
                <HiMagnifyingGlass className="w-4 h-4 text-[var(--home-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search currency code or name..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-xs font-medium text-[var(--home-text)] outline-none"
                />
              </div>
            </div>

            <div className="overflow-y-auto divide-y divide-[var(--home-border)]">
              {filteredCurrencies.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handlePickCurrency(c.code)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[var(--home-track)] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{c.flag}</span>
                    <div>
                      <p className="text-xs font-bold text-[var(--home-text)]">
                        {c.code}
                      </p>
                      <p className="text-[11px] text-[var(--home-text-muted)]">
                        {c.name}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono-num text-xs font-semibold text-[var(--home-text-secondary)]">
                    {c.symbol}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

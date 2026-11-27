"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { HiChevronDown, HiCheck, HiMagnifyingGlass } from "react-icons/hi2";
import { CURRENCIES, DEFAULT_CURRENCY } from "@/utils/currencies";

export default function CurrencySelect({
  value = DEFAULT_CURRENCY.code,
  onChange,
  className = "",
  roundedClass = "rounded-xl",
  id = "currency-select",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedCurrency = useMemo(
    () => CURRENCIES.find((c) => c.code === value) || CURRENCIES[0],
    [value],
  );

  const filteredCurrencies = useMemo(() => {
    if (!searchQuery.trim()) return CURRENCIES;
    const q = searchQuery.toLowerCase().trim();
    return CURRENCIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  const handleSelect = (code) => {
    if (onChange) onChange(code);
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-4 py-2.5 ${roundedClass} border border-[var(--home-border)] bg-[var(--home-background)] text-[var(--home-text)] text-sm flex items-center justify-between transition-all cursor-pointer text-left focus:outline-none focus:border-[var(--home-accent)]`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-base leading-none shrink-0">
            {selectedCurrency.flag}
          </span>
          <span className="font-semibold text-sm truncate">
            {selectedCurrency.code} ({selectedCurrency.symbol})
          </span>
          <span className="text-xs truncate hidden sm:inline text-[var(--home-text-muted)]">
            - {selectedCurrency.name}
          </span>
        </div>
        <HiChevronDown
          className={`w-4 h-4 shrink-0 text-[var(--home-text-muted)] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 right-0 mt-1.5 z-50 ${roundedClass} border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text)] shadow-xl overflow-hidden`}
        >
          <div className="p-2 border-b border-[var(--home-border)] bg-[var(--home-background)] flex items-center gap-2">
            <HiMagnifyingGlass className="w-4 h-4 shrink-0 text-[var(--home-text-muted)]" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search currency or country..."
              className="w-full bg-transparent text-xs text-[var(--home-text)] placeholder-[var(--home-text-muted)] focus:outline-none"
            />
          </div>

          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
            {filteredCurrencies.length === 0 ? (
              <div className="py-4 text-center text-xs text-[var(--home-text-muted)]">
                No currency found
              </div>
            ) : (
              filteredCurrencies.map((c) => {
                const isSelected = c.code === value;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleSelect(c.code)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left ${
                      isSelected
                        ? "bg-[var(--home-track)] text-[var(--home-text)] font-semibold"
                        : "text-[var(--home-text-secondary)] hover:bg-[var(--home-background)] hover:text-[var(--home-text)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base leading-none shrink-0">
                        {c.flag}
                      </span>
                      <span className="truncate">{c.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)]">
                        {c.code} ({c.symbol})
                      </span>
                      {isSelected && (
                        <HiCheck className="w-3.5 h-3.5 text-[var(--home-income)] shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

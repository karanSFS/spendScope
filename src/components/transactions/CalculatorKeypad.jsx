"use client";

import React from "react";
import { HiOutlineBackspace } from "react-icons/hi2";
import { isOperator } from "@/lib/expressionParser";

const KEY_ROWS = [
  ["7", "8", "9", "÷"],
  ["4", "5", "6", "×"],
  ["1", "2", "3", "-"],
  [".", "0", "backspace", "+"],
];

export default function CalculatorKeypad({
  expression = "",
  onChangeExpression,
  onEvaluate,
  onClear,
}) {
  const appendToken = (token) => {
    const current = String(expression || "");
    if (token === "backspace") {
      onChangeExpression?.(current.slice(0, -1));
      return;
    }
    if (token === "clear") {
      onClear?.();
      return;
    }
    if (token === "=") {
      onEvaluate?.();
      return;
    }

    const mapped = token === "×" ? "*" : token === "÷" ? "/" : token;
    if (isOperator(mapped)) {
      if (!current && mapped !== "-") return;
      const last = current.slice(-1);
      if (isOperator(last)) {
        if (current.length === 1 && mapped !== "-") return;
        onChangeExpression?.(current.slice(0, -1) + mapped);
        return;
      }
      onChangeExpression?.(current + mapped);
      return;
    }

    if (mapped === ".") {
      const lastSegment = current.split(/[+\-*/]/).pop() || "";
      if (lastSegment.includes(".")) return;
      onChangeExpression?.(lastSegment ? `${current}.` : `${current}0.`);
      return;
    }

    // Prevent more than 2 decimals in the active number segment
    const lastSegment = current.split(/[+\-*/]/).pop() || "";
    const dotIdx = lastSegment.indexOf(".");
    if (dotIdx !== -1 && lastSegment.length - dotIdx > 2) {
      return;
    }
    if (dotIdx === -1 && lastSegment.length >= 12) {
      return;
    }

    onChangeExpression?.(current + mapped);
  };

  return (
    <div className="space-y-2 select-none">
      <div className="grid grid-cols-4 gap-2">
        {KEY_ROWS.flat().map((key) => {
          const isOp = ["÷", "×", "-", "+"].includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => appendToken(key)}
              aria-label={key === "backspace" ? "Backspace" : `Key ${key}`}
              style={{
                backgroundColor: isOp
                  ? "var(--add-operator-key-bg)"
                  : "var(--add-key-bg)",
              }}
              className={`h-11 rounded-2xl font-mono-num text-base font-bold flex items-center justify-center border border-[var(--home-border)] transition-transform active:scale-95 cursor-pointer ${
                isOp ? "text-[var(--home-accent)]" : "text-[var(--home-text)]"
              }`}
            >
              {key === "backspace" ? (
                <HiOutlineBackspace className="w-5 h-5" />
              ) : (
                key
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => appendToken("clear")}
          style={{ backgroundColor: "var(--add-key-bg)" }}
          className="h-10 rounded-2xl text-xs font-bold border border-[var(--home-border)] text-[var(--home-text-secondary)] hover:text-[var(--home-text)] cursor-pointer"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => appendToken("=")}
          style={{ backgroundColor: "var(--add-operator-key-bg)" }}
          className="col-span-3 h-10 rounded-2xl text-sm font-bold border border-[var(--home-border)] text-[var(--home-accent)] hover:opacity-90 cursor-pointer"
        >
          = Calculate
        </button>
      </div>
    </div>
  );
}

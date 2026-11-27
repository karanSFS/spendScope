import { describe, it, expect } from "vitest";
import {
  evaluateExpression,
  formatExpressionResult,
  sanitizeExpressionInput,
} from "@/lib/expressionParser";

describe("expressionParser", () => {
  it("evaluates arithmetic expressions respecting operator precedence", () => {
    expect(evaluateExpression("120+80")).toBe(200);
    expect(evaluateExpression("10+5*4")).toBe(30);
    expect(evaluateExpression("100-25/5")).toBe(95);
    expect(evaluateExpression("45.5×2")).toBe(91);
    expect(evaluateExpression("100÷4")).toBe(25);
  });

  it("handles unary negative, trailing operators, decimals, and rounding", () => {
    expect(evaluateExpression("-50+125.75")).toBe(75.75);
    expect(evaluateExpression("100+")).toBe(100);
    expect(evaluateExpression("10/3")).toBe(3.33);
    expect(evaluateExpression("")).toBe(0);
    expect(sanitizeExpressionInput(" 5 × 2 ÷ 4 ")).toBe("5*2/4");
    expect(formatExpressionResult(12.5)).toBe("12.5");
    expect(formatExpressionResult(12.0)).toBe("12");
  });

  it("throws on division by zero, invalid decimals, and values exceeding 12 digits", () => {
    expect(() => evaluateExpression("100/0")).toThrow(/zero/i);
    expect(() => evaluateExpression("12.3.4")).toThrow(/format/i);
    expect(() => evaluateExpression("1000000000000")).toThrow(/12-digit/i);
    expect(() => evaluateExpression("10+*2")).toThrow(/operator/i);
  });
});

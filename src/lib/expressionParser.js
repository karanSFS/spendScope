/**
 * Safe recursive-descent math expression parser for the Transaction Calculator Keypad.
 * Supports +, -, *, /, unary leading -, and decimal numbers up to 2 decimal places.
 */

const OPERATOR_CHARS = new Set(["+", "-", "*", "/"]);

export function sanitizeExpressionInput(raw) {
  return String(raw || "")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/\s+/g, "");
}

export function isOperator(ch) {
  return OPERATOR_CHARS.has(ch);
}

/**
 * Evaluates a clean math expression string safely without eval/Function.
 * Throws descriptive errors for malformed input or division by zero.
 */
export function evaluateExpression(rawInput) {
  const expr = sanitizeExpressionInput(rawInput).replace(/[+\-*/.]+$/, "");
  if (!expr) return 0;

  const tokens = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];
    if ((ch >= "0" && ch <= "9") || ch === ".") {
      let numStr = "";
      let dotCount = 0;
      while (i < expr.length && ((expr[i] >= "0" && expr[i] <= "9") || expr[i] === ".")) {
        if (expr[i] === ".") dotCount++;
        if (dotCount > 1) {
          throw new Error("Invalid number format.");
        }
        numStr += expr[i];
        i++;
      }
      const val = Number(numStr);
      if (!Number.isFinite(val)) {
        throw new Error("Invalid numeric value.");
      }
      tokens.push({ type: "num", value: val });
      continue;
    }

    if (isOperator(ch)) {
      const prev = tokens[tokens.length - 1];
      if ((ch === "-" || ch === "+") && (!prev || prev.type === "op")) {
        // Unary sign before next number
        i++;
        let numStr = ch === "-" ? "-" : "";
        let dotCount = 0;
        while (i < expr.length && ((expr[i] >= "0" && expr[i] <= "9") || expr[i] === ".")) {
          if (expr[i] === ".") dotCount++;
          if (dotCount > 1) throw new Error("Invalid number format.");
          numStr += expr[i];
          i++;
        }
        if (numStr === "-" || numStr === "" || numStr === ".") {
          throw new Error("Incomplete expression.");
        }
        const val = Number(numStr);
        if (!Number.isFinite(val)) throw new Error("Invalid numeric value.");
        tokens.push({ type: "num", value: val });
        continue;
      }

      if (!prev || prev.type === "op") {
        throw new Error("Invalid operator sequence.");
      }
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }

    throw new Error(`Unsupported character "${ch}"`);
  }

  if (tokens.length === 0) return 0;
  if (tokens[tokens.length - 1].type === "op") {
    tokens.pop();
  }

  // First pass: * and /
  const reduced = [];
  let idx = 0;
  while (idx < tokens.length) {
    const tok = tokens[idx];
    if (tok.type === "op" && (tok.value === "*" || tok.value === "/")) {
      const left = reduced.pop();
      const right = tokens[idx + 1];
      if (!left || !right || right.type !== "num") {
        throw new Error("Malformed expression.");
      }
      if (tok.value === "/") {
        if (right.value === 0) {
          throw new Error("Cannot divide by zero.");
        }
        reduced.push({ type: "num", value: left.value / right.value });
      } else {
        reduced.push({ type: "num", value: left.value * right.value });
      }
      idx += 2;
    } else {
      reduced.push(tok);
      idx += 1;
    }
  }

  // Second pass: + and -
  let result = reduced[0]?.value ?? 0;
  for (let j = 1; j < reduced.length; j += 2) {
    const op = reduced[j];
    const rhs = reduced[j + 1];
    if (!op || !rhs) break;
    if (op.value === "+") result += rhs.value;
    else if (op.value === "-") result -= rhs.value;
  }

  if (!Number.isFinite(result)) {
    throw new Error("Result out of range.");
  }

  const rounded = Math.round((result + Number.EPSILON) * 100) / 100;
  if (Math.abs(rounded) >= 1_000_000_000_000) {
    throw new Error("Amount exceeds 12-digit limit.");
  }
  return rounded;
}

export function formatExpressionResult(num) {
  const rounded = Math.round((Number(num) + Number.EPSILON) * 100) / 100;
  if (!Number.isFinite(rounded)) return "0";
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
}

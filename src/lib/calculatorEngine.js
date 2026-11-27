import { formatMoney, getCurrencyConfig, getCurrencySymbol } from "@/utils/currencies";
import { parseLocalDate, toLocalDateKey } from "@/lib/dateUtils";

export const round2 = (v) =>
  Math.round(((Number(v) || 0) + Number.EPSILON) * 100) / 100;

export function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function formatCalcMoney(value, currencyCode = "INR", decimals = 2) {
  return formatMoney(value, currencyCode, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function getCalcCurrencySymbol(currencyCode = "INR") {
  return getCurrencySymbol(currencyCode);
}

// ============================================================================
// 1. EMI CALCULATORS
// ============================================================================

export function calculateLoanEmi(principal, annualRate, tenureMonths) {
  const P = Math.max(0, safeNumber(principal));
  const R = Math.max(0, safeNumber(annualRate));
  const n = Math.max(0, Math.round(safeNumber(tenureMonths)));
  if (P <= 0 || n <= 0) return 0;
  const r = R / 12 / 100;
  if (r === 0) return P / n;
  const factor = Math.pow(1 + r, n);
  return (P * r * factor) / (factor - 1);
}

export function calculateEmi({
  principal,
  annualRate,
  tenureMonths,
  processingFeePercent = 0,
}) {
  const P = Math.max(0, safeNumber(principal));
  const rate = Math.max(0, safeNumber(annualRate));
  const n = Math.max(1, Math.round(safeNumber(tenureMonths, 1)));
  const feeRate = Math.max(0, safeNumber(processingFeePercent));

  const r = rate / 12 / 100;
  const emi = P > 0 ? calculateLoanEmi(P, rate, n) : 0;
  const processingFeeAmount = P * (feeRate / 100);

  const schedule = [];
  let currentBalance = P;
  let totalInterest = 0;

  if (P > 0 && n > 0) {
    for (let m = 1; m <= n; m++) {
      const monthlyInterest = currentBalance * r;
      let monthlyPrincipal = emi - monthlyInterest;
      if (m === n || currentBalance - monthlyPrincipal < 0.01) {
        monthlyPrincipal = currentBalance;
      }
      const remaining = Math.max(0, currentBalance - monthlyPrincipal);
      totalInterest += monthlyInterest;
      schedule.push({
        month: m,
        principal: monthlyPrincipal,
        interest: monthlyInterest,
        balance: remaining,
      });
      currentBalance = remaining;
    }
  }

  const totalPayment = P + totalInterest;
  return {
    principal: P,
    interestRate: rate,
    totalMonths: n,
    emi,
    totalInterest,
    processingFeeAmount,
    totalPayment,
    schedule,
  };
}

function solveAnnualRateBisection(P, n, E) {
  if (P <= 0 || n <= 0 || E <= 0) return 0;
  if (E * n <= P) return 0;
  let low = 1e-9;
  let high = 5.0;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    const factor = Math.pow(1 + mid, n);
    const emiGuess = (P * mid * factor) / (factor - 1);
    if (emiGuess < E) low = mid;
    else high = mid;
  }
  return ((low + high) / 2) * 12 * 100;
}

/**
 * Quick Loan Calculator supporting 4 solve modes: EMI | Amount | Period | Interest.
 * Fixes the web Period-mode bug where summary used fractional months while schedule used Math.round(n).
 */
export function calculateQuickLoan({
  mode = "Amount",
  principal = 0,
  annualRate = 0,
  periodYears = 1,
  emi = 0,
}) {
  let P = Math.max(0, safeNumber(principal));
  let R = Math.max(0, safeNumber(annualRate));
  let Y = Math.max(0, safeNumber(periodYears));
  let E = Math.max(0, safeNumber(emi));
  let n = Math.max(1, Math.round(Y * 12));
  let warning = null;

  if (mode === "Amount") {
    const r = R / 12 / 100;
    if (r > 0 && n > 0 && E > 0) {
      const f = Math.pow(1 + r, n);
      P = (E * (f - 1)) / (r * f);
    } else if (n > 0 && E > 0) {
      P = E * n;
    } else {
      P = 0;
    }
  } else if (mode === "EMI") {
    E = P > 0 && n > 0 ? calculateLoanEmi(P, R, n) : 0;
  } else if (mode === "Period") {
    const r = R / 12 / 100;
    if (P > 0 && E > 0) {
      if (r > 0) {
        if (E > P * r) {
          const exactMonths = Math.log(E / (E - P * r)) / Math.log(1 + r);
          n = Math.max(1, Math.min(600, Math.ceil(exactMonths - 1e-9)));
          Y = n / 12;
        } else {
          warning = "EMI is too low to cover monthly interest.";
          n = 600;
          Y = 50;
        }
      } else {
        n = Math.max(1, Math.min(600, Math.ceil(P / E - 1e-9)));
        Y = n / 12;
      }
    }
  } else if (mode === "Interest") {
    R = solveAnnualRateBisection(P, n, E);
  }

  const r = R / 12 / 100;
  const schedule = [];
  let currentBalance = P;
  let yearlyPrincipal = 0;
  let yearlyInterest = 0;
  let totalInterest = 0;
  let totalPaid = 0;

  if (P > 0 && E > 0) {
    for (let m = 1; m <= n; m++) {
      const monthlyInterest = currentBalance * r;
      let monthlyPrincipal = E - monthlyInterest;

      if (m === n || currentBalance - monthlyPrincipal < 0.01) {
        monthlyPrincipal = currentBalance;
      }
      // Guard against negative amortization if EMI < monthly interest
      if (monthlyPrincipal < 0) {
        monthlyPrincipal = 0;
      }

      const actualPaymentThisMonth = monthlyPrincipal + monthlyInterest;
      const remaining = Math.max(0, currentBalance - monthlyPrincipal);

      totalInterest += monthlyInterest;
      totalPaid += actualPaymentThisMonth;
      yearlyPrincipal += monthlyPrincipal;
      yearlyInterest += monthlyInterest;

      schedule.push({
        type: "month",
        month: m,
        principal: monthlyPrincipal,
        interest: monthlyInterest,
        balance: remaining,
      });

      currentBalance = remaining;

      if (m % 12 === 0 || m === n) {
        schedule.push({
          type: "yearly_total",
          year: Math.ceil(m / 12),
          principal: yearlyPrincipal,
          interest: yearlyInterest,
          balance: remaining,
        });
        yearlyPrincipal = 0;
        yearlyInterest = 0;
      }
    }
  }

  return {
    mode,
    principal: P,
    interestRate: R,
    periodYears: Y,
    totalMonths: n,
    emi: E,
    totalInterest,
    totalPayment: P > 0 ? totalPaid : 0,
    schedule,
    warning,
  };
}

export function calculateEmiAdvance({
  principal = 0,
  annualRate = 0,
  tenureMonths = 12,
  timing = "arrears",
  feeType = "percent",
  processingFee = 0,
  gstPercent = 0,
}) {
  const P = Math.max(0, safeNumber(principal));
  const R = Math.max(0, safeNumber(annualRate));
  const n = Math.max(1, Math.round(safeNumber(tenureMonths, 1)));
  const rawFee = Math.max(0, safeNumber(processingFee));
  const gstPct = Math.max(0, safeNumber(gstPercent));
  const r = R / 12 / 100;

  const emiArrears = P > 0 ? calculateLoanEmi(P, R, n) : 0;
  const emi =
    P > 0 && r > 0 && timing === "advance" ? emiArrears / (1 + r) : emiArrears;
  const feeAmount = feeType === "percent" ? P * (rawFee / 100) : rawFee;

  const schedule = [];
  let currentBalance = P;
  let totalInterest = 0;
  let totalGst = 0;
  let yearlyPrincipal = 0;
  let yearlyInterest = 0;
  let yearlyGst = 0;

  if (P > 0 && n > 0 && emi > 0) {
    if (timing === "advance") {
      const firstPrincipal = Math.min(currentBalance, emi);
      const firstBalance = Math.max(0, currentBalance - firstPrincipal);
      yearlyPrincipal += firstPrincipal;
      schedule.push({
        type: "month",
        month: 1,
        isAdvance: true,
        principal: firstPrincipal,
        interest: 0,
        gst: 0,
        balance: firstBalance,
      });
      currentBalance = firstBalance;
      if (n === 1) {
        schedule.push({
          type: "yearly_total",
          year: 1,
          principal: yearlyPrincipal,
          interest: 0,
          gst: 0,
          balance: firstBalance,
        });
      }

      for (let m = 2; m <= n; m++) {
        const monthlyInterest = currentBalance * r;
        let monthlyPrincipal = emi - monthlyInterest;
        if (m === n || currentBalance - monthlyPrincipal < 0.01) {
          monthlyPrincipal = currentBalance;
        }
        const monthlyGst = monthlyInterest * (gstPct / 100);
        const remaining = Math.max(0, currentBalance - monthlyPrincipal);

        totalInterest += monthlyInterest;
        totalGst += monthlyGst;
        yearlyPrincipal += monthlyPrincipal;
        yearlyInterest += monthlyInterest;
        yearlyGst += monthlyGst;

        schedule.push({
          type: "month",
          month: m,
          isAdvance: false,
          principal: monthlyPrincipal,
          interest: monthlyInterest,
          gst: monthlyGst,
          balance: remaining,
        });

        currentBalance = remaining;
        if (m % 12 === 0 || m === n) {
          schedule.push({
            type: "yearly_total",
            year: Math.ceil(m / 12),
            principal: yearlyPrincipal,
            interest: yearlyInterest,
            gst: yearlyGst,
            balance: remaining,
          });
          yearlyPrincipal = 0;
          yearlyInterest = 0;
          yearlyGst = 0;
        }
      }
    } else {
      for (let m = 1; m <= n; m++) {
        const monthlyInterest = currentBalance * r;
        let monthlyPrincipal = emi - monthlyInterest;
        if (m === n || currentBalance - monthlyPrincipal < 0.01) {
          monthlyPrincipal = currentBalance;
        }
        const monthlyGst = monthlyInterest * (gstPct / 100);
        const remaining = Math.max(0, currentBalance - monthlyPrincipal);

        totalInterest += monthlyInterest;
        totalGst += monthlyGst;
        yearlyPrincipal += monthlyPrincipal;
        yearlyInterest += monthlyInterest;
        yearlyGst += monthlyGst;

        schedule.push({
          type: "month",
          month: m,
          isAdvance: false,
          principal: monthlyPrincipal,
          interest: monthlyInterest,
          gst: monthlyGst,
          balance: remaining,
        });

        currentBalance = remaining;
        if (m % 12 === 0 || m === n) {
          schedule.push({
            type: "yearly_total",
            year: Math.ceil(m / 12),
            principal: yearlyPrincipal,
            interest: yearlyInterest,
            gst: yearlyGst,
            balance: remaining,
          });
          yearlyPrincipal = 0;
          yearlyInterest = 0;
          yearlyGst = 0;
        }
      }
    }
  }

  return {
    principal: P,
    interestRate: R,
    totalMonths: n,
    timing,
    emi,
    feeAmount,
    gstOnFee: feeAmount * (gstPct / 100),
    totalInterest,
    totalGst,
    totalPayment: P + totalInterest,
    schedule,
  };
}

export function compareLoans(loan1Input, loan2Input) {
  const computeSingle = ({ principal, annualRate, periodType, period }) => {
    const P = Math.max(0, safeNumber(principal));
    const rate = Math.max(0, safeNumber(annualRate));
    const rawPeriod = Math.max(0, safeNumber(period));
    const totalMonths = Math.max(
      1,
      Math.round(periodType === "yearly" ? rawPeriod * 12 : rawPeriod),
    );
    const emi = P > 0 ? calculateLoanEmi(P, rate, totalMonths) : 0;
    const totalPayment = emi * totalMonths;
    const totalInterest = Math.max(0, totalPayment - P);
    return {
      principal: P,
      rate,
      totalMonths,
      emi,
      totalInterest,
      totalPayment,
    };
  };

  const loan1 = computeSingle(loan1Input);
  const loan2 = computeSingle(loan2Input);

  return {
    loan1,
    loan2,
    differences: {
      emiDiff: Math.abs(loan1.emi - loan2.emi),
      interestDiff: Math.abs(loan1.totalInterest - loan2.totalInterest),
      paymentDiff: Math.abs(loan1.totalPayment - loan2.totalPayment),
      lowerTotalOption:
        loan1.totalPayment === loan2.totalPayment
          ? "equal"
          : loan1.totalPayment < loan2.totalPayment
            ? "loan1"
            : "loan2",
    },
  };
}

// ============================================================================
// 2. BANKING CALCULATORS
// ============================================================================

/**
 * Fixed Deposit Calculator.
 * Fixes:
 * - Short Term locks strictly to Days (ignores years/months)
 * - Removes the 10-year schedule truncation cap
 */
export function calculateFd({
  principal = 0,
  annualRate = 0,
  depositType = "Reinvestment/Cumulative",
  years = 0,
  months = 0,
  days = 0,
  referenceDate = new Date(),
}) {
  const P = Math.max(0, safeNumber(principal));
  const r = Math.max(0, safeNumber(annualRate));
  const isShortTerm = depositType === "Short Term";

  const y = isShortTerm ? 0 : Math.max(0, safeNumber(years));
  const m = isShortTerm ? 0 : Math.max(0, safeNumber(months));
  const d = Math.max(0, safeNumber(days));

  let totalYears;
  let totalDays;

  if (isShortTerm) {
    totalDays = d > 0 ? d : 170;
    totalYears = totalDays / 365;
  } else if (y === 0 && m === 0 && d === 0) {
    totalYears = 1;
    totalDays = 365;
  } else {
    totalYears = y + m / 12 + d / 365;
    totalDays = y * 365 + m * 30.4167 + d;
  }

  let maturityAmount = P;
  let totalInterest = 0;

  if (P > 0 && r >= 0) {
    if (depositType === "Reinvestment/Cumulative") {
      maturityAmount = P * Math.pow(1 + r / 400, totalYears * 4);
      totalInterest = Math.max(0, maturityAmount - P);
    } else if (
      depositType === "Quarterly Payout" ||
      depositType === "Monthly Payout"
    ) {
      totalInterest = P * (r / 100) * totalYears;
      maturityAmount = P + totalInterest;
    } else {
      totalInterest = P * (r / 100) * (totalDays / 365);
      maturityAmount = P + totalInterest;
    }
  }

  const targetDate = new Date(referenceDate);
  if (isShortTerm) {
    targetDate.setDate(targetDate.getDate() + Math.round(totalDays));
  } else if (y === 0 && m === 0 && d === 0) {
    targetDate.setFullYear(targetDate.getFullYear() + 1);
  } else {
    if (y > 0) targetDate.setFullYear(targetDate.getFullYear() + y);
    if (m > 0) targetDate.setMonth(targetDate.getMonth() + m);
    if (d > 0) targetDate.setDate(targetDate.getDate() + d);
  }

  const maturityDate = targetDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const schedule = [];
  const scheduleTenure = Math.max(1, Math.min(50, Math.ceil(totalYears)));
  let runningPrincipal = P;

  for (let yr = 1; yr <= scheduleTenure; yr++) {
    const fraction = yr === scheduleTenure && totalYears < yr ? totalYears - (yr - 1) : 1;
    const elapsedT = (yr - 1) + fraction;

    if (depositType === "Reinvestment/Cumulative") {
      const opening = runningPrincipal;
      const closing = P * Math.pow(1 + r / 400, elapsedT * 4);
      const yearlyInt = Math.max(0, closing - opening);
      runningPrincipal = closing;
      schedule.push({
        year: yr,
        opening,
        interest: yearlyInt,
        closing,
      });
    } else {
      const yearlyInt = P * (r / 100) * fraction;
      schedule.push({
        year: yr,
        opening: P,
        interest: yearlyInt,
        closing: P + P * (r / 100) * elapsedT,
      });
    }
  }

  return {
    principal: P,
    interestRate: r,
    depositType,
    totalDays,
    totalYears,
    totalInterest,
    maturityAmount,
    periodicPayout:
      depositType === "Quarterly Payout"
        ? P * (r / 400)
        : depositType === "Monthly Payout"
          ? P * (r / 1200)
          : 0,
    maturityDate,
    schedule,
  };
}

export function calculateRd({
  monthlyDeposit = 0,
  annualRate = 0,
  tenureMonths = 12,
  referenceDate = new Date(),
}) {
  const P = Math.max(0, safeNumber(monthlyDeposit));
  const r = Math.max(0, safeNumber(annualRate));
  const totalMonths = Math.max(1, Math.round(safeNumber(tenureMonths, 12)));
  const totalInvested = P * totalMonths;
  const quarterlyRate = r / 100 / 4;

  let maturityAmount = 0;
  if (P > 0 && r >= 0) {
    for (let i = 1; i <= totalMonths; i++) {
      const remainingQuarters = (totalMonths - i + 1) / 3;
      maturityAmount += P * Math.pow(1 + quarterlyRate, remainingQuarters);
    }
  }
  const totalInterest = Math.max(0, maturityAmount - totalInvested);

  const targetDate = new Date(referenceDate);
  targetDate.setMonth(targetDate.getMonth() + totalMonths);
  const maturityDate = targetDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const schedule = [];
  const scheduleYears = Math.max(1, Math.ceil(totalMonths / 12));
  let prevClosing = 0;

  for (let yr = 1; yr <= scheduleYears; yr++) {
    const monthsUpToYr = Math.min(totalMonths, yr * 12);
    const monthsInYr = monthsUpToYr - (yr - 1) * 12;
    const yrInvestment = P * monthsInYr;

    let yrMaturity = 0;
    for (let i = 1; i <= monthsUpToYr; i++) {
      const remQuarters = (monthsUpToYr - i + 1) / 3;
      yrMaturity += P * Math.pow(1 + quarterlyRate, remQuarters);
    }
    const yrInterest = Math.max(0, yrMaturity - prevClosing - yrInvestment);
    schedule.push({
      year: yr,
      opening: prevClosing,
      invested: yrInvestment,
      interest: yrInterest,
      closing: yrMaturity,
    });
    prevClosing = yrMaturity;
  }

  return {
    principal: totalInvested,
    monthlyDeposit: P,
    interestRate: r,
    totalMonths,
    totalInterest,
    maturityAmount,
    maturityDate,
    schedule,
  };
}

/**
 * PPF Calculator (India Public Provident Fund Rules).
 * Fixes:
 * - Enforces minimum 15 years tenure (clamped to [15, 50], flags below-min inputs)
 * - Uses monthly balance interest calculation compounded ONCE annually at year-end
 */
export function calculatePpf({
  depositAmount = 0,
  annualRate = 7.1,
  frequency = "Yearly",
  years = 15,
  referenceDate = new Date(),
}) {
  const P = Math.max(0, safeNumber(depositAmount));
  const r = Math.max(0, safeNumber(annualRate));
  const rawYears = safeNumber(years, 15);
  const tenureYears = Math.max(15, Math.min(50, Math.round(rawYears || 15)));
  const isBelowMinimum = rawYears > 0 && rawYears < 15;

  const depositsPerYearMap = {
    Yearly: 1,
    "Half Yearly": 2,
    Quarterly: 4,
    Monthly: 12,
  };
  const depositsPerYear = depositsPerYearMap[frequency] || 1;
  const annualInvestment = P * depositsPerYear;
  const totalInvested = annualInvestment * tenureYears;
  const rate = r / 100;
  const monthlyRate = rate / 12;

  let balance = 0;
  const schedule = [];

  for (let yr = 1; yr <= tenureYears; yr++) {
    const opening = balance;
    let runningForMonth = opening;
    let accruedInterest = 0;

    for (let m = 1; m <= 12; m++) {
      if (frequency === "Yearly" && m === 1) {
        runningForMonth += P;
      } else if (frequency === "Half Yearly" && (m === 1 || m === 7)) {
        runningForMonth += P;
      } else if (frequency === "Quarterly" && (m === 1 || m === 4 || m === 7 || m === 10)) {
        runningForMonth += P;
      } else if (frequency === "Monthly") {
        runningForMonth += P;
      }
      accruedInterest += runningForMonth * monthlyRate;
    }

    balance = opening + annualInvestment + accruedInterest;
    schedule.push({
      year: yr,
      opening,
      invested: annualInvestment,
      interest: accruedInterest,
      closing: balance,
    });
  }

  const targetDate = new Date(referenceDate);
  targetDate.setFullYear(targetDate.getFullYear() + tenureYears);
  const maturityDate = targetDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return {
    principal: totalInvested,
    depositAmount: P,
    annualInvestment,
    frequency,
    interestRate: r,
    tenureYears,
    isBelowMinimum,
    totalInterest: Math.max(0, balance - totalInvested),
    maturityAmount: balance,
    maturityDate,
    schedule,
  };
}

/**
 * Simple & Compound Interest Calculator.
 * Fixes: removes the 20-year schedule truncation cap.
 */
export function calculateInterest({
  principal = 0,
  rate = 0,
  rateType = "Yearly",
  compoundInterval = "None",
  totalYears = 1,
}) {
  const P = Math.max(0, safeNumber(principal));
  const rawRate = Math.max(0, safeNumber(rate));
  const annualRate = rateType === "Monthly" ? rawRate * 12 : rawRate;
  const yearsVal = Math.max(0, safeNumber(totalYears, 1));
  const r = annualRate / 100;

  const freqMap = {
    Annually: 1,
    "Semi-Annually": 2,
    Quarterly: 4,
    Monthly: 12,
    Daily: 365,
  };

  let totalInterest = 0;
  if (P > 0 && r >= 0 && yearsVal > 0) {
    if (compoundInterval === "None") {
      totalInterest = P * r * yearsVal;
    } else {
      const n = freqMap[compoundInterval] || 1;
      totalInterest = Math.max(0, P * Math.pow(1 + r / n, n * yearsVal) - P);
    }
  }

  const schedule = [];
  const scheduleYears = Math.max(1, Math.min(100, Math.ceil(yearsVal)));
  for (let yr = 1; yr <= scheduleYears; yr++) {
    const t = yr === scheduleYears && yearsVal < yr ? yearsVal : yr;
    let yrInt = 0;
    if (compoundInterval === "None") {
      yrInt = P * r * t;
    } else {
      const n = freqMap[compoundInterval] || 1;
      yrInt = P * Math.pow(1 + r / n, n * t) - P;
    }
    schedule.push({
      year: yr,
      interest: yrInt,
      balance: P + yrInt,
    });
  }

  return {
    principal: P,
    rate: rawRate,
    annualRate,
    rateType,
    compoundInterval,
    totalYears: yearsVal,
    totalInterest,
    totalAmount: P + totalInterest,
    schedule,
  };
}

export function calculateInflationImpact({
  initialAmount = 0,
  inflationRate = 0,
  years = 1,
}) {
  const P = Math.max(0, safeNumber(initialAmount));
  const r = Math.min(100, Math.max(0, safeNumber(inflationRate))) / 100;
  const t = Math.min(100, Math.max(1, safeNumber(years, 1)));

  const futureCost = P * Math.pow(1 + r, t);
  const priceIncrease = Math.max(0, futureCost - P);
  const futureValue = futureCost > 0 ? P / Math.pow(1 + r, t) : P;
  const valueReduction = Math.max(0, P - futureValue);

  return {
    currentCost: P,
    futureCost,
    priceIncrease,
    todaysValue: P,
    futureValue,
    valueReduction,
    inflationRate: r * 100,
    years: t,
  };
}

// ============================================================================
// 3. SIP / INVESTMENT CALCULATORS
// ============================================================================

export function calculateSip({
  mode = "sip",
  amount = 0,
  annualReturn = 12,
  years = 10,
}) {
  const P = Math.max(0, safeNumber(amount));
  const r = Math.max(0, safeNumber(annualReturn));
  const y = Math.max(1, Math.round(safeNumber(years, 1)));

  let investedAmount = 0;
  let totalValue = 0;

  if (mode === "sip") {
    const totalMonths = y * 12;
    investedAmount = P * totalMonths;
    if (r > 0 && totalMonths > 0) {
      const i = r / 12 / 100;
      totalValue = P * ((Math.pow(1 + i, totalMonths) - 1) / i) * (1 + i);
    } else {
      totalValue = investedAmount;
    }
  } else {
    investedAmount = P;
    totalValue = P * Math.pow(1 + r / 100, y);
  }

  const roundedInvested = Math.round(investedAmount);
  const roundedTotal = Math.round(totalValue);
  const estReturns = Math.max(0, roundedTotal - roundedInvested);

  const schedule = [];
  for (let yr = 1; yr <= y; yr++) {
    let yrInvested = 0;
    let yrTotal = 0;
    if (mode === "sip") {
      const m = yr * 12;
      yrInvested = P * m;
      if (r > 0) {
        const i = r / 12 / 100;
        yrTotal = P * ((Math.pow(1 + i, m) - 1) / i) * (1 + i);
      } else {
        yrTotal = yrInvested;
      }
    } else {
      yrInvested = P;
      yrTotal = P * Math.pow(1 + r / 100, yr);
    }
    const rInv = Math.round(yrInvested);
    const rTot = Math.round(yrTotal);
    schedule.push({
      year: yr,
      invested: rInv,
      returns: Math.max(0, rTot - rInv),
      total: rTot,
    });
  }

  return {
    investedAmount: roundedInvested,
    estReturns,
    totalValue: roundedTotal,
    schedule,
  };
}

/**
 * Systematic Withdrawal Plan (SWP).
 * Fixes:
 * - Matches Android's withdrawal-before-interest order
 * - Tracks exact depletion month/year when corpus hits 0 before tenure ends
 */
export function calculateSwp({
  totalInvestment = 0,
  withdrawalPerMonth = 0,
  annualReturn = 0,
  years = 1,
}) {
  const P = Math.max(0, safeNumber(totalInvestment));
  const W = Math.max(0, safeNumber(withdrawalPerMonth));
  const r = Math.max(0, safeNumber(annualReturn));
  const y = Math.max(0.1, safeNumber(years, 1));
  const totalMonths = Math.max(1, Math.round(y * 12));
  const monthlyRate = r / 12 / 100;

  let balance = P;
  let totalWithdrawn = 0;
  let depletedMonth = null;
  const schedule = [];

  let yrOpening = P;
  let yrWithdrawn = 0;
  let yrReturns = 0;

  for (let m = 1; m <= totalMonths; m++) {
    if (balance <= 0) break;

    const actualWithdraw = Math.min(balance, W);
    balance = Math.max(0, balance - actualWithdraw);
    totalWithdrawn += actualWithdraw;
    yrWithdrawn += actualWithdraw;

    let interestEarned = 0;
    if (balance > 0) {
      interestEarned = balance * monthlyRate;
      balance += interestEarned;
      yrReturns += interestEarned;
    } else if (depletedMonth === null) {
      depletedMonth = m;
    }

    if (m % 12 === 0 || m === totalMonths || balance <= 0) {
      schedule.push({
        year: Math.ceil(m / 12),
        opening: Math.round(yrOpening),
        withdrawn: Math.round(yrWithdrawn),
        returns: Math.round(yrReturns),
        closing: Math.round(balance),
      });
      yrOpening = balance;
      yrWithdrawn = 0;
      yrReturns = 0;
    }
  }

  const finalValue = Math.round(balance);
  const roundedWithdrawn = Math.round(totalWithdrawn);
  const totalValue = roundedWithdrawn + finalValue;
  const totalReturns = Math.max(0, totalValue - Math.round(P));

  return {
    principal: Math.round(P),
    withdrawalPerMonth: Math.round(W),
    returnRate: r,
    periodYears: y,
    totalMonths,
    totalWithdrawn: roundedWithdrawn,
    finalValue,
    totalValue,
    totalReturns,
    depletedMonth,
    isDepletedBeforeEnd: depletedMonth !== null && depletedMonth < totalMonths,
    schedule,
  };
}

export function calculateStp({
  investmentAmount = 0,
  stpAmount = 0,
  transferorRate = 0,
  transfereeRate = 0,
  totalMonths = 12,
}) {
  const P = Math.max(0, safeNumber(investmentAmount));
  const S = Math.max(0, safeNumber(stpAmount));
  const r1Rate = Math.max(0, safeNumber(transferorRate));
  const r2Rate = Math.max(0, safeNumber(transfereeRate));
  const months = Math.max(1, Math.round(safeNumber(totalMonths, 12)));

  const r1 = r1Rate / 100 / 12;
  const r2 = r2Rate / 100 / 12;

  let b1 = P;
  let b2 = 0;
  let totalTransferred = 0;
  let yrTransferred = 0;
  const schedule = [];

  for (let m = 1; m <= months; m++) {
    const actualTransfer = Math.min(b1, S);
    b1 = Math.max(0, b1 - actualTransfer);
    b2 += actualTransfer;
    totalTransferred += actualTransfer;
    yrTransferred += actualTransfer;

    b1 = b1 * (1 + r1);
    b2 = b2 * (1 + r2);

    if (m % 12 === 0 || m === months) {
      schedule.push({
        year: Math.ceil(m / 12),
        transferred: Math.round(yrTransferred),
        transferorBalance: Math.round(b1),
        transfereeBalance: Math.round(b2),
        totalProfit: Math.max(0, Math.round(b1 + b2 - P)),
      });
      yrTransferred = 0;
    }
    if (b1 <= 0 && b2 <= 0) break;
  }

  const roundB1 = Math.round(b1);
  const roundB2 = Math.round(b2);
  return {
    principal: P,
    stpAmount: S,
    transferorRate: r1Rate,
    transfereeRate: r2Rate,
    totalMonths: months,
    totalTransferred: Math.round(totalTransferred),
    totalProfit: Math.max(0, Math.round(b1 + b2 - P)),
    balanceTransferor: roundB1,
    balanceTransferee: roundB2,
    totalValue: roundB1 + roundB2,
    schedule,
  };
}

/**
 * Step-Up SIP (without Android's accidental 10% expected return cap).
 */
export function calculateStepUpSip({
  monthlyAmount = 0,
  expectedReturnRate = 12,
  annualStepUpRate = 10,
  years = 10,
}) {
  const P = Math.max(0, safeNumber(monthlyAmount));
  const rAnnual = Math.max(0, safeNumber(expectedReturnRate));
  const sRate = Math.max(0, safeNumber(annualStepUpRate));
  const yYears = Math.min(50, Math.max(1, Math.round(safeNumber(years, 1))));

  const monthlyRate = rAnnual > 0 ? rAnnual / 12 / 100 : 0;
  const stepUpFraction = sRate / 100;

  let currentMonthlyDeposit = P;
  let totalInvested = 0;
  let balance = 0;
  const schedule = [];

  for (let y = 1; y <= yYears; y++) {
    for (let m = 1; m <= 12; m++) {
      totalInvested += currentMonthlyDeposit;
      balance = (balance + currentMonthlyDeposit) * (1 + monthlyRate);
    }
    schedule.push({
      year: y,
      invested: Math.round(totalInvested),
      returns: Math.round(Math.max(0, balance - totalInvested)),
      finalBalance: Math.round(balance),
    });
    currentMonthlyDeposit *= 1 + stepUpFraction;
  }

  const totalInvestment = totalInvested;
  const futureValue = balance;
  const totalReturns = Math.max(0, futureValue - totalInvestment);
  const invPercent = futureValue > 0 ? (totalInvestment / futureValue) * 100 : 0;
  const retPercent = futureValue > 0 ? (totalReturns / futureValue) * 100 : 0;

  return {
    monthlyAmount: P,
    expectedReturns: rAnnual,
    annualStepUp: sRate,
    period: yYears,
    totalInvestment,
    totalReturns,
    futureValue,
    invPercent: Number(invPercent.toFixed(1)),
    retPercent: Number(retPercent.toFixed(1)),
    schedule,
  };
}

/**
 * SIP With Inflation.
 * Fixes: separates expectedReturnRate (%) from expectedReturnsAmount (currency gain)
 * instead of overwriting the property.
 */
export function calculateSipWithInflation({
  monthlyAmount = 0,
  expectedReturnRate = 12,
  inflationRate = 6,
  years = 10,
}) {
  const P = Math.max(0, safeNumber(monthlyAmount));
  const rAnnual = Math.max(0, safeNumber(expectedReturnRate));
  const infRate = Math.max(0, safeNumber(inflationRate));
  const yYears = Math.min(50, Math.max(1, Math.round(safeNumber(years, 1))));
  const monthlyRate = rAnnual > 0 ? rAnnual / 12 / 100 : 0;

  const schedule = [];
  for (let y = 1; y <= yYears; y++) {
    const m = y * 12;
    const totalInvestedYear = P * m;
    const nominalFv =
      monthlyRate > 0
        ? P * ((Math.pow(1 + monthlyRate, m) - 1) / monthlyRate) * (1 + monthlyRate)
        : totalInvestedYear;
    const infFactor = Math.pow(1 + infRate / 100, y);
    const adjustedFv = infFactor > 0 ? nominalFv / infFactor : nominalFv;
    schedule.push({
      year: y,
      invested: Math.round(totalInvestedYear),
      returns: Math.round(Math.max(0, adjustedFv - totalInvestedYear)),
      finalBalance: Math.round(adjustedFv),
    });
  }

  const totalMonths = yYears * 12;
  const totalInvestment = P * totalMonths;
  const nominalFutureValue =
    monthlyRate > 0
      ? P *
        ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) *
        (1 + monthlyRate)
      : totalInvestment;
  const totalInfFactor = Math.pow(1 + infRate / 100, yYears);
  const futureValueAdjusted =
    totalInfFactor > 0 ? nominalFutureValue / totalInfFactor : nominalFutureValue;
  const expectedReturnsAmount = Math.max(0, futureValueAdjusted - totalInvestment);

  return {
    monthlyAmount: P,
    expectedReturnRate: rAnnual,
    inflationRate: infRate,
    period: yYears,
    totalInvestment: Math.round(totalInvestment),
    nominalFutureValue: Math.round(nominalFutureValue),
    expectedReturnsAmount: Math.round(expectedReturnsAmount),
    futureValue: Math.round(futureValueAdjusted),
    schedule,
  };
}

// ============================================================================
// 4. GST & VAT CALCULATORS
// ============================================================================

export function calculateGst({ amount = 0, rate = 18, mode = "add" }) {
  const P = Math.max(0, safeNumber(amount));
  const R = Math.max(0, safeNumber(rate));
  let baseAmount = P;
  let gstAmount = 0;
  let totalAmount = P;

  if (mode === "add") {
    baseAmount = P;
    gstAmount = (P * R) / 100;
    totalAmount = baseAmount + gstAmount;
  } else {
    totalAmount = P;
    if (1 + R / 100 > 0) {
      baseAmount = P / (1 + R / 100);
      gstAmount = totalAmount - baseAmount;
    }
  }

  return {
    mode,
    initialAmount: P,
    baseAmount,
    rate: R,
    gstAmount,
    totalAmount,
    halfRate: Number((R / 2).toFixed(2)),
    cgstAmount: gstAmount / 2,
    sgstAmount: gstAmount / 2,
    baseRatio: totalAmount > 0 ? Math.min(1, Math.max(0, baseAmount / totalAmount)) : 1,
    gstRatio: totalAmount > 0 ? Math.min(1, Math.max(0, gstAmount / totalAmount)) : 0,
  };
}

export function calculateVat({ amount = 0, rate = 18, mode = "add" }) {
  const res = calculateGst({ amount, rate, mode });
  return {
    mode: res.mode,
    initialAmount: res.initialAmount,
    baseAmount: res.baseAmount,
    rate: res.rate,
    vatAmount: res.gstAmount,
    totalAmount: res.totalAmount,
    baseRatio: res.baseRatio,
    vatRatio: res.gstRatio,
  };
}

// ============================================================================
// 5. LOAN CALCULATORS (4 MISSING TOOLS + ANDROID BUG FIXES)
// ============================================================================

export function addMonthsToDateKey(dateKey, monthsToAdd) {
  const d = parseLocalDate(dateKey);
  const targetDay = d.getDate();
  const shifted = new Date(d.getFullYear(), d.getMonth() + monthsToAdd, 1);
  const maxDayInMonth = new Date(
    shifted.getFullYear(),
    shifted.getMonth() + 1,
    0,
  ).getDate();
  shifted.setDate(Math.min(targetDay, maxDayInMonth));
  return toLocalDateKey(shifted);
}

export function computeLastEmiDateKey(firstEmiDateKey, tenureMonths) {
  const n = Math.max(1, Math.round(safeNumber(tenureMonths, 1)));
  return addMonthsToDateKey(firstEmiDateKey, n - 1);
}

/**
 * Computes live paid/outstanding loan metrics without Android's hardcoded "0" bug
 * or off-by-one lastEmiDate bug.
 */
export function calculateLoanProfileMetrics(loan, asOfDate = new Date()) {
  const principal = Math.max(0, safeNumber(loan?.principal_amount ?? loan?.amount));
  const rate = Math.max(0, safeNumber(loan?.interest_rate));
  const tenure = Math.max(1, Math.round(safeNumber(loan?.tenure_months, 1)));
  const fees = Math.max(0, safeNumber(loan?.processing_fees));
  const emi =
    safeNumber(loan?.emi_amount) > 0
      ? safeNumber(loan.emi_amount)
      : calculateLoanEmi(principal, rate, tenure);

  const firstEmiKey = toLocalDateKey(loan?.first_emi_date || loan?.loan_date || asOfDate);
  const lastEmiKey = loan?.last_emi_date
    ? toLocalDateKey(loan.last_emi_date)
    : computeLastEmiDateKey(firstEmiKey, tenure);
  const asOfKey = toLocalDateKey(asOfDate);

  let elapsedMonths = 0;
  for (let m = 0; m < tenure; m++) {
    const dueDateKey = addMonthsToDateKey(firstEmiKey, m);
    if (dueDateKey <= asOfKey) {
      elapsedMonths++;
    } else {
      break;
    }
  }

  const r = rate / 12 / 100;
  let balance = principal;
  let principalPaid = 0;
  let interestPaid = 0;
  let totalScheduledInterest = 0;

  for (let m = 1; m <= tenure; m++) {
    const monthInterest = balance * r;
    let monthPrincipal = Math.max(0, emi - monthInterest);
    if (m === tenure || balance - monthPrincipal < 0.01) {
      monthPrincipal = balance;
    }
    totalScheduledInterest += monthInterest;
    if (m <= elapsedMonths) {
      principalPaid += monthPrincipal;
      interestPaid += monthInterest;
    }
    balance = Math.max(0, balance - monthPrincipal);
  }

  const outstandingPrincipal = Math.max(0, principal - principalPaid);
  const outstandingInterest = Math.max(0, totalScheduledInterest - interestPaid);
  const totalPaid = principalPaid + interestPaid;
  const totalPayment = principal + totalScheduledInterest;
  const outstandingTotal = Math.max(0, totalPayment - totalPaid);

  return {
    emiAmount: emi,
    elapsedMonths,
    remainingMonths: Math.max(0, tenure - elapsedMonths),
    principalPaid,
    interestPaid,
    totalPaid,
    outstandingPrincipal,
    outstandingInterest,
    outstandingTotal,
    totalInterest: totalScheduledInterest,
    totalPayment,
    processingFees: fees,
    lastEmiDate: lastEmiKey,
  };
}

export function buildLoanAmortizationSchedule(loan) {
  const principal = Math.max(0, safeNumber(loan?.principal_amount ?? loan?.amount));
  const rate = Math.max(0, safeNumber(loan?.interest_rate));
  const tenure = Math.max(1, Math.round(safeNumber(loan?.tenure_months, 1)));
  const emi =
    safeNumber(loan?.emi_amount) > 0
      ? safeNumber(loan.emi_amount)
      : calculateLoanEmi(principal, rate, tenure);

  const firstKey = toLocalDateKey(loan?.first_emi_date || new Date());
  const r = rate / 12 / 100;
  let balance = principal;
  let yearlyPrincipal = 0;
  let yearlyInterest = 0;
  const rows = [];

  for (let m = 1; m <= tenure; m++) {
    const dueDateKey = addMonthsToDateKey(firstKey, m - 1);
    const interest = balance * r;
    let principalPart = Math.max(0, emi - interest);
    if (m === tenure || balance - principalPart < 0.01) {
      principalPart = balance;
    }
    balance = Math.max(0, balance - principalPart);

    rows.push({
      type: "month",
      month: m,
      date: dueDateKey,
      principal: principalPart,
      interest,
      balance,
    });

    yearlyPrincipal += principalPart;
    yearlyInterest += interest;

    const currentYear = parseLocalDate(dueDateKey).getFullYear();
    const nextYear = parseLocalDate(addMonthsToDateKey(firstKey, m)).getFullYear();
    if (nextYear !== currentYear || m === tenure) {
      rows.push({
        type: "yearly_total",
        year: currentYear,
        month: m,
        date: dueDateKey,
        principal: yearlyPrincipal,
        interest: yearlyInterest,
        balance,
      });
      yearlyPrincipal = 0;
      yearlyInterest = 0;
    }
  }
  return rows;
}

function tenureMonthsExact(principal, emi, monthlyRate) {
  if (principal <= 0 || emi <= 0) return 0;
  if (monthlyRate === 0) return principal / emi;
  if (emi <= principal * monthlyRate) return Infinity;
  return Math.log(emi / (emi - principal * monthlyRate)) / Math.log(1 + monthlyRate);
}

function amortizationMonthsAndInterest(principal, emi, monthlyRate) {
  let balance = principal;
  let months = 0;
  let totalInterest = 0;
  if (principal <= 0) return { months: 0, totalInterest: 0, isFinite: true };
  if (emi <= balance * monthlyRate) {
    return { months: Infinity, totalInterest: Infinity, isFinite: false };
  }
  let guard = 0;
  while (balance > 0 && guard < 1200) {
    guard++;
    const interest = balance * monthlyRate;
    const principalPart = emi - interest;
    if (principalPart >= balance) {
      const denom = emi - balance * monthlyRate;
      if (denom <= 0) {
        return { months: Infinity, totalInterest: Infinity, isFinite: false };
      }
      const fraction = balance / denom;
      months += fraction;
      totalInterest += balance * monthlyRate * fraction;
      balance = 0;
      break;
    }
    balance -= principalPart;
    totalInterest += interest;
    months += 1;
  }
  return { months, totalInterest, isFinite: balance === 0 };
}

/**
 * PrePayment & ROI Change Calculator.
 * Fixes Android bugs:
 * - Compares oldInterest against ORIGINAL principal (never newPrincipal)
 * - Consistent positive savings semantics (`interestSaved = oldInterest - newInterest`)
 */
export function calculateLoanPrepayment({
  mode = "prepayment",
  principal = 0,
  annualRate = 0,
  emi = 0,
  prepayment = 0,
  revisedAnnualRate = 0,
}) {
  const P = Math.max(0, safeNumber(principal));
  const R = Math.max(0, safeNumber(annualRate));
  const E = Math.max(0, safeNumber(emi));
  const prepay = Math.max(0, safeNumber(prepayment));
  const revR = Math.max(0, safeNumber(revisedAnnualRate));

  const r = R / 12 / 100;
  if (P <= 0 || E <= 0) {
    return { valid: false, error: "Please enter a valid outstanding amount and EMI." };
  }
  if (E <= P * r) {
    return {
      valid: false,
      error: "EMI is too low to cover monthly interest. Enter a higher EMI.",
    };
  }

  const oldMonths = tenureMonthsExact(P, E, r);
  const oldInterest = Math.max(0, E * oldMonths - P);

  if (mode === "prepayment") {
    if (prepay <= 0) {
      return { valid: false, error: "Please enter a valid prepayment amount." };
    }
    if (prepay >= P) {
      return {
        valid: false,
        error: "Prepayment cannot be greater than or equal to outstanding amount.",
      };
    }

    const newPrincipal = P - prepay;
    const f = Math.pow(1 + r, oldMonths);
    const newEmi =
      r > 0 && oldMonths > 0 ? (newPrincipal * r * f) / (f - 1) : newPrincipal / oldMonths;
    const newInterestSameTenure = Math.max(0, newEmi * oldMonths - newPrincipal);

    const tenureRes = amortizationMonthsAndInterest(newPrincipal, E, r);
    const newMonths = tenureRes.months;
    const newInterestSameEmi = Math.max(0, tenureRes.totalInterest);

    return {
      valid: true,
      mode,
      changeEmi: {
        newEmi,
        oldEmi: E,
        emiDiff: E - newEmi,
        newInterest: newInterestSameTenure,
        oldInterest,
        interestDiff: oldInterest - newInterestSameTenure,
        newMonths: oldMonths,
        oldMonths,
        monthsDiff: 0,
      },
      changeTenure: {
        newEmi: E,
        oldEmi: E,
        emiDiff: 0,
        newInterest: newInterestSameEmi,
        oldInterest,
        interestDiff: oldInterest - newInterestSameEmi,
        newMonths,
        oldMonths,
        monthsDiff: oldMonths - newMonths,
      },
    };
  }

  // ROI Change mode
  const rRev = revR / 12 / 100;
  const fRev = Math.pow(1 + rRev, oldMonths);
  const newEmi =
    rRev > 0 && oldMonths > 0 ? (P * rRev * fRev) / (fRev - 1) : P / oldMonths;
  const newInterestSameTenure = Math.max(0, newEmi * oldMonths - P);

  const tenureRes = amortizationMonthsAndInterest(P, E, rRev);

  return {
    valid: true,
    mode,
    changeEmi: {
      newEmi,
      oldEmi: E,
      emiDiff: E - newEmi, // positive means EMI reduced (saved)
      newInterest: newInterestSameTenure,
      oldInterest,
      interestDiff: oldInterest - newInterestSameTenure, // positive means interest reduced
      newMonths: oldMonths,
      oldMonths,
      monthsDiff: 0,
    },
    changeTenure: {
      isFinite: tenureRes.isFinite,
      newEmi: E,
      oldEmi: E,
      emiDiff: 0,
      newInterest: tenureRes.totalInterest,
      oldInterest,
      interestDiff: tenureRes.isFinite ? oldInterest - tenureRes.totalInterest : -Infinity,
      newMonths: tenureRes.months,
      oldMonths,
      monthsDiff: tenureRes.isFinite ? oldMonths - tenureRes.months : -Infinity,
    },
  };
}

/**
 * Moratorium Calculator.
 * Fixes Android bugs:
 * - Applies paidInstallments amortization BEFORE moratorium compounding
 * - Replaces Int.MAX_VALUE (2147483647) with explicit isAmortizable: false
 * - Computes remaining payment over remainingMonths instead of inflating by totalMonths
 */
export function calculateMoratorium({
  principal = 0,
  annualRate = 0,
  totalMonths = 12,
  moratoriumMonths = 0,
  option = "keep_emi", // "keep_emi" | "keep_tenure"
  paidInstallments = 0,
}) {
  const P = Math.max(0, safeNumber(principal));
  const rate = Math.max(0, safeNumber(annualRate));
  const months = Math.max(1, Math.round(safeNumber(totalMonths, 12)));
  const morMonths = Math.max(0, Math.round(safeNumber(moratoriumMonths)));
  const paid = Math.max(0, Math.min(months - 1, Math.round(safeNumber(paidInstallments))));

  const r = rate / 12 / 100;
  const baseEmi = calculateLoanEmi(P, rate, months);
  const baseTotalPayment = baseEmi * months;
  const baseTotalInterest = Math.max(0, baseTotalPayment - P);

  const noMoratorium = {
    totalPrincipal: P,
    monthlyEmi: baseEmi,
    tenure: months,
    totalInterest: baseTotalInterest,
    totalPayment: baseTotalPayment,
  };

  if (P <= 0 || baseEmi <= 0) {
    return {
      option,
      noMoratorium,
      moratorium: {
        isAmortizable: true,
        totalPrincipal: 0,
        monthlyEmi: 0,
        tenure: months,
        remainingMonths: Math.max(1, months - paid),
        totalInterest: 0,
        totalPayment: 0,
      },
    };
  }

  // Amortize installments paid BEFORE moratorium starts (when paid > 0 in option 1 or generally)
  let remainingPrincipalBeforeMor = P;
  let paidSoFar = 0;
  if (paid > 0) {
    for (let m = 1; m <= paid; m++) {
      const mInt = remainingPrincipalBeforeMor * r;
      const mPrin = Math.min(
        remainingPrincipalBeforeMor,
        Math.max(0, baseEmi - mInt),
      );
      remainingPrincipalBeforeMor = Math.max(0, remainingPrincipalBeforeMor - mPrin);
      paidSoFar += baseEmi;
    }
  }

  const compoundedPrincipal = remainingPrincipalBeforeMor * Math.pow(1 + r, morMonths);

  if (option === "keep_emi") {
    let isAmortizable = true;
    let exactRemainingMonths = 0;
    let remainingInterestAfterMor = 0;

    if (r === 0) {
      exactRemainingMonths = compoundedPrincipal / baseEmi;
      remainingInterestAfterMor = 0;
    } else if (baseEmi <= compoundedPrincipal * r) {
      isAmortizable = false;
    } else {
      const amort = amortizationMonthsAndInterest(compoundedPrincipal, baseEmi, r);
      isAmortizable = amort.isFinite;
      exactRemainingMonths = amort.months;
      remainingInterestAfterMor = amort.totalInterest;
    }

    if (!isAmortizable) {
      return {
        option,
        noMoratorium,
        moratorium: {
          isAmortizable: false,
          totalPrincipal: compoundedPrincipal,
          monthlyEmi: baseEmi,
          tenure: null,
          totalInterest: Infinity,
          totalPayment: Infinity,
          errorReason:
            "Monthly interest after moratorium exceeds the original EMI. Choose 'No Change in Loan Tenure' or reduce the moratorium period.",
        },
      };
    }

    const newRemainingMonths = Math.max(1, Math.ceil(exactRemainingMonths - 1e-9));
    const totalNewMonths = paid + newRemainingMonths;
    const totalPayment = paidSoFar + compoundedPrincipal + remainingInterestAfterMor;
    const totalInterest = Math.max(0, totalPayment - P);

    return {
      option,
      noMoratorium,
      moratorium: {
        isAmortizable: true,
        totalPrincipal: compoundedPrincipal,
        monthlyEmi: baseEmi,
        tenure: totalNewMonths,
        remainingMonths: newRemainingMonths,
        totalInterest,
        totalPayment,
      },
    };
  }

  // option === "keep_tenure": recompute EMI over remaining months
  const remainingMonths = Math.max(1, months - paid);
  const newEmi = calculateLoanEmi(compoundedPrincipal, rate, remainingMonths);
  const totalPayment = paidSoFar + newEmi * remainingMonths;
  const totalInterest = Math.max(0, totalPayment - P);

  return {
    option,
    noMoratorium,
    moratorium: {
      isAmortizable: true,
      totalPrincipal: compoundedPrincipal,
      monthlyEmi: newEmi,
      tenure: months,
      remainingMonths,
      totalInterest,
      totalPayment,
    },
  };
}

/**
 * Loan Eligibility Calculator.
 * Fixes Android bug: allows existingEmis === 0 cleanly.
 */
export function calculateLoanEligibility({
  monthlyIncome = 0,
  foirPercent = 35,
  existingEmis = 0,
  annualRate = 0,
  tenureMonths = 12,
}) {
  const income = Math.max(0, safeNumber(monthlyIncome));
  const foir = Math.min(95, Math.max(1, safeNumber(foirPercent, 35)));
  const emis = Math.max(0, safeNumber(existingEmis));
  const roi = Math.max(0, safeNumber(annualRate));
  const months = Math.max(1, Math.round(safeNumber(tenureMonths, 12)));

  const eligibleEmi = Math.max(0, (income * foir) / 100 - emis);
  const r = roi / 100 / 12;

  let eligibleLoanAmount = 0;
  if (eligibleEmi > 0 && months > 0) {
    if (r > 0) {
      const f = Math.pow(1 + r, months);
      eligibleLoanAmount = eligibleEmi * ((f - 1) / (r * f));
    } else {
      eligibleLoanAmount = eligibleEmi * months;
    }
  }

  return {
    monthlyIncome: income,
    foirPercent: foir,
    existingEmis: emis,
    annualRate: roi,
    tenureMonths: months,
    eligibleEmi,
    eligibleLoanAmount,
  };
}

// ============================================================================
// 6. OTHER UTILITY CALCULATORS
// ============================================================================

export function getDefaultNoteDenominations(currencyCode = "INR") {
  const code = String(currencyCode || "INR").toUpperCase();
  switch (code) {
    case "USD":
    case "CAD":
    case "AUD":
    case "SGD":
      return [100, 50, 20, 10, 5, 2, 1];
    case "EUR":
      return [500, 200, 100, 50, 20, 10, 5, 2, 1];
    case "GBP":
      return [50, 20, 10, 5, 2, 1];
    case "JPY":
      return [10000, 5000, 2000, 1000, 500, 100, 50, 10, 5, 1];
    case "AED":
      return [1000, 500, 200, 100, 50, 20, 10, 5, 1];
    case "CNY":
      return [100, 50, 20, 10, 5, 1];
    case "BRL":
      return [200, 100, 50, 20, 10, 5, 2, 1];
    case "RUB":
      return [5000, 2000, 1000, 500, 200, 100, 50, 10, 5, 2, 1];
    case "INR":
    default:
      return [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
  }
}

export const COUNTRIES_REGISTRY = [
  {
    id: "in",
    country: "India",
    flag: "🇮🇳",
    formatName: "Indian Format",
    currencyCode: "INR",
    symbol: "₹",
    unitSingular: "Rupee",
    unitPlural: "Rupees",
    subunitSingular: "Paisa",
    subunitPlural: "Paise",
    system: "indian",
    popular: true,
  },
  {
    id: "us",
    country: "United States",
    flag: "🇺🇸",
    formatName: "US Format",
    currencyCode: "USD",
    symbol: "$",
    unitSingular: "Dollar",
    unitPlural: "Dollars",
    subunitSingular: "Cent",
    subunitPlural: "Cents",
    system: "international",
    popular: true,
  },
  {
    id: "gb",
    country: "United Kingdom",
    flag: "🇬🇧",
    formatName: "UK Format",
    currencyCode: "GBP",
    symbol: "£",
    unitSingular: "Pound",
    unitPlural: "Pounds",
    subunitSingular: "Penny",
    subunitPlural: "Pence",
    system: "international",
    popular: true,
  },
  {
    id: "eu",
    country: "Eurozone (European Union)",
    flag: "🇪🇺",
    formatName: "Euro Format",
    currencyCode: "EUR",
    symbol: "€",
    unitSingular: "Euro",
    unitPlural: "Euros",
    subunitSingular: "Cent",
    subunitPlural: "Cents",
    system: "international",
    popular: true,
  },
  {
    id: "ae",
    country: "United Arab Emirates",
    flag: "🇦🇪",
    formatName: "UAE Format",
    currencyCode: "AED",
    symbol: "د.إ",
    unitSingular: "UAE Dirham",
    unitPlural: "UAE Dirhams",
    subunitSingular: "Fils",
    subunitPlural: "Fils",
    system: "international",
    popular: true,
  },
  {
    id: "ca",
    country: "Canada",
    flag: "🇨🇦",
    formatName: "Canada Format",
    currencyCode: "CAD",
    symbol: "C$",
    unitSingular: "Canadian Dollar",
    unitPlural: "Canadian Dollars",
    subunitSingular: "Cent",
    subunitPlural: "Cents",
    system: "international",
    popular: true,
  },
  {
    id: "au",
    country: "Australia",
    flag: "🇦🇺",
    formatName: "Australia Format",
    currencyCode: "AUD",
    symbol: "A$",
    unitSingular: "Australian Dollar",
    unitPlural: "Australian Dollars",
    subunitSingular: "Cent",
    subunitPlural: "Cents",
    system: "international",
    popular: true,
  },
  {
    id: "sg",
    country: "Singapore",
    flag: "🇸🇬",
    formatName: "Singapore Format",
    currencyCode: "SGD",
    symbol: "S$",
    unitSingular: "Singapore Dollar",
    unitPlural: "Singapore Dollars",
    subunitSingular: "Cent",
    subunitPlural: "Cents",
    system: "international",
    popular: true,
  },
  {
    id: "jp",
    country: "Japan",
    flag: "🇯🇵",
    formatName: "Japan Format",
    currencyCode: "JPY",
    symbol: "¥",
    unitSingular: "Japanese Yen",
    unitPlural: "Japanese Yen",
    subunitSingular: "Sen",
    subunitPlural: "Sen",
    system: "international",
    popular: true,
  },
  {
    id: "cn",
    country: "China",
    flag: "🇨🇳",
    formatName: "China Format",
    currencyCode: "CNY",
    symbol: "¥",
    unitSingular: "Chinese Yuan",
    unitPlural: "Chinese Yuan",
    subunitSingular: "Fen",
    subunitPlural: "Fen",
    system: "international",
    popular: true,
  },
  {
    id: "br",
    country: "Brazil",
    flag: "🇧🇷",
    formatName: "Brazil Format",
    currencyCode: "BRL",
    symbol: "R$",
    unitSingular: "Brazilian Real",
    unitPlural: "Brazilian Reais",
    subunitSingular: "Centavo",
    subunitPlural: "Centavos",
    system: "international",
    popular: false,
  },
  {
    id: "ru",
    country: "Russia",
    flag: "🇷🇺",
    formatName: "Russia Format",
    currencyCode: "RUB",
    symbol: "₽",
    unitSingular: "Russian Ruble",
    unitPlural: "Russian Rubles",
    subunitSingular: "Kopek",
    subunitPlural: "Kopeks",
    system: "international",
    popular: false,
  },
  {
    id: "sa",
    country: "Saudi Arabia",
    flag: "🇸🇦",
    formatName: "Saudi Format",
    currencyCode: "SAR",
    symbol: "SAR",
    unitSingular: "Saudi Riyal",
    unitPlural: "Saudi Riyals",
    subunitSingular: "Halala",
    subunitPlural: "Halalas",
    system: "international",
    popular: false,
  },
  {
    id: "ch",
    country: "Switzerland",
    flag: "🇨🇭",
    formatName: "Swiss Format",
    currencyCode: "CHF",
    symbol: "CHF",
    unitSingular: "Swiss Franc",
    unitPlural: "Swiss Francs",
    subunitSingular: "Rappen",
    subunitPlural: "Rappen",
    system: "international",
    popular: false,
  },
  {
    id: "pk",
    country: "Pakistan",
    flag: "🇵🇰",
    formatName: "Pakistan Format",
    currencyCode: "PKR",
    symbol: "₨",
    unitSingular: "Pakistani Rupee",
    unitPlural: "Pakistani Rupees",
    subunitSingular: "Paisa",
    subunitPlural: "Paisa",
    system: "indian",
    popular: false,
  },
  {
    id: "bd",
    country: "Bangladesh",
    flag: "🇧🇩",
    formatName: "Bangladesh Format",
    currencyCode: "BDT",
    symbol: "৳",
    unitSingular: "Bangladeshi Taka",
    unitPlural: "Bangladeshi Taka",
    subunitSingular: "Poisha",
    subunitPlural: "Poisha",
    system: "indian",
    popular: false,
  },
];

export function findCountryByCurrencyCode(currencyCode = "INR") {
  const code = String(currencyCode || "INR").toUpperCase();
  return (
    COUNTRIES_REGISTRY.find((c) => c.currencyCode === code) ||
    COUNTRIES_REGISTRY[0]
  );
}

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function convertThreeDigit(n) {
  let str = "";
  const hundred = Math.floor(n / 100);
  const remainder = n % 100;
  if (hundred > 0) {
    str += ONES[hundred] + " Hundred";
    if (remainder > 0) str += " ";
  }
  if (remainder > 0) {
    if (remainder < 20) str += ONES[remainder];
    else {
      const ten = Math.floor(remainder / 10);
      const unit = remainder % 10;
      str += TENS[ten] + (unit > 0 ? " " + ONES[unit] : "");
    }
  }
  return str.trim();
}

function convertTwoDigit(n) {
  if (n <= 0) return "";
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const unit = n % 10;
  return TENS[ten] + (unit > 0 ? " " + ONES[unit] : "");
}

export function integerToIndianWords(numStr) {
  const clean = String(numStr || "0").replace(/^0+/, "") || "0";
  if (clean === "0") return "Zero";
  try {
    let n = BigInt(clean);
    if (n === 0n) return "Zero";
    const parts = [];
    const hundredPart = Number(n % 1000n);
    n = n / 1000n;
    if (hundredPart > 0) parts.push(convertThreeDigit(hundredPart));

    const units = [
      { name: "Thousand", mod: 100n },
      { name: "Lakh", mod: 100n },
      { name: "Crore", mod: 100n },
      { name: "Arab", mod: 100n },
      { name: "Kharab", mod: 100n },
      { name: "Nil", mod: 100n },
      { name: "Padma", mod: 100n },
      { name: "Shankh", mod: 100n },
    ];
    let idx = 0;
    while (n > 0n && idx < units.length) {
      const chunk = Number(n % units[idx].mod);
      n = n / units[idx].mod;
      if (chunk > 0) parts.unshift(`${convertTwoDigit(chunk)} ${units[idx].name}`);
      idx++;
    }
    if (n > 0n) parts.unshift(`${convertTwoDigit(Number(n))} Super Crore`);
    return parts.filter(Boolean).join(" ");
  } catch {
    return "Number too large";
  }
}

export function integerToInternationalWords(numStr) {
  const clean = String(numStr || "0").replace(/^0+/, "") || "0";
  if (clean === "0") return "Zero";
  try {
    let n = BigInt(clean);
    if (n === 0n) return "Zero";
    const scales = [
      "",
      "Thousand",
      "Million",
      "Billion",
      "Trillion",
      "Quadrillion",
      "Quintillion",
      "Sextillion",
    ];
    const parts = [];
    let scaleIdx = 0;
    while (n > 0n && scaleIdx < scales.length) {
      const chunk = Number(n % 1000n);
      n = n / 1000n;
      if (chunk > 0) {
        const w = convertThreeDigit(chunk);
        parts.unshift(scales[scaleIdx] ? `${w} ${scales[scaleIdx]}` : w);
      }
      scaleIdx++;
    }
    if (n > 0n) parts.unshift(`${convertThreeDigit(Number(n))} Zillion`);
    return parts.filter(Boolean).join(" ");
  } catch {
    return "Number too large";
  }
}

export function convertAmountToWords(amountStr, countryOrCurrency = "INR", withOnlySuffix = false) {
  const countryConfig =
    typeof countryOrCurrency === "string"
      ? findCountryByCurrencyCode(countryOrCurrency)
      : countryOrCurrency || COUNTRIES_REGISTRY[0];

  const rawStr = String(amountStr ?? "").replace(/,/g, "").trim();
  if (!rawStr) {
    return `Zero ${countryConfig.unitPlural}${withOnlySuffix ? " Only" : ""}`;
  }
  if (!/^\d+(\.\d+)?$/.test(rawStr)) {
    return "Invalid Number";
  }

  const [integerPart = "0", rawFraction = ""] = rawStr.split(".");
  let fractionPart = rawFraction.slice(0, 2);
  if (fractionPart.length === 1) fractionPart += "0";

  const integerWords =
    countryConfig.system === "indian"
      ? integerToIndianWords(integerPart)
      : integerToInternationalWords(integerPart);

  let isOneUnit = false;
  try {
    isOneUnit = BigInt(integerPart || "0") === 1n;
  } catch {
    isOneUnit = false;
  }

  const mainUnit = isOneUnit ? countryConfig.unitSingular : countryConfig.unitPlural;
  let result = `${integerWords} ${mainUnit}`;

  const subVal = parseInt(fractionPart || "0", 10);
  if (subVal > 0) {
    const subWords = convertTwoDigit(subVal);
    const subUnit = subVal === 1 ? countryConfig.subunitSingular : countryConfig.subunitPlural;
    result += ` and ${subWords} ${subUnit}`;
  }

  if (withOnlySuffix) result += " Only";
  return result;
}

export function calculateCashNotes({
  denominations = [],
  counts = {},
  customDenom = 0,
  customCount = 0,
  currencyCode = "INR",
}) {
  let totalNotes = 0;
  let totalAmount = 0;

  const rows = denominations.map((denom) => {
    const count = Math.max(0, Math.floor(safeNumber(counts[denom])));
    const subtotal = denom * count;
    totalNotes += count;
    totalAmount += subtotal;
    return { denom, count, subtotal };
  });

  const cDenom = Math.max(0, Math.floor(safeNumber(customDenom)));
  const cCount = Math.max(0, Math.floor(safeNumber(customCount)));
  const cSubtotal = cDenom * cCount;
  totalNotes += cCount;
  totalAmount += cSubtotal;

  const amountInWords = convertAmountToWords(
    String(totalAmount),
    currencyCode,
    true,
  );

  return {
    rows,
    customRow: { denom: cDenom, count: cCount, subtotal: cSubtotal },
    totalNotes,
    totalAmount,
    amountInWords,
  };
}

export function calculateDiscount({
  amount = 0,
  discountPercent = 0,
  taxPercent = 0,
  mode = "after-tax",
}) {
  const P = Math.max(0, safeNumber(amount));
  const D = Math.min(100, Math.max(0, safeNumber(discountPercent)));
  const T = Math.max(0, safeNumber(taxPercent));

  let savings = 0;
  let salesTax = 0;
  let payableAmount = 0;

  if (mode === "after-tax") {
    salesTax = P * (T / 100);
    const amountWithTax = P + salesTax;
    savings = amountWithTax * (D / 100);
    payableAmount = Math.max(0, amountWithTax - savings);
  } else {
    savings = P * (D / 100);
    const discountedAmount = Math.max(0, P - savings);
    salesTax = discountedAmount * (T / 100);
    payableAmount = Math.max(0, discountedAmount + salesTax);
  }

  return {
    mode,
    initialAmount: P,
    savings,
    salesTax,
    payableAmount,
  };
}

export const FX_CURRENCIES = [
  { code: "USD", name: "United States Dollar", symbol: "$", flag: "🇺🇸", rate: 1.0 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳", rate: 86.5 },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺", rate: 0.92 },
  { code: "GBP", name: "British Pound Sterling", symbol: "£", flag: "🇬🇧", rate: 0.79 },
  { code: "AED", name: "United Arab Emirates Dirham", symbol: "د.إ", flag: "🇦🇪", rate: 3.67 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", flag: "🇨🇦", rate: 1.39 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "🇦🇺", rate: 1.54 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "🇯🇵", rate: 153.2 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", flag: "🇸🇬", rate: 1.34 },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", flag: "🇨🇭", rate: 0.89 },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", flag: "🇨🇳", rate: 7.24 },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", flag: "🇳🇿", rate: 1.68 },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", flag: "🇸🇦", rate: 3.75 },
  { code: "QAR", name: "Qatari Riyal", symbol: "QR", flag: "🇶🇦", rate: 3.64 },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "KD", flag: "🇰🇼", rate: 0.31 },
  { code: "BHD", name: "Bahraini Dinar", symbol: "BD", flag: "🇧🇭", rate: 0.38 },
  { code: "OMR", name: "Omani Rial", symbol: "OMR", flag: "🇴🇲", rate: 0.385 },
  { code: "ZAR", name: "South African Rand", symbol: "R", flag: "🇿🇦", rate: 18.25 },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", flag: "🇧🇷", rate: 5.75 },
  { code: "RUB", name: "Russian Ruble", symbol: "₽", flag: "🇷🇺", rate: 96.5 },
  { code: "KRW", name: "South Korean Won", symbol: "₩", flag: "🇰🇷", rate: 1395.0 },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", flag: "🇹🇷", rate: 34.4 },
  { code: "THB", name: "Thai Baht", symbol: "฿", flag: "🇹🇭", rate: 34.8 },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", flag: "🇲🇾", rate: 4.46 },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", flag: "🇮🇩", rate: 15850.0 },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", flag: "🇵🇭", rate: 58.7 },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", flag: "🇻🇳", rate: 25300.0 },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", flag: "🇧🇩", rate: 119.5 },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨", flag: "🇵🇰", rate: 278.2 },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs", flag: "🇱🇰", rate: 292.0 },
  { code: "NPR", name: "Nepalese Rupee", symbol: "Rs", flag: "🇳🇵", rate: 138.4 },
];

export const DEFAULT_FX_RATES = FX_CURRENCIES.reduce((acc, cur) => {
  acc[cur.code] = cur.rate;
  return acc;
}, {});

export function convertCurrency({
  amount = 0,
  fromCode = "USD",
  toCode = "INR",
  rates = DEFAULT_FX_RATES,
}) {
  const num = safeNumber(amount);
  const rFrom = safeNumber(rates?.[fromCode], 1) || 1;
  const rTo = safeNumber(rates?.[toCode], 1) || 1;
  const unitRate = rTo / rFrom;
  const convertedAmount = (num / rFrom) * rTo;
  const config = getCurrencyConfig(toCode);
  return {
    amount: num,
    fromCode,
    toCode,
    unitRate,
    convertedAmount,
    formattedResult: convertedAmount.toLocaleString(config?.locale || "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  };
}

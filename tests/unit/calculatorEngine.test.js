import { describe, it, expect } from "vitest";
import {
  calculateEmi,
  calculateQuickLoan,
  calculateEmiAdvance,
  compareLoans,
  calculateFd,
  calculateRd,
  calculatePpf,
  calculateInterest,
  calculateInflationImpact,
  calculateSip,
  calculateSwp,
  calculateStp,
  calculateStepUpSip,
  calculateSipWithInflation,
  calculateGst,
  calculateVat,
  calculateLoanEmi,
  calculateLoanProfileMetrics,
  buildLoanAmortizationSchedule,
  calculateLoanPrepayment,
  calculateMoratorium,
  calculateLoanEligibility,
  getDefaultNoteDenominations,
  calculateCashNotes,
  convertAmountToWords,
  calculateDiscount,
  convertCurrency,
  formatCalcMoney,
} from "@/lib/calculatorEngine";

describe("calculatorEngine: Currency & Formatting (no Android [0, 0.1]*100 bug)", () => {
  it("formats fractional values cleanly across active account currencies", () => {
    expect(formatCalcMoney(0.05, "USD", 2)).toBe("$0.05");
    expect(formatCalcMoney(1234.5, "INR", 2)).toBe("₹1,234.50");
    expect(formatCalcMoney(1000, "EUR", 0)).toMatch(/^€/);
  });
});

describe("calculatorEngine: EMI Calculators (4)", () => {
  it("calculates standard EMI & amortization schedule summing to principal", () => {
    const res = calculateEmi({
      principal: 100000,
      annualRate: 12,
      tenureMonths: 12,
      processingFeePercent: 1,
    });
    expect(res.emi).toBeCloseTo(8884.88, 2);
    expect(res.processingFeeAmount).toBe(1000);
    expect(res.schedule).toHaveLength(12);
    expect(res.schedule[11].balance).toBe(0);
    const totalPrincipalRepaid = res.schedule.reduce((s, r) => s + r.principal, 0);
    expect(totalPrincipalRepaid).toBeCloseTo(100000, 1);
  });

  it("Quick Calculator Period mode reconciles summary totals with amortization schedule", () => {
    const res = calculateQuickLoan({
      mode: "Period",
      principal: 100000,
      annualRate: 10,
      emi: 5000,
    });
    const monthRows = res.schedule.filter((r) => r.type === "month");
    expect(monthRows.length).toBe(res.totalMonths);
    const sumInterest = monthRows.reduce((s, r) => s + r.interest, 0);
    const sumPrincipal = monthRows.reduce((s, r) => s + r.principal, 0);
    expect(res.totalInterest).toBeCloseTo(sumInterest, 4);
    expect(res.totalPayment).toBeCloseTo(sumPrincipal + sumInterest, 4);
    expect(monthRows[monthRows.length - 1].balance).toBe(0);
  });

  it("Quick Calculator solves Amount, EMI, and Interest accurately", () => {
    const byAmount = calculateQuickLoan({
      mode: "Amount",
      annualRate: 6.5,
      periodYears: 5,
      emi: 10000,
    });
    expect(byAmount.principal).toBeCloseTo(511087, 0);

    const byRate = calculateQuickLoan({
      mode: "Interest",
      principal: 511087,
      periodYears: 5,
      emi: 10000,
    });
    expect(byRate.interestRate).toBeCloseTo(6.5, 1);
  });

  it("EMI in Advance computes Annuity Due lower than Arrears EMI", () => {
    const arrears = calculateEmiAdvance({
      principal: 100000,
      annualRate: 12,
      tenureMonths: 12,
      timing: "arrears",
    });
    const advance = calculateEmiAdvance({
      principal: 100000,
      annualRate: 12,
      tenureMonths: 12,
      timing: "advance",
    });
    expect(advance.emi).toBeCloseTo(arrears.emi / 1.01, 2);
    expect(advance.schedule[0].interest).toBe(0);
    expect(advance.schedule[0].isAdvance).toBe(true);
  });

  it("Compare Loans calculates exact differences", () => {
    const cmp = compareLoans(
      { principal: 100000, annualRate: 10, periodType: "monthly", period: 12 },
      { principal: 100000, annualRate: 12, periodType: "monthly", period: 12 },
    );
    expect(cmp.differences.lowerTotalOption).toBe("loan1");
    expect(cmp.differences.emiDiff).toBeCloseTo(cmp.loan2.emi - cmp.loan1.emi, 4);
  });
});

describe("calculatorEngine: Banking Calculators (5)", () => {
  it("FD Short Term locks to Days-only and removes 10-year schedule truncation", () => {
    const shortFd = calculateFd({
      principal: 10000,
      annualRate: 6.5,
      depositType: "Short Term",
      years: 5, // must be ignored in Short Term
      months: 6, // must be ignored in Short Term
      days: 180,
    });
    expect(shortFd.totalDays).toBe(180);
    expect(shortFd.totalInterest).toBeCloseTo(10000 * 0.065 * (180 / 365), 2);

    const longFd = calculateFd({
      principal: 100000,
      annualRate: 7,
      depositType: "Reinvestment/Cumulative",
      years: 20,
    });
    expect(longFd.schedule).toHaveLength(20);
  });

  it("RD calculates IBA quarterly compounding returns", () => {
    const rd = calculateRd({
      monthlyDeposit: 5000,
      annualRate: 6.5,
      tenureMonths: 12,
    });
    expect(rd.principal).toBe(60000);
    expect(rd.maturityAmount).toBeGreaterThan(60000);
    expect(rd.schedule).toHaveLength(1);
  });

  it("PPF enforces minimum 15 years and compounds annually on monthly balances", () => {
    const tooShort = calculatePpf({
      depositAmount: 10000,
      annualRate: 7.1,
      frequency: "Yearly",
      years: 5,
    });
    expect(tooShort.isBelowMinimum).toBe(true);
    expect(tooShort.tenureYears).toBe(15);

    const monthlyPpf = calculatePpf({
      depositAmount: 1000,
      annualRate: 7.1,
      frequency: "Monthly",
      years: 15,
    });
    // Year 1 interest: sum_{m=1..12}(m * 1000) * (0.071 / 12) = 78000 * 0.071 / 12 = 461.50
    expect(monthlyPpf.schedule[0].interest).toBeCloseTo(461.5, 2);
    expect(monthlyPpf.schedule[0].closing).toBeCloseTo(12461.5, 2);
  });

  it("Interest Calculator does not truncate schedule at 20 years", () => {
    const res = calculateInterest({
      principal: 50000,
      rate: 8,
      rateType: "Yearly",
      compoundInterval: "Annually",
      totalYears: 30,
    });
    expect(res.schedule).toHaveLength(30);
    expect(res.totalAmount).toBeCloseTo(50000 * Math.pow(1.08, 30), 2);
  });

  it("Inflation Impact computes future cost and purchasing power erosion", () => {
    const res = calculateInflationImpact({
      initialAmount: 100000,
      inflationRate: 6,
      years: 10,
    });
    expect(res.futureCost).toBeCloseTo(100000 * Math.pow(1.06, 10), 2);
    expect(res.futureValue).toBeCloseTo(100000 / Math.pow(1.06, 10), 2);
  });
});

describe("calculatorEngine: SIP Calculators (5)", () => {
  it("SIP and Step-Up SIP compute growth without 10% cap", () => {
    const sip = calculateSip({
      mode: "sip",
      amount: 10000,
      annualReturn: 12,
      years: 10,
    });
    expect(sip.investedAmount).toBe(1200000);
    expect(sip.totalValue).toBeCloseTo(2323391, 0);

    const stepUp = calculateStepUpSip({
      monthlyAmount: 10000,
      expectedReturnRate: 18,
      annualStepUpRate: 10,
      years: 5,
    });
    expect(stepUp.expectedReturns).toBe(18);
    expect(stepUp.futureValue).toBeGreaterThan(stepUp.totalInvestment);
  });

  it("SWP deducts withdrawal BEFORE interest and tracks exact depletion month", () => {
    const depleted = calculateSwp({
      totalInvestment: 10000,
      withdrawalPerMonth: 2500,
      annualReturn: 0,
      years: 1,
    });
    expect(depleted.totalWithdrawn).toBe(10000);
    expect(depleted.finalValue).toBe(0);
    expect(depleted.depletedMonth).toBe(4);
    expect(depleted.isDepletedBeforeEnd).toBe(true);

    // Month 1 withdrawal before interest: (100000 - 10000) * 1.01 = 90900
    const oneMonth = calculateSwp({
      totalInvestment: 100000,
      withdrawalPerMonth: 10000,
      annualReturn: 12,
      years: 1 / 12,
    });
    expect(oneMonth.finalValue).toBe(90900);
  });

  it("STP transfers monthly and tracks balances", () => {
    const stp10 = calculateStp({
      investmentAmount: 100000,
      stpAmount: 10000,
      transferorRate: 6,
      transfereeRate: 12,
      totalMonths: 10,
    });
    expect(stp10.totalTransferred).toBe(100000);
    // Remaining balance in transferor equals accrued 6% interest on declining principal (~2322)
    expect(stp10.balanceTransferor).toBeGreaterThan(2000);
    expect(stp10.balanceTransferee).toBeGreaterThan(100000);

    const stp12 = calculateStp({
      investmentAmount: 100000,
      stpAmount: 10000,
      transferorRate: 6,
      transfereeRate: 12,
      totalMonths: 12,
    });
    expect(stp12.balanceTransferor).toBe(0);
    expect(stp12.totalTransferred).toBeGreaterThan(100000);
  });

  it("SIP With Inflation separates rate (%) from currency returns amount", () => {
    const res = calculateSipWithInflation({
      monthlyAmount: 10000,
      expectedReturnRate: 15,
      inflationRate: 6,
      years: 10,
    });
    expect(res.expectedReturnRate).toBe(15);
    expect(res.expectedReturnsAmount).toBeGreaterThan(100000);
    expect(res.futureValue).toBeLessThan(res.nominalFutureValue);
  });
});

describe("calculatorEngine: GST & VAT (2)", () => {
  it("returns baseAmount, taxAmount, and totalAmount cleanly in both Add and Remove modes", () => {
    const addGst = calculateGst({ amount: 1000, rate: 18, mode: "add" });
    expect(addGst.baseAmount).toBe(1000);
    expect(addGst.gstAmount).toBe(180);
    expect(addGst.totalAmount).toBe(1180);

    const removeGst = calculateGst({ amount: 1180, rate: 18, mode: "remove" });
    expect(removeGst.baseAmount).toBeCloseTo(1000, 2);
    expect(removeGst.gstAmount).toBeCloseTo(180, 2);
    expect(removeGst.totalAmount).toBe(1180);

    const removeVat = calculateVat({ amount: 1150, rate: 15, mode: "remove" });
    expect(removeVat.baseAmount).toBeCloseTo(1000, 2);
    expect(removeVat.vatAmount).toBeCloseTo(150, 2);
  });
});

describe("calculatorEngine: Loan Suite (4 missing tools + Android bug fixes)", () => {
  it("Loan Profile computes non-zero paid principal/interest and exact lastEmiDate", () => {
    const emi = calculateLoanEmi(120000, 12, 12);
    const metrics = calculateLoanProfileMetrics(
      {
        principal_amount: 120000,
        interest_rate: 12,
        tenure_months: 12,
        emi_amount: emi,
        processing_fees: 500,
        loan_date: "2026-01-01",
        first_emi_date: "2026-02-01",
      },
      new Date(2026, 4, 15), // 4 EMIs paid: Feb, Mar, Apr, May
    );
    expect(metrics.lastEmiDate).toBe("2027-01-01");
    expect(metrics.elapsedMonths).toBe(4);
    expect(metrics.principalPaid).toBeGreaterThan(35000);
    expect(metrics.interestPaid).toBeGreaterThan(3500);
    expect(metrics.outstandingPrincipal).toBeCloseTo(120000 - metrics.principalPaid, 2);

    const schedule = buildLoanAmortizationSchedule({
      principal_amount: 120000,
      interest_rate: 12,
      tenure_months: 12,
      emi_amount: emi,
      first_emi_date: "2026-02-01",
    });
    expect(schedule.filter((r) => r.type === "month")).toHaveLength(12);
  });

  it("Prepayment compares oldInterest against original principal (not newPrincipal)", () => {
    const principal = 1000000;
    const rate = 9;
    const emi = calculateLoanEmi(principal, rate, 120);
    const res = calculateLoanPrepayment({
      mode: "prepayment",
      principal,
      annualRate: rate,
      emi,
      prepayment: 200000,
    });
    expect(res.valid).toBe(true);
    // oldInterest must be emi*120 - 1,000,000 (~520,109), NOT emi*120 - 800,000
    expect(res.changeEmi.oldInterest).toBeCloseTo(emi * 120 - principal, 0);
    expect(res.changeEmi.interestDiff).toBeGreaterThan(0);
    expect(res.changeTenure.interestDiff).toBeGreaterThan(0);
    expect(res.changeTenure.monthsDiff).toBeGreaterThan(20);
  });

  it("Moratorium accounts for paidInstallments and avoids Int.MAX_VALUE when unpayable", () => {
    const paidRes = calculateMoratorium({
      principal: 1000000,
      annualRate: 12,
      totalMonths: 120,
      moratoriumMonths: 6,
      option: "keep_tenure",
      paidInstallments: 24,
    });
    expect(paidRes.moratorium.isAmortizable).toBe(true);
    // Compounded principal after 24 payments should be lower than starting from 1,000,000
    expect(paidRes.moratorium.totalPrincipal).toBeLessThan(1000000);
    expect(paidRes.moratorium.tenure).toBe(120);

    // Huge moratorium where monthly interest > original EMI -> isAmortizable: false (never 2147483647)
    const unpayable = calculateMoratorium({
      principal: 1000000,
      annualRate: 18,
      totalMonths: 240,
      moratoriumMonths: 48,
      option: "keep_emi",
      paidInstallments: 0,
    });
    expect(unpayable.moratorium.isAmortizable).toBe(false);
    expect(unpayable.moratorium.tenure).toBeNull();
  });

  it("Loan Eligibility permits 0 existing EMIs cleanly", () => {
    const res = calculateLoanEligibility({
      monthlyIncome: 100000,
      foirPercent: 50,
      existingEmis: 0,
      annualRate: 9,
      tenureMonths: 240,
    });
    expect(res.eligibleEmi).toBe(50000);
    expect(res.eligibleLoanAmount).toBeGreaterThan(5500000);
  });
});

describe("calculatorEngine: Other Utility Calculators (4)", () => {
  it("Cash Note Counter returns currency denominations, total, and amount in words", () => {
    expect(getDefaultNoteDenominations("USD")[0]).toBe(100);
    const res = calculateCashNotes({
      denominations: [500, 100],
      counts: { 500: 3, 100: 2 },
      customDenom: 50,
      customCount: 1,
      currencyCode: "INR",
    });
    expect(res.totalNotes).toBe(6);
    expect(res.totalAmount).toBe(1750);
    expect(res.amountInWords).toBe(
      "One Thousand Seven Hundred Fifty Rupees Only",
    );
  });

  it("Amount To Word formats Indian and US systems accurately", () => {
    expect(convertAmountToWords("125000.50", "INR", true)).toBe(
      "One Lakh Twenty Five Thousand Rupees and Fifty Paise Only",
    );
    expect(convertAmountToWords("125000.50", "USD", true)).toBe(
      "One Hundred Twenty Five Thousand Dollars and Fifty Cents Only",
    );
  });

  it("Discount Calculator computes Before Tax and After Tax", () => {
    const afterTax = calculateDiscount({
      amount: 100,
      discountPercent: 10,
      taxPercent: 10,
      mode: "after-tax",
    });
    expect(afterTax.salesTax).toBe(10);
    expect(afterTax.savings).toBe(11);
    expect(afterTax.payableAmount).toBe(99);

    const beforeTax = calculateDiscount({
      amount: 100,
      discountPercent: 10,
      taxPercent: 10,
      mode: "before-tax",
    });
    expect(beforeTax.savings).toBe(10);
    expect(beforeTax.salesTax).toBe(9);
    expect(beforeTax.payableAmount).toBe(99);
  });

  it("Currency Converter translates cross rates accurately", () => {
    const fx = convertCurrency({
      amount: 100,
      fromCode: "USD",
      toCode: "EUR",
      rates: { USD: 1, EUR: 0.92 },
    });
    expect(fx.convertedAmount).toBeCloseTo(92, 4);
  });
});

describe("calculatorEngine: Audit Edge Cases & Reconciliation", () => {
  it("handles 0-decimal JPY, -0.001, NaN, and Infinity cleanly in formatCalcMoney", () => {
    expect(formatCalcMoney(12345.67, "JPY", 2)).toBe("¥12,346");
    expect(formatCalcMoney(-0.001, "INR", 2)).toBe("₹0.00");
    expect(formatCalcMoney(NaN, "USD", 2)).toBe("$0.00");
    expect(formatCalcMoney(Infinity, "USD", 2)).toBe("$0.00");
  });

  it("handles 0% interest and extreme tenures in calculateEmi & calculateEmiAdvance", () => {
    const zeroEmi = calculateEmi({
      principal: 120000,
      annualRate: 0,
      tenureMonths: 12,
    });
    expect(zeroEmi.emi).toBe(10000);
    expect(zeroEmi.totalInterest).toBe(0);
    expect(zeroEmi.schedule[11].balance).toBe(0);

    const singleAdv = calculateEmiAdvance({
      principal: 50000,
      annualRate: 12,
      tenureMonths: 1,
      timing: "advance",
      processingFee: 2,
      gstPercent: 18,
    });
    expect(singleAdv.emi).toBeCloseTo(50000, 2);
    expect(singleAdv.totalInterest).toBeCloseTo(0, 2);
    expect(singleAdv.feeAmount).toBe(1000);
    expect(singleAdv.gstOnFee).toBe(180);
  });

  it("Quick Loan Period mode never produces a final balloon payment > EMI and Interest mode converges for ultra-low rates", () => {
    const res = calculateQuickLoan({
      mode: "Period",
      principal: 100000,
      annualRate: 10,
      emi: 5000,
    });
    const monthRows = res.schedule.filter((r) => r.type === "month");
    for (const row of monthRows) {
      expect(row.principal + row.interest).toBeLessThanOrEqual(5000.01);
    }

    const lowRate = calculateQuickLoan({
      mode: "Interest",
      principal: 100000,
      periodYears: 1,
      emi: calculateLoanEmi(100000, 0.01, 12),
    });
    expect(lowRate.interestRate).toBeCloseTo(0.01, 3);

    const empty = calculateQuickLoan({
      mode: "Period",
      principal: 0,
      annualRate: 10,
      emi: 0,
    });
    expect(empty.schedule).toHaveLength(0);
  });

  it("RD multi-year schedule satisfies opening + invested + interest === closing every year", () => {
    const rd = calculateRd({
      monthlyDeposit: 5000,
      annualRate: 7.5,
      tenureMonths: 36,
    });
    expect(rd.schedule).toHaveLength(3);
    let prevClosing = 0;
    let sumInterest = 0;
    for (const row of rd.schedule) {
      expect(row.opening).toBeCloseTo(prevClosing, 4);
      expect(row.opening + row.invested + row.interest).toBeCloseTo(row.closing, 4);
      prevClosing = row.closing;
      sumInterest += row.interest;
    }
    expect(sumInterest).toBeCloseTo(rd.totalInterest, 2);
    expect(prevClosing).toBeCloseTo(rd.maturityAmount, 2);
  });

  it("Loan Profile & Moratorium guard against negative amortization and zero principal", () => {
    const metrics = calculateLoanProfileMetrics(
      {
        principal_amount: 100000,
        interest_rate: 12,
        tenure_months: 12,
        emi_amount: 500, // deliberately below monthly interest (1000)
        loan_date: "2026-01-01",
        first_emi_date: "2026-02-01",
      },
      new Date(2026, 4, 15),
    );
    expect(metrics.principalPaid).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(metrics.outstandingPrincipal)).toBe(true);

    const zeroMor = calculateMoratorium({
      principal: 0,
      annualRate: 0,
      totalMonths: 12,
      moratoriumMonths: 3,
      option: "keep_emi",
      paidInstallments: 0,
    });
    expect(Number.isNaN(zeroMor.moratorium.totalPayment)).toBe(false);
    expect(zeroMor.moratorium.totalPayment).toBe(0);

    const keepEmiMor = calculateMoratorium({
      principal: 500000,
      annualRate: 10,
      totalMonths: 60,
      moratoriumMonths: 3,
      option: "keep_emi",
      paidInstallments: 6,
    });
    expect(keepEmiMor.moratorium.isAmortizable).toBe(true);
    expect(keepEmiMor.moratorium.totalInterest).toBeGreaterThan(
      keepEmiMor.noMoratorium.totalInterest,
    );
    expect(keepEmiMor.moratorium.tenure).toBeGreaterThan(60);
  });
});

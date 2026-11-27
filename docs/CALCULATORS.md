# Calculators

All 24 calculators are pure functions in `src/lib/calculatorEngine.js` (~2,200 lines) rendered by
React components and registered in `src/app/(private)/calculators/page.jsx`
(`CALCULATOR_CATEGORIES` → `ALL_CALCULATORS`). Currency symbols follow the **active account currency**.

## How the hub works

- Route `/calculators` shows a searchable grid by category. Selecting one updates the URL to
  `/calculators?type=<calculator-id>&category=<category-id>` (via `router.replace`) and renders the tool.
  Old URLs `/calculators-m?type=…` redirect (middleware) preserving the query.
- Every tool is `next/dynamic` with `ssr:false`; fallback is `<AppLoader variant="section" label="Opening calculator" />`.
- To **add a calculator**:
  1. Add a pure function to `calculatorEngine.js` and unit tests in `tests/unit/calculatorEngine.test.js`.
  2. Create the UI component (`src/app/(private)/calculators-m/components/` for classic ones or
     `src/components/calculators/v2/` for loan-style ones; wrap with `CalculatorShell` for v2).
  3. Add a `dynamicCalc(() => import(...))`, an entry in `CALCULATOR_CATEGORIES` (id, title, shortTitle, icon, description)
     and a `case` in `renderTool`.
  4. Update the landing page's calculator teaser if you want it showcased and update this doc.

## Catalog (24)

### EMI (4)
| id | Component | Engine function | Notes |
| --- | --- | --- | --- |
| `emi-calculator` | `EmiC` | `calculateEmi` | EMI, total interest, processing fee %, full amortization schedule |
| `quick-calculator` | `Qcalculator` | `calculateQuickLoan` | Solve for **EMI / Amount / Period / Interest**; Period mode uses `ceil(exactMonths − 1e-9)` so summary = schedule; Interest mode via bisection (`low=1e-9`, 80 iterations) |
| `emi-in-advance` | `EmiAdvance` | `calculateEmiAdvance` | Annuity-due vs arrears; fee types percent/fixed; GST on fee |
| `compare-loans` | `CompareLoan` | `compareLoans` | Side-by-side cost comparison |

### Banking (5)
| id | Component | Engine | Notes |
| --- | --- | --- | --- |
| `fd-calculator` | `FdCalculator` | `calculateFd` | Cumulative vs payout, quarterly compounding; **Short Term locks to days only**; no 10-year schedule cap |
| `rd-calculator` | `RdCalculator` | `calculateRd` | IBA-style quarterly compounding; per-year `opening + invested + interest = closing` |
| `ppf-calculator` | `PpfCalculator` | `calculatePpf` | 15–50 yrs (min 15 enforced), monthly-balance interest compounded once per year |
| `interest-calculator` | `InterestCalculator` | `calculateInterest` | Simple & compound (various intervals); no 20-year cap |
| `inflation-impact` | `InflationImpact` | `calculateInflationImpact` | Future cost & purchasing-power erosion |

### SIP (5)
| id | Component | Engine | Notes |
| --- | --- | --- | --- |
| `sip-calculator` | `SipCalculator` | `calculateSip` | Modes (`sip`, …) wealth growth; no 10 % return cap |
| `swp-calculator` | `SwpCalculator` | `calculateSwp` | Withdrawal **before** interest (Android parity); reports exact depletion month |
| `stp-calculator` | `StpCalculator` | `calculateStp` | Source → target fund monthly transfers with separate rates |
| `step-up-sip` | `StepUpSipCalculator` | `calculateStepUpSip` | Annual % step-up |
| `sip-with-inflation` | `SipWithInflation` | `calculateSipWithInflation` | Separates `expectedReturnRate` (%) from `expectedReturnsAmount` (currency) |

### GST & VAT (2)
`gst-calculator` (`GstCalculator`, `calculateGst`, CGST/SGST 50-50 split) and `vat-calculator`
(`VatCalculator`, `calculateVat`). Modes `add` (exclusive) / `remove` (inclusive); returns
`baseAmount`, `taxAmount`, `totalAmount`.

### Loan (4, "v2")
| id | Component | Engine | Notes |
| --- | --- | --- | --- |
| `loan-profile` | `LoanProfileCalculator` | `calculateLoanProfileMetrics`, `buildLoanAmortizationSchedule`, `computeLastEmiDateKey` | **Persisted** loans (`loan_profiles` store/table, synced). Paid/outstanding computed live; amortization floors principal at `max(0, emi − interest)` |
| `pre-payment-roi-change` | `PrePaymentRoiCalculator` | `calculateLoanPrepayment` | Compares old interest against the **original** principal; `interestSaved = oldInterest − newInterest` |
| `moratorium-calculator` | `MoratoriumCalculator` | `calculateMoratorium` | Applies paid installments first; returns `isAmortizable:false` instead of Android's `Int.MAX_VALUE`; zero-principal guard |
| `loan-eligible-calculator` | `LoanEligibleCalculator` | `calculateLoanEligibility` | Income × FOIR% − existing EMIs → max EMI → eligible principal; `existingEmis = 0` allowed |

### Other (4)
| id | Component | Engine | Notes |
| --- | --- | --- | --- |
| `cash-note-counter` | `CashNoteCounter` | `calculateCashNotes`, `getDefaultNoteDenominations`, `convertAmountToWords` | Denomination tally per currency + total in words |
| `amount-to-word` | `AmountToWord` | `convertAmountToWords`, `integerToIndianWords`, `integerToInternationalWords`, `COUNTRIES_REGISTRY` | Indian (lakh/crore) & international cheque words |
| `discount-calculator` | `DiscountCalculator` | `calculateDiscount` | `before-tax` / `after-tax` modes |
| `currency-converter` | `CurrencyConverter` | `convertCurrency`, `FX_CURRENCIES`, `DEFAULT_FX_RATES` | **Only third-party network call in the app**: `GET https://open.er-api.com/v6/latest/USD`; falls back to bundled `DEFAULT_FX_RATES` when offline/failed |

## Conventions inside the engine

- `round2`, `safeNumber`, `formatCalcMoney(value, currencyCode, decimals)` — zero-decimal currencies
  (JPY/KRW/VND) render without decimals, no negative zero, NaN/Infinity-safe.
- Calculators return plain objects (summary fields + `schedule` arrays); components only format.
- 0 % rates and extreme tenures are handled explicitly (EMI = principal / n).
- Many fixes intentionally diverge from Android bugs; each is documented in the function's JSDoc and
  covered by tests (see [HISTORY_AND_DECISIONS.md](./HISTORY_AND_DECISIONS.md#4-calculation-audit-2026-11-27)).

## Tests
`tests/unit/calculatorEngine.test.js` (grouped by category + "Audit Edge Cases & Reconciliation") and
`tests/e2e/phase4-calculators.spec.mjs` (hub, loan tools, currency propagation, layouts).

# History, Decisions & Known Issues

> **Provenance note.** Git history only starts on 2026-11-26 (`initial commit`), after the project
> had already been built. The timeline for the earlier phases below is **reconstructed from the code,
> tests (`phase1`…`phase6`) and file comments**, not from commit logs. The audit/optimization and
> loader/404 work (2026-11-27) is documented from the actual changes.

## 1. Origin

SpendScope started as a minimal Next.js foundation ("authentication and a private dashboard" — the old
README) and evolved into a **web port of the SpendScope Android app** (`../spend_scope_android`).
The goal: feature parity with Android, cross-platform sync through the same Supabase tables, plus
web-specific upgrades (guest mode, OCR, voice, PDF/CSV, 24 calculators, App Lock via PIN/passkey).

A fresh Supabase project ("v2") was created with a schema strictly compatible with the Android data
shape (`202611260001_spendscope_v2_schema.sql`); the earlier project's definitions are archived in
`supabase/_archive_old_project/`.

## 2. Build phases (as reflected by the tests)

| Phase | Theme | What was delivered |
| --- | --- | --- |
| 1 | Navigation & shell | Landing page, "Continue as Guest", route structure, `AppShell`, responsive layouts |
| 2 | Core finance | Multi-account switching, transaction entry with expression keypad, filtering, analytics charts, Spend Buckets CRUD |
| 3 | Categories & settings | Category CRUD + 3-mode color picker, reassign-to-"Other" on delete, account transfers, Budget Mode, 4-mode Reset Data, security basics |
| 4 | Calculators | Unified `/calculators` hub, all 24 calculators including 4 Loan tools, active-account currency propagation, fixes to known Android formula bugs |
| 5 | Advanced & sync | Self-hosted receipt OCR, voice entry, PIN/passkey App Lock with lockout, reminders (+ `.ics`), IndexedDB outbox sync engine, guest→cloud merge |
| 6 | Visual QA | Light/Dark theme matrix across routes/viewports with no overflow or console errors |

## 3. Timeline (git)

| Date | Commit | Summary |
| --- | --- | --- |
| 2026-11-26 | `20a4489` initial commit | Full app as described above |
| 2026-11-27 | `3fa8c7a` | Config updates, middleware enhancements, calculator component improvements (audit work begins) |
| 2026-11-27 | `0faa8f4` | Removed styled-components; optimized/lazy-loaded calculators |
| 2026-11-27 | `8382128` | Animations + redesigned 404 page |
| 2026-11-27 | `958d2b0` | `AppLoader` component rolled out to pages |
| 2026-11-27 | `cb89690` | `AppLoader` in additional components; `/loader-preview` dev page |
| 2026-11-27 | (this change) | `docs/` folder, Cursor rule, refreshed root README |

## 4. Calculation audit (2026-11-27)

A full functional review of all 24 calculators and core finance flows. Fixes (all with tests):

- **Quick Loan:** Period mode uses `ceil(exactMonths − 1e-9)` so summary matches the schedule and no
  balloon final payment; guards for non-positive principal/EMI; interest solving via bisection
  (`low = 1e-9`, 80 iterations) converges for ultra-low rates.
- **RD:** schedule opening = previous closing; yearly interest = `maturity − prevClosing − invested`
  so `opening + invested + interest = closing` every year.
- **Loan Profile / amortization:** principal portion floored at `max(0, emi − interest)`.
- **Moratorium:** zero-principal guard, amortization computed before moratorium, explicit
  `isAmortizable:false`.
- **Money formatting:** `formatMoney`, `formatCalcMoney` and `formatPdfMoney` are zero-decimal aware
  (JPY/KRW/VND), avoid negative zero and NaN/Infinity.
- **Totals everywhere** (Analytics donut/yearly bars, `useTransactions`, Transactions page, PDF/CSV)
  aggregate in integer minor units so sums reconcile to the cent.
- **Analytics icon bug:** category icon uses `icon_key || icon`.
- Earlier-phase fixes that remain intentional divergences from Android (documented in JSDoc):
  FD short-term days-only, no 10-year/20-year schedule truncation, PPF min 15 years, SWP
  withdrawal-before-interest, Step-Up SIP without the 10 % cap, SIP-with-inflation field separation,
  Prepayment compares old interest to **original** principal, Loan Eligibility allows 0 existing EMIs,
  fractional amounts no longer truncated by `[0, 0.1] × 100` style bugs.

## 5. Optimization (2026-11-27)

- All 24 calculators lazy-loaded with `next/dynamic` (`ssr:false`).
- `subscribeDataChanged` listeners in hooks filtered by `detail.storeName` (no more all-store reloads).
- `/transactions`: pagination (`PAGE_SIZE 200`), memoized rows, deferred search.
- Analytics charts (recharts) lazy-loaded.
- Removed **styled-components** (dependency, `compiler.styledComponents`, `src/lib/registry.jsx`) and
  unused `ResetButton.jsx`, `SideAdvertisement.jsx`.
- Result (build output): shared JS ≈ 103 kB; `/calculators` ≈ 211 kB; `/transactions` ≈ 232 kB;
  `/dashboard` ≈ 236 kB. (Shared bundle had briefly gone 102 → 103 kB during the work.)
- Verification at that point: 72/72 unit tests, 0 lint warnings, clean build, 18/18 E2E.

## 6. Loader, 404 and preview (2026-11-27)

- Replaced the plain "Loading SpendScope…" text in `provider.jsx` with `AppLoader` and applied it to
  every loading state (see [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md#5-loaders-and-404)).
- Designed the editorial 404 page.
- Added `/loader-preview` because the real loader flashes too quickly to evaluate by eye.

## 7. Architecture decision records (ADRs)

| # | Decision | Why | Consequence |
| --- | --- | --- | --- |
| 1 | **Local-first with IndexedDB + outbox** | Instant UI, offline use, guest mode without a backend | Need a sync engine, conflict policy and merge logic |
| 2 | **Guest-first, no route protection** | Zero-friction onboarding; privacy-friendly | Middleware only handles legacy redirects; "auth" gating is by feature (sync) not route |
| 3 | **Same Supabase tables as Android** | One account across Web ↔ Android | Strict column compatibility; web-only features get separate tables (`loan_profiles`, `user_preferences`) |
| 4 | **No server-side seeding** | Android backups must not collide with pre-seeded defaults | Seed on client **after** a clean pull |
| 5 | **Device-local App Lock** | Cloud never stores secrets; matches Android | Not encrypted at rest; passkey is convenience only |
| 6 | **Hard deletes pushed to cloud** | Simple outbox semantics | `deleted_at` columns are for Android compatibility; web ignores them on pull |
| 7 | **Transfers = paired expense/income rows with `transfer_group_id`** | Matches Android model; works with existing CHECK constraints | Every aggregation must exclude `transfer_group_id` rows |
| 8 | **Minor-unit aggregation** | Prevent float drift and Android's truncation bugs | Slight verbosity in sums; enforced by tests |
| 9 | **Local-midnight → UTC for dates** | Compatibility with Android's `FinancialSyncWorker` | Always use `dateUtils` |
| 10 | **Self-hosted Tesseract** | Privacy: receipts never leave the device; works offline | ~28 MB of static assets in `public/tesseract` |
| 11 | **Redux only for UI/theme/auth, not data** | Data of record is IndexedDB | Hooks refresh on `subscribeDataChanged` |
| 12 | **Tailwind v4 + CSS variable tokens** | Runtime accent/dark theming | Tokens duplicated in CSS and `theme.js` (keep in sync) |
| 13 | **Pure-CSS loader (no hooks/Redux)** | Must render before providers are ready | Animations live in `globals.css` |
| 14 | **Remove styled-components** | Unused weight / SSR registry complexity | Tailwind/CSS only |
| 15 | **Calculator logic in one pure engine** | Testable without React | Large file (`calculatorEngine.js`); tests mandatory when editing |

## 8. Known issues & technical debt (as of 2026-11-27)

Nothing here is user-facing broken; it is cleanup/risks to be aware of.

1. `src/app/utils/theme.js` is an **unused duplicate** (differs from `src/utils/theme.js`) — delete after confirming.
2. `src/app/globals.css` still has `.ant-select-*` / `.ant-picker-*` rules from an old Ant Design UI;
   `antd` is not a dependency anymore.
3. `tailwind.config.mjs` contains unused `costomNNN` breakpoints.
4. `deno.lock` in the project root is a leftover (nothing in the app uses Deno).
5. `redux/slices/appSlice.js`: the **whole slice is persisted** (including `syncStatus`, `isAppLocked`,
   `quickAddOpen`); `quickAddOpen` is not used anywhere; `authSlice` has legacy action aliases
   (`logingAuth`, `logoutUser`) kept "for phased migration".
6. Legacy redirect pages (`/calculators-m`, `/spend-budget`) are redundant with `middleware.js` redirects.
7. The calculator components live in `app/(private)/calculators-m/components/` (misleading folder name).
8. DB CHECK allows `transactions.kind = 'transfer'`, but web never writes it (coerces to income/expense).
9. `/loader-preview` returns the 404 UI with HTTP **200** in production (not a true 404); it's `noindex`.
10. No conflict resolution beyond "pending local wins, else remote wins" — concurrent edits from
    Android and Web can overwrite each other (last push wins).
11. Currency changes don't convert existing amounts (by design); account transfers between different
    currencies are allowed with no FX conversion (the service returns `currencyMismatch`).
12. Dark-mode visuals of the loader/404 have not been screenshot-verified.
13. One E2E (phase3 on desktop) flaked once under heavy parallel load; re-run passed.
14. The root `README.md` was historically stale (described only the first auth/dashboard foundation);
    treat `docs/` as authoritative.
15. No CI configuration is checked in (no `.github/workflows`); verification is manual
    (lint → test → build → e2e).

## 9. Ideas / future work

- Remove debt items above; add CI running lint, unit tests, build and Playwright.
- Encrypt IndexedDB data at rest (derive key from PIN) if stronger privacy is needed.
- Incremental sync (pull deltas via `updated_at`) instead of full-table pulls.
- Soft-delete/tombstones to resolve Web↔Android delete conflicts.
- Recurring transactions, multi-currency reporting, budget per category.
- True 404 status for the gated `/loader-preview` page (e.g., via `middleware` or route removal in prod).
- PWA/installability and push-style reminders.

## 10. Reading order for a returning developer

1. [README.md](./README.md) → rules and map.
2. [ARCHITECTURE.md](./ARCHITECTURE.md) → boot flow and layers.
3. [DATA_AND_SYNC.md](./DATA_AND_SYNC.md) → the part most likely to bite if changed.
4. [FEATURES.md](./FEATURES.md) → locate code for the feature you're touching.
5. Run `npm install && npm test && npm run build` to confirm the toolchain still works before editing.

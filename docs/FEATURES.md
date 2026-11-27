# Feature Catalog

For each feature: **what it does → where the code is → rules to keep**.
Paths are relative to `src/`. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the routing table.

---

## 1. Guest mode & authentication

**What:** Anyone can use the whole app immediately ("Continue as Guest (Local Only)"). Optional
email + password accounts via Supabase.

- Pages: `app/(public)/sign-in/page.jsx`, `app/(public)/signup/page.jsx`, shell `components/shared/AuthSplitShell.jsx`.
- Hook: `hooks/useAuth.js` (`signIn`, `signUp`, `continueAsGuest`, `logout({wipeLocal})`, `fetchProfile`).
- Service: `services/authService.js` (`signUp`, `login`, `logout`, profile, `updateUserPassword`,
  `verifyUserPassword`, `getAuthErrorMessage`).
- State: `redux/slices/authSlice.js`; bootstrap in `app/provider.jsx`.
- Signup collects display name, phone (optional), currency, email, password. The DB trigger
  Profile fields are stored in Supabase Auth `user_metadata` (the shared DB has no `profiles`
  table); `authService.profileFromUser` builds the profile object.

**Password reset:** "Forgot password?" on sign-in → `/reset-password` sends `resetPasswordForEmail`;
the emailed link (Supabase `PASSWORD_RECOVERY` session) returns to the same page to set a new
password (`requestPasswordReset`, `updateUserPassword`).

**Rules:** password ≥ **12 chars** (client `MIN_PASSWORD_LENGTH` and Supabase config). Guest mode is
always available even if Supabase env vars are missing (`isSupabaseConfigured` false → guest only).
Auth session is owned by Supabase (not Redux persist, no cookies).

---

## 2. Accounts (multi-account)

**What:** Multiple accounts (e.g., "Default", "Cash", "Savings"), each with its own currency, avatar,
spending period, budget settings, hide-transactions flag and reminder schedule. The *active account*
drives dashboard, transactions, analytics and buckets.

- UI: top-bar account pill/menu and `components/shared/AccountSwitcherModal.jsx`;
  management at `app/(private)/settings/accounts/page.jsx` (create/edit/delete, avatars from
  `public/avatars`, set default, **Transfer Money**).
- Hook/service: `hooks/useAccounts.js`, `services/accountsService.js`.
- Active account id lives in `appSlice.activeAccountId` (persisted); falls back to default account.

**Rules:** unique names (case-insensitive); exactly one default; at least one account must exist;
deleting an account cascades its transactions/buckets/entries; currency is per account and
**amounts are never converted** when changing currency.

### Account transfers
Move money between two accounts of the same user. Creates paired neutral rows (see
[DATA_AND_SYNC.md](./DATA_AND_SYNC.md#account-transfers)). Shown with a "Transfer" badge, not
editable (delete removes both legs), excluded from all income/expense totals and analytics.

---

## 3. Dashboard (Overview) — `app/(private)/dashboard/page.jsx`

- Period filter (`components/shared/PeriodFilterBar.jsx`): Daily / Weekly / Monthly / Yearly / Custom,
  with previous/next navigation. The default period comes from the active account's `spending_period`.
- Summary card: top amount (Income, Budget, or Budget + Income) vs Expenses, net balance,
  `components/shared/ProportionalBar.jsx`, category breakdown with percentages
  (`lib/budgetMath.computeSpendingSummary`).
- Recent transactions list with edit/delete, "Add Transaction" button opening `TransactionFormModal`.
- **Hide Transactions:** if enabled on the account, amounts/entries are masked until the user taps "reveal".
- Empty state via `EmptyStateCard`; loading via `AppLoader`.

---

## 4. Transactions

### Entry — `components/transactions/TransactionFormModal.jsx`
- Expense / Income toggle, amount field accepting **expressions** (`250+45`, `*`, `/`, `-`) evaluated by
  `lib/expressionParser.js` (safe recursive-descent parser, no `eval`; ≤ 2 decimals, ≤ 12 digits,
  throws on divide-by-zero) and an on-screen `CalculatorKeypad.jsx`.
- Category chooser with inline "new category" creation, date picker (local date), note.
- **Scan Receipt** (OCR) and **Voice Entry** buttons (see §10, §11).
- Edit mode reuses the same modal; transfers can't be edited.

### List — `app/(private)/transactions/page.jsx`
- Period filter, search (deferred), type filter and category filter drawer
  (`TransactionFiltersDrawer.jsx`), result totals, grouped by date, edit/delete,
  **Export** (`ExportModal.jsx` → CSV or PDF).
- Performance: `PAGE_SIZE = 200` + "Show more (N remaining)", memoized `TransactionRow`.

### Export — `lib/csvExport.js`, `lib/pdfExport.js`
- CSV: RFC-4180 with CRLF, escapes delimiters, **neutralizes spreadsheet formula injection**
  (`=`,`+`,`-`,`@` prefixes).
- PDF: multi-page report via `pdf-lib` (lazy), Helvetica/WinAnsi (non-ASCII replaced; currency shown as
  symbol or `CODE `), totals in minor units, zero-decimal currency aware, excludes transfers from totals.
- Unit tests verify Summary, CSV and PDF totals reconcile.

---

## 5. Analytics — `app/(private)/analytics/page.jsx`, `components/analytics/AnalyticsCharts.jsx`

- **Monthly donut:** expense by category for the selected month (prev/next month), legend with
  amounts and percentages, interactive active slice.
- **Yearly cashflow bars:** income vs expense per month for the selected year with totals.
- Excludes transfers; aggregates in minor units; charts are lazy-loaded with a compact loader.

---

## 6. Spend Buckets — `app/(private)/spend-bucket/page.jsx`, `[id]/page.jsx`

**What:** Named savings/spending pots per account (e.g., "Vacation"). Add **fund** entries (money in)
and **expense** entries (money out); the bucket shows fund, expense and remaining.

- Components: `components/buckets/BucketFormModal.jsx` (name + image from `BUCKET_PRESET_ICONS`),
  `BucketEntryModal.jsx`.
- Drag-and-drop reorder via `@dnd-kit` (persisted `position`).
- Hook/service: `hooks/useBuckets.js`, `services/bucketsService.js`.
- Totals are recomputed locally in minor units and by a Postgres trigger on the server.

---

## 7. Categories — `app/(private)/categories/page.jsx`

- Separate **Expense** and **Income** tabs; create/edit/delete, drag-reorder.
- `components/CategoryModal.jsx`, `shared/IconPickerModal.jsx` (grouped icon library from
  `ICON_GROUPS` in `lib/defaultSeeds.js`, SVGs in `public/icons`), `shared/ColorPickerModal.jsx`
  (**3 modes:** Android-style 12×10 grid, 2D spectrum canvas, sliders; remembers 8 recent colors).
- Deleting a category with transactions **reassigns them to "Other"** of the same kind; "Other"
  can't be deleted while in use. Default categories carry `is_default`.
- 21 seeded defaults (see data doc).

---

## 8. Budget mode & time period

- `settings/budget-mode`: toggle Budget Mode, set `budget_amount`, `spending_period`
  (Daily/Weekly/Monthly/Yearly), `include_income`, with a live preview of scaled budgets
  (`budgetMath.getScaledBudget`).
- `settings/time-period`: default period + account currency (`components/CurrencySelect.jsx`,
  currencies in `utils/currencies.js`).
- Logic and formulas: [DATA_AND_SYNC.md §8](./DATA_AND_SYNC.md#8-money-dates-and-rounding-conventions).

---

## 9. Settings hub — `app/(private)/settings/page.jsx`

Cards linking to: Account Currency, Default Time Period, Budget Mode, Hide Transactions, Manage
Categories, Accounts & Transfer Money, Cloud Backup & Sync, Profile & Sign Out, **Light/Dark Theme**,
**Accent Color Preset**, plus Security & App Lock, Reminders, Reset Data.

| Sub-page | Purpose |
| --- | --- |
| `accounts` | Account CRUD, avatars, default flag, transfer money |
| `backup` | Guest → cloud merge (`migrateGuestToCloud`), manual sync, sync state |
| `budget-mode` | Budget settings (above) |
| `hide-transactions` | Per-account masking toggle |
| `profile` | Edit display name/phone/avatar, change password, sign out (keep or wipe offline copy) |
| `reminders` | Frequency (Never/Daily/Weekly/Monthly) + time; Notification permission; `.ics` calendar export |
| `reset` | Reset Data (4 combinations); confirm with password (signed in) or typing `RESET` (guest) |
| `security` | Enable/disable 4-digit PIN, change PIN, passkey, "Lock now" |
| `time-period` | Default period & currency |

Shared header: `components/settings/SettingsSubpageHeader.jsx`.

### Reset Data
Always deletes transactions, buckets and bucket entries. Options: keep/delete accounts × keep/delete
categories; wiped sets are re-seeded (1 Default account / 21 categories). Emits
`spendscope:transactions-reset`.

### Reminders
`lib/reminderScheduler.js`: period keys (`YYYY-MM-DD`, ISO week `YYYY-Www`, `YYYY-MM`) guarantee a
reminder fires **once per period**, catching up if the time has already passed while the app was
open. Check runs every 60 s while the app is open (AppShell). Because a closed web app can't notify,
an **RFC-5545 `.ics`** recurring event can be downloaded
(`preferencesService.buildReminderIcs/downloadReminderIcs`). Browser `Notification` is optional.

---

## 10. Receipt OCR — `lib/receiptOcr.js`

- Runs **entirely on-device** with self-hosted tesseract.js (worker, wasm cores and
  `eng.traineddata.gz` served from `/tesseract/*`; E2E asserts **zero third-party requests**).
- Pipeline: HEIC→JPEG (`heic2any`) → downscale + grayscale contrast boost → OCR →
  `parseReceiptText` → `{amount, date, merchant}` prefill.
- Parsing: prefers **Grand Total** over subtotal/tax, handles 2-digit years, month-name dates, and
  currency prefixes for INR, USD, EUR, GBP, JPY, AED, CAD, AUD, SGD, CNY, BRL, RUB (incl. European
  decimal commas).

## 11. Voice entry — `lib/voiceParser.js`

- Browser Web Speech API (`createVoiceRecognizer`, `isSpeechRecognitionSupported`), default `en-US`.
- `parseVoiceTransaction(transcript, categories)` → amount, kind, category, date, note.
- Supports digits and decimals (`45.50`), spoken decimals ("forty five point five zero"), Indian/Western
  scale words (lakh, crore, thousand, million…), relative dates ("yesterday"), month dates,
  and avoids treating the verb "may" as the month.
- Keyword-based category inference falls back to "Other".

---

## 12. App Lock (device-local security) — `lib/webSecurity.js`, `components/shared/AppLockGate.jsx`

- 4-digit PIN hashed with **PBKDF2-SHA256, 60 000 iterations, random 16-byte salt**; stored only in the
  device's IndexedDB `preferences` (`app_lock`), per owner. Never synced.
- **5 wrong attempts → 4-minute lockout** with live countdown. PIN `0000` is valid.
- Optional **WebAuthn passkey** as a convenience unlock (no server verification; PIN remains primary).
- Re-locks after the tab has been hidden ≥ 60 s; "Lock now" in settings.

---

## 13. Calculators — see [CALCULATORS.md](./CALCULATORS.md)

24 tools across EMI, Banking, SIP, GST & VAT, Loan and Other. Selected via
`/calculators?type=<id>&category=<id>`.

---

## 14. Theming & appearance

Light ("warm parchment") / Dark ("espresso") + 28 accent presets or custom color; synced for signed-in
users inside Auth `user_metadata.spendscope_web.appearance`. Details in [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).

## 15. Sync status & offline UX

Sync pill (Local only / Syncing… / Synced / Offline / Sync retry), offline banner, retry banner,
guest backup banner — all in `AppShell`. Behavior in [DATA_AND_SYNC.md](./DATA_AND_SYNC.md#4-sync-engine-srclibsyncenginejs).

## 16. Public site

- Landing (`app/(public)/landing/*`): Hero, Calculators teaser, Categories teaser, Features (6 cards:
  Track Income & Expenses; Visual Analytics & Exports; Named Spend Buckets; Multi-Account & Transfers;
  On-Device Receipt OCR & Voice; Private & App-Lock Ready), CTA. `Header.jsx` (also exports
  `SpendScopeLogo`), `Footer.jsx`.
- `privacy-policy`, SEO: root `metadata` in `app/layout.jsx`, `public/robots.txt`, `public/sitemap.xml`,
  Google Search Console verification file in `public/`.

## 17. Loading states & 404

- `components/shared/AppLoader.jsx` (variants `page`, `section`, `compact`) used for PersistGate,
  App Lock check, route loading (`(private)/loading.jsx`), Suspense/dynamic fallbacks and charts.
- `app/not-found.jsx`: illustrated 404 ("This page wandered off the budget") with buttons to Home and Dashboard.
- `/loader-preview`: dev-only gallery — pick 3/5/10 s full-screen loader, theme toggle, 404 link.
  Details in [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md#5-loaders-and-404).

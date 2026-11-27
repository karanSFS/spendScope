# Data Model & Sync

SpendScope is **local-first**. IndexedDB is the working database; Supabase Postgres is the
cloud backup / cross-device store, **shared with the Android and iOS apps**. This document covers both, plus the sync
engine that connects them.

## 1. Ownership & isolation

- Every signed-in user gets a separate IndexedDB: `spendscope_user_<userId>`.
- Guests use `spendscope_guest` (`owner_id = null`).
- `getOwnerDbName(ownerId)` in `src/lib/localDb.js` is the only place that derives names.
- Signing out either keeps the user's DB (offline copy) or deletes it (`deleteOwnerDb`) — user's choice.
- Guest data is **not** auto-merged. After sign-in the app offers a deterministic merge
  (see [§7](#7-guest--cloud-merge)).

## 2. IndexedDB schema (`DB_VERSION = 1`)

| Object store | keyPath | Indexes | Synced to cloud? |
| --- | --- | --- | --- |
| `accounts` | `id` | `by_updated` | yes |
| `categories` | `id` | `by_kind` | yes |
| `transactions` | `id` | `by_account`, `by_occurred`, `by_category` | yes |
| `buckets` | `id` | `by_account` | yes |
| `bucket_transactions` | `id` | `by_bucket` | yes |
| `loan_profiles` | `id` | — | yes (`loans` table) |
| `preferences` | `key` | — | **only `appearance`** (via Auth metadata) |
| `sync_outbox` | `op_id` | `by_seq` | internal |

`ENTITY_STORES` = `accounts, categories, transactions, buckets, bucket_transactions, loan_profiles`.

**Preference keys used:** `appearance` (synced inside Auth `user_metadata`, see §3.3), `app_lock` (device-only),
`sync_meta` (`last_pull_at`, `last_sync_at`, `initial_pull_done`), `guest_migration_meta`
(guest DB: list of owner IDs already merged), `guest_migration_id_map` (per owner),
`reminder_meta` (last fired period key per account).

**Row metadata added locally:** `sync_status` = `LOCAL` (guest), `PENDING` (queued), `SYNCED`.
`color_name`, `receipt_url`, `sync_status` are local-only and stripped before pushing
(`sanitizeForRemote`).

> Changing the IndexedDB structure requires bumping `DB_VERSION` and writing an `upgrade` migration
> in `getDb()`. Currently there is only version 1.

### Key `localDb.js` API

| Function | What it does |
| --- | --- |
| `getDb(ownerId)` | Open/cached per-owner DB (null on server) |
| `listEntities(owner, store, {includeDeleted})` | Read all rows, hiding `deleted_at` rows by default |
| `putEntity` / `upsertEntity`, `putEntitiesBatch` | Write + (if signed in) enqueue UPSERT in outbox, in one IDB transaction; notifies listeners |
| `deleteEntity` | **Hard** delete locally + enqueue DELETE in outbox |
| `getPreference` / `setPreference` | Preferences store; only `appearance` can enqueue sync |
| `listOutbox`, `removeOutboxOp`, `markOutboxError` | Outbox management; failure sets exponential backoff |
| `reconcileRemoteStore(owner, store, rows)` | Apply a remote pull without clobbering rows with pending local edits |
| `ensureDefaults` / `ensureDefaultsUnlocked` | Idempotent seeding (see §6) |
| `exportOwnerSnapshot` | All entity rows for backup/merge |
| `withOwnerLock(owner, fn)` | Web Locks + in-memory mutex per owner DB |
| `subscribeDataChanged` (= `subscribeDataChanges`), `notifyDataChanged` | In-app pub/sub, also dispatches `spendscope:data-changed` |

Outbox coalescing (`upsertOutboxTx`): only one op per `(entity_type, entity_id)`. A later UPSERT
replaces the payload; a DELETE replaces any earlier op. Each op: `{op_id, seq, entity_type,
entity_id, operation, payload, status, attempts, last_error, next_retry_at, …}`.

## 3. Cloud schema (Supabase Postgres, shared with Android / iOS)

> **Big picture (2026-11-27):** the web app no longer owns its cloud schema. It connects to the
> Supabase project **SpendScope** (`bnxqgdsxxakfkcbvkoti`, ap-south-1) whose tables are designed and
> owned by the mobile team (live migration `init_spend_scope_schema`). The web app adapts to it via
> **`src/lib/remoteSchema.js`** (pure mapping functions, unit-tested) and **never alters the database**.
> The earlier web-only `owner_id` schema is archived in
> `supabase/_archive_old_project/web_v2_owner_id/` for history only. **Do not apply it to the shared
> project.** `supabase/migrations/` is intentionally empty (see its README).

### 3.0 Official contract (iOS/Android/Web specification)

The mobile developers supplied **"SpendScope — Supabase Auth & Offline-First Sync Specification"**
(received 2026-11-27). It is the contract all three clients follow. Key points and how the web
complies:

| Contract item | Web status |
| --- | --- |
| Project `bnxqgdsxxakfkcbvkoti`, URL and publishable key; never ship `service_role`/`sb_secret_` | ✅ `.env.local` matches; only the publishable key is used |
| Hosted web URL `https://spend-scope-mu.vercel.app` (Site URL + redirect `…/**` in dashboard) | ✅ sitemap/robots/docs updated; password-reset links return to `/reset-password` |
| Email + Password: signUp, signIn, **resetPasswordForEmail**, signOut | ✅ reset flow added (`/reset-password`, "Forgot password?" on sign-in) |
| Sign-up with email confirmation and no session → tell the user to confirm, then sign in | ✅ message shown on the sign-up card |
| Reuse the exact existing tables/columns; never create duplicate tables | ✅ `remoteSchema.js` only maps; no migrations here |
| Client UUID primary keys, `updated_at`/`deleted_at` on every entity | ✅ |
| Deletes are soft-delete UPDATEs (`deleted_at`, `updated_at`) | ✅ (§3.4) |
| Push order: accounts & categories → time_periods/budget_modes/carry_overs → transactions → repeatings → buckets → bucket entries → loans → tombstones | ✅ (web does not write `carry_overs`/`transaction_repeatings`; tombstones last) |
| Pull parents→children; **last-write-wins** (`remote.updated_at > local.updated_at`); delete locally when `deleted_at` set | ✅ `reconcileRemoteStore` (pending local edit loses only to a strictly newer remote edit) |
| Pull incrementally with `updated_at > lastSyncedAt` | ⚠️ Not yet: the web pulls full tables (paginated). Functionally equivalent, heavier on large accounts |
| Default-account dedup: unused never-synced local default adopts the remote id when names match | ✅ `adoptRemoteAccounts`; first sync pulls **before** pushing (`pullFirstIfNeverSynced`) |
| Per-user `last_synced_at`, account switching resets state | ✅ Equivalent: one IndexedDB per user (`spendscope_user_<id>`) |
| Auto-sync on sign-in, reconnect, foreground, debounced saves, manual Sync | ✅ (`online`/`focus`/`visibilitychange`, fire-and-forget push after writes, sync pill) |
| Password minimum 6 chars (mobile UI) | ⚠️ Web requires **12** on sign-up/reset (stricter); mobile users with shorter passwords can still sign in on web |
| UI wording: Settings → "Account & Sync" card | Web equivalent lives in Settings → Backup & sync; wording not mirrored |

The specification does **not** define a transaction date column, a kind column, transfers or
bucket-entry type values, so those remain flagged assumptions (§3.2): with only `created_at` and
`updated_at` on `transactions`, `created_at` is the only place a mobile date can live.

> A shareable version of these conventions for the mobile developers is in
> [MOBILE_SYNC_CONVENTIONS.md](./MOBILE_SYNC_CONVENTIONS.md).

### 3.1 Live tables

All tables: RLS enabled, per-operation policies `(select auth.uid()) = user_id` for role
`authenticated`, `user_id` defaults to `auth.uid()`, `created_at/updated_at` default `now()`, and a
nullable `deleted_at` tombstone. There are **no triggers or functions**: the client must set
`updated_at` itself.

| Table | Columns that matter | Notes |
| --- | --- | --- |
| `accounts` | `name`, `avatar` (`avatarN`), `chart_color`, `time_stamp`, `is_hide_future_transaction`, `is_current` | Unique `(user_id, name)` where not deleted |
| `time_periods` | `account_id`, `show_spendings`, `week_start_day`, `month_start_day` (**NOT NULL, no default**) | One row per account (satellite) |
| `budget_modes` | `account_id`, `is_on`, `amount` (text), `is_include_income` (default **true**) | One row per account (satellite) |
| `carry_overs` | `account_id`, `is_on`, `only_positive` | Mobile-only; web never writes it |
| `categories` | `name`, `icon` (e.g. `diningOut`), `chart_color`, `type` (`expense`/`income`), `is_custom`, `position` (global across both types), `has_deleted` | Includes a mobile-only `Carry Over` income category |
| `transactions` | `account_id`, `category_id` (**NOT NULL**, FK `RESTRICT`), `amount float8`, `notes` | **No kind, date or currency column** |
| `transaction_repeatings` | `transaction_id`, `start_date`, `end_date`, `time_period` | Mobile-only; web ignores |
| `spend_buckets` | `account_id`, `bucket_name`, `icon`, `bucket_created_at`, `sort_order` | No totals column |
| `spend_bucket_transactions` | `bucket_id`, `amount` (text), `bucket_transaction_type` (text), `notes` | Table was empty at integration time |
| `loans` | `loan_name`, `loan_account_number`, `bank_name`, `amount/interest_rate/tenure_months/processing_fees` (text), `emi_amount`, 3 dates (timestamptz), 7 derived float totals (`interest_paid`, `principal_paid`, `total_paid`, `outstanding_*`, `total_interest`) | |

All foreign keys are `ON DELETE CASCADE` except `transactions.category_id` (`RESTRICT`).
Auth config (`supabase/config.toml`): email signups on, minimum password length 12.
Advisor note: leaked-password protection is disabled in the dashboard (recommended to enable).

### 3.2 Mapping layer (`src/lib/remoteSchema.js`)

| Web (local) | Shared DB | Rule |
| --- | --- | --- |
| `owner_id` | `user_id` | Local rows keep `owner_id`; every remote filter/write uses `user_id` |
| `buckets` / `bucket_transactions` / `loan_profiles` | `spend_buckets` / `spend_bucket_transactions` / `loans` | Renamed tables and columns (`name`↔`bucket_name`/`loan_name`, `image_key`↔`icon`, `position`↔`sort_order`, `note`↔`notes`, `principal_amount`↔`amount`, `account_name`↔`loan_account_number`) |
| `accounts.is_default` | `accounts.is_current` | Pull normalises to exactly one default (earliest `created_at` wins on ties/none) |
| `accounts.avatar_key` (`user_pf`, `user_pf1`…) | `avatar` (`avatar1`…) | `avatarN` = `AVATAR_KEYS[N-1]`; unknown mobile values are preserved in `remote_avatar` |
| `accounts.spending_period` | `time_periods.show_spendings` | Satellite row; existing row IDs are looked up before upsert. `week_start_day='Sunday'` / `month_start_day=1` written **only** when creating a row |
| `accounts.budget_mode/budget_amount/include_income` | `budget_modes.is_on/amount(text)/is_include_income` | Satellite row |
| `categories.kind` / `icon_key` / `color` / `is_default` | `type` / `icon` / `chart_color` / `!is_custom` | Icon name table in `ICON_PAIRS`; `carryOver` shown with `money_transfer` and preserved (`remote_icon`) |
| `transactions.kind` | `categories.type` | **ASSUMPTION:** income/expense is derived from the category's type |
| `transactions.occurred_at` | `transactions.created_at` | **ASSUMPTION:** the date is `created_at` (keeps time-of-day unless the user back-dates; then local midnight of the chosen day) |
| `transactions.category_id` null | falls back to the "Other" category of the same kind | `category_id` is NOT NULL remotely; a mismatching kind also falls back |
| `transactions.currency_code` | — | Derived from the account's currency on pull |
| `bucket_transactions.kind` | `bucket_transaction_type` | **ASSUMPTION:** values `fund` / `expense` (parsed case-insensitively on pull) |
| bucket `fund_amount/expense_amount` | — | Recomputed from entries on pull |
| Loan derived metrics | 7 float columns | Computed by `calculateLoanProfileMetrics` at push time |

Items marked **ASSUMPTION** were inferred from live data and could not be confirmed against the
mobile source code. They are isolated in `remoteSchema.js` (search `ASSUMPTION:`); change them there
once the Android/iOS developers confirm.

### 3.3 Web-only data that has no column

Stored in Supabase Auth **`user_metadata`** (ignored by the mobile apps):

- Profile: `display_name`, `phone`, `avatar_key`, `currency` (replaces the old `profiles` table;
  `authService.profileFromUser`).
- `spendscope_web` blob: `{ appearance: {appearance_mode, accent_color}, accounts: { [accountId]: {
  currency_code, reminders, reminder_hour, reminder_minute, hide_transactions, expense_amount } } }`.
  Written by `applyWebSettings` in the push step, read on pull.
- **Transfers stay local-only.** They are paired expense/income rows linked by `transfer_group_id`,
  which the shared schema cannot represent. They are never pushed, survive pulls (`keepLocal`), and
  other devices never see them (they are neutral in totals anyway).

### 3.4 Mobile-compatibility rules

- **Never alter the shared database from this repo.** Any DB change must be purely additive and
  agreed with the Android and iOS developers first.
- **Soft delete only.** Web deletes become `UPDATE … SET deleted_at, updated_at` (categories also
  `has_deleted = true`; deleting an account also tombstones its `time_periods`, `budget_modes`,
  `carry_overs`). Hard deletes would never reach other devices that sync by `updated_at`.
- Always send a real `updated_at` (no trigger exists).
- Upserts only send columns the web owns, so mobile-owned columns (`chart_color`, `week_start_day`,
  `is_hide_future_transaction`, …) on existing rows are not overwritten.
- **No** server-side seeding; the client seeds defaults only after a clean pull.
- **No** passcode/lockout data in the cloud — App Lock is device-local.

## 4. Sync engine (`src/lib/syncEngine.js`)

### Entity ordering

- Upserts push **parents first**: accounts → categories → transactions → buckets →
  bucket_transactions → loan_profiles → user_preferences.
- Deletes push **children first**: bucket_transactions → buckets → transactions → categories →
  accounts → loan_profiles. Each is a **soft delete** (see §3.4).

### `pushOutbox(ownerId, client, {ignoreBackoff})`
Skips if no owner/client or `navigator.onLine === false`. First builds a context (local categories
for transaction category resolution, existing `time_periods`/`budget_modes` row IDs per account,
lazy-loaded loan metrics). For each eligible op: `buildRemoteWrites` (upsert, one or several tables)
or `buildRemoteDeletes` (soft delete) → on success remove from outbox and mark the local row
`SYNCED`; on failure `markOutboxError` with exponential backoff `min(60s, 2s × 2^(attempts-1))`.
Local-only entities (transfers) are dropped from the outbox without a request. Ops that also carry
web-only settings (account upserts/deletes, appearance) are completed only after one
`auth.updateUser({data:{spendscope_web}})` succeeds; otherwise they are retried.

### `pullRemote(ownerId, client, {defaultCurrency})`
Paginated (1000-row pages; PostgREST caps responses) `select *` of `accounts`, `categories`
(**including soft-deleted**, needed to classify old transactions), `transactions`, `spend_buckets`,
`spend_bucket_transactions`, `loans`, `time_periods`, `budget_modes`, all filtered by `user_id`,
plus `auth.getUser()` for the web settings. `mapRemoteSnapshot` converts them to local shapes, then
`reconcileRemoteStore` runs per store: remote values win for columns the shared schema stores,
web-only fields keep their local value (or a default for new rows), rows with a pending outbox op
are untouched, local rows missing remotely are deleted unless pending or local-only (transfers).
Appearance is applied only if no pending preference op. Writes `sync_meta`.

### `syncNow(ownerId, {client, defaultCurrency, ignoreBackoff})`
1. No owner → just ensure local defaults, status `local`.
2. Offline → emit `offline` state.
3. Emit `syncing` → `pushOutbox` → `pullRemote` → **then** `ensureDefaultsUnlocked` (seed only after a
   clean pull; if seeded, push again) → compute `synced`/`error` status.
4. On leftover/failed ops with ≤ 5 attempts, schedule `retry` using `getRetryDelayMs`.
5. Whole thing runs inside `withOwnerLock`.

### When sync runs
- Sign-in / sign-up (`useAuth`), session hydrate (`provider.jsx`).
- Browser `online`, window `focus`, `visibilitychange` (visible).
- Clicking the sync pill, "Retry Sync" banner button.
- After most service mutations: `pushOutbox(...)` fire-and-forget (no full pull).
- Retry timers after failures.

### Conflict model
Simple and deliberate: **pending local changes win; otherwise remote wins on pull.** There is no
field-level merge or version vector. There is **no** `updated_at` trigger on the shared DB; the web
sets `updated_at` itself from the local edit time, so concurrent edits from mobile and web are
last-write-wins.

### Sync status shape
`{ state: idle|local|syncing|synced|offline|error, pendingCount, lastSyncAt, lastError }`
→ stored in `appSlice.syncStatus` via `subscribeSyncStatus`, displayed by the AppShell sync pill.

## 5. Services layer (business rules)

| Service | Notable rules |
| --- | --- |
| `accountsService` | CRUD; unique name (case-insensitive); exactly one default; **cannot delete the last account**; delete cascades bucket_transactions → buckets → transactions → account, promotes another default; `transferBetweenAccounts` (§below) |
| `transactionsService` | `getTransactions` builds *view models* (`type`, `category`, `category_icon`, `color_code`, `date`); amounts rounded to 2 dp; deleting a transfer row deletes **both** legs; `occurred_at` default = local midnight ISO |
| `categoriesService` | CRUD, `reorderCategories`, linked counts; **delete reassigns transactions to the same-kind "Other"** (creates it if missing); cannot delete "Other" while it has transactions |
| `bucketsService` | CRUD, reorder, entries (`fund`/`expense`); recomputes parent totals client-side in minor units (DB trigger does the same server-side) |
| `loanProfilesService` | Validation: name ≤ 120, account/bank required, principal > 0, rate 0–30 %, tenure 1–600, first EMI after loan date; computes EMI and last EMI date |
| `preferencesService` | `saveAppearancePreference` (syncs), `.ics` reminder generation/download |
| `resetService` | `resetUserData({keepAccounts, keepCategories})` — 4 combinations; always wipes transactions/buckets/bucket entries; re-seeds defaults if accounts/categories were wiped |
| `authService` | Supabase auth wrapper: `signUp` (min 12-char password), `login`, `logout`, profile read/update, `verifyUserPassword` (re-auth before destructive actions), friendly error mapping |

### Account transfers
`transferBetweenAccounts` creates two rows with one `transfer_group_id`:
source `expense` (note defaults to "Transfer to X") and destination `income`
("Transfer from Y"), each with its own account's currency and a `counterparty_account_id`.
No category. Totals exclude any row with `transfer_group_id`. Currency mismatch is reported
(`currencyMismatch`) — **no FX conversion is applied**.

## 6. Seeding defaults

`buildDefaultAccount` → one account named **"Default"** (`is_default`, Monthly, no budget).
`buildDefaultCategories` → **15 expense** (Housing, Utilities, Dining Out, Transportation, Groceries,
Health, Education, Entertainment, Shopping, Insurance, Savings, Family, Travel, Debt Payments, Other)
and **6 income** (Salary, Transfer, Business Income, Freelance, Interest Income, Other) = **21**.
Seeding runs only if the owner has zero active accounts / zero active categories, under the owner lock,
and for signed-in users **only after a successful pull**.

## 7. Guest → cloud merge

`getGuestMigrationSummary(ownerId)` decides whether to prompt (meaningful guest data and not yet
migrated for this owner). `migrateGuestToCloud(ownerId)`:

1. Push outbox + pull remote first (so cloud rows exist locally).
2. **Accounts** matched by case-insensitive name; never creates a second "Default" or second default flag.
3. **Categories** matched by `(kind, lower(name))`.
4. **Transactions** re-pointed to mapped account/category ids; `transfer_group_id` remapped consistently
   (transfers are local-only on the shared schema, so they merge locally but are not uploaded).
5. **Buckets** matched by `(account, name)`; entries remapped; parent totals recomputed.
6. **Loan profiles** deduplicated by `(name, loan_date, principal)`.
7. Deterministic id map is stored (`guest_migration_id_map`) → re-running is idempotent.
8. Mark owner as migrated, push, pull, return counts (`accountsReused`, `transactionsMigrated`, …).

UI entry points: banner in AppShell and `/settings/backup`.

## 8. Money, dates and rounding conventions

- Amount storage: JS numbers with 2 dp (DB: `float8` for transactions, text for buckets/loans; the
  mapping layer converts); **aggregate via minor units**.
  Helpers: `round2` (calculatorEngine, budgetMath), `formatMoney` (`utils/currencies.js`),
  `formatPdfMoney` (pdfExport).
- Zero-decimal currencies: `JPY`, `KRW`, `VND` (formatters round to 0 dp).
- Dates: `src/lib/dateUtils.js` — `parseLocalDate`, `toLocalMidnightIso`, `fromIsoToLocalDateKey`,
  `getPeriodBounds` (Daily; Weekly = Sunday–Saturday of the anchor's week; Monthly; Yearly),
  `isOccurredAtInRange` (compares local calendar days).
- Budget scaling (`budgetMath.getScaledBudget`): converts budgets between periods using fixed
  factors (Month = 30 days, Year = 365 days, Month = 4 weeks, Year = 52 weeks); Custom ranges scale
  from the daily value × `customDays`. Matches Android `SpendingFragment.kt`.
- Spending summary (`computeSpendingSummary`): excludes transfers; with Budget Mode the "top amount"
  is `Budget` or `Budget + Income` (if `include_income`), `netBalance = top − expenses`, plus
  percentage bars and a sorted category breakdown colored from `HOME_CATEGORY_PALETTE`.

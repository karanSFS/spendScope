# Data Model & Sync

SpendScope is **local-first**. IndexedDB is the working database; Supabase Postgres is the
cloud backup / cross-device (Web ↔ Android) store. This document covers both, plus the sync
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
| `loan_profiles` | `id` | — | yes (web-only table) |
| `preferences` | `key` | — | **only `appearance`** |
| `sync_outbox` | `op_id` | `by_seq` | internal |

`ENTITY_STORES` = `accounts, categories, transactions, buckets, bucket_transactions, loan_profiles`.

**Preference keys used:** `appearance` (synced as `user_preferences`), `app_lock` (device-only),
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

## 3. Cloud schema (Supabase Postgres)

Source of truth: `supabase/migrations/202611260001_spendscope_v2_schema.sql`
(`project_id` in `supabase/config.toml`). All tables have RLS enabled and `anon` has **no** grants;
`authenticated` gets CRUD limited by policies.

| Table | Purpose | Notes |
| --- | --- | --- |
| `profiles` | `id`→`auth.users`, `display_name` (1–80), `email`, `phone`, `avatar_key`, `default_currency` (`^[A-Z]{3}$`) | Created by trigger on signup |
| `accounts` | name, avatar, currency, `is_default`, `spending_period`, `budget_amount`, `include_income`, `budget_mode`, `expense_amount`, `reminders`, `reminder_hour/minute`, `hide_transactions`, soft-delete `deleted_at` | Unique: one default per owner (partial), unique `(owner, lower(name))` when not deleted |
| `categories` | `kind` (`income`/`expense`), name, `icon_key`, `color`, `position`, `is_default` | Unique `(owner, kind, lower(name))` when not deleted |
| `transactions` | `account_id`, `category_id` (set null on delete), `kind` (`income`/`expense`/`transfer` allowed by CHECK), `amount numeric(18,2) > 0`, `currency_code`, `occurred_at timestamptz`, `note`, `transfer_group_id`, `counterparty_account_id` | Indexes by owner/account/category/transfer group |
| `buckets` | per-account goal: `name`, `image_key`, `position`, `fund_amount`, `expense_amount` | Aggregates maintained by trigger |
| `bucket_transactions` | `kind` (`fund`/`expense`), `amount > 0`, `occurred_at`, `note` | Trigger `recalculate_bucket_totals` updates parent bucket |
| `loan_profiles` | **Web-only** (Android keeps loans locally): principal, rate (0–30), tenure (1–600), EMI, fees, dates | |
| `user_preferences` | **Web-only**: `appearance_mode` (`light`/`dark`), `accent_color` (`#RRGGBB`) | PK `owner_id` |

Triggers/functions: `set_updated_at` on every table; `handle_new_user()` (security definer, creates
**only** `profiles` + `user_preferences`, never accounts/categories); `recalculate_bucket_totals()`.

RLS: all policies are `owner_id = (select auth.uid())`; child-table `WITH CHECK` also verifies that
the referenced account/category/bucket belongs to the same user and (unless deleting) isn't deleted.

Auth config (`supabase/config.toml`): email signups on, **minimum password length 12**, local
`site_url http://localhost:3000`.

### Android compatibility rules

(From the header of the schema file — keep them.)

- Shared tables (`accounts, categories, transactions, buckets, bucket_transactions`) keep Android's
  exact column types, nullability, CHECKs and unique indexes.
- Additive web columns on shared tables must be **nullable and unconstrained**.
- **No** server-side seeding of accounts/categories.
- **No** passcode/lockout columns in the cloud — App Lock is device-local.
- Web-only tables: `loan_profiles`, `user_preferences`.
- Account transfers use `kind` `expense` + `income` with `transfer_group_id` (the `transfer` value
  allowed by the CHECK is not used by web; `sanitizeForRemote` coerces to income/expense).
- Colors for default categories are the first 15 of Android's `colors.json`
  (`ANDROID_DEFAULT_CATEGORY_COLORS`).
- Time convention matches Android's `FinancialSyncWorker`: `occurred_at` = local midnight → UTC ISO.

The pre-v2 database definitions live in `supabase/_archive_old_project/` for reference only.

## 4. Sync engine (`src/lib/syncEngine.js`)

### Entity ordering

- Upserts push **parents first**: accounts → categories → transactions → buckets →
  bucket_transactions → loan_profiles → user_preferences.
- Deletes push **children first**: bucket_transactions → buckets → transactions → categories →
  accounts → loan_profiles.
- Deletes are **hard deletes** on the server (`.delete().eq(id).eq(owner_id)`); the `deleted_at`
  columns exist for Android compatibility, and the web **pulls with `deleted_at is null`**.

### `pushOutbox(ownerId, client, {ignoreBackoff})`
Skips if no owner/client or `navigator.onLine === false`. For each eligible op: sanitize payload
(`sanitizeForRemote` builds the exact remote column set per table) → `upsert(..., onConflict id)`
(or `owner_id` for `user_preferences`) → on success remove from outbox and mark local row `SYNCED`;
on failure `markOutboxError` with exponential backoff `min(60s, 2s × 2^(attempts-1))`.

### `pullRemote(ownerId, client)`
Parallel `select *` of all seven tables for the owner (`deleted_at is null`), throws on any error,
then `reconcileRemoteStore` per store (remote rows replace local **unless that id has a pending
outbox op**; local rows missing remotely are deleted unless pending). Preferences are applied only
if no pending preference op. Writes `sync_meta`.

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
field-level merge or version vector. The `updated_at` DB trigger stamps server time on writes.

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
4. **Transactions** re-pointed to mapped account/category ids; `transfer_group_id` remapped consistently.
5. **Buckets** matched by `(account, name)`; entries remapped; parent totals recomputed.
6. **Loan profiles** deduplicated by `(name, loan_date, principal)`.
7. Deterministic id map is stored (`guest_migration_id_map`) → re-running is idempotent.
8. Mark owner as migrated, push, pull, return counts (`accountsReused`, `transactionsMigrated`, …).

UI entry points: banner in AppShell and `/settings/backup`.

## 8. Money, dates and rounding conventions

- Amount storage: JS numbers with 2 dp (DB `numeric(18,2)`); **aggregate via minor units**.
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

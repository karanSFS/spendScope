# SpendScope Web — Conventions for the Shared Supabase Database

> **Audience:** the Android and iOS developers (and anyone maintaining the web app).
> **Status:** the web app is **built and already follows these conventions** (verified 2026-11-27,
> against "SpendScope — Supabase Auth & Offline-First Sync Specification").
> **Purpose:** the shared schema and the specification do not define a few things (transaction date,
> income/expense, transfers, currency, bucket entry types). The web had to pick a convention for each.
> This file lists exactly what the web **writes** and **expects**, so the mobile apps can either
> **adopt the same convention** (nothing more to build, all three clients agree) or **tell us what
> differs** (we change one file: `src/lib/remoteSchema.js`).
>
> Nothing here requires a database change. Section 5 lists *optional, additive* improvements for
> later — **proposals only, not applied**.

Project: `bnxqgdsxxakfkcbvkoti` (ap-south-1). Web: https://spend-scope-mu.vercel.app.

---

## 1. Conventions the web uses (please adopt, or tell us if different)

| # | Topic | Web convention | Why / alternative |
| --- | --- | --- | --- |
| 1 | **Transaction date** | `transactions.created_at` **is the transaction date.** Web writes the real timestamp when the user did not back-date; when back-dated it writes local midnight of the chosen day (as UTC). Web groups by the viewer's **local calendar day**. | The table has no other date column. If mobile stores the date elsewhere, tell us where. |
| 2 | **Income vs expense** | Derived from `categories.type`. There is no kind column. A transaction's category must always exist and match its kind. | Web falls back to the "Other" category of the same kind when a category is missing (`category_id` is NOT NULL). |
| 3 | **Amounts** | `transactions.amount` is always **positive**; direction comes from the category type. Web reads `abs(amount)`. | If mobile stores signed amounts, tell us. |
| 4 | **Soft delete only** | Web never hard-deletes. It sends `UPDATE … SET deleted_at = now, updated_at = now` (categories also `has_deleted = true`). Deleting an account also tombstones its `time_periods`, `budget_modes`, `carry_overs` rows. | Per the spec. Mobile pulls must treat `deleted_at != null` as deleted. |
| 5 | **`updated_at`** | Always set by the client (there are no triggers). Web stamps every edit with the device clock; conflicts are last-write-wins on `updated_at`. | Per the spec. Large clock skew between devices would affect LWW. |
| 6 | **Spend bucket entry type** | `spend_bucket_transactions.bucket_transaction_type` is `fund` or `expense` (web reads case-insensitively and also accepts `add`/`deposit`/`credit`/`income`/`in` as fund). Amount is a plain decimal string, e.g. `"250.5"`. | The live table was empty, so the real values were unknown. **Please confirm yours.** |
| 7 | **Bucket totals** | There is no totals column. Web computes fund/expense totals from the entries. | |
| 8 | **Account "default"** | Web treats `accounts.is_current = true` as its default/selected account. If several rows are true (or none), web picks the earliest-created. | Please keep exactly one `is_current` per user, or tell us if it means something else. |
| 9 | **Avatars** | `accounts.avatar` = `avatarN` (1-based). Web's avatar list is 10 images, `avatar1…avatar10`. Unknown values from mobile are preserved on write-back. | Confirm `avatarN` numbering. |
| 10 | **Category icons** | Web maps the mobile identifiers (e.g. `diningOut`, `savingAndInvestments`, `incomeOther`) to its own icons and writes mobile identifiers back for default categories. Custom web icons are written as web keys (e.g. `travel_car`) which mobile may not recognise — mobile should fall back to a generic icon. `carryOver` is shown with a generic web icon and preserved. | |
| 11 | **Account settings** | `time_periods.show_spendings` ← web period (`Daily`/`Weekly`/`Monthly`/`Yearly`); `budget_modes.is_on / amount (text) / is_include_income`. Web always sends `week_start_day`/`month_start_day` (NOT NULL, no default; Postgres checks it on the upsert INSERT tuple): it re-sends the values mobile already stored, or `Sunday`/`1` for a new row, so mobile values are never changed. Web looks up the existing satellite row (by `account_id`) before writing, so no duplicates. | |
| 12 | **Loans** | `loans` ← web loan profiles: text columns hold plain decimals; the three dates are local midnight as UTC; the seven derived totals are computed by the web's loan engine at save time. | Mobile may recompute them. |
| 13 | **Default data** | Web seeds a "Default" account + 21 categories **only if, after a clean pull, the user has none**. First sync pulls before pushing; an unused never-synced local account with the same name adopts the remote id (per spec). | The live data also has a mobile-only `Carry Over` category the web never creates. |
| 14 | **Columns web never touches** | `chart_color` on accounts, `is_hide_future_transaction`, `carry_overs`, `transaction_repeatings`, `week_start_day`/`month_start_day` values (re-sent unchanged). | Safe: web upserts only the columns it owns. |

## 2. Web-only data (mobile can ignore, but must not delete it)

The database has no columns for these, so the web stores them in **Supabase Auth `user_metadata`**:

- Profile: `display_name`, `phone`, `avatar_key`, `currency` (from sign-up).
- `user_metadata.spendscope_web`:
  ```json
  {
    "appearance": { "appearance_mode": "dark", "accent_color": "#C88856" },
    "accounts": {
      "<accountId>": {
        "currency_code": "INR", "reminders": "Never",
        "reminder_hour": null, "reminder_minute": null,
        "hide_transactions": false, "expense_amount": null
      }
    }
  }
  ```
- **Mobile requirement:** when your app updates `user_metadata` (e.g. a profile edit) use a merge so the
  `spendscope_web` key is **not overwritten or dropped**. `auth.updateUser({data: {...}})` merges
  top-level keys, so only your own keys should be sent.
- `user_metadata` is user-writable and travels in the JWT: never store secrets there.

## 3. Known gaps (what does not sync today)

| Feature | Behaviour | Needed to fix |
| --- | --- | --- |
| **Account transfers** | Web models a transfer as two rows (expense + income) linked by `transfer_group_id`. The schema cannot link them, so transfers stay **local to the web device** and are neutral in totals. | Shared convention or additive columns (§5.1) |
| **Per-account currency** | Not a column; stored in the web blob above. Mobile shows no per-account currency. | §5.2 |
| **Recurring transactions** (`transaction_repeatings`) | Web has no recurring feature; it ignores these rows. | Product decision |
| **Carry-over** (`carry_overs`) | Web has no carry-over feature; ignores these rows. | Product decision |
| **Incremental pull** | Web downloads whole tables (1000-row pages) instead of `updated_at > lastSyncedAt`. | Web optimisation (not blocking) |
| **Password minimum** | Web enforces 12 chars on sign-up/reset (mobile UI minimum is 6). Sign-in is unaffected. | Align by decision |

## 4. Checklist for the mobile apps

1. Treat `transactions.created_at` as the date, and category type as income/expense (or tell us otherwise).
2. Tolerate positive-only amounts and category icons you do not know (fall back to a default icon).
3. Never hard-delete; keep honouring `deleted_at` tombstones from other clients.
4. Keep exactly one `is_current` account per user.
5. Preserve `user_metadata.spendscope_web` when editing user metadata.
6. Confirm `bucket_transaction_type` values and `avatarN` numbering (rows 6 and 9 above).
7. If you disagree with any row in §1, reply with the correct rule — the web change is one file
   (`src/lib/remoteSchema.js`, search `ASSUMPTION:`) plus its tests.

## 5. Optional additive proposals (NOT applied — need agreement from everyone)

All are nullable/additive, so existing app versions keep working. **Do not run without sign-off from
the Android, iOS and web owners.**

```sql
-- 5.1 Make transfers syncable (web would then push them instead of keeping them local)
alter table public.transactions
  add column if not exists transfer_group_id uuid,
  add column if not exists counterparty_account_id uuid references public.accounts(id);
create index if not exists transactions_transfer_group_idx
  on public.transactions (user_id, transfer_group_id) where transfer_group_id is not null;

-- 5.2 Per-account currency (ISO 4217), web would stop using the metadata blob for it
alter table public.accounts add column if not exists currency_code text;

-- 5.3 Explicit transaction date instead of overloading created_at
-- (keep created_at as the real creation time; fall back to created_at when null)
alter table public.transactions add column if not exists occurred_at timestamptz;
```

If 5.1–5.3 are adopted, mobile adds the same fields to its models and the web switches its mapping in
`remoteSchema.js` (about one afternoon plus tests). Until then the conventions in §1 apply.

---

Technical detail for the web side: [DATA_AND_SYNC.md](./DATA_AND_SYNC.md) (§3 mapping table),
[HISTORY_AND_DECISIONS.md](./HISTORY_AND_DECISIONS.md) §10.

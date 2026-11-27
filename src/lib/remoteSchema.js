/**
 * Remote schema adapter ("mapping layer") between SpendScope Web's local-first
 * data model and the shared Supabase database used by the Android / iOS apps.
 *
 * The shared database is the source of truth for table/column design and must
 * NOT be altered for web needs. Everything that the database cannot represent
 * is handled here, in exactly one place:
 *
 *   - Column/table renames (owner_id -> user_id, buckets -> spend_buckets, ...)
 *   - Transaction `kind`     <-> categories.type   (no kind column remotely)
 *   - Transaction `occurred_at` <-> transactions.created_at (no date column)
 *   - Per-account settings   <-> time_periods + budget_modes satellite tables
 *   - Web-only data (per-account currency, reminders, appearance, profile)
 *       -> Supabase Auth `user_metadata.spendscope_web` (mobile apps ignore it)
 *   - Transfers (paired rows) have no remote representation -> local-only
 *
 * All functions here are pure (no network, no IndexedDB) so they are unit-tested
 * in tests/unit/remoteSchema.test.js. Assumptions that still need confirmation
 * from the mobile developers are marked `ASSUMPTION:` and live only in this file.
 */
import { AVATAR_KEYS, generateUuid } from "./defaultSeeds";
import { fromIsoToLocalDateKey, toLocalMidnightIso } from "./dateUtils";

/** Local entity store -> remote table. */
export const REMOTE_TABLES = {
  accounts: "accounts",
  categories: "categories",
  transactions: "transactions",
  buckets: "spend_buckets",
  bucket_transactions: "spend_bucket_transactions",
  loan_profiles: "loans",
};

/** Key inside Supabase Auth user_metadata holding web-only synced settings. */
export const WEB_METADATA_KEY = "spendscope_web";

/** Remote tables that belong to an account and are soft-deleted with it. */
export const ACCOUNT_SATELLITE_TABLES = [
  "time_periods",
  "budget_modes",
  "carry_overs",
];

/* ----------------------------- small helpers ----------------------------- */

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const toText = (value) =>
  value === null || value === undefined || value === "" ? "" : String(value);

/* -------------------------------- icons ---------------------------------- */

// Web default icon key <-> Android/iOS icon identifier (from live categories).
const ICON_PAIRS = [
  ["housing", "housing"],
  ["utilities", "utilities"],
  ["dining", "diningOut"],
  ["transportation", "transportation"],
  ["groceries", "groceries"],
  ["health_wellness", "healthAndWellness"],
  ["education", "education"],
  ["entertainment", "entertainment"],
  ["shopping", "shopping"],
  ["insurance", "insurance"],
  ["savings_investments", "savingAndInvestments"],
  ["family_children", "familyAndChildren"],
  ["travel", "travel"],
  ["debt_payments", "debtPayments"],
  ["other", "other"],
  ["salary", "salary"],
  ["transfer", "transfer"],
  ["business_income", "businessIncome"],
  ["freelance", "freelance"],
  ["interest_income", "interestIncome"],
  ["other_income", "incomeOther"],
];

const ICON_LOCAL_TO_REMOTE = new Map(ICON_PAIRS);
const ICON_REMOTE_TO_LOCAL = new Map(ICON_PAIRS.map(([l, r]) => [r, l]));
// Mobile-only category without a web icon yet.
ICON_REMOTE_TO_LOCAL.set("carryOver", "money_transfer");

export function iconToLocal(remoteIcon) {
  if (!remoteIcon) return "other";
  return ICON_REMOTE_TO_LOCAL.get(remoteIcon) || remoteIcon;
}

export function iconToRemote(localIcon, remoteIconHint = null) {
  // Preserve a mobile-only identifier (e.g. carryOver) if the user never changed it.
  if (remoteIconHint && iconToLocal(remoteIconHint) === localIcon) {
    return remoteIconHint;
  }
  if (!localIcon) return "other";
  return ICON_LOCAL_TO_REMOTE.get(localIcon) || localIcon;
}

/* ------------------------------- avatars --------------------------------- */

// ASSUMPTION: remote `avatarN` (1-based) corresponds to AVATAR_KEYS[N - 1].
export function avatarToLocal(remoteAvatar) {
  const match = /^avatar(\d+)$/.exec(String(remoteAvatar || ""));
  if (match) {
    const key = AVATAR_KEYS[Number(match[1]) - 1];
    if (key) return key;
  }
  return AVATAR_KEYS.includes(remoteAvatar) ? remoteAvatar : AVATAR_KEYS[0];
}

export function avatarToRemote(localAvatar, remoteAvatarHint = null) {
  if (remoteAvatarHint && avatarToLocal(remoteAvatarHint) === localAvatar) {
    return remoteAvatarHint;
  }
  const idx = AVATAR_KEYS.indexOf(localAvatar);
  return idx >= 0 ? `avatar${idx + 1}` : "avatar1";
}

/* --------------------------- local-only entities -------------------------- */

/**
 * Transfers are stored by the web as paired expense/income rows linked by
 * `transfer_group_id`. The shared schema has no column for that link, so
 * syncing them would double count on other apps. They stay on this device.
 */
export function isLocalOnlyEntity(entityType, record) {
  return entityType === "transactions" && Boolean(record?.transfer_group_id);
}

/* ------------------------- web settings (user_metadata) ------------------- */

export function readWebSettings(user) {
  const raw = user?.user_metadata?.[WEB_METADATA_KEY];
  const settings = raw && typeof raw === "object" ? raw : {};
  return {
    appearance:
      settings.appearance && typeof settings.appearance === "object"
        ? settings.appearance
        : null,
    accounts:
      settings.accounts && typeof settings.accounts === "object"
        ? settings.accounts
        : {},
  };
}

/** Merges queued changes into the existing blob; returns the new blob. */
export function mergeWebSettings(existing, patch = {}) {
  const base = existing || { appearance: null, accounts: {} };
  const accounts = { ...(base.accounts || {}) };
  for (const [id, value] of Object.entries(patch.accounts || {})) {
    accounts[id] = { ...(accounts[id] || {}), ...value };
  }
  for (const id of patch.removeAccounts || []) {
    delete accounts[id];
  }
  return {
    ...base,
    appearance: patch.appearance
      ? { ...(base.appearance || {}), ...patch.appearance }
      : base.appearance || null,
    accounts,
  };
}

function accountSettingsOf(record) {
  return {
    currency_code: String(record.currency_code || "INR").toUpperCase(),
    reminders: record.reminders || "Never",
    reminder_hour:
      record.reminder_hour == null ? null : Number(record.reminder_hour),
    reminder_minute:
      record.reminder_minute == null ? null : Number(record.reminder_minute),
    hide_transactions: Boolean(record.hide_transactions),
    expense_amount: toNullableNumber(record.expense_amount),
  };
}

/* ------------------------------- push (to remote) ------------------------- */

function pickRemoteCreatedAt(record) {
  // ASSUMPTION: a transaction's date lives in transactions.created_at
  // (no dedicated date column exists). Keep the real time-of-day when the
  // user did not back-date; otherwise use the chosen date at local midnight.
  const occurred = record.occurred_at;
  const created = record.created_at;
  if (!occurred) return created;
  if (
    created &&
    fromIsoToLocalDateKey(created) === fromIsoToLocalDateKey(occurred)
  ) {
    return created;
  }
  return occurred;
}

function resolveCategoryForRemote(record, categories = []) {
  const kind = record.kind === "income" ? "income" : "expense";
  const byId = new Map(categories.map((c) => [c.id, c]));
  const direct = record.category_id ? byId.get(record.category_id) : null;
  if (direct && (direct.kind === kind || direct.type === kind)) {
    return direct.id;
  }
  const ofKind = categories.filter(
    (c) => (c.kind || c.type) === kind && !c.deleted_at,
  );
  const other = ofKind.find(
    (c) => String(c.name || "").trim().toLowerCase() === "other",
  );
  return (other || ofKind[0] || null)?.id || null;
}

/**
 * Builds the remote write set for one local entity.
 * Returns `{ writes, settingsPatch }`; `writes` is empty for local-only data.
 * `ctx`: { categories, timePeriodIds: Map, timePeriodDays: Map, budgetModeIds: Map, loanMetrics }
 */
export function buildRemoteWrites(entityType, record, ownerId, ctx = {}) {
  if (isLocalOnlyEntity(entityType, record)) {
    return { writes: [], settingsPatch: null, localOnly: true };
  }

  switch (entityType) {
    case "accounts": {
      const timePeriodIds = ctx.timePeriodIds || new Map();
      const budgetModeIds = ctx.budgetModeIds || new Map();
      const existingTp = timePeriodIds.get(record.id);
      const existingBm = budgetModeIds.get(record.id);
      const tpId = existingTp || generateUuid();
      const bmId = existingBm || generateUuid();
      timePeriodIds.set(record.id, tpId);
      budgetModeIds.set(record.id, bmId);

      const updatedAt = record.updated_at || new Date().toISOString();
      // week_start_day / month_start_day are NOT NULL with no default. Postgres
      // validates NOT NULL on the proposed INSERT tuple of an upsert *before* it
      // resolves the conflict, so they must always be sent. Re-send the values the
      // mobile apps already stored (preloaded) so they are never overwritten.
      const existingDays = (ctx.timePeriodDays || new Map()).get(record.id);
      const timePeriodRow = {
        id: tpId,
        user_id: ownerId,
        account_id: record.id,
        show_spendings: record.spending_period || "Monthly",
        week_start_day: existingDays?.week_start_day || "Sunday",
        month_start_day: Number.isFinite(Number(existingDays?.month_start_day))
          ? Number(existingDays.month_start_day)
          : 1,
        updated_at: updatedAt,
        deleted_at: null,
      };

      return {
        writes: [
          {
            table: "accounts",
            onConflict: "id",
            row: {
              id: record.id,
              user_id: ownerId,
              name: record.name,
              avatar: avatarToRemote(record.avatar_key, record.remote_avatar),
              is_current: Boolean(record.is_default),
              created_at: record.created_at,
              updated_at: updatedAt,
              deleted_at: null,
            },
          },
          { table: "time_periods", onConflict: "id", row: timePeriodRow },
          {
            table: "budget_modes",
            onConflict: "id",
            row: {
              id: bmId,
              user_id: ownerId,
              account_id: record.id,
              is_on: Boolean(record.budget_mode),
              amount:
                record.budget_amount === "" || record.budget_amount == null
                  ? null
                  : String(record.budget_amount),
              is_include_income: Boolean(record.include_income),
              updated_at: updatedAt,
              deleted_at: null,
            },
          },
        ],
        settingsPatch: { accounts: { [record.id]: accountSettingsOf(record) } },
      };
    }

    case "categories":
      return {
        writes: [
          {
            table: "categories",
            onConflict: "id",
            row: {
              id: record.id,
              user_id: ownerId,
              name: record.name,
              icon: iconToRemote(record.icon_key, record.remote_icon),
              chart_color: record.color ?? null,
              type: record.kind === "income" ? "income" : "expense",
              is_custom: !record.is_default,
              position: Number.isFinite(Number(record.position))
                ? Number(record.position)
                : 0,
              has_deleted: false,
              created_at: record.created_at,
              updated_at: record.updated_at,
              deleted_at: null,
            },
          },
        ],
        settingsPatch: null,
      };

    case "transactions": {
      const categoryId = resolveCategoryForRemote(record, ctx.categories);
      if (!categoryId) {
        throw new Error(
          "No matching category exists yet for this transaction; it will retry after categories sync.",
        );
      }
      return {
        writes: [
          {
            table: "transactions",
            onConflict: "id",
            row: {
              id: record.id,
              user_id: ownerId,
              account_id: record.account_id,
              category_id: categoryId,
              amount: Math.abs(toNumber(record.amount)),
              notes: record.note ?? null,
              created_at: pickRemoteCreatedAt(record),
              updated_at: record.updated_at,
              deleted_at: null,
            },
          },
        ],
        settingsPatch: null,
      };
    }

    case "buckets":
      return {
        writes: [
          {
            table: "spend_buckets",
            onConflict: "id",
            row: {
              id: record.id,
              user_id: ownerId,
              account_id: record.account_id,
              bucket_name: record.name,
              icon: record.image_key || "money_pig",
              bucket_created_at: record.created_at,
              sort_order: Number.isFinite(Number(record.position))
                ? Number(record.position)
                : 0,
              created_at: record.created_at,
              updated_at: record.updated_at,
              deleted_at: null,
            },
          },
        ],
        settingsPatch: null,
      };

    case "bucket_transactions":
      return {
        writes: [
          {
            table: "spend_bucket_transactions",
            onConflict: "id",
            row: {
              id: record.id,
              user_id: ownerId,
              bucket_id: record.bucket_id,
              // ASSUMPTION: 'fund' | 'expense' (live table was empty).
              bucket_transaction_type:
                record.kind === "fund" ? "fund" : "expense",
              amount: String(Math.abs(toNumber(record.amount))),
              notes: record.note ?? null,
              created_at: record.occurred_at || record.created_at,
              updated_at: record.updated_at,
              deleted_at: null,
            },
          },
        ],
        settingsPatch: null,
      };

    case "loan_profiles": {
      const metrics =
        typeof ctx.loanMetrics === "function" ? ctx.loanMetrics(record) : null;
      const row = {
        id: record.id,
        user_id: ownerId,
        loan_name: record.name,
        loan_account_number: toText(record.account_name),
        bank_name: toText(record.bank_name),
        amount: String(toNumber(record.principal_amount)),
        interest_rate: String(toNumber(record.interest_rate)),
        tenure_months: String(Math.round(toNumber(record.tenure_months, 1))),
        emi_amount: toNumber(record.emi_amount),
        processing_fees: String(toNumber(record.processing_fees)),
        loan_date: record.loan_date ? toLocalMidnightIso(record.loan_date) : null,
        first_emi_date: record.first_emi_date
          ? toLocalMidnightIso(record.first_emi_date)
          : null,
        last_emi_date: record.last_emi_date
          ? toLocalMidnightIso(record.last_emi_date)
          : null,
        created_at: record.created_at,
        updated_at: record.updated_at,
        deleted_at: null,
      };
      // Drop null dates so the NOT NULL timestamptz defaults apply.
      for (const key of ["loan_date", "first_emi_date", "last_emi_date"]) {
        if (row[key] === null) delete row[key];
      }
      if (metrics) {
        row.interest_paid = toNumber(metrics.interestPaid);
        row.principal_paid = toNumber(metrics.principalPaid);
        row.total_paid = toNumber(metrics.totalPaid);
        row.outstanding_interest = toNumber(metrics.outstandingInterest);
        row.outstanding_principal = toNumber(metrics.outstandingPrincipal);
        row.outstanding_total = toNumber(metrics.outstandingTotal);
        row.total_interest = toNumber(metrics.totalInterest);
      }
      return {
        writes: [{ table: "loans", onConflict: "id", row }],
        settingsPatch: null,
      };
    }

    case "user_preferences":
      return {
        writes: [],
        settingsPatch: {
          appearance: {
            appearance_mode: record.appearance_mode === "dark" ? "dark" : "light",
            accent_color: record.accent_color || null,
          },
        },
      };

    default:
      return { writes: [], settingsPatch: null };
  }
}

/**
 * Soft-delete plan for a local hard delete. The shared database (and the
 * mobile apps' incremental sync) rely on `deleted_at` tombstones, so rows are
 * never hard-deleted from the web.
 */
export function buildRemoteDeletes(entityType, entityId, ownerId, nowIso) {
  const table = REMOTE_TABLES[entityType];
  if (!table) return { deletes: [], settingsPatch: null };

  const patch = { deleted_at: nowIso, updated_at: nowIso };
  if (entityType === "categories") patch.has_deleted = true;

  const deletes = [
    { table, match: { id: entityId, user_id: ownerId }, patch },
  ];
  let settingsPatch = null;

  if (entityType === "accounts") {
    for (const satellite of ACCOUNT_SATELLITE_TABLES) {
      deletes.push({
        table: satellite,
        match: { account_id: entityId, user_id: ownerId },
        patch: { deleted_at: nowIso, updated_at: nowIso },
      });
    }
    settingsPatch = { removeAccounts: [entityId] };
  }
  return { deletes, settingsPatch };
}

/* ------------------------------ pull (from remote) ------------------------ */

const isLive = (row) => row && !row.deleted_at;

function indexBy(rows, key) {
  const map = new Map();
  for (const row of rows || []) {
    if (isLive(row) && !map.has(row[key])) map.set(row[key], row);
  }
  return map;
}

export function parseBucketKind(value) {
  const v = String(value || "").trim().toLowerCase();
  if (["fund", "add", "deposit", "credit", "income", "in"].includes(v)) {
    return "fund";
  }
  return "expense";
}

/**
 * Maps a complete remote snapshot to local-shaped rows per entity store.
 * `raw`: { accounts, categories (incl. soft-deleted), transactions, buckets,
 *          bucketTransactions, loans, timePeriods, budgetModes }
 * `opts`: { ownerId, webSettings, defaultCurrency }
 */
export function mapRemoteSnapshot(raw, opts = {}) {
  const ownerId = opts.ownerId || null;
  const webSettings = opts.webSettings || { appearance: null, accounts: {} };
  const defaultCurrency = String(opts.defaultCurrency || "INR").toUpperCase();

  const timePeriods = indexBy(raw.timePeriods, "account_id");
  const budgetModes = indexBy(raw.budgetModes, "account_id");

  // --- accounts ---------------------------------------------------------
  const liveAccounts = (raw.accounts || []).filter(isLive);
  let accounts = liveAccounts.map((row) => {
    const tp = timePeriods.get(row.id);
    const bm = budgetModes.get(row.id);
    const settings = webSettings.accounts?.[row.id] || null;
    const mapped = {
      id: row.id,
      owner_id: ownerId,
      name: row.name,
      avatar_key: avatarToLocal(row.avatar),
      remote_avatar: row.avatar || null,
      is_default: Boolean(row.is_current),
      spending_period: tp?.show_spendings || "Monthly",
      budget_amount: bm ? toNullableNumber(bm.amount) : null,
      include_income: bm ? Boolean(bm.is_include_income) : false,
      budget_mode: bm ? Boolean(bm.is_on) : false,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: null,
    };
    if (settings) {
      mapped.currency_code = String(
        settings.currency_code || defaultCurrency,
      ).toUpperCase();
      mapped.reminders = settings.reminders || "Never";
      mapped.reminder_hour = settings.reminder_hour ?? null;
      mapped.reminder_minute = settings.reminder_minute ?? null;
      mapped.hide_transactions = Boolean(settings.hide_transactions);
      mapped.expense_amount = settings.expense_amount ?? null;
    }
    return mapped;
  });

  // Web models exactly one default account; the shared schema only has a
  // per-row `is_current` flag. Normalise so the UI always has a single default.
  if (accounts.length > 0) {
    const sorted = [...accounts].sort((a, b) =>
      String(a.created_at).localeCompare(String(b.created_at)),
    );
    const winner = sorted.find((a) => a.is_default) || sorted[0];
    accounts = accounts.map((a) => ({ ...a, is_default: a.id === winner.id }));
  }

  const accountCurrency = new Map(
    accounts.map((a) => [
      a.id,
      a.currency_code || webSettings.accounts?.[a.id]?.currency_code || null,
    ]),
  );

  // --- categories -------------------------------------------------------
  const allCategoriesById = new Map(
    (raw.categories || []).map((row) => [row.id, row]),
  );
  const categories = (raw.categories || [])
    .filter((row) => isLive(row) && !row.has_deleted)
    .map((row) => ({
      id: row.id,
      owner_id: ownerId,
      kind: row.type === "income" ? "income" : "expense",
      name: row.name,
      icon_key: iconToLocal(row.icon),
      remote_icon: row.icon || null,
      color: row.chart_color || null,
      position: toNumber(row.position),
      is_default: !row.is_custom,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: null,
    }));

  // --- transactions -----------------------------------------------------
  const transactions = (raw.transactions || []).filter(isLive).map((row) => {
    const category = allCategoriesById.get(row.category_id);
    // ASSUMPTION: income/expense is determined by the category's type.
    const kind = category?.type === "income" ? "income" : "expense";
    return {
      id: row.id,
      owner_id: ownerId,
      account_id: row.account_id,
      category_id: row.category_id,
      kind,
      amount: Math.abs(toNumber(row.amount)),
      currency_code: accountCurrency.get(row.account_id) || defaultCurrency,
      // ASSUMPTION: transaction date == created_at (see pickRemoteCreatedAt).
      occurred_at: row.created_at,
      note: row.notes ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: null,
    };
  });

  // --- bucket transactions then buckets (totals derive from entries) ----
  const liveBuckets = (raw.buckets || []).filter(isLive);
  const bucketIds = new Set(liveBuckets.map((b) => b.id));
  const bucketTransactions = (raw.bucketTransactions || [])
    .filter((row) => isLive(row) && bucketIds.has(row.bucket_id))
    .map((row) => ({
      id: row.id,
      owner_id: ownerId,
      bucket_id: row.bucket_id,
      kind: parseBucketKind(row.bucket_transaction_type),
      amount: Math.abs(toNumber(row.amount)),
      occurred_at: row.created_at,
      note: row.notes ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: null,
    }));

  const totals = new Map();
  for (const entry of bucketTransactions) {
    const t = totals.get(entry.bucket_id) || { fund: 0, expense: 0 };
    t[entry.kind === "fund" ? "fund" : "expense"] += entry.amount;
    totals.set(entry.bucket_id, t);
  }
  const round2 = (n) => Math.round(n * 100) / 100;

  const buckets = liveBuckets.map((row) => {
    const t = totals.get(row.id) || { fund: 0, expense: 0 };
    return {
      id: row.id,
      owner_id: ownerId,
      account_id: row.account_id,
      name: row.bucket_name,
      image_key: row.icon || null,
      position: toNumber(row.sort_order),
      fund_amount: round2(t.fund),
      expense_amount: round2(t.expense),
      created_at: row.bucket_created_at || row.created_at,
      updated_at: row.updated_at,
      deleted_at: null,
    };
  });

  // --- loans ------------------------------------------------------------
  const loan_profiles = (raw.loans || []).filter(isLive).map((row) => ({
    id: row.id,
    owner_id: ownerId,
    name: row.loan_name,
    account_name: row.loan_account_number || null,
    bank_name: row.bank_name || null,
    principal_amount: toNumber(row.amount),
    interest_rate: toNumber(row.interest_rate),
    tenure_months: Math.max(1, Math.round(toNumber(row.tenure_months, 1))),
    emi_amount: toNumber(row.emi_amount),
    processing_fees: toNumber(row.processing_fees),
    loan_date: row.loan_date ? fromIsoToLocalDateKey(row.loan_date) : null,
    first_emi_date: row.first_emi_date
      ? fromIsoToLocalDateKey(row.first_emi_date)
      : null,
    last_emi_date: row.last_emi_date
      ? fromIsoToLocalDateKey(row.last_emi_date)
      : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: null,
  }));

  return {
    accounts,
    categories,
    transactions,
    buckets,
    bucket_transactions: bucketTransactions,
    loan_profiles,
  };
}

/**
 * Defaults for web-only fields when a row is seen for the first time.
 * Existing local values always win over these (see reconcile merge).
 */
export function webOnlyDefaults(entityType, ctx = {}) {
  const currency = String(ctx.defaultCurrency || "INR").toUpperCase();
  switch (entityType) {
    case "accounts":
      return {
        currency_code: currency,
        expense_amount: null,
        reminders: "Never",
        reminder_hour: null,
        reminder_minute: null,
        hide_transactions: false,
      };
    case "loan_profiles":
      return { currency_code: currency };
    default:
      return {};
  }
}

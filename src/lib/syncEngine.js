import { supabase as defaultSupabase } from "./supabaseconfig";
import { generateUuid } from "./defaultSeeds";
import {
  ensureDefaults,
  ensureDefaultsUnlocked,
  exportOwnerSnapshot,
  getPreference,
  listEntities,
  listOutbox,
  markOutboxError,
  notifyDataChanged,
  putEntitiesBatch,
  reconcileRemoteStore,
  removeOutboxOp,
  setPreference,
  withOwnerLock,
} from "./localDb";

const UPSERT_ORDER = {
  accounts: 1,
  categories: 2,
  transactions: 3,
  buckets: 4,
  bucket_transactions: 5,
  loan_profiles: 6,
  user_preferences: 7,
};

const DELETE_ORDER = {
  bucket_transactions: 1,
  buckets: 2,
  transactions: 3,
  categories: 4,
  accounts: 5,
  loan_profiles: 6,
};

const syncSubscribers = new Set();
const retryTimers = new Map();

export function getRetryDelayMs(attempts = 1) {
  return Math.min(60000, 2000 * 2 ** Math.max(0, Number(attempts) - 1));
}

export function subscribeSyncStatus(listener) {
  syncSubscribers.add(listener);
  return () => syncSubscribers.delete(listener);
}

function emitSyncStatus(status) {
  for (const listener of syncSubscribers) {
    try {
      listener(status);
    } catch {
      // Ignore subscriber errors
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("spendscope:sync-status", { detail: status }),
    );
  }
}

export function sanitizeForRemote(entityType, record, ownerId) {
  switch (entityType) {
    case "accounts":
      return {
        id: record.id,
        owner_id: ownerId,
        name: record.name,
        avatar_key: record.avatar_key ?? "user_pf",
        currency_code: (record.currency_code || "INR").toUpperCase(),
        is_default: Boolean(record.is_default),
        spending_period: record.spending_period || "Monthly",
        budget_amount:
          record.budget_amount === "" || record.budget_amount == null
            ? null
            : Number(record.budget_amount),
        include_income: Boolean(record.include_income),
        budget_mode: Boolean(record.budget_mode),
        expense_amount:
          record.expense_amount === "" || record.expense_amount == null
            ? null
            : Number(record.expense_amount),
        reminders: record.reminders || "Never",
        reminder_hour:
          record.reminder_hour == null ? null : Number(record.reminder_hour),
        reminder_minute:
          record.reminder_minute == null ? null : Number(record.reminder_minute),
        hide_transactions: Boolean(record.hide_transactions),
        created_at: record.created_at,
        updated_at: record.updated_at,
        deleted_at: null,
      };
    case "categories":
      return {
        id: record.id,
        owner_id: ownerId,
        kind: record.kind === "income" ? "income" : "expense",
        name: record.name,
        icon_key: record.icon_key ?? null,
        color: record.color ?? null,
        position: Number.isFinite(Number(record.position))
          ? Number(record.position)
          : 0,
        is_default:
          record.is_default === undefined ? null : Boolean(record.is_default),
        created_at: record.created_at,
        updated_at: record.updated_at,
        deleted_at: null,
      };
    case "transactions":
      return {
        id: record.id,
        owner_id: ownerId,
        account_id: record.account_id,
        category_id: record.category_id ?? null,
        kind: record.kind === "income" ? "income" : "expense",
        amount: Number(record.amount),
        currency_code: (record.currency_code || "INR").toUpperCase(),
        occurred_at: record.occurred_at,
        note: record.note ?? null,
        transfer_group_id: record.transfer_group_id ?? null,
        counterparty_account_id: record.counterparty_account_id ?? null,
        created_at: record.created_at,
        updated_at: record.updated_at,
        deleted_at: null,
      };
    case "buckets":
      return {
        id: record.id,
        owner_id: ownerId,
        account_id: record.account_id,
        name: record.name,
        image_key: record.image_key ?? null,
        position: Number.isFinite(Number(record.position))
          ? Number(record.position)
          : 0,
        fund_amount: Number(record.fund_amount || 0),
        expense_amount: Number(record.expense_amount || 0),
        created_at: record.created_at,
        updated_at: record.updated_at,
        deleted_at: null,
      };
    case "bucket_transactions":
      return {
        id: record.id,
        owner_id: ownerId,
        bucket_id: record.bucket_id,
        kind: record.kind === "fund" ? "fund" : "expense",
        amount: Number(record.amount),
        occurred_at: record.occurred_at,
        note: record.note ?? null,
        created_at: record.created_at,
        updated_at: record.updated_at,
        deleted_at: null,
      };
    case "loan_profiles":
      return {
        id: record.id,
        owner_id: ownerId,
        name: record.name,
        account_name: record.account_name ?? null,
        bank_name: record.bank_name ?? null,
        principal_amount: Number(record.principal_amount),
        interest_rate: Number(record.interest_rate),
        tenure_months: Number(record.tenure_months),
        emi_amount: Number(record.emi_amount),
        processing_fees: Number(record.processing_fees || 0),
        loan_date: record.loan_date,
        first_emi_date: record.first_emi_date,
        last_emi_date: record.last_emi_date,
        currency_code: (record.currency_code || "INR").toUpperCase(),
        created_at: record.created_at,
        updated_at: record.updated_at,
        deleted_at: null,
      };
    case "user_preferences":
      return {
        owner_id: ownerId,
        appearance_mode: record.appearance_mode === "dark" ? "dark" : "light",
        accent_color: record.accent_color || null,
        updated_at: record.updated_at,
      };
    default:
      return record;
  }
}

export async function pushOutbox(
  ownerId,
  client = defaultSupabase,
  { ignoreBackoff = true } = {},
) {
  if (!ownerId || !client) {
    return { pushed: 0, failed: 0, deferred: 0, skipped: true };
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { pushed: 0, failed: 0, deferred: 0, offline: true };
  }

  const ops = await listOutbox(ownerId);
  if (ops.length === 0) {
    return { pushed: 0, failed: 0 };
  }

  const now = Date.now();
  const eligible = ignoreBackoff
    ? ops
    : ops.filter((op) => !op.next_retry_at || op.next_retry_at <= now);
  const deferred = ops.length - eligible.length;

  const upserts = eligible
    .filter((op) => op.operation !== "DELETE")
    .sort(
      (a, b) =>
        (UPSERT_ORDER[a.entity_type] || 99) -
          (UPSERT_ORDER[b.entity_type] || 99) || (a.seq || 0) - (b.seq || 0),
    );

  const deletes = eligible
    .filter((op) => op.operation === "DELETE")
    .sort(
      (a, b) =>
        (DELETE_ORDER[a.entity_type] || 99) -
          (DELETE_ORDER[b.entity_type] || 99) || (a.seq || 0) - (b.seq || 0),
    );

  let pushed = 0;
  let failed = 0;

  for (const op of [...upserts, ...deletes]) {
    try {
      if (op.operation === "DELETE") {
        const { error } = await client
          .from(op.entity_type)
          .delete()
          .eq("id", op.entity_id)
          .eq("owner_id", ownerId);
        if (error) throw error;
      } else {
        const cleanPayload = sanitizeForRemote(
          op.entity_type,
          op.payload,
          ownerId,
        );
        const onConflict =
          op.entity_type === "user_preferences" ? "owner_id" : "id";
        const { error } = await client
          .from(op.entity_type)
          .upsert(cleanPayload, { onConflict });
        if (error) throw error;
      }
      await removeOutboxOp(ownerId, op.op_id, op.entity_type, op.entity_id);
      pushed++;
    } catch (err) {
      failed++;
      await markOutboxError(
        ownerId,
        op.op_id,
        err?.message || "Failed to sync operation",
      );
    }
  }

  return deferred > 0 ? { pushed, failed, deferred } : { pushed, failed };
}

export async function pullRemote(ownerId, client = defaultSupabase) {
  if (!ownerId || !client) {
    return { pulled: false, skipped: true };
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { pulled: false, offline: true };
  }

  const [
    accountsRes,
    categoriesRes,
    transactionsRes,
    bucketsRes,
    bucketTxRes,
    loanRes,
    prefsRes,
  ] = await Promise.all([
    client
      .from("accounts")
      .select("*")
      .eq("owner_id", ownerId)
      .is("deleted_at", null),
    client
      .from("categories")
      .select("*")
      .eq("owner_id", ownerId)
      .is("deleted_at", null),
    client
      .from("transactions")
      .select("*")
      .eq("owner_id", ownerId)
      .is("deleted_at", null),
    client
      .from("buckets")
      .select("*")
      .eq("owner_id", ownerId)
      .is("deleted_at", null),
    client
      .from("bucket_transactions")
      .select("*")
      .eq("owner_id", ownerId)
      .is("deleted_at", null),
    client
      .from("loan_profiles")
      .select("*")
      .eq("owner_id", ownerId)
      .is("deleted_at", null),
    client
      .from("user_preferences")
      .select("*")
      .eq("owner_id", ownerId)
      .maybeSingle(),
  ]);

  const errors = [
    accountsRes.error,
    categoriesRes.error,
    transactionsRes.error,
    bucketsRes.error,
    bucketTxRes.error,
    loanRes.error,
    prefsRes.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw errors[0];
  }

  await reconcileRemoteStore(ownerId, "accounts", accountsRes.data || []);
  await reconcileRemoteStore(ownerId, "categories", categoriesRes.data || []);
  await reconcileRemoteStore(
    ownerId,
    "transactions",
    transactionsRes.data || [],
  );
  await reconcileRemoteStore(ownerId, "buckets", bucketsRes.data || []);
  await reconcileRemoteStore(
    ownerId,
    "bucket_transactions",
    bucketTxRes.data || [],
  );
  await reconcileRemoteStore(ownerId, "loan_profiles", loanRes.data || []);

  if (prefsRes.data) {
    const outbox = await listOutbox(ownerId);
    const hasPendingPrefs = outbox.some(
      (op) => op.entity_type === "user_preferences",
    );
    if (!hasPendingPrefs) {
      await setPreference(ownerId, "appearance", {
        appearance_mode: prefsRes.data.appearance_mode,
        accent_color: prefsRes.data.accent_color,
      });
    }
  }

  const nowIso = new Date().toISOString();
  await setPreference(ownerId, "sync_meta", {
    last_pull_at: nowIso,
    last_sync_at: nowIso,
    initial_pull_done: true,
  });

  notifyDataChanged({ action: "pulled", ownerId });
  return { pulled: true };
}

function scheduleRetry(ownerId, client, delayMs, defaultCurrency) {
  if (typeof window === "undefined" || !ownerId) return;
  const existingTimer = retryTimers.get(ownerId);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(() => {
    retryTimers.delete(ownerId);
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    syncNow(ownerId, {
      client,
      defaultCurrency,
      ignoreBackoff: false,
    }).catch(() => {});
  }, delayMs);
  retryTimers.set(ownerId, timer);
}

export async function syncNow(
  ownerId,
  { client = defaultSupabase, defaultCurrency = "INR", ignoreBackoff = true } = {},
) {
  if (!ownerId) {
    await ensureDefaults({ ownerId: null, currencyCode: defaultCurrency });
    return { status: "local" };
  }

  return withOwnerLock(ownerId, async () => {
    const pendingBefore = await listOutbox(ownerId);
    if (!client) {
      await ensureDefaultsUnlocked({ ownerId, currencyCode: defaultCurrency });
      return { status: "offline", pendingCount: pendingBefore.length };
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      emitSyncStatus({
        state: "offline",
        pendingCount: pendingBefore.length,
        lastSyncAt:
          (await getPreference(ownerId, "sync_meta"))?.last_sync_at || null,
      });
      return { status: "offline", pendingCount: pendingBefore.length };
    }

    emitSyncStatus({ state: "syncing", pendingCount: pendingBefore.length });
    try {
      const pushRes = await pushOutbox(ownerId, client, { ignoreBackoff });
      await pullRemote(ownerId, client);

      // Seed defaults only AFTER a clean pull confirms no remote accounts/categories exist,
      // preventing collisions with Android backups.
      const seedRes = await ensureDefaultsUnlocked({
        ownerId,
        currencyCode: defaultCurrency,
        enqueueSync: true,
      });
      if (seedRes.seededAccounts > 0 || seedRes.seededCategories > 0) {
        await pushOutbox(ownerId, client, { ignoreBackoff: true });
      }

      const remaining = await listOutbox(ownerId);
      const meta = await getPreference(ownerId, "sync_meta");
      const hasErrors = remaining.length > 0 || pushRes.failed > 0;
      const statusObj = {
        state: hasErrors ? "error" : "synced",
        pendingCount: remaining.length,
        lastSyncAt: meta?.last_sync_at || new Date().toISOString(),
        lastError: remaining[0]?.last_error || null,
      };
      emitSyncStatus(statusObj);

      if (hasErrors) {
        const maxAttempts = remaining.reduce(
          (m, item) => Math.max(m, item.attempts || 1),
          1,
        );
        if (maxAttempts <= 5) {
          scheduleRetry(
            ownerId,
            client,
            getRetryDelayMs(maxAttempts),
            defaultCurrency,
          );
        }
      }

      return statusObj;
    } catch (err) {
      const remaining = await listOutbox(ownerId);
      const statusObj = {
        state: "error",
        pendingCount: remaining.length,
        lastError: err?.message || "Sync failed",
      };
      emitSyncStatus(statusObj);
      scheduleRetry(ownerId, client, getRetryDelayMs(1), defaultCurrency);
      return statusObj;
    }
  });
}

/**
 * Checks whether guest IndexedDB holds local data worth backing up to an account.
 */
export async function getGuestMigrationSummary(ownerId = null) {
  const snapshot = await exportOwnerSnapshot(null);
  const migPref = (await getPreference(null, "guest_migration_meta")) || {};
  const migratedOwners = Array.isArray(migPref.migratedOwners)
    ? migPref.migratedOwners
    : [];

  const nonDefaultAccounts = snapshot.accounts.filter(
    (a) => String(a.name || "").trim().toLowerCase() !== "default",
  );
  const customCategories = snapshot.categories.filter((c) => !c.is_default);

  const hasMeaningfulData =
    snapshot.transactions.length > 0 ||
    snapshot.buckets.length > 0 ||
    snapshot.bucket_transactions.length > 0 ||
    snapshot.loan_profiles.length > 0 ||
    nonDefaultAccounts.length > 0 ||
    customCategories.length > 0;

  const alreadyMigrated = ownerId ? migratedOwners.includes(ownerId) : false;

  return {
    hasData: hasMeaningfulData,
    alreadyMigrated,
    shouldPrompt: hasMeaningfulData && !alreadyMigrated,
    counts: {
      accounts: snapshot.accounts.length,
      categories: snapshot.categories.length,
      transactions: snapshot.transactions.length,
      buckets: snapshot.buckets.length,
      bucket_transactions: snapshot.bucket_transactions.length,
      loan_profiles: snapshot.loan_profiles.length,
    },
  };
}

/**
 * Merges guest IndexedDB data cleanly into an authenticated owner's store and cloud:
 * 1) Pulls remote records first so cloud accounts/categories/buckets exist locally.
 * 2) Matches accounts by name (never creates duplicate "Default" or double is_default).
 * 3) Matches categories by (kind, name) (never duplicates Android/Web defaults).
 * 4) Remaps all foreign keys + transfer_group_id deterministically so re-runs stay idempotent.
 * 5) Queues new/merged entities into sync_outbox and pushes to Supabase.
 */
export async function migrateGuestToCloud(
  ownerId,
  client = defaultSupabase,
) {
  if (!ownerId) {
    throw new Error("Sign in required before migrating local guest data.");
  }

  const guest = await exportOwnerSnapshot(null);
  const summary = await getGuestMigrationSummary(ownerId);
  if (!summary.hasData) {
    return {
      migrated: false,
      reason: "no_guest_data",
      merged: {
        accountsReused: 0,
        accountsCreated: 0,
        categoriesReused: 0,
        categoriesCreated: 0,
        transactionsMigrated: 0,
        bucketsMigrated: 0,
        bucketEntriesMigrated: 0,
        loansMigrated: 0,
      },
    };
  }

  return withOwnerLock(ownerId, async () => {
    // 1. Pull latest remote state first when connected
    if (client && (typeof navigator === "undefined" || navigator.onLine !== false)) {
      await pushOutbox(ownerId, client, { ignoreBackoff: true });
      await pullRemote(ownerId, client);
    }

    const target = await exportOwnerSnapshot(ownerId);
    const idMapPref =
      (await getPreference(ownerId, "guest_migration_id_map")) || {};
    const idMap = { ...(idMapPref.map || {}) };
    const mapEntityId = (guestId) => {
      if (!guestId) return null;
      if (!idMap[guestId]) {
        idMap[guestId] = generateUuid();
      }
      return idMap[guestId];
    };

    // --- Accounts (merge by case-insensitive name, preserve single is_default) ---
    const targetAccountByName = new Map();
    for (const acc of target.accounts) {
      targetAccountByName.set(String(acc.name || "").trim().toLowerCase(), acc);
    }
    let hasDefaultAccount = target.accounts.some((a) => Boolean(a.is_default));
    const accountIdMap = new Map();
    const newAccounts = [];
    let accountsReused = 0;

    for (const gAcc of guest.accounts) {
      const key = String(gAcc.name || "").trim().toLowerCase();
      const existing = targetAccountByName.get(key);
      if (existing) {
        accountIdMap.set(gAcc.id, existing.id);
        accountsReused++;
      } else {
        const mappedId = mapEntityId(`acc:${gAcc.id}`);
        const shouldBeDefault = !hasDefaultAccount && Boolean(gAcc.is_default);
        if (shouldBeDefault) hasDefaultAccount = true;
        const created = {
          ...gAcc,
          id: mappedId,
          owner_id: ownerId,
          is_default: shouldBeDefault,
        };
        accountIdMap.set(gAcc.id, mappedId);
        targetAccountByName.set(key, created);
        newAccounts.push(created);
      }
    }

    // Ensure at least one account fallback exists if somehow guest had orphaned references
    const fallbackAccountId =
      target.accounts.find((a) => a.is_default)?.id ||
      target.accounts[0]?.id ||
      newAccounts[0]?.id ||
      null;

    // --- Categories (merge by kind + case-insensitive name) ---
    const targetCategoryByKey = new Map();
    const maxPosByKind = { expense: -1, income: -1 };
    for (const cat of target.categories) {
      const k = cat.kind === "income" ? "income" : "expense";
      targetCategoryByKey.set(
        `${k}:${String(cat.name || "").trim().toLowerCase()}`,
        cat,
      );
      maxPosByKind[k] = Math.max(
        maxPosByKind[k],
        Number.isFinite(Number(cat.position)) ? Number(cat.position) : 0,
      );
    }

    const categoryIdMap = new Map();
    const newCategories = [];
    let categoriesReused = 0;

    for (const gCat of guest.categories) {
      const k = gCat.kind === "income" ? "income" : "expense";
      const key = `${k}:${String(gCat.name || "").trim().toLowerCase()}`;
      const existing = targetCategoryByKey.get(key);
      if (existing) {
        categoryIdMap.set(gCat.id, existing.id);
        categoriesReused++;
      } else {
        const mappedId = mapEntityId(`cat:${gCat.id}`);
        maxPosByKind[k] += 1;
        const created = {
          ...gCat,
          id: mappedId,
          owner_id: ownerId,
          kind: k,
          position: maxPosByKind[k],
        };
        categoryIdMap.set(gCat.id, mappedId);
        targetCategoryByKey.set(key, created);
        newCategories.push(created);
      }
    }

    // --- Transactions ---
    const existingTxIds = new Set(target.transactions.map((t) => t.id));
    const transferGroupMap = new Map();
    const newTransactions = [];

    for (const gTx of guest.transactions) {
      const targetAccId = accountIdMap.get(gTx.account_id) || fallbackAccountId;
      if (!targetAccId) continue;
      const mappedTxId = mapEntityId(`tx:${gTx.id}`);
      if (existingTxIds.has(mappedTxId)) continue;

      let mappedTransferGroupId = null;
      if (gTx.transfer_group_id) {
        if (!transferGroupMap.has(gTx.transfer_group_id)) {
          transferGroupMap.set(
            gTx.transfer_group_id,
            mapEntityId(`tgrp:${gTx.transfer_group_id}`),
          );
        }
        mappedTransferGroupId = transferGroupMap.get(gTx.transfer_group_id);
      }

      newTransactions.push({
        ...gTx,
        id: mappedTxId,
        owner_id: ownerId,
        account_id: targetAccId,
        category_id: gTx.category_id
          ? categoryIdMap.get(gTx.category_id) ?? null
          : null,
        counterparty_account_id: gTx.counterparty_account_id
          ? accountIdMap.get(gTx.counterparty_account_id) ?? null
          : null,
        transfer_group_id: mappedTransferGroupId,
      });
    }

    // --- Buckets & Bucket Transactions ---
    const targetBucketByKey = new Map();
    const maxBucketPosByAccount = new Map();
    for (const b of target.buckets) {
      const bKey = `${b.account_id}:${String(b.name || "").trim().toLowerCase()}`;
      targetBucketByKey.set(bKey, b);
      maxBucketPosByAccount.set(
        b.account_id,
        Math.max(
          maxBucketPosByAccount.get(b.account_id) ?? -1,
          Number(b.position || 0),
        ),
      );
    }

    const bucketIdMap = new Map();
    const bucketsToUpsert = new Map();

    for (const gBucket of guest.buckets) {
      const targetAccId =
        accountIdMap.get(gBucket.account_id) || fallbackAccountId;
      if (!targetAccId) continue;
      const bKey = `${targetAccId}:${String(gBucket.name || "").trim().toLowerCase()}`;
      const existing = targetBucketByKey.get(bKey);
      if (existing) {
        bucketIdMap.set(gBucket.id, existing.id);
      } else {
        const mappedBucketId = mapEntityId(`bkt:${gBucket.id}`);
        const nextPos = (maxBucketPosByAccount.get(targetAccId) ?? -1) + 1;
        maxBucketPosByAccount.set(targetAccId, nextPos);
        const created = {
          ...gBucket,
          id: mappedBucketId,
          owner_id: ownerId,
          account_id: targetAccId,
          position: nextPos,
          fund_amount: 0,
          expense_amount: 0,
        };
        bucketIdMap.set(gBucket.id, mappedBucketId);
        targetBucketByKey.set(bKey, created);
        bucketsToUpsert.set(mappedBucketId, created);
      }
    }

    const existingBtIds = new Set(target.bucket_transactions.map((bt) => bt.id));
    const newBucketTx = [];
    const affectedBucketIds = new Set();

    for (const gBt of guest.bucket_transactions) {
      const targetBucketId = bucketIdMap.get(gBt.bucket_id);
      if (!targetBucketId) continue;
      const mappedBtId = mapEntityId(`btx:${gBt.id}`);
      if (existingBtIds.has(mappedBtId)) continue;

      newBucketTx.push({
        ...gBt,
        id: mappedBtId,
        owner_id: ownerId,
        bucket_id: targetBucketId,
      });
      affectedBucketIds.add(targetBucketId);
    }

    // Write entities to owner store + outbox
    if (newAccounts.length > 0) {
      await putEntitiesBatch(ownerId, "accounts", newAccounts, {
        enqueueSync: true,
        silent: true,
      });
    }
    if (newCategories.length > 0) {
      await putEntitiesBatch(ownerId, "categories", newCategories, {
        enqueueSync: true,
        silent: true,
      });
    }
    if (newTransactions.length > 0) {
      await putEntitiesBatch(ownerId, "transactions", newTransactions, {
        enqueueSync: true,
        silent: true,
      });
    }
    if (bucketsToUpsert.size > 0) {
      await putEntitiesBatch(
        ownerId,
        "buckets",
        Array.from(bucketsToUpsert.values()),
        { enqueueSync: true, silent: true },
      );
    }
    if (newBucketTx.length > 0) {
      await putEntitiesBatch(ownerId, "bucket_transactions", newBucketTx, {
        enqueueSync: true,
        silent: true,
      });
    }

    // Recompute affected bucket totals cleanly
    if (affectedBucketIds.size > 0) {
      const [allBuckets, allBucketTxs] = await Promise.all([
        listEntities(ownerId, "buckets"),
        listEntities(ownerId, "bucket_transactions"),
      ]);
      const updatedBuckets = [];
      for (const bId of affectedBucketIds) {
        const b = allBuckets.find((row) => row.id === bId);
        if (!b) continue;
        const txs = allBucketTxs.filter((row) => row.bucket_id === bId);
        const fundSum = txs
          .filter((r) => r.kind === "fund")
          .reduce((s, r) => s + Number(r.amount || 0), 0);
        const expSum = txs
          .filter((r) => r.kind === "expense")
          .reduce((s, r) => s + Number(r.amount || 0), 0);
        updatedBuckets.push({
          ...b,
          fund_amount: Math.round(fundSum * 100) / 100,
          expense_amount: Math.round(expSum * 100) / 100,
        });
      }
      if (updatedBuckets.length > 0) {
        await putEntitiesBatch(ownerId, "buckets", updatedBuckets, {
          enqueueSync: true,
          silent: true,
        });
      }
    }

    // --- Loan Profiles ---
    const existingLoanKeys = new Set(
      target.loan_profiles.map(
        (l) =>
          `${String(l.name || "").trim().toLowerCase()}|${l.loan_date}|${Number(l.principal_amount)}`,
      ),
    );
    const newLoans = [];
    for (const gLoan of guest.loan_profiles) {
      const loanKey = `${String(gLoan.name || "").trim().toLowerCase()}|${gLoan.loan_date}|${Number(gLoan.principal_amount)}`;
      if (existingLoanKeys.has(loanKey)) continue;
      const mappedLoanId = mapEntityId(`loan:${gLoan.id}`);
      newLoans.push({
        ...gLoan,
        id: mappedLoanId,
        owner_id: ownerId,
      });
      existingLoanKeys.add(loanKey);
    }
    if (newLoans.length > 0) {
      await putEntitiesBatch(ownerId, "loan_profiles", newLoans, {
        enqueueSync: true,
        silent: true,
      });
    }

    // Persist deterministic map + mark owner migrated
    await setPreference(
      ownerId,
      "guest_migration_id_map",
      { map: idMap },
      { enqueueSync: false },
    );

    const migPref = (await getPreference(null, "guest_migration_meta")) || {};
    const prevOwners = Array.isArray(migPref.migratedOwners)
      ? migPref.migratedOwners
      : [];
    if (!prevOwners.includes(ownerId)) {
      await setPreference(
        null,
        "guest_migration_meta",
        { migratedOwners: [...prevOwners, ownerId], lastMigratedAt: new Date().toISOString() },
        { enqueueSync: false },
      );
    }

    // Push merged entities to Supabase
    let pushRes = { pushed: 0, failed: 0 };
    if (client && (typeof navigator === "undefined" || navigator.onLine !== false)) {
      pushRes = await pushOutbox(ownerId, client, { ignoreBackoff: true });
      if (pushRes.failed === 0) {
        await pullRemote(ownerId, client);
      }
    }

    notifyDataChanged({ action: "migrated_guest", ownerId });

    return {
      migrated: true,
      pushRes,
      merged: {
        accountsReused,
        accountsCreated: newAccounts.length,
        categoriesReused,
        categoriesCreated: newCategories.length,
        transactionsMigrated: newTransactions.length,
        bucketsMigrated: bucketsToUpsert.size,
        bucketEntriesMigrated: newBucketTx.length,
        loansMigrated: newLoans.length,
      },
    };
  });
}

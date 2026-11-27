import { openDB, deleteDB } from "idb";
import {
  buildDefaultAccount,
  buildDefaultCategories,
  generateUuid,
} from "./defaultSeeds";

export const ENTITY_STORES = [
  "accounts",
  "categories",
  "transactions",
  "buckets",
  "bucket_transactions",
  "loan_profiles",
];

const DB_VERSION = 1;
const dbCache = new Map();
const ownerMutexes = new Map();
const changeListeners = new Set();

export function getOwnerDbName(ownerId) {
  return ownerId ? `spendscope_user_${ownerId}` : "spendscope_guest";
}

export function subscribeDataChanges(listener) {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

export const subscribeDataChanged = subscribeDataChanges;

export function notifyDataChanged(detail = {}) {
  for (const listener of changeListeners) {
    try {
      listener(detail);
    } catch {
      // Ignore subscriber errors
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("spendscope:data-changed", { detail }));
  }
}

export async function withOwnerLock(ownerId, task) {
  const key = getOwnerDbName(ownerId);

  const runWithMemoryMutex = async () => {
    const previous = ownerMutexes.get(key) || Promise.resolve();
    let release;
    const current = new Promise((resolve) => {
      release = resolve;
    });
    ownerMutexes.set(key, previous.then(() => current));
    await previous;
    try {
      return await task();
    } finally {
      release();
    }
  };

  if (
    typeof navigator !== "undefined" &&
    navigator.locks &&
    typeof navigator.locks.request === "function"
  ) {
    return navigator.locks.request(`lock_${key}`, runWithMemoryMutex);
  }
  return runWithMemoryMutex();
}

export async function getDb(ownerId = null) {
  if (typeof indexedDB === "undefined") {
    return null;
  }
  const dbName = getOwnerDbName(ownerId);
  if (!dbCache.has(dbName)) {
    const promise = openDB(dbName, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("accounts")) {
          const store = db.createObjectStore("accounts", { keyPath: "id" });
          store.createIndex("by_updated", "updated_at");
        }
        if (!db.objectStoreNames.contains("categories")) {
          const store = db.createObjectStore("categories", { keyPath: "id" });
          store.createIndex("by_kind", "kind");
        }
        if (!db.objectStoreNames.contains("transactions")) {
          const store = db.createObjectStore("transactions", { keyPath: "id" });
          store.createIndex("by_account", "account_id");
          store.createIndex("by_occurred", "occurred_at");
          store.createIndex("by_category", "category_id");
        }
        if (!db.objectStoreNames.contains("buckets")) {
          const store = db.createObjectStore("buckets", { keyPath: "id" });
          store.createIndex("by_account", "account_id");
        }
        if (!db.objectStoreNames.contains("bucket_transactions")) {
          const store = db.createObjectStore("bucket_transactions", {
            keyPath: "id",
          });
          store.createIndex("by_bucket", "bucket_id");
        }
        if (!db.objectStoreNames.contains("loan_profiles")) {
          db.createObjectStore("loan_profiles", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("preferences")) {
          db.createObjectStore("preferences", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("sync_outbox")) {
          const store = db.createObjectStore("sync_outbox", {
            keyPath: "op_id",
          });
          store.createIndex("by_seq", "seq");
        }
      },
    }).catch((err) => {
      dbCache.delete(dbName);
      throw err;
    });
    dbCache.set(dbName, promise);
  }
  return dbCache.get(dbName);
}

export async function closeOwnerDb(ownerId = null) {
  const dbName = getOwnerDbName(ownerId);
  const existingPromise = dbCache.get(dbName);
  if (existingPromise) {
    try {
      const db = await existingPromise;
      db?.close();
    } catch {
      // Ignore close error
    }
    dbCache.delete(dbName);
  }
}

export async function deleteOwnerDb(ownerId) {
  if (!ownerId && ownerId !== null) return;
  const dbName = getOwnerDbName(ownerId);
  await closeOwnerDb(ownerId);
  if (typeof indexedDB !== "undefined") {
    await deleteDB(dbName);
  }
}

let seqCounter = 0;
function nextSeq(existingMax = 0) {
  seqCounter = (seqCounter + 1) % 1000;
  const candidate = Date.now() * 1000 + seqCounter;
  return candidate > existingMax ? candidate : existingMax + 1;
}

export async function listEntities(
  ownerId,
  storeName,
  { includeDeleted = false } = {},
) {
  const db = await getDb(ownerId);
  if (!db) return [];
  const rows = await db.getAll(storeName);
  if (includeDeleted) return rows;
  return rows.filter((row) => !row.deleted_at);
}

export async function getEntityById(ownerId, storeName, id) {
  const db = await getDb(ownerId);
  if (!db || !id) return null;
  const row = await db.get(storeName, id);
  return row && !row.deleted_at ? row : null;
}

async function upsertOutboxTx(outboxStore, entityType, entityId, operation, payload) {
  const allOps = await outboxStore.getAll();
  const maxSeq = allOps.reduce((max, item) => Math.max(max, item.seq || 0), 0);
  const existing = allOps.find(
    (op) => op.entity_type === entityType && op.entity_id === entityId,
  );
  const nowIso = new Date().toISOString();

  if (existing) {
    if (operation === "DELETE") {
      await outboxStore.put({
        ...existing,
        operation: "DELETE",
        payload: { id: entityId },
        status: "PENDING",
        last_error: null,
        updated_at: nowIso,
      });
      return;
    }
    await outboxStore.put({
      ...existing,
      operation: "UPSERT",
      payload,
      status: "PENDING",
      last_error: null,
      updated_at: nowIso,
    });
    return;
  }

  await outboxStore.put({
    op_id: generateUuid(),
    seq: nextSeq(maxSeq),
    entity_type: entityType,
    entity_id: entityId,
    operation,
    payload,
    status: "PENDING",
    attempts: 0,
    last_error: null,
    created_at: nowIso,
    updated_at: nowIso,
  });
}

export async function putEntity(
  ownerId,
  storeName,
  record,
  { enqueueSync = true, silent = false } = {},
) {
  const db = await getDb(ownerId);
  if (!db) return record;

  const nowIso = new Date().toISOString();
  const normalized = {
    ...record,
    id: record.id || generateUuid(),
    owner_id: ownerId || null,
    created_at: record.created_at || nowIso,
    updated_at: record.updated_at || nowIso,
    deleted_at: null,
    sync_status: ownerId && enqueueSync ? "PENDING" : ownerId ? "SYNCED" : "LOCAL",
  };

  const tx = db.transaction([storeName, "sync_outbox"], "readwrite");
  await tx.objectStore(storeName).put(normalized);
  if (ownerId && enqueueSync) {
    await upsertOutboxTx(
      tx.objectStore("sync_outbox"),
      storeName,
      normalized.id,
      "UPSERT",
      normalized,
    );
  }
  await tx.done;

  if (!silent) {
    notifyDataChanged({ storeName, action: "put", id: normalized.id, ownerId });
  }
  return normalized;
}

export const upsertEntity = putEntity;

export async function putEntitiesBatch(
  ownerId,
  storeName,
  records,
  { enqueueSync = true, silent = false } = {},
) {
  const db = await getDb(ownerId);
  if (!db || !records?.length) return [];

  const nowIso = new Date().toISOString();
  const normalizedList = records.map((record) => ({
    ...record,
    id: record.id || generateUuid(),
    owner_id: ownerId || null,
    created_at: record.created_at || nowIso,
    updated_at: record.updated_at || nowIso,
    deleted_at: null,
    sync_status: ownerId && enqueueSync ? "PENDING" : ownerId ? "SYNCED" : "LOCAL",
  }));

  const tx = db.transaction([storeName, "sync_outbox"], "readwrite");
  const entityStore = tx.objectStore(storeName);
  const outboxStore = tx.objectStore("sync_outbox");

  for (const item of normalizedList) {
    await entityStore.put(item);
    if (ownerId && enqueueSync) {
      await upsertOutboxTx(outboxStore, storeName, item.id, "UPSERT", item);
    }
  }
  await tx.done;

  if (!silent) {
    notifyDataChanged({ storeName, action: "batchPut", ownerId });
  }
  return normalizedList;
}

export async function deleteEntity(
  ownerId,
  storeName,
  entityId,
  { enqueueSync = true, silent = false } = {},
) {
  const db = await getDb(ownerId);
  if (!db || !entityId) return false;

  const tx = db.transaction([storeName, "sync_outbox"], "readwrite");
  await tx.objectStore(storeName).delete(entityId);
  if (ownerId && enqueueSync) {
    await upsertOutboxTx(
      tx.objectStore("sync_outbox"),
      storeName,
      entityId,
      "DELETE",
      { id: entityId },
    );
  }
  await tx.done;

  if (!silent) {
    notifyDataChanged({ storeName, action: "delete", id: entityId, ownerId });
  }
  return true;
}

export async function getPreference(ownerId, key, fallback = null) {
  const db = await getDb(ownerId);
  if (!db) return fallback;
  const row = await db.get("preferences", key);
  return row ? row : fallback;
}

export async function setPreference(
  ownerId,
  key,
  value,
  { enqueueSync = false } = {},
) {
  const db = await getDb(ownerId);
  if (!db) return null;
  const nowIso = new Date().toISOString();
  const payload = {
    ...value,
    key,
    updated_at: nowIso,
  };
  const tx = db.transaction(["preferences", "sync_outbox"], "readwrite");
  await tx.objectStore("preferences").put(payload);
  // IMPORTANT: Only appearance/accent preferences ever sync to cloud; app_lock never syncs.
  if (ownerId && enqueueSync && key === "appearance") {
    await upsertOutboxTx(
      tx.objectStore("sync_outbox"),
      "user_preferences",
      ownerId,
      "UPSERT",
      payload,
    );
  }
  await tx.done;
  return payload;
}

export async function listOutbox(ownerId) {
  const db = await getDb(ownerId);
  if (!db) return [];
  const ops = await db.getAll("sync_outbox");
  return ops.sort((a, b) => (a.seq || 0) - (b.seq || 0));
}

export async function removeOutboxOp(ownerId, opId, entityType, entityId) {
  const db = await getDb(ownerId);
  if (!db) return;
  const stores = ENTITY_STORES.includes(entityType)
    ? ["sync_outbox", entityType]
    : ["sync_outbox"];
  const tx = db.transaction(stores, "readwrite");
  await tx.objectStore("sync_outbox").delete(opId);
  if (ENTITY_STORES.includes(entityType)) {
    const existing = await tx.objectStore(entityType).get(entityId);
    if (existing) {
      await tx.objectStore(entityType).put({
        ...existing,
        sync_status: "SYNCED",
      });
    }
  }
  await tx.done;
}

export async function markOutboxError(ownerId, opId, errorMessage) {
  const db = await getDb(ownerId);
  if (!db) return;
  const tx = db.transaction("sync_outbox", "readwrite");
  const store = tx.objectStore("sync_outbox");
  const existing = await store.get(opId);
  if (existing) {
    const nextAttempts = (existing.attempts || 0) + 1;
    const backoffMs = Math.min(60000, 2000 * 2 ** Math.max(0, nextAttempts - 1));
    await store.put({
      ...existing,
      status: "FAILED",
      attempts: nextAttempts,
      next_retry_at: Date.now() + backoffMs,
      last_error: String(errorMessage || "Sync error"),
      updated_at: new Date().toISOString(),
    });
  }
  await tx.done;
}

/**
 * Replaces synced rows from a remote pull without overwriting rows that have
 * pending local edits in sync_outbox.
 */
export async function reconcileRemoteStore(ownerId, storeName, remoteRows) {
  const db = await getDb(ownerId);
  if (!db) return;

  const tx = db.transaction([storeName, "sync_outbox"], "readwrite");
  const entityStore = tx.objectStore(storeName);
  const outboxOps = await tx.objectStore("sync_outbox").getAll();

  const pendingIds = new Set(
    outboxOps
      .filter((op) => op.entity_type === storeName)
      .map((op) => op.entity_id),
  );

  const remoteMap = new Map();
  for (const row of remoteRows || []) {
    if (!row.deleted_at) {
      remoteMap.set(row.id, row);
    }
  }

  const localRows = await entityStore.getAll();
  for (const localRow of localRows) {
    if (pendingIds.has(localRow.id)) continue;
    if (!remoteMap.has(localRow.id)) {
      await entityStore.delete(localRow.id);
    }
  }

  for (const [id, remoteRow] of remoteMap.entries()) {
    if (pendingIds.has(id)) continue;
    await entityStore.put({
      ...remoteRow,
      sync_status: "SYNCED",
    });
  }

  await tx.done;
}

/**
 * Unlocked variant for callers that already hold withOwnerLock(ownerId).
 */
export async function ensureDefaultsUnlocked({
  ownerId = null,
  currencyCode,
  defaultCurrency,
  enqueueSync = Boolean(ownerId),
} = {}) {
  const resolvedCurrency = currencyCode || defaultCurrency || "INR";
  const db = await getDb(ownerId);
  if (!db) return { seededAccounts: 0, seededCategories: 0, accounts: [] };

  let seededAccounts = 0;
  let seededCategories = 0;

  let existingAccounts = (await db.getAll("accounts")).filter(
    (a) => !a.deleted_at,
  );
  if (existingAccounts.length === 0) {
    const defAccount = buildDefaultAccount(ownerId, resolvedCurrency);
    await putEntity(ownerId, "accounts", defAccount, {
      enqueueSync,
      silent: true,
    });
    existingAccounts = [defAccount];
    seededAccounts = 1;
  }

  const existingCategories = (await db.getAll("categories")).filter(
    (c) => !c.deleted_at,
  );
  if (existingCategories.length === 0) {
    const defCategories = buildDefaultCategories(ownerId);
    await putEntitiesBatch(ownerId, "categories", defCategories, {
      enqueueSync,
      silent: true,
    });
    seededCategories = defCategories.length;
  }

  if (seededAccounts > 0 || seededCategories > 0) {
    notifyDataChanged({ action: "seeded", ownerId });
  }

  return { seededAccounts, seededCategories, accounts: existingAccounts };
}

/**
 * Idempotent client-side seeding for accounts and categories.
 * Protected by per-owner lock (including Web Locks across tabs).
 */
export async function ensureDefaults(options = {}) {
  return withOwnerLock(options.ownerId ?? null, () =>
    ensureDefaultsUnlocked(options),
  );
}

export async function exportOwnerSnapshot(ownerId = null) {
  const db = await getDb(ownerId);
  if (!db) {
    return {
      accounts: [],
      categories: [],
      transactions: [],
      buckets: [],
      bucket_transactions: [],
      loan_profiles: [],
    };
  }
  const [
    accounts,
    categories,
    transactions,
    buckets,
    bucket_transactions,
    loan_profiles,
  ] = await Promise.all([
    listEntities(ownerId, "accounts"),
    listEntities(ownerId, "categories"),
    listEntities(ownerId, "transactions"),
    listEntities(ownerId, "buckets"),
    listEntities(ownerId, "bucket_transactions"),
    listEntities(ownerId, "loan_profiles"),
  ]);
  return {
    accounts,
    categories,
    transactions,
    buckets,
    bucket_transactions,
    loan_profiles,
  };
}

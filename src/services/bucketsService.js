import { supabase, isSupabaseConfigured } from "@/lib/supabaseconfig";
import {
  listEntities,
  putEntity,
  putEntitiesBatch,
  deleteEntity,
} from "@/lib/localDb";
import { pushOutbox } from "@/lib/syncEngine";
import { generateUuid } from "@/lib/defaultSeeds";
import { toLocalMidnightIso, fromIsoToLocalDateKey } from "@/lib/dateUtils";

const round2 = (v) => Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100;

async function syncParentBucketTotals(ownerId, bucketId) {
  const [buckets, entries] = await Promise.all([
    listEntities(ownerId, "buckets"),
    listEntities(ownerId, "bucket_transactions"),
  ]);
  const bucket = buckets.find((b) => b.id === bucketId);
  if (!bucket) return null;

  let fundMinor = 0;
  let expenseMinor = 0;
  for (const e of entries) {
    if (e.bucket_id !== bucketId) continue;
    const minor = Math.round((Number(e.amount) || 0) * 100);
    if (e.kind === "fund") fundMinor += minor;
    else expenseMinor += minor;
  }

  const updated = {
    ...bucket,
    fund_amount: round2(fundMinor / 100),
    expense_amount: round2(expenseMinor / 100),
    updated_at: new Date().toISOString(),
  };

  await putEntity(ownerId, "buckets", updated, {
    enqueueSync: Boolean(ownerId),
  });
  return updated;
}

export async function listBuckets(ownerId = null, accountId = null) {
  const rows = await listEntities(ownerId, "buckets");
  return rows
    .filter((b) => !accountId || b.account_id === accountId)
    .sort((a, b) => {
      const posCmp = (Number(a.position) || 0) - (Number(b.position) || 0);
      if (posCmp !== 0) return posCmp;
      return String(a.created_at || "").localeCompare(String(b.created_at || ""));
    });
}

export async function getBucketById(bucketId, ownerId = null) {
  const rows = await listEntities(ownerId, "buckets");
  return rows.find((b) => b.id === bucketId) || null;
}

export async function createBucket(
  { accountId, name, imageKey = "house_bucket" },
  ownerId = null,
) {
  const cleanName = String(name || "").trim();
  if (!cleanName) throw new Error("Bucket name is required.");
  if (!accountId) throw new Error("Account is required.");

  const existing = await listBuckets(ownerId, accountId);
  const dup = existing.find(
    (b) => String(b.name || "").trim().toLowerCase() === cleanName.toLowerCase(),
  );
  if (dup) throw new Error("A bucket with this name already exists.");

  const maxPos = existing.reduce(
    (max, b) => Math.max(max, Number(b.position) || 0),
    0,
  );
  const now = new Date().toISOString();

  const record = {
    id: generateUuid(),
    owner_id: ownerId || null,
    account_id: accountId,
    name: cleanName.slice(0, 80),
    image_key: imageKey || "house_bucket",
    position: maxPos + 1,
    fund_amount: 0,
    expense_amount: 0,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await putEntity(ownerId, "buckets", record, {
    enqueueSync: Boolean(ownerId),
  });

  if (ownerId && isSupabaseConfigured && supabase) {
    pushOutbox(ownerId, supabase).catch(() => {});
  }
  return record;
}

export async function updateBucket(bucketId, updates, ownerId = null) {
  const rows = await listEntities(ownerId, "buckets");
  const current = rows.find((b) => b.id === bucketId);
  if (!current) throw new Error("Bucket not found.");

  if (updates.name !== undefined) {
    const cleanName = String(updates.name).trim();
    if (!cleanName) throw new Error("Bucket name is required.");
    const dup = rows.find(
      (b) =>
        b.id !== bucketId &&
        b.account_id === current.account_id &&
        String(b.name || "").trim().toLowerCase() === cleanName.toLowerCase(),
    );
    if (dup) throw new Error("A bucket with this name already exists.");
  }

  const next = {
    ...current,
    ...(updates.name !== undefined ? { name: String(updates.name).trim() } : {}),
    ...(updates.imageKey !== undefined || updates.image_key !== undefined
      ? { image_key: updates.imageKey ?? updates.image_key }
      : {}),
    ...(updates.position !== undefined ? { position: updates.position } : {}),
    updated_at: new Date().toISOString(),
  };

  await putEntity(ownerId, "buckets", next, {
    enqueueSync: Boolean(ownerId),
  });

  if (ownerId && isSupabaseConfigured && supabase) {
    pushOutbox(ownerId, supabase).catch(() => {});
  }
  return next;
}

export async function reorderBuckets(orderedIds, ownerId = null) {
  const rows = await listEntities(ownerId, "buckets");
  const byId = new Map(rows.map((r) => [r.id, r]));
  const now = new Date().toISOString();

  const updatedList = orderedIds
    .map((id, idx) => {
      const existing = byId.get(id);
      if (!existing) return null;
      return {
        ...existing,
        position: idx + 1,
        updated_at: now,
      };
    })
    .filter(Boolean);

  if (updatedList.length > 0) {
    await putEntitiesBatch(ownerId, "buckets", updatedList, {
      enqueueSync: Boolean(ownerId),
    });
    if (ownerId && isSupabaseConfigured && supabase) {
      pushOutbox(ownerId, supabase).catch(() => {});
    }
  }
  return updatedList;
}

export async function deleteBucket(bucketId, ownerId = null) {
  const entries = await listEntities(ownerId, "bucket_transactions");
  for (const e of entries) {
    if (e.bucket_id === bucketId) {
      await deleteEntity(ownerId, "bucket_transactions", e.id, {
        enqueueSync: Boolean(ownerId),
        silent: true,
      });
    }
  }
  await deleteEntity(ownerId, "buckets", bucketId, {
    enqueueSync: Boolean(ownerId),
  });

  if (ownerId && isSupabaseConfigured && supabase) {
    pushOutbox(ownerId, supabase).catch(() => {});
  }
  return true;
}

export async function listBucketEntries(bucketId, ownerId = null) {
  const entries = await listEntities(ownerId, "bucket_transactions");
  return entries
    .filter((e) => e.bucket_id === bucketId)
    .map((e) => ({
      ...e,
      date: fromIsoToLocalDateKey(e.occurred_at || e.created_at),
      amount: Number(e.amount) || 0,
    }))
    .sort((a, b) => {
      const dCmp = String(b.date || "").localeCompare(String(a.date || ""));
      if (dCmp !== 0) return dCmp;
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });
}

export async function addBucketEntry(
  { bucketId, kind = "expense", amount, date, occurredAt, note = "" },
  ownerId = null,
) {
  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    throw new Error("Amount must be greater than zero.");
  }
  const now = new Date().toISOString();
  const normalizedKind =
    String(kind).toLowerCase() === "fund" ? "fund" : "expense";

  const entry = {
    id: generateUuid(),
    owner_id: ownerId || null,
    bucket_id: bucketId,
    kind: normalizedKind,
    amount: round2(numAmount),
    occurred_at: occurredAt || toLocalMidnightIso(date || new Date()),
    note: note ? String(note).trim() : null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await putEntity(ownerId, "bucket_transactions", entry, {
    enqueueSync: Boolean(ownerId),
    silent: true,
  });

  await syncParentBucketTotals(ownerId, bucketId);

  if (ownerId && isSupabaseConfigured && supabase) {
    pushOutbox(ownerId, supabase).catch(() => {});
  }
  return entry;
}

export async function updateBucketEntry(entryId, updates, ownerId = null) {
  const entries = await listEntities(ownerId, "bucket_transactions");
  const current = entries.find((e) => e.id === entryId);
  if (!current) throw new Error("Bucket entry not found.");

  const next = {
    ...current,
    ...(updates.kind !== undefined
      ? { kind: String(updates.kind).toLowerCase() === "fund" ? "fund" : "expense" }
      : {}),
    ...(updates.amount !== undefined ? { amount: round2(Number(updates.amount)) } : {}),
    ...(updates.date !== undefined
      ? { occurred_at: toLocalMidnightIso(updates.date) }
      : {}),
    ...(updates.note !== undefined
      ? { note: updates.note ? String(updates.note).trim() : null }
      : {}),
    updated_at: new Date().toISOString(),
  };

  await putEntity(ownerId, "bucket_transactions", next, {
    enqueueSync: Boolean(ownerId),
    silent: true,
  });
  await syncParentBucketTotals(ownerId, current.bucket_id);

  if (ownerId && isSupabaseConfigured && supabase) {
    pushOutbox(ownerId, supabase).catch(() => {});
  }
  return next;
}

export async function deleteBucketEntry(entryId, ownerId = null) {
  const entries = await listEntities(ownerId, "bucket_transactions");
  const current = entries.find((e) => e.id === entryId);
  if (!current) return false;

  await deleteEntity(ownerId, "bucket_transactions", entryId, {
    enqueueSync: Boolean(ownerId),
    silent: true,
  });
  await syncParentBucketTotals(ownerId, current.bucket_id);

  if (ownerId && isSupabaseConfigured && supabase) {
    pushOutbox(ownerId, supabase).catch(() => {});
  }
  return true;
}

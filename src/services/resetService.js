import { supabase, isSupabaseConfigured } from "@/lib/supabaseconfig";
import {
  deleteEntity,
  ensureDefaults,
  listEntities,
  notifyDataChanged,
} from "@/lib/localDb";
import { pushOutbox } from "@/lib/syncEngine";

/**
 * Safe, owner-scoped data reset service.
 * Supports the 4 Android combinations: keepAccounts x keepCategories.
 * Never deletes rows without strict owner_id scoping.
 */
export async function resetUserData({
  ownerId = null,
  keepAccounts = true,
  keepCategories = true,
} = {}) {
  try {
    // 1. Always delete transactions, buckets, bucket_transactions for this owner
    const [bucketTxs, buckets, txs] = await Promise.all([
      listEntities(ownerId, "bucket_transactions"),
      listEntities(ownerId, "buckets"),
      listEntities(ownerId, "transactions"),
    ]);

    for (const bt of bucketTxs) {
      await deleteEntity(ownerId, "bucket_transactions", bt.id, {
        enqueueSync: Boolean(ownerId),
        silent: true,
      });
    }
    for (const b of buckets) {
      await deleteEntity(ownerId, "buckets", b.id, {
        enqueueSync: Boolean(ownerId),
        silent: true,
      });
    }
    for (const tx of txs) {
      await deleteEntity(ownerId, "transactions", tx.id, {
        enqueueSync: Boolean(ownerId),
        silent: true,
      });
    }

    if (!keepCategories) {
      const cats = await listEntities(ownerId, "categories");
      for (const c of cats) {
        await deleteEntity(ownerId, "categories", c.id, {
          enqueueSync: Boolean(ownerId),
          silent: true,
        });
      }
    }

    if (!keepAccounts) {
      const accs = await listEntities(ownerId, "accounts");
      for (const a of accs) {
        await deleteEntity(ownerId, "accounts", a.id, {
          enqueueSync: Boolean(ownerId),
          silent: true,
        });
      }
    }

    // Also run owner-scoped direct deletes if authenticated & online
    if (ownerId && isSupabaseConfigured && supabase) {
      await pushOutbox(ownerId, supabase);
    }

    // Re-seed defaults when accounts or categories were wiped
    if (!keepAccounts || !keepCategories) {
      await ensureDefaults({
        ownerId,
        enqueueSync: Boolean(ownerId),
      });
      if (ownerId && isSupabaseConfigured && supabase) {
        await pushOutbox(ownerId, supabase);
      }
    }

    notifyDataChanged({ action: "reset", ownerId });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("spendscope:transactions-reset"));
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err?.message || "Failed to reset data.",
    };
  }
}

export async function resetUserTransactions(ownerId = null) {
  return resetUserData({
    ownerId,
    keepAccounts: true,
    keepCategories: true,
  });
}

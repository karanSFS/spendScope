"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  listBuckets,
  getBucketById,
  createBucket as createBucketSvc,
  updateBucket as updateBucketSvc,
  reorderBuckets as reorderBucketsSvc,
  deleteBucket as deleteBucketSvc,
  listBucketEntries,
  addBucketEntry as addBucketEntrySvc,
  updateBucketEntry as updateBucketEntrySvc,
  deleteBucketEntry as deleteBucketEntrySvc,
} from "@/services/bucketsService";
import { subscribeDataChanged } from "@/lib/localDb";

export const useBuckets = (explicitAccountId) => {
  const userId = useSelector((state) => state?.authSlice?.userId) || null;
  const activeAccountId =
    useSelector((state) => state?.appSlice?.activeAccountId) || null;
  const accountId =
    explicitAccountId !== undefined ? explicitAccountId : activeAccountId;

  const [buckets, setBuckets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshBuckets = useCallback(async () => {
    if (!accountId) {
      setBuckets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listBuckets(userId, accountId);
      setBuckets(rows);
    } catch (err) {
      setError(err?.message || "Failed to load buckets.");
    } finally {
      setLoading(false);
    }
  }, [userId, accountId]);

  useEffect(() => {
    refreshBuckets();
    const unsub = subscribeDataChanged((detail) => {
      if (
        !detail?.storeName ||
        detail.storeName === "buckets" ||
        detail.storeName === "bucket_transactions" ||
        detail.storeName === "accounts"
      ) {
        refreshBuckets();
      }
    });
    return unsub;
  }, [refreshBuckets]);

  const summary = useMemo(() => {
    let totalFunded = 0;
    let totalSpent = 0;
    for (const b of buckets) {
      totalFunded += Number(b.fund_amount) || 0;
      totalSpent += Number(b.expense_amount) || 0;
    }
    return {
      totalFunded: Math.round((totalFunded + Number.EPSILON) * 100) / 100,
      totalSpent: Math.round((totalSpent + Number.EPSILON) * 100) / 100,
      leftAcrossBuckets:
        Math.round((totalFunded - totalSpent + Number.EPSILON) * 100) / 100,
    };
  }, [buckets]);

  const createBucket = async ({ name, imageKey }) => {
    try {
      const created = await createBucketSvc(
        { accountId, name, imageKey },
        userId,
      );
      await refreshBuckets();
      return { success: true, data: created };
    } catch (err) {
      return { success: false, error: err?.message || "Failed to create bucket." };
    }
  };

  const updateBucket = async (bucketId, updates) => {
    try {
      const updated = await updateBucketSvc(bucketId, updates, userId);
      await refreshBuckets();
      return { success: true, data: updated };
    } catch (err) {
      return { success: false, error: err?.message || "Failed to update bucket." };
    }
  };

  const reorderBuckets = async (orderedIds) => {
    setBuckets((prev) => {
      const map = new Map(prev.map((b) => [b.id, b]));
      return orderedIds
        .map((id, idx) =>
          map.get(id) ? { ...map.get(id), position: idx + 1 } : null,
        )
        .filter(Boolean);
    });
    await reorderBucketsSvc(orderedIds, userId);
  };

  const deleteBucket = async (bucketId) => {
    try {
      await deleteBucketSvc(bucketId, userId);
      await refreshBuckets();
      return { success: true };
    } catch (err) {
      return { success: false, error: err?.message || "Failed to delete bucket." };
    }
  };

  return {
    buckets,
    summary,
    loading,
    error,
    refreshBuckets,
    createBucket,
    updateBucket,
    reorderBuckets,
    deleteBucket,
  };
};

export const useBucketDetails = (bucketId) => {
  const userId = useSelector((state) => state?.authSlice?.userId) || null;
  const [bucket, setBucket] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!bucketId) {
      setBucket(null);
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [found, rows] = await Promise.all([
        getBucketById(bucketId, userId),
        listBucketEntries(bucketId, userId),
      ]);
      setBucket(found);
      setEntries(rows);
    } catch (err) {
      setError(err?.message || "Failed to load bucket.");
    } finally {
      setLoading(false);
    }
  }, [bucketId, userId]);

  useEffect(() => {
    refresh();
    const unsub = subscribeDataChanged((detail) => {
      if (
        !detail?.storeName ||
        detail.storeName === "buckets" ||
        detail.storeName === "bucket_transactions"
      ) {
        refresh();
      }
    });
    return unsub;
  }, [refresh]);

  const updateBucket = async (updates) => {
    try {
      const updated = await updateBucketSvc(bucketId, updates, userId);
      await refresh();
      return { success: true, data: updated };
    } catch (err) {
      return { success: false, error: err?.message || "Failed to update bucket." };
    }
  };

  const addEntry = async (payload) => {
    try {
      const created = await addBucketEntrySvc(
        { ...payload, bucketId },
        userId,
      );
      await refresh();
      return { success: true, data: created };
    } catch (err) {
      return { success: false, error: err?.message || "Failed to add entry." };
    }
  };

  const updateEntry = async (entryId, updates) => {
    try {
      const updated = await updateBucketEntrySvc(entryId, updates, userId);
      await refresh();
      return { success: true, data: updated };
    } catch (err) {
      return { success: false, error: err?.message || "Failed to update entry." };
    }
  };

  const deleteEntry = async (entryId) => {
    try {
      await deleteBucketEntrySvc(entryId, userId);
      await refresh();
      return { success: true };
    } catch (err) {
      return { success: false, error: err?.message || "Failed to delete entry." };
    }
  };

  return {
    bucket,
    entries,
    loading,
    error,
    refresh,
    updateBucket,
    addEntry,
    updateEntry,
    deleteEntry,
  };
};

export default useBuckets;

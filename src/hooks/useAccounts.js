"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { persistor } from "@/redux";
import { setActiveAccountId } from "@/redux/slices/appSlice";
import {
  listAccounts,
  createAccount as createAccountSvc,
  updateAccount as updateAccountSvc,
  deleteAccount as deleteAccountSvc,
  transferBetweenAccounts as transferBetweenAccountsSvc,
} from "@/services/accountsService";
import { subscribeDataChanged } from "@/lib/localDb";

export const useAccounts = () => {
  const dispatch = useDispatch();
  const userId = useSelector((state) => state?.authSlice?.userId) || null;
  const defaultCurrency =
    useSelector((state) => state?.authSlice?.profile?.default_currency) ||
    "INR";
  const activeAccountId =
    useSelector((state) => state?.appSlice?.activeAccountId) || null;

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listAccounts(userId, defaultCurrency);
      setAccounts(rows);
      if (rows.length > 0 && !rows.some((a) => a.id === activeAccountId)) {
        const preferred = rows.find((a) => a.is_default) || rows[0];
        dispatch(setActiveAccountId(preferred.id));
      }
    } catch (err) {
      setError(err?.message || "Failed to load accounts.");
    } finally {
      setLoading(false);
    }
  }, [userId, defaultCurrency, activeAccountId, dispatch]);

  useEffect(() => {
    refreshAccounts();
    const unsub = subscribeDataChanged((detail) => {
      if (!detail?.storeName || detail.storeName === "accounts") {
        refreshAccounts();
      }
    });
    return unsub;
  }, [refreshAccounts]);

  const activeAccount = useMemo(
    () =>
      accounts.find((a) => a.id === activeAccountId) ||
      accounts.find((a) => a.is_default) ||
      accounts[0] ||
      null,
    [accounts, activeAccountId],
  );

  const switchAccount = useCallback(
    (id) => {
      if (id) {
        dispatch(setActiveAccountId(id));
        persistor?.flush?.();
      }
    },
    [dispatch],
  );

  const createAccount = async (payload) => {
    setError(null);
    try {
      const acc = await createAccountSvc(payload, userId);
      if (payload?.activate !== false && acc?.id) {
        dispatch(setActiveAccountId(acc.id));
        await persistor?.flush?.();
      }
      await refreshAccounts();
      return { success: true, data: acc };
    } catch (err) {
      const msg = err?.message || "Failed to create account.";
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const updateAccount = async (accountId, updates) => {
    setError(null);
    try {
      const acc = await updateAccountSvc(accountId, updates, userId);
      await refreshAccounts();
      return { success: true, data: acc };
    } catch (err) {
      const msg = err?.message || "Failed to update account.";
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const deleteAccount = async (accountId) => {
    setError(null);
    try {
      await deleteAccountSvc(accountId, userId);
      await refreshAccounts();
      return { success: true };
    } catch (err) {
      const msg = err?.message || "Failed to delete account.";
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const transferFunds = async (payload) => {
    setError(null);
    try {
      const res = await transferBetweenAccountsSvc(payload, userId);
      await refreshAccounts();
      return { success: true, data: res };
    } catch (err) {
      const msg = err?.message || "Failed to complete transfer.";
      setError(msg);
      return { success: false, error: msg };
    }
  };

  return {
    accounts,
    activeAccount,
    activeAccountId: activeAccount?.id || activeAccountId,
    loading,
    error,
    refreshAccounts,
    switchAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    transferFunds,
  };
};

export default useAccounts;

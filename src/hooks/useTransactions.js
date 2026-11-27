"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import {
  getTransactions as fetchTransactionsApi,
  createTransaction as createTransactionApi,
  updateTransaction as updateTransactionApi,
  deleteTransaction as deleteTransactionApi,
} from "@/services/transactionsService";
import { subscribeDataChanged } from "@/lib/localDb";
import { useDataReady } from "@/lib/dataReady";

export const useTransactions = (options = {}) => {
  const userId = useSelector((state) => state?.authSlice?.userId) || null;
  const storeActiveAccountId =
    useSelector((state) => state?.appSlice?.activeAccountId) || null;

  const accountId =
    options.accountId !== undefined ? options.accountId : storeActiveAccountId;

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const dataReady = useDataReady();
  const loadedKeyRef = useRef(null);

  const getTransactions = useCallback(async () => {
    // Skeleton only for the first load of this owner/account; later refreshes are silent.
    const key = `${userId}|${accountId}`;
    if (loadedKeyRef.current !== key) setLoading(true);
    setError(null);
    try {
      const data = await fetchTransactionsApi({
        userId,
        accountId,
      });
      setTransactions(data || []);
    } catch (err) {
      setError(err?.message || "Failed to load transactions.");
    } finally {
      loadedKeyRef.current = key;
      setLoading(false);
    }
  }, [userId, accountId]);

  useEffect(() => {
    getTransactions();

    const unsubData = subscribeDataChanged((detail) => {
      if (
        !detail?.storeName ||
        detail.storeName === "transactions" ||
        detail.storeName === "categories" ||
        detail.storeName === "accounts"
      ) {
        getTransactions();
      }
    });

    const handleResetEvent = () => {
      setTransactions([]);
      getTransactions();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("spendscope:transactions-reset", handleResetEvent);
    }
    return () => {
      unsubData();
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "spendscope:transactions-reset",
          handleResetEvent,
        );
      }
    };
  }, [getTransactions]);

  const addTransaction = async (payload) => {
    setError(null);
    try {
      const newTx = await createTransactionApi({
        ...payload,
        userId,
        account_id: payload?.account_id || accountId,
      });
      await getTransactions();
      return { success: true, data: newTx };
    } catch (err) {
      const errMsg = err?.message || "Failed to add transaction.";
      setError(errMsg);
      return { success: false, error: errMsg };
    }
  };

  const editTransaction = async (id, payload) => {
    setError(null);
    try {
      const updated = await updateTransactionApi(id, payload, userId);
      await getTransactions();
      return { success: true, data: updated };
    } catch (err) {
      const errMsg = err?.message || "Failed to update transaction.";
      setError(errMsg);
      return { success: false, error: errMsg };
    }
  };

  const removeTransaction = async (id) => {
    setError(null);
    try {
      await deleteTransactionApi(id, userId);
      await getTransactions();
      return { success: true };
    } catch (err) {
      const errMsg = err?.message || "Failed to delete transaction.";
      setError(errMsg);
      return { success: false, error: errMsg };
    }
  };

  const { totalIncome, totalExpense, balance } = useMemo(() => {
    let incomeMinor = 0;
    let expenseMinor = 0;

    transactions.forEach((t) => {
      if (t.transfer_group_id) return;
      const minor = Math.round((parseFloat(t.amount) || 0) * 100);
      const kind = String(t.kind || t.type || "expense").toLowerCase();
      if (kind === "income") {
        incomeMinor += minor;
      } else {
        expenseMinor += minor;
      }
    });

    return {
      totalIncome: incomeMinor / 100,
      totalExpense: expenseMinor / 100,
      balance: (incomeMinor - expenseMinor) / 100,
    };
  }, [transactions]);

  const fetchPaginatedTransactions = useCallback(
    async (params = {}) => {
      try {
        const result = await fetchTransactionsApi({
          ...params,
          userId,
          accountId: params?.accountId !== undefined ? params.accountId : accountId,
        });
        return {
          data: result || [],
          totalCount: result?.totalCount ?? (result || []).length,
        };
      } catch (err) {
        console.error(err);
        return { data: [], totalCount: 0 };
      }
    },
    [userId, accountId],
  );

  return {
    transactions,
    loading: loading || !dataReady,
    error,
    totalIncome,
    totalExpense,
    balance,
    getTransactions,
    addTransaction,
    updateTransaction: editTransaction,
    deleteTransaction: removeTransaction,
    fetchPaginatedTransactions,
  };
};

export default useTransactions;

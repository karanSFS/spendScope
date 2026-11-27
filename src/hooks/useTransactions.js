"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  getTransactions as fetchTransactionsApi,
  createTransaction as createTransactionApi,
  updateTransaction as updateTransactionApi,
  deleteTransaction as deleteTransactionApi,
} from "@/services/transactionsService";
import { subscribeDataChanged } from "@/lib/localDb";

export const useTransactions = (options = {}) => {
  const userId = useSelector((state) => state?.authSlice?.userId) || null;
  const storeActiveAccountId =
    useSelector((state) => state?.appSlice?.activeAccountId) || null;

  const accountId =
    options.accountId !== undefined ? options.accountId : storeActiveAccountId;

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getTransactions = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [userId, accountId]);

  useEffect(() => {
    getTransactions();

    const unsubData = subscribeDataChanged(() => {
      getTransactions();
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
    let income = 0;
    let expense = 0;

    transactions.forEach((t) => {
      if (t.transfer_group_id) return;
      const val = parseFloat(t.amount) || 0;
      const kind = String(t.kind || t.type || "expense").toLowerCase();
      if (kind === "income") {
        income += val;
      } else {
        expense += val;
      }
    });

    return {
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
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
    loading,
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

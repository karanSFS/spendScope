"use client";

import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  listLoanProfiles,
  createLoanProfile as createLoanProfileSvc,
  deleteLoanProfile as deleteLoanProfileSvc,
} from "@/services/loanProfilesService";
import { subscribeDataChanged } from "@/lib/localDb";

export function useLoanProfiles() {
  const userId = useSelector((state) => state?.authSlice?.userId) || null;
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshLoans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listLoanProfiles(userId);
      setLoans(rows);
    } catch (err) {
      setError(err?.message || "Failed to load loan profiles.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshLoans();
    return subscribeDataChanged((detail) => {
      if (
        !detail?.storeName ||
        detail.storeName === "loan_profiles" ||
        detail.action === "pulled"
      ) {
        refreshLoans();
      }
    });
  }, [refreshLoans]);

  const createLoan = async (payload) => {
    setError(null);
    try {
      const created = await createLoanProfileSvc(payload, userId);
      await refreshLoans();
      return { success: true, data: created };
    } catch (err) {
      const msg = err?.message || "Failed to save loan profile.";
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const removeLoan = async (loanId) => {
    setError(null);
    try {
      await deleteLoanProfileSvc(loanId, userId);
      await refreshLoans();
      return { success: true };
    } catch (err) {
      const msg = err?.message || "Failed to delete loan profile.";
      setError(msg);
      return { success: false, error: msg };
    }
  };

  return {
    loans,
    loading,
    error,
    refreshLoans,
    createLoan,
    removeLoan,
  };
}

export default useLoanProfiles;

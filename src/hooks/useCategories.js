"use client";

import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  getCategories as fetchCategoriesApi,
  getCategoryLinkedCounts,
  createCategory as createCategoryApi,
  updateCategory as updateCategoryApi,
  reorderCategories as reorderCategoriesApi,
  deleteCategory as deleteCategoryApi,
} from "@/services/categoriesService";
import { subscribeDataChanged } from "@/lib/localDb";

export const useCategories = () => {
  const userId = useSelector((state) => state?.authSlice?.userId) || null;
  const [categories, setCategories] = useState([]);
  const [linkedCounts, setLinkedCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, counts] = await Promise.all([
        fetchCategoriesApi(userId),
        getCategoryLinkedCounts(userId),
      ]);
      setCategories(data || []);
      setLinkedCounts(counts || {});
    } catch (err) {
      const errMsg = err?.message || "Failed to load categories.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    getCategories();
    const unsub = subscribeDataChanged(() => {
      getCategories();
    });
    return unsub;
  }, [getCategories]);

  const createCategory = async (nameOrPayload) => {
    setError(null);
    try {
      const newCategory = await createCategoryApi(nameOrPayload, userId);
      await getCategories();
      return { success: true, data: newCategory };
    } catch (err) {
      const errMsg = err?.message || "Failed to create category.";
      setError(errMsg);
      return { success: false, error: errMsg };
    }
  };

  const updateCategory = async (id, nameOrPayload) => {
    setError(null);
    try {
      const updatedItem = await updateCategoryApi(id, nameOrPayload, userId);
      await getCategories();
      return { success: true, data: updatedItem };
    } catch (err) {
      const errMsg = err?.message || "Failed to update category.";
      setError(errMsg);
      return { success: false, error: errMsg };
    }
  };

  const reorderCategories = async (orderedIds) => {
    setCategories((prev) => {
      const posMap = new Map(orderedIds.map((id, idx) => [id, idx + 1]));
      return [...prev]
        .map((cat) =>
          posMap.has(cat.id) ? { ...cat, position: posMap.get(cat.id) } : cat,
        )
        .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
    });
    await reorderCategoriesApi(orderedIds, userId);
  };

  const deleteCategory = async (id) => {
    setError(null);
    try {
      const res = await deleteCategoryApi(id, userId);
      await getCategories();
      return { success: true, ...res };
    } catch (err) {
      const errMsg = err?.message || "Failed to delete category.";
      setError(errMsg);
      return { success: false, error: errMsg };
    }
  };

  return {
    categories,
    linkedCounts,
    loading,
    error,
    getCategories,
    createCategory,
    updateCategory,
    reorderCategories,
    deleteCategory,
  };
};

export default useCategories;

import { store } from "@/redux";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseconfig";
import {
  listEntities,
  upsertEntity,
  putEntitiesBatch,
  deleteEntity,
  ensureDefaults,
} from "@/lib/localDb";
import { pushOutbox } from "@/lib/syncEngine";
import { generateUuid } from "@/lib/defaultSeeds";

const getContext = () => {
  try {
    const state = store?.getState?.();
    const userId = state?.authSlice?.userId || null;
    const defaultCurrency =
      state?.authSlice?.profile?.default_currency || "INR";
    return { userId, defaultCurrency };
  } catch {
    return { userId: null, defaultCurrency: "INR" };
  }
};

const toViewCategory = (c) => ({
  ...c,
  type: c.kind === "income" ? "Income" : "Expense",
  icon: c.icon_key || "other",
  color_code: c.color || "#C88856",
  is_default: Boolean(c.is_default),
});

export const getCategories = async (explicitUserId) => {
  const ctx = getContext();
  const ownerId = explicitUserId !== undefined ? explicitUserId : ctx.userId;

  await ensureDefaults({
    ownerId,
    defaultCurrency: ctx.defaultCurrency,
    enqueueSync: Boolean(ownerId),
  });

  const rows = await listEntities(ownerId, "categories");
  return [...rows]
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
    .map(toViewCategory);
};

export const getCategoryLinkedCounts = async (explicitUserId) => {
  const ctx = getContext();
  const ownerId = explicitUserId !== undefined ? explicitUserId : ctx.userId;
  const txs = await listEntities(ownerId, "transactions");
  const counts = {};
  for (const tx of txs) {
    if (tx.category_id) {
      counts[tx.category_id] = (counts[tx.category_id] || 0) + 1;
    }
  }
  return counts;
};

export const createCategory = async (payload, explicitUserId) => {
  const name =
    typeof payload === "string" ? payload.trim() : payload?.name?.trim();
  if (!name) throw new Error("Category name is required.");

  const ctx = getContext();
  const ownerId = explicitUserId !== undefined ? explicitUserId : ctx.userId;

  const existing = await listEntities(ownerId, "categories");
  const kind = String(
    (typeof payload === "object" ? payload.kind || payload.type : "expense") ||
      "expense",
  ).toLowerCase();
  const normalizedKind = kind === "income" ? "income" : "expense";

  const duplicate = existing.find(
    (c) =>
      c.kind === normalizedKind &&
      String(c.name || "").trim().toLowerCase() === name.toLowerCase(),
  );
  if (duplicate) {
    throw new Error("A category with this name already exists.");
  }

  const maxPos = existing
    .filter((c) => c.kind === normalizedKind)
    .reduce((m, c) => Math.max(m, Number(c.position) || 0), 0);
  const nowIso = new Date().toISOString();

  const record = {
    id: generateUuid(),
    owner_id: ownerId || null,
    name: name.slice(0, 60),
    kind: normalizedKind,
    icon_key:
      (typeof payload === "object" && (payload.icon_key || payload.icon)) ||
      (normalizedKind === "income" ? "other_income" : "other"),
    color:
      (typeof payload === "object" && (payload.color || payload.color_code)) ||
      "#C88856",
    color_name: (typeof payload === "object" && payload.color_name) || null,
    position: maxPos + 1,
    is_default: false,
    created_at: nowIso,
    updated_at: nowIso,
    deleted_at: null,
  };

  await upsertEntity(ownerId, "categories", record, {
    enqueueSync: Boolean(ownerId),
  });

  if (ownerId && isSupabaseConfigured && supabase) {
    pushOutbox(ownerId, supabase).catch(() => {});
  }

  return toViewCategory(record);
};

export const updateCategory = async (id, payload, explicitUserId) => {
  if (!id) throw new Error("Category ID is required.");
  const ctx = getContext();
  const ownerId = explicitUserId !== undefined ? explicitUserId : ctx.userId;

  const rows = await listEntities(ownerId, "categories");
  const current = rows.find((c) => c.id === id);
  if (!current) throw new Error("Category not found.");

  const updates =
    typeof payload === "string" ? { name: payload.trim() } : { ...payload };

  if (updates.name !== undefined) {
    const cleanName = String(updates.name).trim();
    if (!cleanName) throw new Error("Category name cannot be empty.");
    const dup = rows.find(
      (c) =>
        c.id !== id &&
        c.kind === current.kind &&
        String(c.name || "").trim().toLowerCase() === cleanName.toLowerCase(),
    );
    if (dup) throw new Error("A category with this name already exists.");
    updates.name = cleanName.slice(0, 60);
  }

  const record = {
    ...current,
    ...(updates.name ? { name: updates.name } : {}),
    ...(updates.icon_key || updates.icon
      ? { icon_key: updates.icon_key || updates.icon }
      : {}),
    ...(updates.color || updates.color_code
      ? { color: updates.color || updates.color_code }
      : {}),
    ...(updates.color_name !== undefined
      ? { color_name: updates.color_name }
      : {}),
    ...(updates.position !== undefined ? { position: updates.position } : {}),
    updated_at: new Date().toISOString(),
  };

  await upsertEntity(ownerId, "categories", record, {
    enqueueSync: Boolean(ownerId),
  });

  if (ownerId && isSupabaseConfigured && supabase) {
    pushOutbox(ownerId, supabase).catch(() => {});
  }

  return toViewCategory(record);
};

export const reorderCategories = async (orderedIds, explicitUserId) => {
  const ctx = getContext();
  const ownerId = explicitUserId !== undefined ? explicitUserId : ctx.userId;
  const rows = await listEntities(ownerId, "categories");
  const byId = new Map(rows.map((r) => [r.id, r]));
  const now = new Date().toISOString();

  const updated = orderedIds
    .map((id, idx) => {
      const current = byId.get(id);
      if (!current) return null;
      return {
        ...current,
        position: idx + 1,
        updated_at: now,
      };
    })
    .filter(Boolean);

  if (updated.length > 0) {
    await putEntitiesBatch(ownerId, "categories", updated, {
      enqueueSync: Boolean(ownerId),
    });
    if (ownerId && isSupabaseConfigured && supabase) {
      pushOutbox(ownerId, supabase).catch(() => {});
    }
  }
  return updated.map(toViewCategory);
};

/**
 * Deletes a category safely:
 * - Blocks deleting "Other" while transactions reference it.
 * - Moves any linked transactions to the same-kind "Other" category (creating it if missing)
 *   before deleting the category.
 */
export const deleteCategory = async (id, explicitUserId) => {
  if (!id) throw new Error("Category ID is required.");
  const ctx = getContext();
  const ownerId = explicitUserId !== undefined ? explicitUserId : ctx.userId;

  const [cats, txs] = await Promise.all([
    listEntities(ownerId, "categories"),
    listEntities(ownerId, "transactions"),
  ]);

  const target = cats.find((c) => c.id === id);
  if (!target) throw new Error("Category not found.");

  const linkedTxs = txs.filter((t) => t.category_id === id);
  const isTargetOther =
    String(target.name || "").trim().toLowerCase() === "other";

  if (isTargetOther && linkedTxs.length > 0) {
    throw new Error(
      `Cannot delete "${target.name}" while ${linkedTxs.length} transaction(s) are assigned to it.`,
    );
  }

  let fallbackOtherId = null;
  if (linkedTxs.length > 0) {
    let fallbackOther = cats.find(
      (c) =>
        c.id !== id &&
        c.kind === target.kind &&
        String(c.name || "").trim().toLowerCase() === "other",
    );

    const nowIso = new Date().toISOString();
    if (!fallbackOther) {
      const maxPos = cats
        .filter((c) => c.kind === target.kind)
        .reduce((m, c) => Math.max(m, Number(c.position) || 0), 0);
      fallbackOther = {
        id: generateUuid(),
        owner_id: ownerId || null,
        name: "Other",
        kind: target.kind,
        icon_key: target.kind === "income" ? "other_income" : "other",
        color: "#78909C",
        color_name: "slate",
        position: maxPos + 1,
        is_default: true,
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      };
      await upsertEntity(ownerId, "categories", fallbackOther, {
        enqueueSync: Boolean(ownerId),
        silent: true,
      });
    }

    fallbackOtherId = fallbackOther.id;
    const reassignedTxs = linkedTxs.map((tx) => ({
      ...tx,
      category_id: fallbackOther.id,
      updated_at: nowIso,
    }));

    await putEntitiesBatch(ownerId, "transactions", reassignedTxs, {
      enqueueSync: Boolean(ownerId),
      silent: true,
    });
  }

  await deleteEntity(ownerId, "categories", id, {
    enqueueSync: Boolean(ownerId),
  });

  if (ownerId && isSupabaseConfigured && supabase) {
    pushOutbox(ownerId, supabase).catch(() => {});
  }

  return {
    deleted: true,
    reassignedCount: linkedTxs.length,
    fallbackCategoryId: fallbackOtherId,
  };
};

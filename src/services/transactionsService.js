import { store } from "@/redux";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseconfig";
import {
  listEntities,
  upsertEntity,
  deleteEntity,
  ensureDefaults,
} from "@/lib/localDb";
import { pushOutbox } from "@/lib/syncEngine";
import { generateUuid } from "@/lib/defaultSeeds";
import { toLocalMidnightIso, fromIsoToLocalDateKey } from "@/lib/dateUtils";

const getContext = () => {
  try {
    const state = store?.getState?.();
    const userId = state?.authSlice?.userId || null;
    const activeAccountId = state?.appSlice?.activeAccountId || null;
    const defaultCurrency =
      state?.authSlice?.profile?.default_currency || "INR";
    return { userId, activeAccountId, defaultCurrency };
  } catch {
    return { userId: null, activeAccountId: null, defaultCurrency: "INR" };
  }
};

const toViewTransaction = (tx, categoryMap) => {
  const cat = tx.category_id ? categoryMap.get(tx.category_id) : null;
  const kind = (tx.kind || cat?.kind || "expense").toLowerCase();
  return {
    ...tx,
    type: kind === "income" ? "Income" : "Expense",
    amount: Number(tx.amount) || 0,
    category: tx.transfer_group_id
      ? "Account Transfer"
      : cat?.name || "Uncategorized",
    category_icon: tx.transfer_group_id
      ? "transfer"
      : cat?.icon_key || "other",
    color_code: cat?.color || "#C88856",
    date:
      fromIsoToLocalDateKey(tx.occurred_at) ||
      fromIsoToLocalDateKey(tx.created_at),
    note: tx.note || "",
  };
};

export const getTransactions = async (params = {}) => {
  const ctx = getContext();
  const ownerId =
    typeof params === "string"
      ? params
      : params?.userId !== undefined
        ? params.userId
        : params?.explicitUserId !== undefined
          ? params.explicitUserId
          : ctx.userId;

  await ensureDefaults({
    ownerId,
    currencyCode: ctx.defaultCurrency,
    enqueueSync: Boolean(ownerId),
  });

  const [txRows, catRows] = await Promise.all([
    listEntities(ownerId, "transactions"),
    listEntities(ownerId, "categories"),
  ]);

  const categoryMap = new Map(catRows.map((c) => [c.id, c]));
  const filterAccountId =
    typeof params === "object" && params !== null
      ? params.accountId !== undefined
        ? params.accountId
        : ctx.activeAccountId
      : ctx.activeAccountId;

  let items = txRows
    .filter((t) => !filterAccountId || t.account_id === filterAccountId)
    .map((t) => toViewTransaction(t, categoryMap));

  if (typeof params === "object" && params !== null) {
    const { startDate, endDate, limit, page } = params;
    if (startDate || endDate) {
      items = items.filter((item) => {
        if (startDate && item.date < startDate) return false;
        if (endDate && item.date > endDate) return false;
        return true;
      });
    }
    items.sort((a, b) => {
      const dateCmp = String(b.date || "").localeCompare(String(a.date || ""));
      if (dateCmp !== 0) return dateCmp;
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });

    const totalCount = items.length;
    if (limit && page) {
      const start = (page - 1) * limit;
      items = items.slice(start, start + limit);
    } else if (limit) {
      items = items.slice(0, limit);
    }
    items.totalCount = totalCount;
    return items;
  }

  items.sort((a, b) =>
    String(b.occurred_at || b.created_at || "").localeCompare(
      String(a.occurred_at || a.created_at || ""),
    ),
  );
  items.totalCount = items.length;
  return items;
};

export const createTransaction = async ({
  amount,
  type,
  kind,
  category_id,
  account_id,
  currency_code,
  date,
  occurred_at,
  note,
  userId: explicitUserId,
}) => {
  const ctx = getContext();
  const ownerId = explicitUserId !== undefined ? explicitUserId : ctx.userId;

  const { accounts } = await ensureDefaults({
    ownerId,
    currencyCode: ctx.defaultCurrency,
    enqueueSync: Boolean(ownerId),
  });

  const resolvedAccountId =
    account_id || ctx.activeAccountId || accounts[0]?.id;
  const activeAcc =
    accounts.find((a) => a.id === resolvedAccountId) || accounts[0];
  const resolvedKind = String(kind || type || "expense").toLowerCase();
  const nowIso = new Date().toISOString();

  const record = {
    id: generateUuid(),
    owner_id: ownerId || null,
    account_id: resolvedAccountId,
    category_id: category_id || null,
    kind: resolvedKind === "income" ? "income" : "expense",
    amount: Math.round((Number(amount) + Number.EPSILON) * 100) / 100,
    currency_code: (
      currency_code ||
      activeAcc?.currency_code ||
      ctx.defaultCurrency ||
      "INR"
    ).toUpperCase(),
    note: note ? String(note).trim() : null,
    occurred_at: occurred_at || toLocalMidnightIso(date || new Date()),
    transfer_group_id: null,
    counterparty_account_id: null,
    receipt_url: null,
    created_at: nowIso,
    updated_at: nowIso,
    deleted_at: null,
  };

  await upsertEntity(ownerId, "transactions", record, {
    enqueueSync: Boolean(ownerId),
  });

  if (ownerId && isSupabaseConfigured && supabase) {
    pushOutbox(ownerId, supabase).catch(() => {});
  }

  const catRows = await listEntities(ownerId, "categories");
  const catMap = new Map(catRows.map((c) => [c.id, c]));
  return toViewTransaction(record, catMap);
};

export const updateTransaction = async (id, updates = {}, explicitUserId) => {
  if (!id) throw new Error("Transaction ID is required.");
  const ctx = getContext();
  const ownerId = explicitUserId !== undefined ? explicitUserId : ctx.userId;

  const [txRows, catRows] = await Promise.all([
    listEntities(ownerId, "transactions"),
    listEntities(ownerId, "categories"),
  ]);
  const current = txRows.find((t) => t.id === id);
  if (!current) throw new Error("Transaction not found.");

  const resolvedKind =
    updates.kind !== undefined || updates.type !== undefined
      ? String(updates.kind || updates.type).toLowerCase() === "income"
        ? "income"
        : "expense"
      : current.kind;

  const next = {
    ...current,
    ...(updates.account_id !== undefined
      ? { account_id: updates.account_id }
      : {}),
    ...(updates.category_id !== undefined
      ? { category_id: updates.category_id || null }
      : {}),
    kind: resolvedKind,
    ...(updates.amount !== undefined
      ? {
          amount:
            Math.round((Number(updates.amount) + Number.EPSILON) * 100) / 100,
        }
      : {}),
    ...(updates.date !== undefined || updates.occurred_at !== undefined
      ? {
          occurred_at:
            updates.occurred_at || toLocalMidnightIso(updates.date),
        }
      : {}),
    ...(updates.note !== undefined
      ? { note: updates.note ? String(updates.note).trim() : null }
      : {}),
    updated_at: new Date().toISOString(),
  };

  await upsertEntity(ownerId, "transactions", next, {
    enqueueSync: Boolean(ownerId),
  });

  if (ownerId && isSupabaseConfigured && supabase) {
    pushOutbox(ownerId, supabase).catch(() => {});
  }

  const catMap = new Map(catRows.map((c) => [c.id, c]));
  return toViewTransaction(next, catMap);
};

export const deleteTransaction = async (id, explicitUserId) => {
  if (!id) throw new Error("Transaction ID is required.");
  const ctx = getContext();
  const ownerId = explicitUserId !== undefined ? explicitUserId : ctx.userId;

  const rows = await listEntities(ownerId, "transactions");
  const target = rows.find((t) => t.id === id);

  if (target?.transfer_group_id) {
    const paired = rows.filter(
      (t) => t.transfer_group_id === target.transfer_group_id,
    );
    for (const row of paired) {
      await deleteEntity(ownerId, "transactions", row.id, {
        enqueueSync: Boolean(ownerId),
      });
    }
  } else {
    await deleteEntity(ownerId, "transactions", id, {
      enqueueSync: Boolean(ownerId),
    });
  }

  if (ownerId && isSupabaseConfigured && supabase) {
    pushOutbox(ownerId, supabase).catch(() => {});
  }
  return true;
};

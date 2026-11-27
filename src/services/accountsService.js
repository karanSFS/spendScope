import { supabase, isSupabaseConfigured } from "@/lib/supabaseconfig";
import {
  listEntities,
  putEntity,
  putEntitiesBatch,
  deleteEntity,
  ensureDefaults,
} from "@/lib/localDb";
import { pushOutbox } from "@/lib/syncEngine";
import { generateUuid } from "@/lib/defaultSeeds";
import { toLocalMidnightIso } from "@/lib/dateUtils";

export async function listAccounts(ownerId = null, defaultCurrency = "INR") {
  await ensureDefaults({
    ownerId,
    currencyCode: defaultCurrency,
    enqueueSync: Boolean(ownerId),
  });
  const rows = await listEntities(ownerId, "accounts");
  return [...rows].sort((a, b) => {
    if (a.is_default && !b.is_default) return -1;
    if (!a.is_default && b.is_default) return 1;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

export async function createAccount(
  {
    name,
    avatarKey = "user_pf",
    currencyCode = "INR",
    spendingPeriod = "Monthly",
    budgetMode = false,
    budgetAmount = null,
    includeIncome = false,
    hideTransactions = false,
    isDefault = false,
  },
  ownerId = null,
) {
  const cleanName = String(name || "").trim();
  if (!cleanName) throw new Error("Account name is required.");

  const existing = await listEntities(ownerId, "accounts");
  const duplicate = existing.find(
    (a) => String(a.name || "").trim().toLowerCase() === cleanName.toLowerCase(),
  );
  if (duplicate) {
    throw new Error("An account with this name already exists.");
  }

  const now = new Date().toISOString();
  const shouldBeDefault = existing.length === 0 || Boolean(isDefault);

  if (shouldBeDefault && existing.some((a) => a.is_default)) {
    const updatedPrev = existing
      .filter((a) => a.is_default)
      .map((a) => ({ ...a, is_default: false, updated_at: now }));
    await putEntitiesBatch(ownerId, "accounts", updatedPrev, {
      enqueueSync: Boolean(ownerId),
      silent: true,
    });
  }

  const record = {
    id: generateUuid(),
    owner_id: ownerId || null,
    name: cleanName.slice(0, 80),
    avatar_key: avatarKey || "user_pf",
    currency_code: String(currencyCode || "INR").toUpperCase(),
    is_default: shouldBeDefault,
    spending_period: spendingPeriod || "Monthly",
    budget_amount:
      budgetAmount !== "" && budgetAmount != null ? Number(budgetAmount) : null,
    include_income: Boolean(includeIncome),
    budget_mode: Boolean(budgetMode),
    expense_amount: null,
    reminders: "Never",
    reminder_hour: null,
    reminder_minute: null,
    hide_transactions: Boolean(hideTransactions),
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await putEntity(ownerId, "accounts", record, {
    enqueueSync: Boolean(ownerId),
  });

  if (ownerId && isSupabaseConfigured && supabase) {
    pushOutbox(ownerId, supabase).catch(() => {});
  }
  return record;
}

export async function updateAccount(accountId, updates, ownerId = null) {
  if (!accountId) throw new Error("Account ID is required.");
  const rows = await listEntities(ownerId, "accounts");
  const current = rows.find((a) => a.id === accountId);
  if (!current) throw new Error("Account not found.");

  if (updates.name !== undefined) {
    const cleanName = String(updates.name).trim();
    if (!cleanName) throw new Error("Account name cannot be empty.");
    const dup = rows.find(
      (a) =>
        a.id !== accountId &&
        String(a.name || "").trim().toLowerCase() === cleanName.toLowerCase(),
    );
    if (dup) throw new Error("An account with this name already exists.");
  }

  const now = new Date().toISOString();
  if (updates.is_default === true) {
    const others = rows
      .filter((a) => a.id !== accountId && a.is_default)
      .map((a) => ({ ...a, is_default: false, updated_at: now }));
    if (others.length > 0) {
      await putEntitiesBatch(ownerId, "accounts", others, {
        enqueueSync: Boolean(ownerId),
        silent: true,
      });
    }
  }

  const next = {
    ...current,
    ...updates,
    name: updates.name !== undefined ? String(updates.name).trim() : current.name,
    currency_code:
      updates.currency_code !== undefined
        ? String(updates.currency_code).toUpperCase()
        : current.currency_code,
    updated_at: now,
  };

  await putEntity(ownerId, "accounts", next, {
    enqueueSync: Boolean(ownerId),
  });

  if (ownerId && isSupabaseConfigured && supabase) {
    pushOutbox(ownerId, supabase).catch(() => {});
  }
  return next;
}

export async function deleteAccount(accountId, ownerId = null) {
  const rows = await listEntities(ownerId, "accounts");
  if (rows.length <= 1) {
    throw new Error("You must keep at least one account.");
  }
  const target = rows.find((a) => a.id === accountId);
  if (!target) throw new Error("Account not found.");

  const [txs, buckets, bucketTxs] = await Promise.all([
    listEntities(ownerId, "transactions"),
    listEntities(ownerId, "buckets"),
    listEntities(ownerId, "bucket_transactions"),
  ]);

  const accountBucketIds = new Set(
    buckets.filter((b) => b.account_id === accountId).map((b) => b.id),
  );

  for (const bt of bucketTxs) {
    if (accountBucketIds.has(bt.bucket_id)) {
      await deleteEntity(ownerId, "bucket_transactions", bt.id, {
        enqueueSync: Boolean(ownerId),
        silent: true,
      });
    }
  }
  for (const b of buckets) {
    if (b.account_id === accountId) {
      await deleteEntity(ownerId, "buckets", b.id, {
        enqueueSync: Boolean(ownerId),
        silent: true,
      });
    }
  }
  for (const tx of txs) {
    if (tx.account_id === accountId) {
      await deleteEntity(ownerId, "transactions", tx.id, {
        enqueueSync: Boolean(ownerId),
        silent: true,
      });
    }
  }

  await deleteEntity(ownerId, "accounts", accountId, {
    enqueueSync: Boolean(ownerId),
  });

  if (target.is_default) {
    const remaining = rows.filter((a) => a.id !== accountId);
    if (remaining[0]) {
      await updateAccount(remaining[0].id, { is_default: true }, ownerId);
    }
  }

  if (ownerId && isSupabaseConfigured && supabase) {
    pushOutbox(ownerId, supabase).catch(() => {});
  }
  return true;
}

/**
 * Creates a neutral paired transfer between two accounts owned by the same user.
 * Inserts a source debit (kind = "expense") and destination credit (kind = "income")
 * sharing one transfer_group_id so reports/analytics exclude them from income/expense totals
 * while displaying them cleanly under Transfers. Works regardless of Budget Mode.
 */
export async function transferBetweenAccounts(
  {
    fromAccountId,
    toAccountId,
    amount,
    date,
    occurredAt,
    note = "",
  },
  ownerId = null,
) {
  if (!fromAccountId || !toAccountId) {
    throw new Error("Both source and destination accounts are required.");
  }
  if (fromAccountId === toAccountId) {
    throw new Error("Source and destination accounts must be different.");
  }

  const numAmount = Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    throw new Error("Transfer amount must be greater than zero.");
  }

  const accounts = await listEntities(ownerId, "accounts");
  const fromAcc = accounts.find((a) => a.id === fromAccountId);
  const toAcc = accounts.find((a) => a.id === toAccountId);
  if (!fromAcc || !toAcc) {
    throw new Error("Selected account not found.");
  }

  const nowIso = new Date().toISOString();
  const transferGroupId = generateUuid();
  const occurred = occurredAt || toLocalMidnightIso(date || new Date());
  const userMemo = String(note || "").trim();

  const debitRow = {
    id: generateUuid(),
    owner_id: ownerId || null,
    account_id: fromAcc.id,
    category_id: null,
    kind: "expense",
    amount: numAmount,
    currency_code: (fromAcc.currency_code || "INR").toUpperCase(),
    note: userMemo || `Transfer to ${toAcc.name}`,
    occurred_at: occurred,
    transfer_group_id: transferGroupId,
    counterparty_account_id: toAcc.id,
    receipt_url: null,
    created_at: nowIso,
    updated_at: nowIso,
    deleted_at: null,
  };

  const creditRow = {
    id: generateUuid(),
    owner_id: ownerId || null,
    account_id: toAcc.id,
    category_id: null,
    kind: "income",
    amount: numAmount,
    currency_code: (toAcc.currency_code || "INR").toUpperCase(),
    note: userMemo || `Transfer from ${fromAcc.name}`,
    occurred_at: occurred,
    transfer_group_id: transferGroupId,
    counterparty_account_id: fromAcc.id,
    receipt_url: null,
    created_at: nowIso,
    updated_at: nowIso,
    deleted_at: null,
  };

  await putEntitiesBatch(ownerId, "transactions", [debitRow, creditRow], {
    enqueueSync: Boolean(ownerId),
  });

  if (ownerId && isSupabaseConfigured && supabase) {
    pushOutbox(ownerId, supabase).catch(() => {});
  }

  return {
    transferGroupId,
    debitRow,
    creditRow,
    currencyMismatch:
      (fromAcc.currency_code || "INR") !== (toAcc.currency_code || "INR"),
  };
}

import { describe, it, expect, beforeEach } from "vitest";
import { parseReceiptText } from "@/lib/receiptOcr";
import {
  parseSpokenNumber,
  extractVoiceDate,
  parseVoiceTransaction,
} from "@/lib/voiceParser";
import {
  enablePinLock,
  verifyPinAttempt,
  getAppLockState,
  MAX_PIN_ATTEMPTS,
} from "@/lib/webSecurity";
import { getReminderPeriodKey, isReminderDue } from "@/lib/reminderScheduler";
import {
  deleteOwnerDb,
  ensureDefaults,
  putEntity,
  listEntities,
  listOutbox,
} from "@/lib/localDb";
import {
  migrateGuestToCloud,
  getGuestMigrationSummary,
  sanitizeForRemote,
} from "@/lib/syncEngine";
import { buildDefaultAccount, buildDefaultCategories, generateUuid } from "@/lib/defaultSeeds";

const REMOTE_TABLES = [
  "accounts",
  "categories",
  "transactions",
  "spend_buckets",
  "spend_bucket_transactions",
  "loans",
  "time_periods",
  "budget_modes",
  "carry_overs",
];

const NOT_NULL_NO_DEFAULT = {
  accounts: ["id", "name"],
  categories: ["id", "name", "icon", "type"],
  transactions: ["id", "account_id", "category_id", "amount"],
  time_periods: ["id", "account_id", "show_spendings", "week_start_day", "month_start_day"],
  budget_modes: ["id", "account_id"],
  spend_buckets: ["id", "account_id", "bucket_name", "icon"],
  spend_bucket_transactions: ["id", "bucket_id", "amount", "bucket_transaction_type"],
  loans: ["id"],
};

/** Mirrors Postgres: NOT NULL is checked on the INSERT tuple even for ON CONFLICT DO UPDATE. */
function violatesNotNull(table, payload) {
  const missing = (NOT_NULL_NO_DEFAULT[table] || []).find(
    (col) => payload[col] === undefined || payload[col] === null,
  );
  return missing
    ? {
        message: `null value in column "${missing}" of relation "${table}" violates not-null constraint`,
      }
    : null;
}

/** In-memory stand-in for the shared (user_id based) Supabase schema. */
function createMockSupabase(initialRemote = {}) {
  const remote = {};
  for (const table of REMOTE_TABLES) {
    remote[table] = [...(initialRemote[table] || [])];
  }

  const from = (table) => {
    const filters = [];
    let rangeFrom = null;
    let rangeTo = null;
    const chain = {
      select() {
        return chain;
      },
      eq(col, val) {
        filters.push((row) => row[col] === val);
        return chain;
      },
      is(col, val) {
        filters.push((row) =>
          val === null ? row[col] == null : row[col] === val,
        );
        return chain;
      },
      order() {
        return chain;
      },
      range(a, b) {
        rangeFrom = a;
        rangeTo = b;
        return chain;
      },
      then(resolve, reject) {
        let data = (remote[table] || []).filter((r) =>
          filters.every((fn) => fn(r)),
        );
        if (rangeFrom !== null) data = data.slice(rangeFrom, rangeTo + 1);
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
      upsert(payload, opts) {
        const nullError = violatesNotNull(table, payload);
        if (nullError) return Promise.resolve({ error: nullError });
        const conflictKey = opts?.onConflict || "id";
        // Mirror the shared schema's unique index (user_id, name) WHERE deleted_at IS NULL
        // to prove merge-by-name never collides.
        if (table === "accounts") {
          const dupName = remote.accounts.find(
            (a) =>
              !a.deleted_at &&
              a.user_id === payload.user_id &&
              a.id !== payload.id &&
              a.name.trim().toLowerCase() === payload.name.trim().toLowerCase(),
          );
          if (dupName) {
            return Promise.resolve({
              error: { message: "duplicate account name index" },
            });
          }
        }
        const idx = remote[table].findIndex(
          (r) => r[conflictKey] === payload[conflictKey],
        );
        if (idx >= 0) {
          remote[table][idx] = { ...remote[table][idx], ...payload };
        } else {
          remote[table].push({ ...payload });
        }
        return Promise.resolve({ error: null });
      },
      update(patch) {
        const updateFilters = [];
        const updateChain = {
          eq(col, val) {
            updateFilters.push((row) => row[col] === val);
            return updateChain;
          },
          then(resolve, reject) {
            remote[table] = remote[table].map((r) =>
              updateFilters.every((fn) => fn(r)) ? { ...r, ...patch } : r,
            );
            return Promise.resolve({ error: null }).then(resolve, reject);
          },
        };
        return updateChain;
      },
    };
    return chain;
  };

  return { client: { from }, remote };
}

/** Builds the shared-schema rows a mobile app would already have stored. */
function toCloudRows(ownerId) {
  const account = {
    id: generateUuid(),
    user_id: ownerId,
    name: "Default",
    avatar: "avatar1",
    is_current: true,
    created_at: "2026-11-20T00:00:00.000Z",
    updated_at: "2026-11-20T00:00:00.000Z",
    deleted_at: null,
  };
  const localCats = buildDefaultCategories(ownerId);
  const categories = localCats.map((cat) =>
    sanitizeForRemote("categories", cat, ownerId),
  );
  return { account, categories, localCats };
}

describe("Phase 5 Receipt OCR Parser", () => {
  it("extracts Grand Total over subtotal/tax and parses 2-digit year dates", () => {
    const sample = `
      FRESH MARKET ORGANIC
      Date: 26/11/26
      Subtotal       ₹1,055.00
      CGST 9%        ₹94.95
      SGST 9%        ₹94.95
      Grand Total    ₹1,244.90
      Cash Tendered  ₹2,000.00
    `;
    const res = parseReceiptText(sample, "INR");
    expect(res.amount).toBe(1244.9);
    expect(res.date).toBe("2026-11-26");
    expect(res.note).toBe("FRESH MARKET ORGANIC");
  });

  it("supports USD, EUR, GBP, JPY, AED, BRL, RUB currency formats", () => {
    expect(parseReceiptText("Total Due $48.75", "USD").amount).toBe(48.75);
    expect(parseReceiptText("Total €32,50", "EUR").amount).toBe(32.5);
    expect(parseReceiptText("Total £19.99", "GBP").amount).toBe(19.99);
    expect(parseReceiptText("Total ¥1500", "JPY").amount).toBe(1500);
    expect(parseReceiptText("Amount Payable AED 240.00", "AED").amount).toBe(240);
    expect(parseReceiptText("Total R$ 89,90", "BRL").amount).toBe(89.9);
    expect(parseReceiptText("Итого ₽750.00", "RUB").amount).toBe(750);
  });
});

describe("Phase 5 Voice Parser", () => {
  const sampleCategories = [
    { id: "cat-gro", name: "Groceries", kind: "expense" },
    { id: "cat-din", name: "Dining", kind: "expense" },
    { id: "cat-debt", name: "Debt Payments", kind: "expense" },
    { id: "cat-sal", name: "Salary", kind: "income" },
  ];

  it("parses spoken & numeric decimals and Indian/Western scales accurately", () => {
    expect(parseSpokenNumber("Spent 45.50 on groceries yesterday")).toBe(45.5);
    expect(parseSpokenNumber("forty five point five zero")).toBe(45.5);
    expect(parseSpokenNumber("forty five dollars and fifty cents")).toBe(45.5);
    expect(parseSpokenNumber("two lakh fifty thousand")).toBe(250000);
    expect(parseSpokenNumber("1.5 lakh")).toBe(150000);
    expect(parseSpokenNumber("two thousand five hundred")).toBe(2500);
  });

  it("avoids false positive on modal verb 'may' while supporting real May dates", () => {
    const ref = new Date(2026, 10, 26); // Nov 26, 2026
    expect(extractVoiceDate("I may have spent 80 on coffee", ref)).toBe("2026-11-26");
    expect(extractVoiceDate("Spent 45.50 yesterday", ref)).toBe("2026-11-25");
    expect(extractVoiceDate("Spent 250 on May 15", ref)).toBe("2026-05-15");
    expect(extractVoiceDate("Paid 250 on 15th May 2026", ref)).toBe("2026-05-15");
  });

  it("maps 'Spent 45.50 on groceries yesterday' cleanly", () => {
    const ref = new Date(2026, 10, 26);
    const parsed = parseVoiceTransaction(
      "Spent 45.50 on groceries yesterday",
      sampleCategories,
      ref,
    );
    expect(parsed.amount).toBe(45.5);
    expect(parsed.kind).toBe("expense");
    expect(parsed.categoryId).toBe("cat-gro");
    expect(parsed.date).toBe("2026-11-25");
  });

  it("maps income and Debt Payments correctly", () => {
    const ref = new Date(2026, 10, 26);
    const inc = parseVoiceTransaction("Received 50000 salary today", sampleCategories, ref);
    expect(inc.kind).toBe("income");
    expect(inc.categoryId).toBe("cat-sal");

    const emi = parseVoiceTransaction("Paid 12000 for EMI", sampleCategories, ref);
    expect(emi.kind).toBe("expense");
    expect(emi.categoryId).toBe("cat-debt");
  });
});

describe("Phase 5 Device-Local PIN & Lockout", () => {
  const ownerId = "lock-test-user";

  beforeEach(async () => {
    await deleteOwnerDb(ownerId);
  });

  it("preserves PIN '0000', triggers exact 4-min lockout after 5 wrong tries, and writes zero sync_outbox entries", async () => {
    await enablePinLock(ownerId, "0000");
    const state = await getAppLockState(ownerId);
    expect(state.enabled).toBe(true);

    const ok = await verifyPinAttempt(ownerId, "0000");
    expect(ok.valid).toBe(true);

    for (let i = 1; i < MAX_PIN_ATTEMPTS; i++) {
      const fail = await verifyPinAttempt(ownerId, "9999");
      expect(fail.valid).toBe(false);
      expect(fail.attemptsLeft).toBe(MAX_PIN_ATTEMPTS - i);
      expect(fail.lockedRemainingSeconds).toBe(0);
    }

    const fifth = await verifyPinAttempt(ownerId, "9999");
    expect(fifth.valid).toBe(false);
    expect(fifth.lockedRemainingSeconds).toBeGreaterThanOrEqual(239);
    expect(fifth.lockedRemainingSeconds).toBeLessThanOrEqual(240);

    // Even valid PIN is blocked during cooldown
    const blocked = await verifyPinAttempt(ownerId, "0000");
    expect(blocked.valid).toBe(false);
    expect(blocked.lockedRemainingSeconds).toBeGreaterThan(0);

    // Zero lock secrets ever enter sync_outbox
    const outbox = await listOutbox(ownerId);
    expect(outbox).toHaveLength(0);
  });
});

describe("Phase 5 Reminder Scheduler", () => {
  it("computes Daily/Weekly/Monthly keys and catches up inside active period", () => {
    const afternoon = new Date(2026, 10, 26, 21, 15);
    const key = getReminderPeriodKey("Daily", afternoon);
    expect(key).toBe("2026-11-26");

    expect(
      isReminderDue({
        frequency: "Daily",
        hour: 20,
        minute: 0,
        lastFiredKey: null,
        now: afternoon,
      }),
    ).toEqual({ due: true, periodKey: "2026-11-26" });

    expect(
      isReminderDue({
        frequency: "Daily",
        hour: 20,
        minute: 0,
        lastFiredKey: "2026-11-26",
        now: afternoon,
      }).due,
    ).toBe(false);
  });
});

describe("Phase 5 Guest-to-Cloud Merge & Deduplication", () => {
  const ownerId = "cloud-user-1";

  beforeEach(async () => {
    await deleteOwnerDb(null);
    await deleteOwnerDb(ownerId);
  });

  it("merges guest data into cloud user that already has 'Default' account + default categories with ZERO duplicates", async () => {
    // Cloud already has mobile-originated Default account + categories
    const cloud = toCloudRows(ownerId);
    const cloudDefaultAcc = cloud.account;
    const cloudCats = cloud.categories;
    const { client, remote } = createMockSupabase({
      accounts: [cloudDefaultAcc],
      categories: cloudCats,
    });

    // Guest creates local defaults + 2 transactions + 1 bucket + 1 loan profile + 1 extra account
    const guestSeed = await ensureDefaults({ ownerId: null, enqueueSync: false });
    const guestDefaultAcc = guestSeed.accounts[0];
    const guestCats = await listEntities(null, "categories");
    const guestGroceries = guestCats.find((c) => c.name === "Groceries");

    const travelAcc = await putEntity(
      null,
      "accounts",
      {
        name: "Travel Wallet",
        currency_code: "USD",
        is_default: false,
      },
      { enqueueSync: false },
    );

    const tGrp = generateUuid();
    await putEntity(
      null,
      "transactions",
      {
        account_id: guestDefaultAcc.id,
        category_id: guestGroceries.id,
        kind: "expense",
        amount: 550,
        occurred_at: "2026-11-25T18:30:00.000Z",
        note: "Groceries before sign in",
      },
      { enqueueSync: false },
    );
    await putEntity(
      null,
      "transactions",
      {
        account_id: guestDefaultAcc.id,
        counterparty_account_id: travelAcc.id,
        transfer_group_id: tGrp,
        kind: "expense",
        amount: 2000,
        occurred_at: "2026-11-25T18:30:00.000Z",
      },
      { enqueueSync: false },
    );
    await putEntity(
      null,
      "transactions",
      {
        account_id: travelAcc.id,
        counterparty_account_id: guestDefaultAcc.id,
        transfer_group_id: tGrp,
        kind: "income",
        amount: 2000,
        occurred_at: "2026-11-25T18:30:00.000Z",
      },
      { enqueueSync: false },
    );

    const guestBucket = await putEntity(
      null,
      "buckets",
      {
        account_id: guestDefaultAcc.id,
        name: "Goa Trip",
        fund_amount: 5000,
        expense_amount: 1200,
      },
      { enqueueSync: false },
    );
    await putEntity(
      null,
      "bucket_transactions",
      {
        bucket_id: guestBucket.id,
        kind: "fund",
        amount: 5000,
        occurred_at: "2026-11-25T18:30:00.000Z",
      },
      { enqueueSync: false },
    );

    const preSummary = await getGuestMigrationSummary(ownerId);
    expect(preSummary.hasData).toBe(true);
    expect(preSummary.shouldPrompt).toBe(true);

    const res = await migrateGuestToCloud(ownerId, client);
    expect(res.migrated).toBe(true);
    expect(res.pushRes.failed).toBe(0);
    expect(res.merged.accountsReused).toBe(1);
    expect(res.merged.accountsCreated).toBe(1);
    expect(res.merged.categoriesReused).toBe(21);
    expect(res.merged.categoriesCreated).toBe(0);
    expect(res.merged.transactionsMigrated).toBe(3);

    // Exactly 2 accounts in cloud ("Default" + "Travel Wallet"), single current account
    expect(remote.accounts).toHaveLength(2);
    expect(remote.accounts.filter((a) => a.is_current)).toHaveLength(1);
    // Categories never duplicated (still 21)
    expect(remote.categories).toHaveLength(21);
    // Guest Groceries tx attached to Cloud Groceries ID + Cloud Default Account ID
    const cloudGroceries = cloudCats.find((c) => c.name === "Groceries");
    const migratedGroTx = remote.transactions.find(
      (t) => t.notes === "Groceries before sign in",
    );
    expect(migratedGroTx.account_id).toBe(cloudDefaultAcc.id);
    expect(migratedGroTx.category_id).toBe(cloudGroceries.id);

    // Transfers have no representation on the shared schema: they stay local-only.
    expect(remote.transactions).toHaveLength(1);
    const localTxs = await listEntities(ownerId, "transactions");
    expect(localTxs.filter((t) => t.transfer_group_id)).toHaveLength(2);
    // Bucket + entry synced under the shared table names
    expect(remote.spend_buckets).toHaveLength(1);
    expect(remote.spend_bucket_transactions).toHaveLength(1);

    // Re-running migration stays strictly idempotent (0 duplicates)
    const secondRun = await migrateGuestToCloud(ownerId, client);
    expect(secondRun.merged.transactionsMigrated).toBe(0);
    expect(remote.accounts).toHaveLength(2);
    expect(remote.transactions).toHaveLength(1);
  });
});

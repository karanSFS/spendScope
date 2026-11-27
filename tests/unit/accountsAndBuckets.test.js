import { describe, it, expect, beforeEach } from "vitest";
import { deleteOwnerDb, listEntities } from "@/lib/localDb";
import {
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from "@/services/accountsService";
import {
  listBuckets,
  createBucket,
  reorderBuckets,
  addBucketEntry,
  updateBucketEntry,
  deleteBucketEntry,
  listBucketEntries,
} from "@/services/bucketsService";
import { createTransaction } from "@/services/transactionsService";

describe("accountsService & bucketsService", () => {
  beforeEach(async () => {
    await deleteOwnerDb(null);
  });

  it("creates, switches default, rejects duplicates, and cascades deletion safely", async () => {
    const initial = await listAccounts(null, "INR");
    expect(initial).toHaveLength(1);
    const defaultAcc = initial[0];

    await expect(deleteAccount(defaultAcc.id, null)).rejects.toThrow(
      /at least one account/i,
    );

    const travel = await createAccount(
      {
        name: "Travel Wallet",
        currencyCode: "USD",
        spendingPeriod: "Weekly",
        budgetMode: true,
        budgetAmount: 800,
      },
      null,
    );

    await expect(
      createAccount({ name: "travel wallet" }, null),
    ).rejects.toThrow(/already exists/i);

    await updateAccount(travel.id, { is_default: true }, null);
    const afterDefault = await listAccounts(null);
    expect(afterDefault.find((a) => a.id === travel.id)?.is_default).toBe(true);
    expect(afterDefault.find((a) => a.id === defaultAcc.id)?.is_default).toBe(
      false,
    );

    // Add child transaction + bucket + entry under Travel Wallet then delete account
    await createTransaction({
      account_id: travel.id,
      amount: 55,
      kind: "expense",
      date: "2026-11-26",
      userId: null,
    });
    const b = await createBucket(
      { accountId: travel.id, name: "Flights" },
      null,
    );
    await addBucketEntry({ bucketId: b.id, kind: "fund", amount: 500 }, null);

    await deleteAccount(travel.id, null);
    const remainingAccs = await listAccounts(null);
    expect(remainingAccs).toHaveLength(1);
    expect(remainingAccs[0].is_default).toBe(true);
    expect(await listEntities(null, "transactions")).toHaveLength(0);
    expect(await listEntities(null, "buckets")).toHaveLength(0);
    expect(await listEntities(null, "bucket_transactions")).toHaveLength(0);
  });

  it("tracks bucket entries, recalculates parent fund/expense totals, and persists reorder", async () => {
    const [acc] = await listAccounts(null, "INR");
    const b1 = await createBucket({ accountId: acc.id, name: "Goa Trip" }, null);
    const b2 = await createBucket({ accountId: acc.id, name: "Laptop" }, null);

    await reorderBuckets([b2.id, b1.id], null);
    const ordered = await listBuckets(null, acc.id);
    expect(ordered.map((b) => b.name)).toEqual(["Laptop", "Goa Trip"]);

    const f1 = await addBucketEntry(
      { bucketId: b1.id, kind: "fund", amount: 1500, date: "2026-11-25" },
      null,
    );
    const e1 = await addBucketEntry(
      { bucketId: b1.id, kind: "expense", amount: 420.5, date: "2026-11-26" },
      null,
    );

    let bucketsAfter = await listBuckets(null, acc.id);
    let goa = bucketsAfter.find((b) => b.id === b1.id);
    expect(goa.fund_amount).toBe(1500);
    expect(goa.expense_amount).toBe(420.5);

    await updateBucketEntry(e1.id, { amount: 500 }, null);
    bucketsAfter = await listBuckets(null, acc.id);
    goa = bucketsAfter.find((b) => b.id === b1.id);
    expect(goa.expense_amount).toBe(500);

    await deleteBucketEntry(f1.id, null);
    bucketsAfter = await listBuckets(null, acc.id);
    goa = bucketsAfter.find((b) => b.id === b1.id);
    expect(goa.fund_amount).toBe(0);
    expect(await listBucketEntries(b1.id, null)).toHaveLength(1);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import {
  getOwnerDbName,
  deleteOwnerDb,
  ensureDefaults,
  listEntities,
  putEntity,
  deleteEntity,
  listOutbox,
  reconcileRemoteStore,
  setPreference,
  getPreference,
} from "@/lib/localDb";

describe("localDb per-owner isolation, seeding, and outbox", () => {
  const userA = "user-a-1111";
  const userB = "user-b-2222";

  beforeEach(async () => {
    await deleteOwnerDb(null);
    await deleteOwnerDb(userA);
    await deleteOwnerDb(userB);
  });

  it("uses distinct IndexedDB database names per owner", () => {
    expect(getOwnerDbName(null)).toBe("spendscope_guest");
    expect(getOwnerDbName(userA)).toBe(`spendscope_user_${userA}`);
    expect(getOwnerDbName(userB)).toBe(`spendscope_user_${userB}`);
  });

  it("seeds exactly 1 Default account and 21 default categories idempotently even under concurrent calls", async () => {
    await Promise.all([
      ensureDefaults({ ownerId: null, currencyCode: "INR" }),
      ensureDefaults({ ownerId: null, currencyCode: "INR" }),
    ]);

    const accounts = await listEntities(null, "accounts");
    const categories = await listEntities(null, "categories");

    expect(accounts).toHaveLength(1);
    expect(accounts[0].name).toBe("Default");
    expect(accounts[0].currency_code).toBe("INR");
    expect(categories).toHaveLength(21);
    expect(categories.filter((c) => c.kind === "expense")).toHaveLength(15);
    expect(categories.filter((c) => c.kind === "income")).toHaveLength(6);
  });

  it("isolates records across Guest, User A, and User B", async () => {
    await ensureDefaults({ ownerId: null });
    await ensureDefaults({ ownerId: userA, enqueueSync: false });
    await ensureDefaults({ ownerId: userB, enqueueSync: false });

    await putEntity(
      userA,
      "transactions",
      {
        id: "tx-a-1",
        account_id: "acc-a",
        kind: "expense",
        amount: 250,
        occurred_at: new Date().toISOString(),
      },
      { enqueueSync: true },
    );

    const guestTxs = await listEntities(null, "transactions");
    const userATxs = await listEntities(userA, "transactions");
    const userBTxs = await listEntities(userB, "transactions");

    expect(guestTxs).toHaveLength(0);
    expect(userATxs).toHaveLength(1);
    expect(userBTxs).toHaveLength(0);

    const outboxA = await listOutbox(userA);
    expect(outboxA).toHaveLength(1);
    expect(outboxA[0].operation).toBe("UPSERT");
    expect(outboxA[0].entity_id).toBe("tx-a-1");
  });

  it("preserves pending outbox rows during reconcileRemoteStore and records DELETE ops cleanly", async () => {
    await putEntity(
      userA,
      "transactions",
      {
        id: "tx-pending",
        account_id: "acc-a",
        kind: "expense",
        amount: 100,
        occurred_at: new Date().toISOString(),
      },
      { enqueueSync: true },
    );

    // Remote pull returns different row and does NOT contain tx-pending yet
    await reconcileRemoteStore(userA, "transactions", [
      {
        id: "tx-remote",
        owner_id: userA,
        account_id: "acc-a",
        kind: "income",
        amount: 500,
        occurred_at: new Date().toISOString(),
        deleted_at: null,
      },
    ]);

    const txs = await listEntities(userA, "transactions");
    expect(txs.map((t) => t.id).sort()).toEqual(["tx-pending", "tx-remote"]);

    // Deleting enqueues DELETE operation replacing prior UPSERT in outbox
    await deleteEntity(userA, "transactions", "tx-pending", {
      enqueueSync: true,
    });
    const outbox = await listOutbox(userA);
    expect(outbox.find((o) => o.entity_id === "tx-pending")?.operation).toBe(
      "DELETE",
    );
  });

  it("never enqueues device-local app_lock preferences to sync_outbox", async () => {
    await setPreference(userA, "app_lock", { pinHash: "abc" }, { enqueueSync: true });
    await setPreference(
      userA,
      "appearance",
      { appearance_mode: "dark" },
      { enqueueSync: true },
    );

    const lockPref = await getPreference(userA, "app_lock");
    expect(lockPref?.pinHash).toBe("abc");

    const outbox = await listOutbox(userA);
    expect(outbox.some((op) => op.entity_type === "app_lock")).toBe(false);
    expect(outbox.some((op) => op.entity_type === "user_preferences")).toBe(
      true,
    );
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import {
  deleteOwnerDb,
  putEntity,
  deleteEntity,
  listOutbox,
  listEntities,
} from "@/lib/localDb";
import { pushOutbox, sanitizeForRemote, syncNow } from "@/lib/syncEngine";

function createMockSupabase(initialRemote = {}) {
  const remote = {
    accounts: [...(initialRemote.accounts || [])],
    categories: [...(initialRemote.categories || [])],
    transactions: [...(initialRemote.transactions || [])],
    buckets: [...(initialRemote.buckets || [])],
    bucket_transactions: [...(initialRemote.bucket_transactions || [])],
    loan_profiles: [...(initialRemote.loan_profiles || [])],
    user_preferences: [...(initialRemote.user_preferences || [])],
  };
  const calls = [];

  const from = (table) => {
    const chain = {
      _filters: [],
      select() {
        return chain;
      },
      eq(col, val) {
        chain._filters.push((row) => row[col] === val);
        return chain;
      },
      is(col, val) {
        chain._filters.push((row) =>
          val === null ? row[col] == null : row[col] === val,
        );
        return chain;
      },
      maybeSingle() {
        const rows = (remote[table] || []).filter((r) =>
          chain._filters.every((fn) => fn(r)),
        );
        return Promise.resolve({ data: rows[0] || null, error: null });
      },
      then(resolve) {
        const rows = (remote[table] || []).filter((r) =>
          chain._filters.every((fn) => fn(r)),
        );
        return Promise.resolve({ data: rows, error: null }).then(resolve);
      },
      upsert(payload, opts) {
        calls.push({ op: "upsert", table, payload, opts });
        const conflictKey = opts?.onConflict || "id";
        const idx = remote[table].findIndex(
          (r) => r[conflictKey] === payload[conflictKey],
        );
        if (idx >= 0) remote[table][idx] = payload;
        else remote[table].push(payload);
        return Promise.resolve({ error: null });
      },
      delete() {
        const deleteChain = {
          _filters: [],
          eq(col, val) {
            deleteChain._filters.push((row) => row[col] === val);
            if (deleteChain._filters.length >= 2) {
              calls.push({ op: "delete", table, id: deleteChain._filters });
              remote[table] = remote[table].filter(
                (r) => !deleteChain._filters.every((fn) => fn(r)),
              );
              return Promise.resolve({ error: null });
            }
            return deleteChain;
          },
        };
        return deleteChain;
      },
    };
    return chain;
  };

  return { client: { from }, remote, calls };
}

describe("syncEngine", () => {
  const ownerId = "owner-sync-999";

  beforeEach(async () => {
    await deleteOwnerDb(ownerId);
  });

  it("strips local-only metadata and formats Android-compatible remote payloads", () => {
    const clean = sanitizeForRemote(
      "transactions",
      {
        id: "tx-1",
        account_id: "acc-1",
        category_id: "cat-1",
        kind: "expense",
        amount: "420.50",
        currency_code: "inr",
        occurred_at: "2026-11-26T00:00:00.000Z",
        note: "Coffee",
        sync_status: "PENDING",
        extra_local_field: "strip-me",
      },
      ownerId,
    );

    expect(clean.owner_id).toBe(ownerId);
    expect(clean.currency_code).toBe("INR");
    expect(clean.amount).toBe(420.5);
    expect(clean.sync_status).toBeUndefined();
    expect(clean.extra_local_field).toBeUndefined();
  });

  it("pushes parents before children and processes hard deletes child-first", async () => {
    const mock = createMockSupabase();

    await putEntity(ownerId, "transactions", {
      id: "tx-1",
      account_id: "acc-1",
      kind: "expense",
      amount: 100,
      occurred_at: "2026-11-26T00:00:00.000Z",
    });
    await putEntity(ownerId, "accounts", {
      id: "acc-1",
      name: "Default",
      currency_code: "INR",
    });

    const res = await pushOutbox(ownerId, mock.client);
    expect(res).toEqual({ pushed: 2, failed: 0 });
    expect(mock.calls.map((c) => `${c.op}:${c.table}`)).toEqual([
      "upsert:accounts",
      "upsert:transactions",
    ]);
    expect(await listOutbox(ownerId)).toHaveLength(0);

    await deleteEntity(ownerId, "accounts", "acc-1");
    await deleteEntity(ownerId, "transactions", "tx-1");
    await pushOutbox(ownerId, mock.client);
    expect(mock.calls.slice(2).map((c) => `${c.op}:${c.table}`)).toEqual([
      "delete:transactions",
      "delete:accounts",
    ]);
  });

  it("runs pull before default seeding in syncNow so remote Android backups are not duplicated", async () => {
    const androidAccount = {
      id: "android-acc-1",
      owner_id: ownerId,
      name: "Android Cash",
      currency_code: "USD",
      is_default: true,
      created_at: "2026-11-20T00:00:00.000Z",
      updated_at: "2026-11-20T00:00:00.000Z",
      deleted_at: null,
    };
    const mock = createMockSupabase({ accounts: [androidAccount] });

    const status = await syncNow(ownerId, { client: mock.client });
    expect(status.state).toBe("synced");

    const accounts = await listEntities(ownerId, "accounts");
    expect(accounts).toHaveLength(1);
    expect(accounts[0].id).toBe("android-acc-1");
    expect(accounts[0].name).toBe("Android Cash");
  });
});

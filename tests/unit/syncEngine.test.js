import { describe, it, expect, beforeEach } from "vitest";
import {
  deleteOwnerDb,
  putEntity,
  deleteEntity,
  listOutbox,
  listEntities,
  getPreference,
} from "@/lib/localDb";
import { pushOutbox, sanitizeForRemote, syncNow } from "@/lib/syncEngine";

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

/** In-memory stand-in for the shared (user_id based) Supabase schema. */
function createMockSupabase(initialRemote = {}, initialMetadata = {}) {
  const remote = {};
  for (const table of REMOTE_TABLES) {
    remote[table] = [...(initialRemote[table] || [])];
  }
  const calls = [];
  const state = { metadata: { ...initialMetadata }, userId: "owner-sync-999" };

  const from = (table) => {
    const filters = [];
    let rangeFrom = null;
    let rangeTo = null;
    const rows = () =>
      (remote[table] || []).filter((r) => filters.every((fn) => fn(r)));
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
        let data = rows();
        if (rangeFrom !== null) data = data.slice(rangeFrom, rangeTo + 1);
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
      upsert(payload, opts) {
        calls.push({ op: "upsert", table, payload, opts });
        const key = opts?.onConflict || "id";
        const idx = remote[table].findIndex((r) => r[key] === payload[key]);
        if (idx >= 0) remote[table][idx] = { ...remote[table][idx], ...payload };
        else remote[table].push({ ...payload });
        return Promise.resolve({ error: null });
      },
      update(patch) {
        const updateFilters = [];
        const run = () => {
          calls.push({ op: "update", table, patch });
          remote[table] = remote[table].map((r) =>
            updateFilters.every((fn) => fn(r)) ? { ...r, ...patch } : r,
          );
          return Promise.resolve({ error: null });
        };
        const updateChain = {
          eq(col, val) {
            updateFilters.push((row) => row[col] === val);
            return updateChain;
          },
          then(resolve, reject) {
            return run().then(resolve, reject);
          },
        };
        return updateChain;
      },
    };
    return chain;
  };

  const auth = {
    async getUser() {
      return {
        data: {
          user: { id: state.userId, user_metadata: { ...state.metadata } },
        },
        error: null,
      };
    },
    async updateUser({ data }) {
      calls.push({ op: "updateUser", data });
      state.metadata = { ...state.metadata, ...data };
      return { data: { user: { id: state.userId } }, error: null };
    },
  };

  return { client: { from, auth }, remote, calls, state };
}

const categoryRow = (over = {}) => ({
  id: "cat-exp-other",
  user_id: "owner-sync-999",
  name: "Other",
  icon: "other",
  chart_color: "#9B59B6",
  type: "expense",
  is_custom: false,
  position: 14,
  has_deleted: false,
  created_at: "2026-11-20T00:00:00.000Z",
  updated_at: "2026-11-20T00:00:00.000Z",
  deleted_at: null,
  ...over,
});

describe("syncEngine (shared user_id schema)", () => {
  const ownerId = "owner-sync-999";

  beforeEach(async () => {
    await deleteOwnerDb(ownerId);
  });

  it("maps local records to shared-schema columns and strips local-only metadata", () => {
    const row = sanitizeForRemote(
      "transactions",
      {
        id: "tx-1",
        account_id: "acc-1",
        category_id: "cat-1",
        kind: "expense",
        amount: "420.50",
        currency_code: "inr",
        occurred_at: "2026-11-26T00:00:00.000Z",
        created_at: "2026-11-26T09:30:00.000Z",
        updated_at: "2026-11-26T09:30:00.000Z",
        note: "Coffee",
        sync_status: "PENDING",
        extra_local_field: "strip-me",
      },
      ownerId,
      { categories: [{ id: "cat-1", kind: "expense", name: "Dining Out" }] },
    );

    expect(row.user_id).toBe(ownerId);
    expect(row.owner_id).toBeUndefined();
    expect(row.kind).toBeUndefined();
    expect(row.currency_code).toBeUndefined();
    expect(row.category_id).toBe("cat-1");
    expect(row.amount).toBe(420.5);
    expect(row.notes).toBe("Coffee");
    expect(row.sync_status).toBeUndefined();
    expect(row.extra_local_field).toBeUndefined();
  });

  it("pushes parents before children and soft-deletes (never hard-deletes) child-first", async () => {
    const mock = createMockSupabase({ categories: [categoryRow()] });

    await putEntity(ownerId, "categories", {
      id: "cat-exp-other",
      kind: "expense",
      name: "Other",
      icon_key: "other",
      is_default: true,
      position: 14,
    });
    await putEntity(ownerId, "transactions", {
      id: "tx-1",
      account_id: "acc-1",
      category_id: "cat-exp-other",
      kind: "expense",
      amount: 100,
      occurred_at: "2026-11-26T00:00:00.000Z",
    });
    await putEntity(ownerId, "accounts", {
      id: "acc-1",
      name: "Default",
      currency_code: "INR",
      is_default: true,
    });

    const res = await pushOutbox(ownerId, mock.client);
    expect(res).toEqual({ pushed: 3, failed: 0 });
    expect(
      mock.calls
        .filter((c) => c.op === "upsert")
        .map((c) => c.table),
    ).toEqual([
      "accounts",
      "time_periods",
      "budget_modes",
      "categories",
      "transactions",
    ]);
    expect(await listOutbox(ownerId)).toHaveLength(0);

    // Web-only account settings are stored in Auth metadata, not the database.
    expect(mock.state.metadata.spendscope_web.accounts["acc-1"].currency_code).toBe(
      "INR",
    );

    await deleteEntity(ownerId, "accounts", "acc-1");
    await deleteEntity(ownerId, "transactions", "tx-1");
    const before = mock.calls.length;
    await pushOutbox(ownerId, mock.client);

    const deleteCalls = mock.calls.slice(before).filter((c) => c.op === "update");
    expect(deleteCalls.map((c) => c.table)).toEqual([
      "transactions",
      "accounts",
      "time_periods",
      "budget_modes",
      "carry_overs",
    ]);
    for (const call of deleteCalls) {
      expect(call.patch.deleted_at).toBeTruthy();
      expect(call.patch.updated_at).toBeTruthy();
    }
    // Rows remain as tombstones for the mobile apps' sync.
    expect(mock.remote.transactions[0].deleted_at).toBeTruthy();
    expect(mock.remote.accounts[0].deleted_at).toBeTruthy();
    expect(mock.state.metadata.spendscope_web.accounts["acc-1"]).toBeUndefined();
  });

  it("keeps transfers local-only: never pushed and not removed by a pull", async () => {
    const mock = createMockSupabase({ categories: [categoryRow()] });
    await putEntity(ownerId, "transactions", {
      id: "tx-transfer",
      account_id: "acc-1",
      category_id: null,
      kind: "expense",
      amount: 50,
      occurred_at: "2026-11-26T00:00:00.000Z",
      transfer_group_id: "group-1",
    });

    const res = await pushOutbox(ownerId, mock.client);
    expect(res.failed).toBe(0);
    expect(mock.calls.filter((c) => c.table === "transactions")).toHaveLength(0);
    expect(await listOutbox(ownerId)).toHaveLength(0);

    await syncNow(ownerId, { client: mock.client });
    const txs = await listEntities(ownerId, "transactions");
    expect(txs.map((t) => t.id)).toContain("tx-transfer");
  });

  it("pulls mobile-created data first, mapping kind from category type and date from created_at", async () => {
    const mock = createMockSupabase(
      {
        accounts: [
          {
            id: "mobile-acc-1",
            user_id: ownerId,
            name: "Mobile Cash",
            avatar: "avatar2",
            is_current: true,
            created_at: "2026-11-20T00:00:00.000Z",
            updated_at: "2026-11-20T00:00:00.000Z",
            deleted_at: null,
          },
        ],
        categories: [
          categoryRow(),
          categoryRow({
            id: "cat-inc-salary",
            name: "Salary",
            icon: "salary",
            type: "income",
            position: 15,
          }),
        ],
        transactions: [
          {
            id: "tx-income",
            user_id: ownerId,
            account_id: "mobile-acc-1",
            category_id: "cat-inc-salary",
            amount: 1200,
            notes: "Nov salary",
            created_at: "2026-11-25T10:00:00.000Z",
            updated_at: "2026-11-25T10:00:00.000Z",
            deleted_at: null,
          },
        ],
        time_periods: [
          {
            id: "tp-1",
            user_id: ownerId,
            account_id: "mobile-acc-1",
            show_spendings: "Weekly",
            week_start_day: "Monday",
            month_start_day: 1,
            deleted_at: null,
          },
        ],
        budget_modes: [
          {
            id: "bm-1",
            user_id: ownerId,
            account_id: "mobile-acc-1",
            is_on: true,
            amount: "5000",
            is_include_income: false,
            deleted_at: null,
          },
        ],
      },
      { currency: "USD" },
    );

    const status = await syncNow(ownerId, { client: mock.client });
    expect(status.state).toBe("synced");

    const accounts = await listEntities(ownerId, "accounts");
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({
      id: "mobile-acc-1",
      name: "Mobile Cash",
      avatar_key: "user_pf1",
      is_default: true,
      spending_period: "Weekly",
      budget_mode: true,
      budget_amount: 5000,
      include_income: false,
      currency_code: "USD",
      owner_id: ownerId,
    });

    const txs = await listEntities(ownerId, "transactions");
    expect(txs).toHaveLength(1);
    expect(txs[0]).toMatchObject({
      id: "tx-income",
      kind: "income",
      amount: 1200,
      note: "Nov salary",
      occurred_at: "2026-11-25T10:00:00.000Z",
      currency_code: "USD",
    });

    // Existing mobile categories are reused; web did not seed duplicates.
    const categories = await listEntities(ownerId, "categories");
    expect(categories).toHaveLength(2);
    expect(categories.find((c) => c.id === "cat-inc-salary").kind).toBe("income");
    expect(mock.remote.categories).toHaveLength(2);
  });

  it("restores web-only account settings and appearance from Auth metadata", async () => {
    const mock = createMockSupabase(
      {
        accounts: [
          {
            id: "acc-meta",
            user_id: ownerId,
            name: "Travel",
            avatar: "avatar1",
            is_current: true,
            created_at: "2026-11-20T00:00:00.000Z",
            updated_at: "2026-11-20T00:00:00.000Z",
            deleted_at: null,
          },
        ],
        categories: [categoryRow()],
      },
      {
        spendscope_web: {
          appearance: { appearance_mode: "dark", accent_color: "#112233" },
          accounts: {
            "acc-meta": {
              currency_code: "EUR",
              reminders: "Daily",
              reminder_hour: 20,
              reminder_minute: 30,
              hide_transactions: true,
              expense_amount: 10,
            },
          },
        },
      },
    );

    await syncNow(ownerId, { client: mock.client });

    const [account] = await listEntities(ownerId, "accounts");
    expect(account).toMatchObject({
      currency_code: "EUR",
      reminders: "Daily",
      reminder_hour: 20,
      reminder_minute: 30,
      hide_transactions: true,
    });
    const appearance = await getPreference(ownerId, "appearance");
    expect(appearance.appearance_mode).toBe("dark");
    expect(appearance.accent_color).toBe("#112233");
  });

  it("reuses existing satellite rows instead of duplicating time_periods/budget_modes", async () => {
    const mock = createMockSupabase({
      accounts: [
        {
          id: "acc-1",
          user_id: ownerId,
          name: "Default",
          avatar: "avatar1",
          is_current: true,
          created_at: "2026-11-20T00:00:00.000Z",
          updated_at: "2026-11-20T00:00:00.000Z",
          deleted_at: null,
        },
      ],
      time_periods: [
        {
          id: "tp-existing",
          user_id: ownerId,
          account_id: "acc-1",
          show_spendings: "Monthly",
          week_start_day: "Monday",
          month_start_day: 5,
          deleted_at: null,
        },
      ],
      budget_modes: [
        {
          id: "bm-existing",
          user_id: ownerId,
          account_id: "acc-1",
          is_on: false,
          amount: null,
          is_include_income: true,
          deleted_at: null,
        },
      ],
    });

    await putEntity(ownerId, "accounts", {
      id: "acc-1",
      name: "Default",
      spending_period: "Weekly",
      budget_mode: true,
      budget_amount: 900,
      is_default: true,
    });
    await pushOutbox(ownerId, mock.client);

    expect(mock.remote.time_periods).toHaveLength(1);
    expect(mock.remote.budget_modes).toHaveLength(1);
    expect(mock.remote.time_periods[0]).toMatchObject({
      id: "tp-existing",
      show_spendings: "Weekly",
      // Mobile-owned preferences must not be overwritten by the web.
      week_start_day: "Monday",
      month_start_day: 5,
    });
    expect(mock.remote.budget_modes[0]).toMatchObject({
      id: "bm-existing",
      is_on: true,
      amount: "900",
    });
  });
});

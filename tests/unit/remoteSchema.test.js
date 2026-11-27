import { describe, it, expect } from "vitest";
import {
  avatarToLocal,
  avatarToRemote,
  buildRemoteDeletes,
  buildRemoteWrites,
  iconToLocal,
  iconToRemote,
  isLocalOnlyEntity,
  mapRemoteSnapshot,
  mergeWebSettings,
  parseBucketKind,
  readWebSettings,
} from "@/lib/remoteSchema";

const OWNER = "user-1";

describe("remoteSchema: icons and avatars", () => {
  it("maps web icon keys to mobile identifiers and back", () => {
    expect(iconToRemote("dining")).toBe("diningOut");
    expect(iconToLocal("diningOut")).toBe("dining");
    expect(iconToLocal("incomeOther")).toBe("other_income");
    expect(iconToRemote("other_income")).toBe("incomeOther");
  });

  it("passes unknown icons through and preserves mobile-only identifiers", () => {
    expect(iconToLocal("carryOver")).toBe("money_transfer");
    expect(iconToRemote("money_transfer", "carryOver")).toBe("carryOver");
    expect(iconToRemote("money_transfer")).toBe("money_transfer");
    expect(iconToLocal("someNewMobileIcon")).toBe("someNewMobileIcon");
  });

  it("maps avatarN (1-based) to web avatar keys", () => {
    expect(avatarToLocal("avatar1")).toBe("user_pf");
    expect(avatarToLocal("avatar3")).toBe("user_pf2");
    expect(avatarToRemote("user_pf2")).toBe("avatar3");
    expect(avatarToLocal("avatar99")).toBe("user_pf");
    expect(avatarToRemote("user_pf", "avatar99")).toBe("avatar99");
  });
});

describe("remoteSchema: push mapping", () => {
  const categories = [
    { id: "e-other", kind: "expense", name: "Other" },
    { id: "e-food", kind: "expense", name: "Dining Out" },
    { id: "i-other", kind: "income", name: "Other" },
  ];

  it("falls back to 'Other' of the right kind when category is missing", () => {
    const { writes } = buildRemoteWrites(
      "transactions",
      { id: "t", account_id: "a", kind: "income", amount: 5, category_id: null },
      OWNER,
      { categories },
    );
    expect(writes[0].row.category_id).toBe("i-other");
  });

  it("falls back when the category kind does not match the transaction kind", () => {
    const { writes } = buildRemoteWrites(
      "transactions",
      {
        id: "t",
        account_id: "a",
        kind: "income",
        amount: 5,
        category_id: "e-food",
      },
      OWNER,
      { categories },
    );
    expect(writes[0].row.category_id).toBe("i-other");
  });

  it("throws (so the op retries) when no category of that kind exists", () => {
    expect(() =>
      buildRemoteWrites(
        "transactions",
        { id: "t", account_id: "a", kind: "expense", amount: 1 },
        OWNER,
        { categories: [] },
      ),
    ).toThrow(/category/i);
  });

  it("uses created_at for the date: keeps time-of-day unless back-dated", () => {
    const sameDay = buildRemoteWrites(
      "transactions",
      {
        id: "t",
        account_id: "a",
        category_id: "e-food",
        kind: "expense",
        amount: 1,
        created_at: "2026-11-26T12:34:56.000Z",
        occurred_at: "2026-11-26T12:34:56.000Z",
      },
      OWNER,
      { categories },
    ).writes[0].row;
    expect(sameDay.created_at).toBe("2026-11-26T12:34:56.000Z");

    const backDated = buildRemoteWrites(
      "transactions",
      {
        id: "t",
        account_id: "a",
        category_id: "e-food",
        kind: "expense",
        amount: 1,
        created_at: "2026-11-26T12:34:56.000Z",
        occurred_at: "2026-10-01T00:00:00.000Z",
      },
      OWNER,
      { categories },
    ).writes[0].row;
    expect(backDated.created_at).toBe("2026-10-01T00:00:00.000Z");
  });

  it("stores amounts as positive floats", () => {
    const { writes } = buildRemoteWrites(
      "transactions",
      {
        id: "t",
        account_id: "a",
        category_id: "e-food",
        kind: "expense",
        amount: "-12.5",
      },
      OWNER,
      { categories },
    );
    expect(writes[0].row.amount).toBe(12.5);
  });

  it("builds account + time_periods + budget_modes writes, adding NOT NULL defaults only for new satellites", () => {
    const fresh = buildRemoteWrites(
      "accounts",
      {
        id: "acc",
        name: "Cash",
        avatar_key: "user_pf1",
        is_default: true,
        spending_period: "Weekly",
        budget_mode: true,
        budget_amount: 100,
        currency_code: "usd",
      },
      OWNER,
      { timePeriodIds: new Map(), budgetModeIds: new Map() },
    );
    expect(fresh.writes.map((w) => w.table)).toEqual([
      "accounts",
      "time_periods",
      "budget_modes",
    ]);
    expect(fresh.writes[0].row).toMatchObject({
      avatar: "avatar2",
      is_current: true,
    });
    expect(fresh.writes[1].row).toMatchObject({
      show_spendings: "Weekly",
      week_start_day: "Sunday",
      month_start_day: 1,
    });
    expect(fresh.writes[2].row).toMatchObject({ is_on: true, amount: "100" });
    expect(fresh.settingsPatch.accounts.acc.currency_code).toBe("USD");

    const existing = buildRemoteWrites(
      "accounts",
      { id: "acc", name: "Cash", spending_period: "Monthly" },
      OWNER,
      {
        timePeriodIds: new Map([["acc", "tp-1"]]),
        budgetModeIds: new Map([["acc", "bm-1"]]),
      },
    );
    expect(existing.writes[1].row.id).toBe("tp-1");
    expect(existing.writes[1].row.week_start_day).toBeUndefined();
    expect(existing.writes[2].row.id).toBe("bm-1");
  });

  it("maps categories, buckets, bucket entries and loans to shared columns", () => {
    const cat = buildRemoteWrites(
      "categories",
      {
        id: "c",
        name: "Fuel",
        kind: "expense",
        icon_key: "travel_car",
        color: "#fff",
        position: 3,
      },
      OWNER,
    ).writes[0];
    expect(cat.row).toMatchObject({
      type: "expense",
      icon: "travel_car",
      chart_color: "#fff",
      is_custom: true,
      has_deleted: false,
    });

    const bucket = buildRemoteWrites(
      "buckets",
      {
        id: "b",
        account_id: "a",
        name: "Trip",
        image_key: "travel_flight",
        position: 2,
        created_at: "2026-11-01T00:00:00.000Z",
      },
      OWNER,
    ).writes[0];
    expect(bucket.table).toBe("spend_buckets");
    expect(bucket.row).toMatchObject({
      bucket_name: "Trip",
      icon: "travel_flight",
      sort_order: 2,
    });

    const entry = buildRemoteWrites(
      "bucket_transactions",
      {
        id: "bt",
        bucket_id: "b",
        kind: "fund",
        amount: 25.5,
        note: "x",
        occurred_at: "2026-11-02T00:00:00.000Z",
      },
      OWNER,
    ).writes[0];
    expect(entry.table).toBe("spend_bucket_transactions");
    expect(entry.row).toMatchObject({
      bucket_transaction_type: "fund",
      amount: "25.5",
      notes: "x",
    });

    const loan = buildRemoteWrites(
      "loan_profiles",
      {
        id: "l",
        name: "Car",
        principal_amount: 1000,
        interest_rate: 8.5,
        tenure_months: 12,
        emi_amount: 90,
        processing_fees: 5,
        loan_date: "2026-01-15",
        first_emi_date: "2026-02-15",
        last_emi_date: "2027-01-15",
      },
      OWNER,
      {
        loanMetrics: () => ({
          interestPaid: 1,
          principalPaid: 2,
          totalPaid: 3,
          outstandingInterest: 4,
          outstandingPrincipal: 5,
          outstandingTotal: 9,
          totalInterest: 7,
        }),
      },
    ).writes[0];
    expect(loan.table).toBe("loans");
    expect(loan.row).toMatchObject({
      loan_name: "Car",
      amount: "1000",
      interest_rate: "8.5",
      tenure_months: "12",
      total_paid: 3,
      outstanding_total: 9,
    });
    expect(loan.row.loan_date).toMatch(/^2026-01-1[45]T/);
  });

  it("treats transfers as local-only and appearance as a settings patch", () => {
    expect(isLocalOnlyEntity("transactions", { transfer_group_id: "g" })).toBe(
      true,
    );
    expect(isLocalOnlyEntity("transactions", {})).toBe(false);
    expect(
      buildRemoteWrites(
        "transactions",
        { id: "t", transfer_group_id: "g" },
        OWNER,
      ).localOnly,
    ).toBe(true);

    const prefs = buildRemoteWrites(
      "user_preferences",
      { appearance_mode: "dark", accent_color: "#abc" },
      OWNER,
    );
    expect(prefs.writes).toEqual([]);
    expect(prefs.settingsPatch.appearance).toEqual({
      appearance_mode: "dark",
      accent_color: "#abc",
    });
  });
});

describe("remoteSchema: soft deletes", () => {
  it("soft-deletes rows and flags categories", () => {
    const now = "2026-11-27T00:00:00.000Z";
    const tx = buildRemoteDeletes("transactions", "t1", OWNER, now);
    expect(tx.deletes).toEqual([
      {
        table: "transactions",
        match: { id: "t1", user_id: OWNER },
        patch: { deleted_at: now, updated_at: now },
      },
    ]);
    const cat = buildRemoteDeletes("categories", "c1", OWNER, now);
    expect(cat.deletes[0].patch.has_deleted).toBe(true);
  });

  it("also soft-deletes account satellites and clears web settings", () => {
    const plan = buildRemoteDeletes(
      "accounts",
      "a1",
      OWNER,
      "2026-11-27T00:00:00.000Z",
    );
    expect(plan.deletes.map((d) => d.table)).toEqual([
      "accounts",
      "time_periods",
      "budget_modes",
      "carry_overs",
    ]);
    expect(plan.settingsPatch).toEqual({ removeAccounts: ["a1"] });
  });
});

describe("remoteSchema: pull mapping", () => {
  const base = {
    accounts: [],
    categories: [],
    transactions: [],
    buckets: [],
    bucketTransactions: [],
    loans: [],
    timePeriods: [],
    budgetModes: [],
  };

  it("normalises to exactly one default account", () => {
    const mk = (id, current, created) => ({
      id,
      name: id,
      avatar: "avatar1",
      is_current: current,
      created_at: created,
      updated_at: created,
    });
    const { accounts } = mapRemoteSnapshot(
      {
        ...base,
        accounts: [
          mk("a", true, "2026-01-02T00:00:00Z"),
          mk("b", true, "2026-01-01T00:00:00Z"),
          mk("c", false, "2026-01-03T00:00:00Z"),
        ],
      },
      { ownerId: OWNER },
    );
    expect(accounts.filter((a) => a.is_default).map((a) => a.id)).toEqual(["b"]);

    const none = mapRemoteSnapshot(
      {
        ...base,
        accounts: [
          mk("x", false, "2026-01-02T00:00:00Z"),
          mk("y", false, "2026-01-01T00:00:00Z"),
        ],
      },
      { ownerId: OWNER },
    );
    expect(none.accounts.filter((a) => a.is_default).map((a) => a.id)).toEqual([
      "y",
    ]);
  });

  it("derives transaction kind from category type, including soft-deleted categories", () => {
    const snap = mapRemoteSnapshot(
      {
        ...base,
        categories: [
          {
            id: "c-inc",
            name: "Salary",
            type: "income",
            icon: "salary",
            deleted_at: "2026-11-01T00:00:00Z",
            has_deleted: true,
          },
          { id: "c-exp", name: "Rent", type: "expense", icon: "housing" },
        ],
        transactions: [
          {
            id: "t1",
            account_id: "a",
            category_id: "c-inc",
            amount: 10,
            created_at: "2026-11-02T08:00:00Z",
            updated_at: "2026-11-02T08:00:00Z",
          },
          {
            id: "t2",
            account_id: "a",
            category_id: "c-exp",
            amount: -4,
            created_at: "2026-11-03T08:00:00Z",
            updated_at: "2026-11-03T08:00:00Z",
          },
          {
            id: "t3",
            account_id: "a",
            category_id: "c-exp",
            amount: 1,
            deleted_at: "2026-11-04T00:00:00Z",
          },
        ],
      },
      { ownerId: OWNER },
    );
    expect(snap.categories.map((c) => c.id)).toEqual(["c-exp"]);
    expect(snap.transactions.map((t) => [t.id, t.kind, t.amount])).toEqual([
      ["t1", "income", 10],
      ["t2", "expense", 4],
    ]);
    expect(snap.transactions[0].occurred_at).toBe("2026-11-02T08:00:00Z");
  });

  it("computes bucket totals from entries and parses entry kinds", () => {
    const snap = mapRemoteSnapshot(
      {
        ...base,
        buckets: [
          {
            id: "b",
            account_id: "a",
            bucket_name: "Trip",
            icon: "travel_flight",
            sort_order: 1,
            created_at: "2026-11-01T00:00:00Z",
            updated_at: "2026-11-01T00:00:00Z",
          },
        ],
        bucketTransactions: [
          { id: "1", bucket_id: "b", amount: "100.10", bucket_transaction_type: "Fund" },
          { id: "2", bucket_id: "b", amount: "40.05", bucket_transaction_type: "expense" },
          { id: "3", bucket_id: "ghost", amount: "9", bucket_transaction_type: "fund" },
        ],
      },
      { ownerId: OWNER },
    );
    expect(snap.bucket_transactions).toHaveLength(2);
    expect(snap.buckets[0]).toMatchObject({
      name: "Trip",
      fund_amount: 100.1,
      expense_amount: 40.05,
    });
    expect(parseBucketKind("Deposit")).toBe("fund");
    expect(parseBucketKind("whatever")).toBe("expense");
  });

  it("maps loans from text/timestamptz columns to numbers and date keys", () => {
    const { loan_profiles } = mapRemoteSnapshot(
      {
        ...base,
        loans: [
          {
            id: "l",
            loan_name: "Car",
            loan_account_number: "123",
            bank_name: "HDFC",
            amount: "250000",
            interest_rate: "8.5",
            tenure_months: "36",
            emi_amount: 7890.5,
            processing_fees: "",
            loan_date: "2026-01-15T00:00:00Z",
            first_emi_date: "2026-02-15T00:00:00Z",
            last_emi_date: "2029-01-15T00:00:00Z",
            created_at: "2026-01-15T00:00:00Z",
            updated_at: "2026-01-15T00:00:00Z",
          },
        ],
      },
      { ownerId: OWNER },
    );
    expect(loan_profiles[0]).toMatchObject({
      name: "Car",
      principal_amount: 250000,
      interest_rate: 8.5,
      tenure_months: 36,
      emi_amount: 7890.5,
      processing_fees: 0,
    });
    expect(loan_profiles[0].loan_date).toMatch(/^2026-01-1[45]$/);
  });

  it("applies web settings blobs only to matching accounts", () => {
    const { accounts } = mapRemoteSnapshot(
      {
        ...base,
        accounts: [
          {
            id: "a",
            name: "A",
            avatar: "avatar1",
            is_current: true,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
          {
            id: "b",
            name: "B",
            avatar: "avatar1",
            is_current: false,
            created_at: "2026-01-02T00:00:00Z",
            updated_at: "2026-01-02T00:00:00Z",
          },
        ],
      },
      {
        ownerId: OWNER,
        webSettings: {
          appearance: null,
          accounts: { a: { currency_code: "jpy", hide_transactions: true } },
        },
      },
    );
    expect(accounts.find((x) => x.id === "a")).toMatchObject({
      currency_code: "JPY",
      hide_transactions: true,
    });
    expect(accounts.find((x) => x.id === "b").currency_code).toBeUndefined();
  });
});

describe("remoteSchema: web settings blob", () => {
  it("reads defensively and merges patches", () => {
    expect(readWebSettings(null)).toEqual({ appearance: null, accounts: {} });
    const existing = readWebSettings({
      user_metadata: {
        spendscope_web: {
          accounts: { a: { currency_code: "USD", reminders: "Daily" } },
        },
      },
    });
    const merged = mergeWebSettings(existing, {
      accounts: { a: { currency_code: "EUR" }, b: { currency_code: "INR" } },
      appearance: { appearance_mode: "dark" },
    });
    expect(merged.accounts.a).toEqual({
      currency_code: "EUR",
      reminders: "Daily",
    });
    expect(merged.accounts.b.currency_code).toBe("INR");
    expect(merged.appearance.appearance_mode).toBe("dark");

    const removed = mergeWebSettings(merged, { removeAccounts: ["a"] });
    expect(removed.accounts.a).toBeUndefined();
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { deleteOwnerDb, listEntities } from "@/lib/localDb";
import {
  getCategories,
  createCategory,
  reorderCategories,
  deleteCategory,
  getCategoryLinkedCounts,
} from "@/services/categoriesService";
import {
  listAccounts,
  createAccount,
  transferBetweenAccounts,
} from "@/services/accountsService";
import {
  createTransaction,
  deleteTransaction,
} from "@/services/transactionsService";
import { resetUserData } from "@/services/resetService";
import { computeSpendingSummary } from "@/lib/budgetMath";
import { buildReminderIcs } from "@/services/preferencesService";
import {
  enablePinLock,
  verifyPinAttempt,
  getAppLockState,
} from "@/lib/webSecurity";

describe("Phase 3 Categories, Transfers, 4-mode Reset, and Security", () => {
  beforeEach(async () => {
    await deleteOwnerDb(null);
  });

  it("reassigns linked transactions to same-kind 'Other' on category delete and blocks deleting 'Other' while in use", async () => {
    const cats = await getCategories(null);
    const expenseCats = cats.filter((c) => c.kind === "expense");
    expect(expenseCats.length).toBeGreaterThanOrEqual(15);

    const coffee = await createCategory(
      { name: "Specialty Coffee", kind: "expense", color: "#4F46E5" },
      null,
    );
    const [acc] = await listAccounts(null, "INR");

    await createTransaction({
      account_id: acc.id,
      category_id: coffee.id,
      kind: "expense",
      amount: 320,
      date: "2026-11-26",
      note: "Pour over",
      userId: null,
    });

    const counts = await getCategoryLinkedCounts(null);
    expect(counts[coffee.id]).toBe(1);

    const delRes = await deleteCategory(coffee.id, null);
    expect(delRes.deleted).toBe(true);
    expect(delRes.reassignedCount).toBe(1);

    const allCatsAfter = await getCategories(null);
    const otherCat = allCatsAfter.find(
      (c) => c.kind === "expense" && c.name === "Other",
    );
    expect(otherCat).toBeTruthy();

    const txsAfter = await listEntities(null, "transactions");
    expect(txsAfter).toHaveLength(1);
    expect(txsAfter[0].category_id).toBe(otherCat.id);

    // Deleting "Other" while transactions reference it must throw
    await expect(deleteCategory(otherCat.id, null)).rejects.toThrow(
      /Cannot delete/i,
    );
  });

  it("reorders categories cleanly", async () => {
    const cats = await getCategories(null);
    const incomeIds = cats.filter((c) => c.kind === "income").map((c) => c.id);
    const reversed = [...incomeIds].reverse();
    await reorderCategories(reversed, null);
    const updated = (await getCategories(null)).filter(
      (c) => c.kind === "income",
    );
    expect(updated.map((c) => c.id)).toEqual(reversed);
  });

  it("creates neutral paired account transfers excluded from totals and symmetrically deletes both sides", async () => {
    const [accA] = await listAccounts(null, "INR");
    const accB = await createAccount(
      { name: "Vault", currencyCode: "INR", budgetMode: false },
      null,
    );

    const transfer = await transferBetweenAccounts(
      {
        fromAccountId: accA.id,
        toAccountId: accB.id,
        amount: 2500,
        date: "2026-11-26",
        note: "Vault sweep",
      },
      null,
    );

    expect(transfer.debitRow.account_id).toBe(accA.id);
    expect(transfer.debitRow.kind).toBe("expense");
    expect(transfer.creditRow.account_id).toBe(accB.id);
    expect(transfer.creditRow.kind).toBe("income");
    expect(transfer.debitRow.transfer_group_id).toBe(
      transfer.creditRow.transfer_group_id,
    );

    const allTxs = await listEntities(null, "transactions");
    expect(allTxs).toHaveLength(2);

    const summaryA = computeSpendingSummary({
      transactions: allTxs.filter((t) => t.account_id === accA.id),
      categories: [],
      account: accA,
    });
    expect(summaryA.totalExpense).toBe(0);
    expect(summaryA.totalIncome).toBe(0);
    expect(summaryA.transferCount).toBe(1);

    // Deleting one side removes both paired rows
    await deleteTransaction(transfer.debitRow.id, null);
    expect(await listEntities(null, "transactions")).toHaveLength(0);
  });

  it("supports all 4 Reset Data combinations safely", async () => {
    const [defaultAcc] = await listAccounts(null, "INR");
    await createAccount({ name: "Extra Wallet" }, null);
    const customCat = await createCategory(
      { name: "Pets", kind: "expense" },
      null,
    );
    await createTransaction({
      account_id: defaultAcc.id,
      category_id: customCat.id,
      kind: "expense",
      amount: 100,
      date: "2026-11-26",
      userId: null,
    });

    // 1. Keep both accounts & categories
    await resetUserData({
      ownerId: null,
      keepAccounts: true,
      keepCategories: true,
    });
    expect(await listEntities(null, "transactions")).toHaveLength(0);
    expect(await listEntities(null, "accounts")).toHaveLength(2);
    expect(
      (await getCategories(null)).some((c) => c.name === "Pets"),
    ).toBe(true);

    // 2. Wipe categories, keep accounts
    await resetUserData({
      ownerId: null,
      keepAccounts: true,
      keepCategories: false,
    });
    expect(await listEntities(null, "accounts")).toHaveLength(2);
    expect(
      (await getCategories(null)).some((c) => c.name === "Pets"),
    ).toBe(false);
    expect((await getCategories(null)).length).toBe(21);

    // 3. Wipe accounts, keep categories
    await createCategory({ name: "TempCat", kind: "expense" }, null);
    await resetUserData({
      ownerId: null,
      keepAccounts: false,
      keepCategories: true,
    });
    expect(await listEntities(null, "accounts")).toHaveLength(1);
    expect(
      (await getCategories(null)).some((c) => c.name === "TempCat"),
    ).toBe(true);

    // 4. Full wipe
    await resetUserData({
      ownerId: null,
      keepAccounts: false,
      keepCategories: false,
    });
    expect(await listEntities(null, "accounts")).toHaveLength(1);
    expect((await getCategories(null)).length).toBe(21);
    expect(
      (await getCategories(null)).some((c) => c.name === "TempCat"),
    ).toBe(false);
  });

  it("handles '0000' PIN hashing, 5-attempt 4-min lockout, and valid .ics reminder generation", async () => {
    await enablePinLock(null, "0000");
    const state = await getAppLockState(null);
    expect(state.enabled).toBe(true);

    const ok = await verifyPinAttempt(null, "0000");
    expect(ok.valid).toBe(true);

    for (let i = 1; i <= 4; i++) {
      const fail = await verifyPinAttempt(null, "9999");
      expect(fail.valid).toBe(false);
      expect(fail.attemptsLeft).toBe(5 - i);
    }
    const fifth = await verifyPinAttempt(null, "9999");
    expect(fifth.valid).toBe(false);
    expect(fifth.lockedRemainingSeconds).toBe(240);

    const ics = buildReminderIcs({
      frequency: "Weekly",
      hour: 19,
      minute: 30,
      accountName: "Default",
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("RRULE:FREQ=WEEKLY");
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { deleteOwnerDb, listOutbox } from "@/lib/localDb";
import {
  listLoanProfiles,
  createLoanProfile,
  deleteLoanProfile,
} from "@/services/loanProfilesService";

describe("loanProfilesService", () => {
  beforeEach(async () => {
    await deleteOwnerDb(null);
    await deleteOwnerDb("user-loan-test");
  });

  it("creates, lists, validates SQL bounds, enqueues sync outbox, and deletes cleanly", async () => {
    await expect(
      createLoanProfile({
        name: "Bad Loan",
        account_name: "LN1",
        bank_name: "Bank",
        principal_amount: 100000,
        interest_rate: 45, // exceeds SQL check (<= 30)
        tenure_months: 12,
        loan_date: "2026-01-01",
        first_emi_date: "2026-02-01",
      }),
    ).rejects.toThrow(/30%/);

    await expect(
      createLoanProfile({
        name: "Same Day EMI",
        account_name: "LN2",
        bank_name: "Bank",
        principal_amount: 100000,
        interest_rate: 8.5,
        tenure_months: 12,
        loan_date: "2026-01-01",
        first_emi_date: "2026-01-01",
      }),
    ).rejects.toThrow(/after the loan date/i);

    const created = await createLoanProfile(
      {
        name: "Home Mortgage",
        account_name: "HL-8899",
        bank_name: "HDFC Bank",
        principal_amount: 2500000,
        interest_rate: 8.5,
        tenure_months: 120,
        processing_fees: 5000,
        loan_date: "2026-01-01",
        first_emi_date: "2026-02-01",
        currency_code: "USD",
      },
      "user-loan-test",
    );

    expect(created.last_emi_date).toBe("2036-01-01");
    expect(created.currency_code).toBe("USD");
    expect(created.emi_amount).toBeGreaterThan(30000);

    const rows = await listLoanProfiles("user-loan-test");
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Home Mortgage");

    const guestRows = await listLoanProfiles(null);
    expect(guestRows).toHaveLength(0);

    const outboxAfterCreate = await listOutbox("user-loan-test");
    expect(
      outboxAfterCreate.some(
        (op) => op.entity_type === "loan_profiles" && op.operation === "UPSERT",
      ),
    ).toBe(true);

    await deleteLoanProfile(created.id, "user-loan-test");
    expect(await listLoanProfiles("user-loan-test")).toHaveLength(0);
    const outboxAfterDelete = await listOutbox("user-loan-test");
    expect(
      outboxAfterDelete.some(
        (op) => op.entity_type === "loan_profiles" && op.operation === "DELETE",
      ),
    ).toBe(true);
  });
});

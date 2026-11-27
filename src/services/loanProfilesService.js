import { supabase, isSupabaseConfigured } from "@/lib/supabaseconfig";
import { listEntities, putEntity, deleteEntity } from "@/lib/localDb";
import { pushOutbox } from "@/lib/syncEngine";
import { generateUuid } from "@/lib/defaultSeeds";
import { toLocalDateKey } from "@/lib/dateUtils";
import {
  calculateLoanEmi,
  computeLastEmiDateKey,
  round2,
} from "@/lib/calculatorEngine";

export async function listLoanProfiles(ownerId = null) {
  const rows = await listEntities(ownerId, "loan_profiles");
  return [...rows].sort((a, b) =>
    String(b.created_at || "").localeCompare(String(a.created_at || "")),
  );
}

export async function createLoanProfile(payload, ownerId = null) {
  const name = String(payload?.name || "").trim();
  const accountName = String(payload?.account_name || "").trim();
  const bankName = String(payload?.bank_name || "").trim();
  const principal = Number(payload?.principal_amount);
  const rate = Number(payload?.interest_rate);
  const tenure = Math.round(Number(payload?.tenure_months));
  const processingFees = Number(payload?.processing_fees || 0);
  const loanDate = toLocalDateKey(payload?.loan_date || new Date());
  const firstEmiDate = toLocalDateKey(payload?.first_emi_date || new Date());
  const currencyCode = String(payload?.currency_code || "INR")
    .trim()
    .toUpperCase();

  if (!name || name.length > 120) {
    throw new Error("Loan name is required (max 120 characters).");
  }
  if (!accountName) {
    throw new Error("Loan account number cannot be empty.");
  }
  if (!bankName) {
    throw new Error("Bank name cannot be empty.");
  }
  if (!Number.isFinite(principal) || principal <= 0) {
    throw new Error("Loan amount must be greater than 0.");
  }
  if (!Number.isFinite(rate) || rate <= 0 || rate > 30) {
    throw new Error("Interest rate must be greater than 0% and at most 30%.");
  }
  if (!Number.isFinite(tenure) || tenure <= 0 || tenure > 600) {
    throw new Error("Tenure months must be between 1 and 600.");
  }
  if (!Number.isFinite(processingFees) || processingFees < 0) {
    throw new Error("Processing fees must be 0 or greater.");
  }
  if (firstEmiDate <= loanDate) {
    throw new Error("First EMI date must be after the loan date.");
  }

  const emiAmount = round2(calculateLoanEmi(principal, rate, tenure));
  const lastEmiDate = computeLastEmiDateKey(firstEmiDate, tenure);
  const now = new Date().toISOString();

  const record = {
    id: generateUuid(),
    owner_id: ownerId || null,
    name,
    account_name: accountName,
    bank_name: bankName,
    principal_amount: round2(principal),
    interest_rate: Number(rate.toFixed(3)),
    tenure_months: tenure,
    emi_amount: emiAmount,
    processing_fees: round2(processingFees),
    loan_date: loanDate,
    first_emi_date: firstEmiDate,
    last_emi_date: lastEmiDate,
    currency_code: /^[A-Z]{3}$/.test(currencyCode) ? currencyCode : "INR",
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await putEntity(ownerId, "loan_profiles", record, {
    enqueueSync: Boolean(ownerId),
  });

  if (ownerId && isSupabaseConfigured && supabase) {
    pushOutbox(ownerId, supabase).catch(() => {});
  }

  return record;
}

export async function deleteLoanProfile(loanId, ownerId = null) {
  if (!loanId) return false;
  await deleteEntity(ownerId, "loan_profiles", loanId, {
    enqueueSync: Boolean(ownerId),
  });

  if (ownerId && isSupabaseConfigured && supabase) {
    pushOutbox(ownerId, supabase).catch(() => {});
  }
  return true;
}

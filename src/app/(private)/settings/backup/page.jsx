"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import {
  HiOutlineCloudArrowUp,
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
} from "react-icons/hi2";
import useAuth from "@/hooks/useAuth";
import useAccounts from "@/hooks/useAccounts";
import {
  syncNow,
  getGuestMigrationSummary,
  migrateGuestToCloud,
} from "@/lib/syncEngine";
import SettingsSubpageHeader from "@/components/settings/SettingsSubpageHeader";

export default function BackupSettingsPage() {
  const { userId, isGuest, email, defaultCurrency } = useAuth();
  const { activeAccount } = useAccounts();
  const syncStatus =
    useSelector((state) => state?.appSlice?.syncStatus) || {
      state: "local",
      pendingCount: 0,
      lastSyncedAt: null,
    };

  const [syncing, setSyncing] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [guestSummary, setGuestSummary] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadGuestSummary = useCallback(async () => {
    const s = await getGuestMigrationSummary(userId);
    setGuestSummary(s);
  }, [userId]);

  useEffect(() => {
    loadGuestSummary();
  }, [loadGuestSummary]);

  const handleManualSync = async () => {
    if (!userId) return;
    setSyncing(true);
    setNotice("");
    setError("");
    try {
      const res = await syncNow(userId, { defaultCurrency, ignoreBackoff: true });
      if (res?.lastError || res?.state === "error") {
        setError(res.lastError || "Sync failed.");
      } else {
        setNotice("All local changes synced with SpendScope Cloud.");
      }
    } catch (err) {
      setError(err?.message || "Sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  const handleBackupGuestData = async () => {
    if (!userId) return;
    setMigrating(true);
    setNotice("");
    setError("");
    try {
      const res = await migrateGuestToCloud(userId);
      await loadGuestSummary();
      if (!res.migrated) {
        setNotice("No additional guest records were found to migrate.");
      } else {
        const m = res.merged;
        setNotice(
          `Guest backup complete: ${m.transactionsMigrated} transaction(s), ${m.bucketsMigrated} bucket(s), ${m.loansMigrated} loan(s) merged cleanly (${m.accountsReused} existing account(s) & ${m.categoriesReused} category(s) matched with zero duplicates).`,
        );
      }
    } catch (err) {
      setError(err?.message || "Failed to merge local guest data.");
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <SettingsSubpageHeader
        title="Cloud Backup & Sync"
        description="Keep your accounts, categories, transactions, and buckets synced across devices."
        activeAccount={activeAccount}
      />

      {notice && (
        <div className="p-3.5 rounded-2xl border border-[var(--home-income)]/40 bg-[var(--home-income-soft)] text-xs font-semibold text-[var(--home-income)] flex items-start gap-2">
          <HiOutlineCheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl border border-[var(--home-destructive)]/40 bg-[var(--home-card)] text-xs font-semibold text-[var(--home-destructive)]">
          {error}
        </div>
      )}

      {isGuest ? (
        <div className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--home-track)] text-[var(--home-accent)] flex items-center justify-center">
            <HiOutlineCloudArrowUp className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-display text-xl text-[var(--home-text)]">
              You are currently using Local Guest Mode
            </h2>
            <p className="text-xs sm:text-sm text-[var(--home-text-secondary)] leading-relaxed">
              Your financial records are stored safely in this browser&apos;s IndexedDB
              {guestSummary?.hasData
                ? ` (${guestSummary.counts.transactions} transactions, ${guestSummary.counts.buckets} buckets). `
                : ". "}
              Sign in or create a free SpendScope Cloud account to back up and sync with SpendScope Android.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/sign-in"
              className="px-6 py-2.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs sm:text-sm font-semibold"
            >
              Sign In to Back Up
            </Link>
            <Link
              href="/signup"
              className="px-6 py-2.5 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] text-xs sm:text-sm font-semibold text-[var(--home-text)]"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-[var(--home-text)]">
                  Connected to SpendScope Cloud
                </h2>
                <p className="text-xs text-[var(--home-text-muted)]">
                  Signed in as {email}
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--home-income-soft)] text-[var(--home-income)]">
                {syncStatus.state === "offline"
                  ? "Offline"
                  : syncStatus.pendingCount > 0
                    ? `${syncStatus.pendingCount} pending`
                    : "Up to date"}
              </span>
            </div>

            <div className="text-xs text-[var(--home-text-secondary)]">
              Last synced:{" "}
              <span className="font-mono-num font-semibold">
                {syncStatus.lastSyncedAt || syncStatus.lastSyncAt
                  ? new Date(
                      syncStatus.lastSyncedAt || syncStatus.lastSyncAt,
                    ).toLocaleString()
                  : "Not synced yet in this session"}
              </span>
            </div>

            <button
              type="button"
              disabled={syncing}
              onClick={handleManualSync}
              className="h-10 px-6 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <HiOutlineArrowPath
                className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`}
              />
              <span>{syncing ? "Syncing…" : "Sync Now"}</span>
            </button>
          </div>

          {guestSummary?.hasData && (
            <div className="rounded-[24px] border border-[var(--home-accent)]/40 bg-[var(--home-card)] p-6 space-y-3">
              <h3 className="font-display text-lg text-[var(--home-text)]">
                Local Guest Data Found on This Device
              </h3>
              <p className="text-xs text-[var(--home-text-secondary)] leading-relaxed">
                Found{" "}
                <span className="font-mono-num font-bold">
                  {guestSummary.counts.transactions}
                </span>{" "}
                transaction(s),{" "}
                <span className="font-mono-num font-bold">
                  {guestSummary.counts.buckets}
                </span>{" "}
                bucket(s), and{" "}
                <span className="font-mono-num font-bold">
                  {guestSummary.counts.loan_profiles}
                </span>{" "}
                loan profile(s) from Guest Mode. Existing cloud accounts and categories are matched by name so nothing duplicates.
              </p>

              <button
                type="button"
                disabled={migrating}
                onClick={handleBackupGuestData}
                className="h-10 px-6 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <HiOutlineCloudArrowUp className="w-4 h-4" />
                <span>
                  {migrating ? "Merging & Backing Up…" : "Back up local data"}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

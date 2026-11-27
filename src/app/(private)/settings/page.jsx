"use client";

import React, { useState, useEffect, Suspense } from "react";
import PageSkeleton from "@/components/shared/PageSkeleton";
import { Skeleton, SkeletonTitle, SkeletonRegion } from "@/components/shared/Skeleton";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import {
  HiOutlineChevronRight,
  HiOutlineCurrencyDollar,
  HiOutlineClock,
  HiOutlineChartBar,
  HiOutlineEyeSlash,
  HiOutlineSquares2X2,
  HiOutlineWallet,
  HiOutlineCloudArrowUp,
  HiOutlineUserCircle,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineBell,
  HiOutlineLockClosed,
  HiOutlineTrash,
  HiOutlineShieldCheck,
  HiOutlineChatBubbleLeftRight,
  HiOutlineShare,
  HiOutlineInformationCircle,
} from "react-icons/hi2";
import { IoColorPaletteOutline } from "react-icons/io5";
import useAccounts from "@/hooks/useAccounts";
import useAuth from "@/hooks/useAuth";
import ThemeChange from "@/components/ThemeChange";
import CurrencySelect from "@/components/CurrencySelect";
import { formatMoney } from "@/utils/currencies";
import { changeTheme } from "@/redux/slices/themeSlice";
import { saveAppearancePreference } from "@/services/preferencesService";
import packageMeta from "../../../../package.json";

const APP_VERSION = packageMeta?.version || "0.2.0";

function SettingRow({
  href,
  onClick,
  icon: Icon,
  title,
  subtitle,
  rightValue,
  destructive = false,
}) {
  const inner = (
    <div className="min-h-[60px] px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-[var(--home-background)]/70 transition-colors">
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
            destructive
              ? "bg-[var(--home-destructive)]/10 text-[var(--home-destructive)]"
              : "bg-[var(--home-track)] text-[var(--home-accent)]"
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span
            className={`text-sm font-bold block truncate ${
              destructive
                ? "text-[var(--home-destructive)]"
                : "text-[var(--home-text)]"
            }`}
          >
            {title}
          </span>
          {subtitle && (
            <span className="text-xs text-[var(--home-text-muted)] block truncate">
              {subtitle}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {rightValue && (
          <span className="text-xs font-semibold text-[var(--home-text-secondary)] max-w-[140px] truncate">
            {rightValue}
          </span>
        )}
        <HiOutlineChevronRight className="w-4 h-4 text-[var(--home-text-muted)]" />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left block cursor-pointer"
    >
      {inner}
    </button>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const { userId, isGuest, displayName } = useAuth();
  const {
    activeAccount,
    accounts,
    updateAccount,
    loading: accountsLoading,
  } = useAccounts();

  const themeState = useSelector((state) => state?.themeSlice);
  const appState = useSelector((state) => state?.appSlice);
  const isDark = themeState?.mode === "dark";
  const customAccent = themeState?.customAccent || null;
  const syncStatus = appState?.syncStatus || { state: "local", pendingCount: 0 };

  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState("INR");
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [shareToast, setShareToast] = useState("");

  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (tab === "accounts") {
      router.replace("/settings/accounts");
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (activeAccount?.currency_code) {
      setPendingCurrency(activeAccount.currency_code);
    }
  }, [activeAccount?.currency_code]);

  const handleToggleMode = async () => {
    const nextMode = isDark ? "light" : "dark";
    dispatch(changeTheme(nextMode));
    await saveAppearancePreference(userId, {
      appearanceMode: nextMode,
      accentColor: customAccent,
    });
  };

  const handleSaveCurrency = async () => {
    if (!activeAccount?.id) return;
    setSavingCurrency(true);
    try {
      await updateAccount(activeAccount.id, {
        currency_code: pendingCurrency,
      });
      setCurrencyModalOpen(false);
    } finally {
      setSavingCurrency(false);
    }
  };

  const handleShare = async () => {
    const shareUrl =
      typeof window !== "undefined" ? window.location.origin : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: "SpendScope — Calm Personal Finance",
          text: "Track expenses, savings buckets, and financial calculators with SpendScope.",
          url: shareUrl,
        });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setShareToast("App link copied to clipboard!");
        setTimeout(() => setShareToast(""), 3000);
      }
    } catch {
      // User dismissed share sheet
    }
  };

  const formatReminderSummary = () => {
    if (!activeAccount?.reminders || activeAccount.reminders === "Never") {
      return "Never";
    }
    const h = activeAccount.reminder_hour ?? 20;
    const m = String(activeAccount.reminder_minute ?? 0).padStart(2, "0");
    return `${activeAccount.reminders} · ${String(h).padStart(2, "0")}:${m}`;
  };

  if (accountsLoading) {
    return (
      <SkeletonRegion label="Loading settings" className="space-y-6">
        <SkeletonTitle />
        {[3, 4, 3].map((rows, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <div className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] divide-y divide-[var(--home-border)] overflow-hidden">
              {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="flex items-center gap-3 px-4 py-4">
                  <Skeleton className="h-9 w-9 shrink-0" rounded="rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-40 max-w-full" />
                    <Skeleton className="h-3 w-56 max-w-full" />
                  </div>
                  <Skeleton className="h-4 w-14" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </SkeletonRegion>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl text-[var(--home-text)]">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-[var(--home-text-secondary)]">
          Configure {activeAccount?.name || "Default"}, categories, appearance, reminders, security, and cloud sync.
        </p>
      </div>

      {shareToast && (
        <div className="p-3 rounded-2xl border border-[var(--home-income)]/40 bg-[var(--home-income-soft)] text-xs font-semibold text-[var(--home-income)]">
          {shareToast}
        </div>
      )}

      {/* 1. SPENDING */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--home-text-muted)] px-1">
          Spending
        </h2>
        <div className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] divide-y divide-[var(--home-border)] overflow-hidden">
          <SettingRow
            icon={HiOutlineCurrencyDollar}
            title="Account Currency"
            subtitle="Display currency for active account (amounts are not converted)"
            rightValue={activeAccount?.currency_code || "INR"}
            onClick={() => {
              setPendingCurrency(activeAccount?.currency_code || "INR");
              setCurrencyModalOpen(true);
            }}
          />
          <SettingRow
            href="/settings/time-period"
            icon={HiOutlineClock}
            title="Default Time Period"
            subtitle="Initial overview interval when opening SpendScope"
            rightValue={activeAccount?.spending_period || "Monthly"}
          />
          <SettingRow
            href="/settings/budget-mode"
            icon={HiOutlineChartBar}
            title="Budget Mode"
            subtitle="Set recurring spending cap & Include Income option"
            rightValue={
              activeAccount?.budget_mode
                ? formatMoney(
                    activeAccount.budget_amount || 0,
                    activeAccount.currency_code || "INR",
                  )
                : "Off"
            }
          />
          <SettingRow
            href="/settings/hide-transactions"
            icon={HiOutlineEyeSlash}
            title="Hide Transactions"
            subtitle="Mask balances and entries until revealed"
            rightValue={activeAccount?.hide_transactions ? "On" : "Off"}
          />
          <SettingRow
            href="/categories"
            icon={HiOutlineSquares2X2}
            title="Manage Categories"
            subtitle="Expense & income tabs, icons, colors, and ordering"
          />
        </div>
      </section>

      {/* 2. ACCOUNT MANAGEMENT */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--home-text-muted)] px-1">
          Account Management
        </h2>
        <div className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] divide-y divide-[var(--home-border)] overflow-hidden">
          <SettingRow
            href="/settings/accounts"
            icon={HiOutlineWallet}
            title="Accounts &amp; Transfer Money"
            subtitle="Switch, create, edit avatars, or move funds between accounts"
            rightValue={`${accounts.length} account${accounts.length === 1 ? "" : "s"}`}
          />
          <SettingRow
            href="/settings/backup"
            icon={HiOutlineCloudArrowUp}
            title="Cloud Backup &amp; Sync"
            subtitle={
              isGuest
                ? "Sign in to back up local guest data safely"
                : "Sync status, manual push/pull & outbox health"
            }
            rightValue={
              isGuest
                ? "Local only"
                : syncStatus.pendingCount > 0
                  ? `${syncStatus.pendingCount} pending`
                  : "Synced"
            }
          />
          <SettingRow
            href="/settings/profile"
            icon={HiOutlineUserCircle}
            title="Profile &amp; Sign Out"
            subtitle={
              isGuest
                ? "Sign in or create an account"
                : displayName || "Manage profile, password & device sign-out"
            }
            rightValue={isGuest ? "Guest" : "Signed in"}
          />
        </div>
      </section>

      {/* 3. USER INTERFACE */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--home-text-muted)] px-1">
          User Interface
        </h2>
        <div className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] divide-y divide-[var(--home-border)] overflow-hidden">
          <SettingRow
            icon={isDark ? HiOutlineMoon : HiOutlineSun}
            title="Light / Dark Theme"
            subtitle="Switch between warm parchment Light and espresso Dark"
            rightValue={isDark ? "Dark" : "Light"}
            onClick={handleToggleMode}
          />
          <SettingRow
            icon={IoColorPaletteOutline}
            title="Accent Color Preset"
            subtitle="Keep Android terracotta default or pick a custom accent"
            rightValue={customAccent || "Editorial Default"}
            onClick={() => setThemeModalOpen(true)}
          />
        </div>
      </section>

      {/* 4. GENERAL */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--home-text-muted)] px-1">
          General
        </h2>
        <div className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] divide-y divide-[var(--home-border)] overflow-hidden">
          <SettingRow
            href="/settings/reminders"
            icon={HiOutlineBell}
            title="Reminders"
            subtitle="Browser notifications & recurring .ics calendar reminder"
            rightValue={formatReminderSummary()}
          />
          <SettingRow
            href="/settings/security"
            icon={HiOutlineLockClosed}
            title="Passcode &amp; App Lock"
            subtitle="Device-local 4-digit PIN lock (saved in this browser only)"
          />
          <SettingRow
            href="/settings/reset"
            icon={HiOutlineTrash}
            title="Reset Data"
            subtitle="Clear transactions with Keep Accounts & Keep Categories options"
            destructive
          />
        </div>
      </section>

      {/* 5. APP (No Rate App on web) */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--home-text-muted)] px-1">
          App
        </h2>
        <div className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] divide-y divide-[var(--home-border)] overflow-hidden">
          <SettingRow
            href="/privacy-policy"
            icon={HiOutlineShieldCheck}
            title="Privacy Policy"
            subtitle="How SpendScope stores local and synced financial records"
          />
          <SettingRow
            icon={HiOutlineChatBubbleLeftRight}
            title="Send Feedback"
            subtitle="Report an issue or suggest a feature"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = `mailto:support@spendscope.app?subject=${encodeURIComponent(`SpendScope Web v${APP_VERSION} Feedback`)}`;
              }
            }}
          />
          <SettingRow
            icon={HiOutlineShare}
            title="Share SpendScope"
            subtitle="Copy link or open system share sheet"
            onClick={handleShare}
          />
          <div className="min-h-[56px] px-5 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-[var(--home-track)] text-[var(--home-accent)] flex items-center justify-center">
                <HiOutlineInformationCircle className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-[var(--home-text)]">
                App Version
              </span>
            </div>
            <span className="font-mono-num text-xs font-bold text-[var(--home-text-secondary)]">
              v{APP_VERSION}
            </span>
          </div>
        </div>
      </section>

      {/* Currency Change Modal with non-conversion warning */}
      {currencyModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Change Account Currency"
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setCurrencyModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[28px] border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text)] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-xl">Account Currency</h3>
            <p className="text-xs text-[var(--home-text-secondary)] leading-relaxed p-3 rounded-2xl border border-[var(--home-border)] bg-[var(--home-background)]">
              Changing currency updates the display symbol for{" "}
              <strong>{activeAccount?.name}</strong> only. Existing transaction
              and budget numbers are <strong>not converted</strong> across FX
              rates.
            </p>
            <CurrencySelect
              value={pendingCurrency}
              onChange={setPendingCurrency}
            />
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setCurrencyModalOpen(false)}
                className="flex-1 py-2.5 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingCurrency}
                onClick={handleSaveCurrency}
                className="flex-[2] py-2.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {savingCurrency ? "Saving…" : "Save Currency"}
              </button>
            </div>
          </div>
        </div>
      )}

      {themeModalOpen && (
        <ThemeChange handleClose={() => setThemeModalOpen(false)} />
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={<PageSkeleton label="Loading settings" />}
    >
      <SettingsContent />
    </Suspense>
  );
}

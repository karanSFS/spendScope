"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import {
  HiOutlineHome,
  HiOutlineClipboardDocumentList,
  HiOutlineChartPie,
  HiOutlineArchiveBox,
  HiOutlineSquares2X2,
  HiOutlineCalculator,
  HiOutlineCog6Tooth,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineChevronDown,
  HiOutlineArrowRightOnRectangle,
  HiOutlineCloud,
  HiOutlineCloudArrowUp,
  HiOutlineExclamationCircle,
  HiOutlineTrash,
  HiOutlineEllipsisHorizontal,
  HiXMark,
  HiOutlineShieldCheck,
} from "react-icons/hi2";
import { IoColorPaletteOutline } from "react-icons/io5";
import { SpendScopeLogo } from "@/components/Header";
import ThemeChange from "@/components/ThemeChange";
import AvatarBadge from "@/components/shared/AvatarBadge";
import AccountSwitcherModal from "@/components/shared/AccountSwitcherModal";
import useAuth from "@/hooks/useAuth";
import useAccounts from "@/hooks/useAccounts";
import { changeTheme } from "@/redux/slices/themeSlice";
import { toggleSidebarCollapsed } from "@/redux/slices/appSlice";
import { syncNow, getGuestMigrationSummary } from "@/lib/syncEngine";
import { checkAndTriggerAccountReminder } from "@/lib/reminderScheduler";

const PRIMARY_NAV = [
  { href: "/dashboard", label: "Overview", mobileLabel: "Home", icon: HiOutlineHome },
  {
    href: "/transactions",
    label: "Transactions",
    mobileLabel: "History",
    icon: HiOutlineClipboardDocumentList,
  },
  {
    href: "/analytics",
    label: "Analytics",
    mobileLabel: "Analytics",
    icon: HiOutlineChartPie,
  },
  {
    href: "/spend-bucket",
    label: "Spend Buckets",
    mobileLabel: "Buckets",
    icon: HiOutlineArchiveBox,
  },
  {
    href: "/categories",
    label: "Categories",
    mobileLabel: "Categories",
    icon: HiOutlineSquares2X2,
  },
  {
    href: "/calculators",
    label: "Calculators",
    mobileLabel: "Calculators",
    icon: HiOutlineCalculator,
  },
];

const MOBILE_PRIMARY = PRIMARY_NAV.slice(0, 4);

export default function AppShell({ children }) {
  const pathname = usePathname();
  const dispatch = useDispatch();

  const {
    userId,
    isGuest,
    displayName,
    email,
    profile,
    defaultCurrency,
    logout,
  } = useAuth();

  const themeState = useSelector((state) => state?.themeSlice);
  const appState = useSelector((state) => state?.appSlice);
  const isDark = themeState?.mode === "dark";
  const sidebarCollapsed = Boolean(appState?.sidebarCollapsed);
  const syncStatus = appState?.syncStatus || { state: "local", pendingCount: 0 };

  const {
    accounts,
    activeAccount,
    activeAccountId,
    switchAccount,
    createAccount,
  } = useAccounts();

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [signOutConfirm, setSignOutConfirm] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [reminderBanner, setReminderBanner] = useState(null);
  const [guestBackupBanner, setGuestBackupBanner] = useState(false);

  const accountRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine !== false : true);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onDue = (e) => {
      if (e?.detail?.message) setReminderBanner(e.detail);
    };
    window.addEventListener("spendscope:reminder-due", onDue);
    return () => window.removeEventListener("spendscope:reminder-due", onDue);
  }, []);

  useEffect(() => {
    if (!activeAccount?.id) return undefined;
    const runCheck = () => {
      checkAndTriggerAccountReminder(userId, activeAccount).catch(() => {});
    };
    runCheck();
    const interval = setInterval(runCheck, 60 * 1000);
    const onFocus = () => runCheck();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [userId, activeAccount]);

  useEffect(() => {
    if (isGuest || !userId) {
      setGuestBackupBanner(false);
      return;
    }
    let active = true;
    getGuestMigrationSummary(userId)
      .then((s) => {
        if (active) setGuestBackupBanner(Boolean(s?.shouldPrompt));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isGuest, userId, pathname]);

  useEffect(() => {
    setAccountMenuOpen(false);
    setUserMenuOpen(false);
    setMobileMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isRouteActive = (href) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const renderSyncPill = (compact = false) => {
    if (isGuest) {
      return (
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border border-[var(--home-border)] bg-[var(--home-background)] text-[var(--home-text-secondary)] hover:text-[var(--home-text)] transition-colors"
          title="Stored locally on this device. Sign in to enable cloud backup."
        >
          <HiOutlineCloud className="w-3.5 h-3.5 text-[var(--home-text-muted)] shrink-0" />
          {!compact && <span>Local only</span>}
        </Link>
      );
    }

    const s = syncStatus?.state || "idle";
    let label = "Synced";
    let icon = <HiOutlineCloud className="w-3.5 h-3.5 text-[var(--home-income)] shrink-0" />;
    if (s === "syncing") {
      label = "Syncing…";
      icon = (
        <HiOutlineCloudArrowUp className="w-3.5 h-3.5 text-[var(--home-accent)] animate-pulse shrink-0" />
      );
    } else if (s === "offline") {
      label = "Offline";
      icon = <HiOutlineCloud className="w-3.5 h-3.5 text-[var(--home-text-muted)] shrink-0" />;
    } else if (s === "error") {
      label = "Sync retry";
      icon = (
        <HiOutlineExclamationCircle className="w-3.5 h-3.5 text-[var(--home-destructive)] shrink-0" />
      );
    }

    return (
      <button
        type="button"
        onClick={() => userId && syncNow(userId)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border border-[var(--home-border)] bg-[var(--home-background)] text-[var(--home-text-secondary)] hover:text-[var(--home-text)] transition-colors cursor-pointer"
        title={syncStatus?.lastError || "Click to sync now"}
      >
        {icon}
        {!compact && <span>{label}</span>}
      </button>
    );
  };

  return (
    <div className="min-h-screen flex bg-[var(--home-background)] text-[var(--home-text)]">
      {/* DESKTOP COLLAPSIBLE SIDEBAR */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-[var(--home-border)] bg-[var(--home-card)] sticky top-0 h-screen transition-all duration-200 z-30 ${
          sidebarCollapsed ? "w-[80px]" : "w-[248px]"
        }`}
      >
        {/* Brand row */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[var(--home-border)]">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 min-w-0"
            title="SpendScope Overview"
          >
            <SpendScopeLogo className="w-8 h-8 shrink-0" />
            {!sidebarCollapsed && (
              <span className="font-display text-xl tracking-tight truncate">
                <span className="text-[var(--home-accent)]">Spend</span>
                <span className="text-[var(--home-text)]">Scope</span>
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => dispatch(toggleSidebarCollapsed())}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] transition-colors cursor-pointer shrink-0"
          >
            {sidebarCollapsed ? (
              <HiOutlineChevronRight className="w-4 h-4" />
            ) : (
              <HiOutlineChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={sidebarCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
                  active
                    ? "bg-[var(--home-accent)] text-[var(--home-on-accent)] shadow-xs"
                    : "text-[var(--home-text-secondary)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)]/70"
                } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom settings + sync */}
        <div className="p-3 border-t border-[var(--home-border)] space-y-2">
          <Link
            href="/settings"
            title={sidebarCollapsed ? "Settings" : undefined}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
              isRouteActive("/settings")
                ? "bg-[var(--home-accent)] text-[var(--home-on-accent)] shadow-xs"
                : "text-[var(--home-text-secondary)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)]/70"
            } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
          >
            <HiOutlineCog6Tooth className="w-5 h-5 shrink-0" />
            {!sidebarCollapsed && <span>Settings</span>}
          </Link>

          <div className={`flex ${sidebarCollapsed ? "justify-center" : "px-1"}`}>
            {renderSyncPill(sidebarCollapsed)}
          </div>
        </div>
      </aside>

      {/* MAIN COLUMN */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP UTILITY BAR */}
        <header className="sticky top-0 z-20 h-16 px-3 sm:px-6 border-b border-[var(--home-border)] bg-[var(--home-card)]/90 backdrop-blur-md flex items-center justify-between gap-2">
          {/* Left: Mobile Logo + Active Account Pill */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/dashboard"
              className="flex lg:hidden items-center gap-2 shrink-0"
            >
              <SpendScopeLogo className="w-7 h-7" />
              <span className="font-display text-lg hidden sm:inline">
                <span className="text-[var(--home-accent)]">Spend</span>
                <span className="text-[var(--home-text)]">Scope</span>
              </span>
            </Link>

            {/* Account Switcher Pill */}
            <div className="relative min-w-0" ref={accountRef}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((o) => !o)}
                className="h-10 max-w-[200px] sm:max-w-[260px] px-3 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] hover:border-[var(--home-accent)]/60 flex items-center gap-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                aria-label="Switch active account"
              >
                <AvatarBadge
                  avatarKey={activeAccount?.avatar_key || "user_pf"}
                  name={activeAccount?.name || "Default"}
                  size={20}
                />
                <span className="truncate text-[var(--home-text)]">
                  {activeAccount?.name || "Default"}
                </span>
                <span className="hidden xs:inline text-[11px] font-mono-num text-[var(--home-text-muted)] shrink-0">
                  {activeAccount?.currency_code || defaultCurrency || "INR"}
                </span>
                <HiOutlineChevronDown className="w-3.5 h-3.5 text-[var(--home-text-muted)] shrink-0" />
              </button>

              {accountMenuOpen && (
                <div className="absolute left-0 top-full mt-2 w-64 rounded-2xl border border-[var(--home-border)] bg-[var(--home-card)] shadow-xl p-1.5 z-50">
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--home-text-muted)]">
                    Accounts
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {accounts.map((acc) => {
                      const selected = acc.id === activeAccount?.id;
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => {
                            switchAccount(acc.id);
                            setAccountMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold transition-colors cursor-pointer ${
                            selected
                              ? "bg-[var(--home-track)] text-[var(--home-text)]"
                              : "text-[var(--home-text-secondary)] hover:bg-[var(--home-background)]"
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <AvatarBadge
                              avatarKey={acc.avatar_key || "user_pf"}
                              name={acc.name}
                              size={22}
                            />
                            <span className="truncate">{acc.name}</span>
                          </span>
                          <span className="font-mono-num text-[11px] text-[var(--home-text-muted)] shrink-0">
                            {acc.currency_code || "INR"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-t border-[var(--home-border)] mt-1.5 pt-1.5 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        setAccountModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[var(--home-accent)] hover:bg-[var(--home-background)] transition-colors cursor-pointer"
                    >
                      + Switch or Add Account
                    </button>
                    <Link
                      href="/settings/accounts"
                      onClick={() => setAccountMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl text-xs font-semibold text-[var(--home-text-secondary)] hover:bg-[var(--home-background)] transition-colors"
                    >
                      Manage accounts &amp; transfers →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Sync + Theme + User / Guest Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block lg:hidden">{renderSyncPill(false)}</div>

            {/* Light/Dark quick toggle */}
            <button
              type="button"
              onClick={() => dispatch(changeTheme(isDark ? "light" : "dark"))}
              aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="w-10 h-10 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] flex items-center justify-center text-[var(--home-text-secondary)] hover:text-[var(--home-text)] transition-colors cursor-pointer"
              title={isDark ? "Light Mode" : "Dark Mode"}
            >
              {isDark ? (
                <HiOutlineSun className="w-4.5 h-4.5" />
              ) : (
                <HiOutlineMoon className="w-4.5 h-4.5" />
              )}
            </button>

            {/* Accent palette button */}
            <button
              type="button"
              onClick={() => setThemeModalOpen((o) => !o)}
              aria-label="Appearance and accent colors"
              className="w-10 h-10 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] flex items-center justify-center text-[var(--home-text-secondary)] hover:text-[var(--home-text)] transition-colors cursor-pointer"
              title="Appearance & Accent"
            >
              <IoColorPaletteOutline className="w-4.5 h-4.5" />
            </button>

            {/* Guest CTA or Authenticated Profile Menu */}
            {isGuest ? (
              <Link
                href="/sign-in"
                className="h-10 px-3.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 shadow-xs hover:opacity-95 transition-opacity"
              >
                <span className="hidden xs:inline">Back up /</span>
                <span>Sign In</span>
              </Link>
            ) : (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="h-10 pl-1.5 pr-2.5 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] flex items-center gap-2 hover:border-[var(--home-accent)]/60 transition-colors cursor-pointer"
                  aria-expanded={userMenuOpen}
                >
                  <AvatarBadge
                    avatarKey={profile?.avatar_key || "user_pf"}
                    name={displayName}
                    size={28}
                  />
                  <span className="hidden md:inline text-xs font-semibold max-w-[120px] truncate">
                    {displayName || "Account"}
                  </span>
                  <HiOutlineChevronDown className="w-3.5 h-3.5 text-[var(--home-text-muted)]" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-[var(--home-border)] bg-[var(--home-card)] shadow-xl p-1.5 z-50">
                    <div className="px-3 py-2 border-b border-[var(--home-border)] mb-1">
                      <p className="text-xs font-bold truncate">{displayName}</p>
                      <p className="text-[11px] text-[var(--home-text-muted)] truncate">
                        {email}
                      </p>
                    </div>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--home-text-secondary)] hover:text-[var(--home-text)] hover:bg-[var(--home-background)]"
                    >
                      <HiOutlineCog6Tooth className="w-4 h-4" />
                      <span>Settings & Profile</span>
                    </Link>
                    <Link
                      href="/privacy-policy"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--home-text-secondary)] hover:text-[var(--home-text)] hover:bg-[var(--home-background)]"
                    >
                      <HiOutlineShieldCheck className="w-4 h-4" />
                      <span>Privacy & Storage</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setSignOutConfirm(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--home-destructive)] hover:bg-[var(--home-background)] cursor-pointer text-left"
                    >
                      <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* STATUS BANNERS (Offline, Sync Retry, Guest Backup Prompt, Reminder) */}
        <div className="w-full max-w-[1280px] mx-auto px-3 sm:px-6 lg:px-8 space-y-2 pt-3 empty:hidden">
          {!isGuest && (!isOnline || syncStatus?.state === "offline") && (
            <div className="px-4 py-2.5 rounded-2xl border border-[var(--home-border)] bg-[var(--home-card)] text-xs text-[var(--home-text-secondary)] flex items-center justify-between gap-2">
              <span>
                You are offline — edits are stored locally and will sync automatically once reconnected.
              </span>
            </div>
          )}

          {!isGuest && isOnline && syncStatus?.state === "error" && (
            <div className="px-4 py-2.5 rounded-2xl border border-[var(--home-destructive)]/40 bg-[var(--home-card)] text-xs text-[var(--home-destructive)] flex items-center justify-between gap-2">
              <span>
                Sync paused ({syncStatus.pendingCount || 1} pending): {syncStatus.lastError || "Retrying automatically"}
              </span>
              <button
                type="button"
                onClick={() => userId && syncNow(userId, { ignoreBackoff: true })}
                className="px-3 py-1 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-[11px] font-bold shrink-0 cursor-pointer"
              >
                Retry Sync
              </button>
            </div>
          )}

          {!isGuest && guestBackupBanner && (
            <div className="px-4 py-2.5 rounded-2xl border border-[var(--home-accent)]/40 bg-[var(--home-card)] text-xs text-[var(--home-text)] flex items-center justify-between gap-2 flex-wrap">
              <span>
                Local Guest records are stored on this device. Merge them into your cloud account without duplicates.
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/settings/backup"
                  className="px-3 py-1 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-[11px] font-bold"
                >
                  Back up local data
                </Link>
                <button
                  type="button"
                  onClick={() => setGuestBackupBanner(false)}
                  aria-label="Dismiss backup notice"
                  className="text-[var(--home-text-muted)] hover:text-[var(--home-text)] cursor-pointer p-1"
                >
                  <HiXMark className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {reminderBanner && (
            <div className="px-4 py-2.5 rounded-2xl border border-[var(--home-income)]/40 bg-[var(--home-income-soft)] text-xs font-semibold text-[var(--home-income)] flex items-center justify-between gap-2">
              <span>{reminderBanner.message}</span>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/dashboard"
                  onClick={() => setReminderBanner(null)}
                  className="px-3 py-1 rounded-full bg-[var(--home-income)] text-white text-[11px] font-bold"
                >
                  Open Spending
                </Link>
                <button
                  type="button"
                  onClick={() => setReminderBanner(null)}
                  aria-label="Dismiss reminder"
                  className="p-1 cursor-pointer"
                >
                  <HiXMark className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PAGE CONTENT */}
        <main className="flex-1 w-full max-w-[1280px] mx-auto px-3 sm:px-6 lg:px-8 py-5 pb-24 lg:pb-10">
          {children}
        </main>
      </div>

      {/* MOBILE / TABLET BOTTOM NAVIGATION BAR */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--home-border)] bg-[var(--home-card)]/95 backdrop-blur-md px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="grid grid-cols-5 gap-1 max-w-xl mx-auto">
          {MOBILE_PRIMARY.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[11px] font-semibold transition-colors ${
                  active
                    ? "text-[var(--home-accent)] bg-[var(--home-track)]/70"
                    : "text-[var(--home-text-muted)] hover:text-[var(--home-text)]"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="truncate max-w-full">{item.mobileLabel}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileMoreOpen(true)}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
              isRouteActive("/categories") ||
              isRouteActive("/calculators") ||
              isRouteActive("/settings")
                ? "text-[var(--home-accent)] bg-[var(--home-track)]/70"
                : "text-[var(--home-text-muted)] hover:text-[var(--home-text)]"
            }`}
          >
            <HiOutlineEllipsisHorizontal className="w-5 h-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* MOBILE "MORE" SHEET */}
      {mobileMoreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-end justify-center"
          onClick={() => setMobileMoreOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-[28px] border-t border-[var(--home-border)] bg-[var(--home-card)] p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-lg">More Tools</span>
              <button
                type="button"
                onClick={() => setMobileMoreOpen(false)}
                aria-label="Close menu"
                className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--home-track)] text-[var(--home-text)] cursor-pointer"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/categories"
                className="flex items-center gap-3 p-3.5 rounded-2xl border border-[var(--home-border)] bg-[var(--home-background)] text-sm font-semibold"
              >
                <HiOutlineSquares2X2 className="w-5 h-5 text-[var(--home-accent)]" />
                <span>Categories</span>
              </Link>
              <Link
                href="/calculators"
                className="flex items-center gap-3 p-3.5 rounded-2xl border border-[var(--home-border)] bg-[var(--home-background)] text-sm font-semibold"
              >
                <HiOutlineCalculator className="w-5 h-5 text-[var(--home-accent)]" />
                <span>Calculators</span>
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-3 p-3.5 rounded-2xl border border-[var(--home-border)] bg-[var(--home-background)] text-sm font-semibold"
              >
                <HiOutlineCog6Tooth className="w-5 h-5 text-[var(--home-accent)]" />
                <span>Settings</span>
              </Link>
              <Link
                href="/privacy-policy"
                className="flex items-center gap-3 p-3.5 rounded-2xl border border-[var(--home-border)] bg-[var(--home-background)] text-sm font-semibold"
              >
                <HiOutlineShieldCheck className="w-5 h-5 text-[var(--home-accent)]" />
                <span>Privacy</span>
              </Link>
            </div>
            <div className="flex items-center justify-between pt-2">
              {renderSyncPill(false)}
              {!isGuest && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMoreOpen(false);
                    setSignOutConfirm(true);
                  }}
                  className="text-xs font-semibold text-[var(--home-destructive)] px-3 py-2 cursor-pointer"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* THEME PALETTE MODAL */}
      {themeModalOpen && (
        <ThemeChange handleClose={() => setThemeModalOpen(false)} />
      )}

      {/* ACCOUNT SWITCHER & INLINE CREATE MODAL */}
      <AccountSwitcherModal
        open={accountModalOpen}
        accounts={accounts}
        activeAccountId={activeAccountId}
        onSelectAccount={switchAccount}
        onCreateAccount={createAccount}
        onClose={() => setAccountModalOpen(false)}
      />

      {/* SIGN OUT MODAL WITH DEVICE WIPE OPTION */}
      {signOutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-6 shadow-2xl space-y-4">
            <h3 className="font-display text-xl text-[var(--home-text)]">
              Sign out of SpendScope?
            </h3>
            <p className="text-xs text-[var(--home-text-secondary)] leading-relaxed">
              Your synced data stays safely backed up in the cloud. On shared computers, you can also remove the local offline cache from this device.
            </p>
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  setSignOutConfirm(false);
                  await logout({ wipeLocal: false });
                }}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-[var(--home-accent)] text-[var(--home-on-accent)] hover:opacity-95 transition-opacity cursor-pointer"
              >
                Sign out (keep offline copy)
              </button>
              <button
                type="button"
                onClick={async () => {
                  setSignOutConfirm(false);
                  await logout({ wipeLocal: true });
                }}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold border border-[var(--home-destructive)]/40 text-[var(--home-destructive)] hover:bg-[var(--home-background)] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <HiOutlineTrash className="w-4 h-4" />
                <span>Sign out & remove local data</span>
              </button>
              <button
                type="button"
                onClick={() => setSignOutConfirm(false)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-[var(--home-text-secondary)] hover:bg-[var(--home-track)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

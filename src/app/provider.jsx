"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { Provider, useDispatch, useSelector } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { ThemeProvider } from "styled-components";
import StyledComponentsRegistry from "@/lib/registry";
import { store, persistor } from "../redux";
import { buildTheme } from "@/utils/theme";
import {
  setAuthSession,
  enterGuestMode,
  clearLegacySessionArtifacts,
} from "@/redux/slices/authSlice";
import { setSyncStatus } from "@/redux/slices/appSlice";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseconfig";
import { getProfile } from "@/services/authService";
import { ensureDefaults, closeOwnerDb } from "@/lib/localDb";
import { syncNow, subscribeSyncStatus } from "@/lib/syncEngine";

const CSS_TOKEN_MAP = {
  homeBackground: "--home-background",
  homeCard: "--home-card",
  homeBorder: "--home-border",
  homeTrack: "--home-track",
  homeAccent: "--home-accent",
  homeOnAccent: "--home-on-accent",
  homeIncome: "--home-income",
  homeIncomeSoft: "--home-income-soft",
  homeExpense: "--home-expense",
  homeText: "--home-text",
  homeTextSecondary: "--home-text-secondary",
  homeTextMuted: "--home-text-muted",
  homeDestructive: "--home-destructive",
  addSheetBackground: "--add-sheet-bg",
  addKeyBackground: "--add-key-bg",
  addOperatorKeyBackground: "--add-operator-key-bg",
  homeCategory1: "--home-category-1",
  homeCategory2: "--home-category-2",
  homeCategory3: "--home-category-3",
  homeCategory4: "--home-category-4",
  homeCategory5: "--home-category-5",
  homeCategory6: "--home-category-6",
};

function ReduxThemeBridge({ children }) {
  const dispatch = useDispatch();
  const themeState = useSelector((state) => state?.themeSlice);
  const userId = useSelector((state) => state?.authSlice?.userId) || null;
  const activeOwnerRef = useRef(null);

  const currentTheme = useMemo(
    () => buildTheme(themeState?.mode || "light", themeState?.customAccent || null),
    [themeState?.mode, themeState?.customAccent],
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (currentTheme.mode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    Object.entries(CSS_TOKEN_MAP).forEach(([tokenKey, cssVar]) => {
      if (currentTheme.tokens[tokenKey]) {
        root.style.setProperty(cssVar, currentTheme.tokens[tokenKey]);
      }
    });

    Object.entries(currentTheme.colors).forEach(([key, val]) => {
      root.style.setProperty(`--theme-${key}`, val);
    });

    root.style.setProperty("--primary", currentTheme.tokens.homeAccent);
    root.style.setProperty("--background", currentTheme.tokens.homeBackground);
    root.style.setProperty("--foreground", currentTheme.tokens.homeText);
  }, [currentTheme]);

  useEffect(() => {
    clearLegacySessionArtifacts();

    const unsubSync = subscribeSyncStatus((status) => {
      dispatch(setSyncStatus(status));
    });

    let mounted = true;

    const bootstrapGuest = async () => {
      if (activeOwnerRef.current) {
        await closeOwnerDb(activeOwnerRef.current);
        activeOwnerRef.current = null;
      }
      if (!mounted) return;
      dispatch(enterGuestMode());
      dispatch(
        setSyncStatus({
          state: "local",
          pendingCount: 0,
          lastError: null,
        }),
      );
      await ensureDefaults({ ownerId: null, enqueueSync: false }).catch(() => {});
    };

    const hydrateAuthenticated = async (session) => {
      const nextOwnerId = session?.user?.id || null;
      if (!nextOwnerId) {
        await bootstrapGuest();
        return;
      }
      if (activeOwnerRef.current && activeOwnerRef.current !== nextOwnerId) {
        await closeOwnerDb(activeOwnerRef.current);
      }
      activeOwnerRef.current = nextOwnerId;

      const profile = await getProfile(nextOwnerId);
      if (!mounted) return;

      dispatch(
        setAuthSession({
          user: session.user,
          session,
          profile,
        }),
      );

      await syncNow(nextOwnerId, {
        defaultCurrency:
          profile?.default_currency ||
          session.user?.user_metadata?.currency ||
          "INR",
      }).catch(() => {});
    };

    if (!isSupabaseConfigured || !supabase) {
      bootstrapGuest();
      return () => {
        mounted = false;
        unsubSync();
      };
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        if (data?.session?.user) {
          hydrateAuthenticated(data.session);
        } else {
          bootstrapGuest();
        }
      })
      .catch(() => {
        if (mounted) bootstrapGuest();
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT" || !session?.user) {
        bootstrapGuest();
      } else if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        hydrateAuthenticated(session);
      }
    });

    return () => {
      mounted = false;
      unsubSync();
      subscription?.unsubscribe?.();
    };
  }, [dispatch]);

  useEffect(() => {
    if (typeof window === "undefined" || !userId || !isSupabaseConfigured) {
      return undefined;
    }

    const triggerSync = () => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      syncNow(userId).catch(() => {});
    };

    const handleVisibility = () => {
      if (!document.hidden) triggerSync();
    };

    window.addEventListener("online", triggerSync);
    window.addEventListener("focus", triggerSync);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("online", triggerSync);
      window.removeEventListener("focus", triggerSync);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [userId]);

  return <ThemeProvider theme={currentTheme}>{children}</ThemeProvider>;
}

export default function Providers({ children }) {
  return (
    <StyledComponentsRegistry>
      <Provider store={store}>
        <PersistGate
          loading={
            <div className="min-h-screen bg-[#F5EDDE] dark:bg-[#1A1714] flex items-center justify-center text-[#68635D] dark:text-[#C2B9AB] font-sans text-sm">
              Loading SpendScope…
            </div>
          }
          persistor={persistor}
        >
          <ReduxThemeBridge>{children}</ReduxThemeBridge>
        </PersistGate>
      </Provider>
    </StyledComponentsRegistry>
  );
}

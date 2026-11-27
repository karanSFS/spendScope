"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiXMark,
  HiEye,
  HiEyeSlash,
  HiExclamationTriangle,
} from "react-icons/hi2";
import { getAuthErrorMessage } from "@/services/authService";
import useAuth from "@/hooks/useAuth";
import { SpendScopeLogo } from "@/components/Header";
import AuthSplitShell from "@/components/shared/AuthSplitShell";

export default function SignInPage({
  isModal = false,
  onClose,
  onSwitchToSignUp,
}) {
  const router = useRouter();
  const { signIn, continueAsGuest, isAuthenticated, authReady } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!isModal && authReady && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isModal, authReady, isAuthenticated, router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("spendscope_remembered_email");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!isModal || !onClose) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isModal, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!email.trim() || !password) {
      setFormError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const data = await signIn({ email: email.trim(), password });
      if (!data?.session) {
        throw new Error(
          "Unable to establish session. Please verify your credentials.",
        );
      }
      if (rememberMe) {
        localStorage.setItem("spendscope_remembered_email", email.trim());
      } else {
        localStorage.removeItem("spendscope_remembered_email");
      }
      if (onClose) onClose();
      router.replace("/dashboard");
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const cardContent = (
    <div className="w-full max-w-md rounded-[26px] border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text)] shadow-xl p-7 sm:p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--home-accent)]/80" />

      {isModal && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] rounded-full transition-colors cursor-pointer"
          aria-label="Close"
        >
          <HiXMark className="w-5 h-5" />
        </button>
      )}

      <div className="text-center mb-6 space-y-2">
        <div className="flex justify-center">
          <SpendScopeLogo className="w-9 h-9" />
        </div>
        <h1 className="font-display text-2xl sm:text-[26px] tracking-tight text-[var(--home-text)]">
          Sign in to SpendScope
        </h1>
        <p className="text-sm text-[var(--home-text-secondary)]">
          Sync your accounts across Web and Android
        </p>
      </div>

      {formError && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-5 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs sm:text-sm font-medium border border-[var(--home-destructive)]/40 bg-[var(--home-background)] text-[var(--home-destructive)]"
        >
          <HiExclamationTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 leading-snug">{formError}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="signin-email"
            className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1.5"
          >
            Email Address
          </label>
          <input
            id="signin-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (formError) setFormError("");
            }}
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-[var(--home-text)] text-sm placeholder-[var(--home-text-muted)] focus:outline-none focus:border-[var(--home-accent)] focus:ring-2 focus:ring-[var(--home-accent)]/20 transition-all"
          />
        </div>

        <div>
          <label
            htmlFor="signin-password"
            className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1.5"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="signin-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (formError) setFormError("");
              }}
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              className="w-full px-4 py-2.5 pr-10 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-[var(--home-text)] text-sm placeholder-[var(--home-text-muted)] focus:outline-none focus:border-[var(--home-accent)] focus:ring-2 focus:ring-[var(--home-accent)]/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--home-text-muted)] hover:text-[var(--home-text)] cursor-pointer p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <HiEyeSlash className="w-5 h-5" />
              ) : (
                <HiEye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs font-medium text-[var(--home-text-secondary)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="rounded border-[var(--home-border)] accent-[var(--home-accent)]"
          />
          <span>Remember email on this device</span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-sm font-semibold hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer shadow-sm"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="mt-5 pt-4 border-t border-[var(--home-border)] space-y-3 text-center">
        <button
          type="button"
          onClick={() => {
            if (onClose) onClose();
            continueAsGuest();
          }}
          className="w-full py-2.5 px-4 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] text-xs font-semibold text-[var(--home-text)] hover:border-[var(--home-accent)] transition-colors cursor-pointer"
        >
          Continue as Guest (Local Only)
        </button>

        <p className="text-sm text-[var(--home-text-secondary)]">
          Don&apos;t have an account?{" "}
          {onSwitchToSignUp ? (
            <button
              type="button"
              onClick={onSwitchToSignUp}
              className="font-semibold text-[var(--home-accent)] hover:underline cursor-pointer"
            >
              Sign up
            </button>
          ) : (
            <Link
              href="/signup"
              className="font-semibold text-[var(--home-accent)] hover:underline"
            >
              Sign up
            </Link>
          )}
        </p>
      </div>
    </div>
  );

  if (isModal) {
    if (typeof document === "undefined") return null;
    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sign in modal"
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      >
        <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
          {cardContent}
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <AuthSplitShell
      eyebrow="WELCOME BACK"
      headline="Pick up right where you left off."
      subtitle="Sign in to sync your accounts, Spend Buckets, and categories across Web and Android — or jump straight into Guest Mode."
    >
      {cardContent}
    </AuthSplitShell>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiEye,
  HiEyeSlash,
  HiExclamationTriangle,
  HiCheckCircle,
} from "react-icons/hi2";
import {
  MIN_PASSWORD_LENGTH,
  getAuthErrorMessage,
  requestPasswordReset,
  updateUserPassword,
} from "@/services/authService";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseconfig";
import { SpendScopeLogo } from "@/components/Header";
import AuthSplitShell from "@/components/shared/AuthSplitShell";

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-[var(--home-text)] text-sm placeholder-[var(--home-text-muted)] focus:outline-none focus:border-[var(--home-accent)] focus:ring-2 focus:ring-[var(--home-accent)]/20 transition-all";
const labelClass =
  "block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1.5";

/**
 * Two-step password reset:
 *  1. "request": ask for an email and send the reset link.
 *  2. "update":  opened from the emailed link (Supabase PASSWORD_RECOVERY
 *     session) to choose a new password.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [mode, setMode] = useState("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (/type=recovery/.test(window.location.hash)) setMode("update");
    if (!isSupabaseConfigured || !supabase) return undefined;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("update");
    });
    return () => subscription?.unsubscribe?.();
  }, []);

  const handleRequest = async (e) => {
    e.preventDefault();
    setFormError("");
    setInfo("");
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setInfo(
        "If an account exists for that email, a reset link is on its way. Open it on this device to choose a new password.",
      );
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setFormError("");
    setInfo("");
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await updateUserPassword(password);
      setInfo("Password updated. Taking you to your dashboard…");
      setTimeout(() => router.replace("/dashboard"), 1200);
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const isUpdate = mode === "update";

  return (
    <AuthSplitShell
      eyebrow="ACCOUNT RECOVERY"
      headline="Back in, safely."
      subtitle="Reset your password by email. Your local data on this device is never touched."
    >
      <div className="w-full max-w-md rounded-[26px] border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text)] shadow-xl p-7 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--home-accent)]/80" />

        <div className="text-center mb-6 space-y-2">
          <div className="flex justify-center">
            <SpendScopeLogo className="w-9 h-9" />
          </div>
          <h1 className="font-display text-2xl sm:text-[26px] tracking-tight">
            {isUpdate ? "Choose a new password" : "Reset your password"}
          </h1>
          <p className="text-sm text-[var(--home-text-secondary)]">
            {isUpdate
              ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
              : "Enter your account email and we will send a reset link."}
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
        {info && (
          <div
            role="status"
            aria-live="polite"
            className="mb-5 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs sm:text-sm font-medium border border-[var(--home-income)]/40 bg-[var(--home-background)] text-[var(--home-income)]"
          >
            <HiCheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">{info}</div>
          </div>
        )}

        {isUpdate ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label htmlFor="reset-new-password" className={labelClass}>
                New password
              </label>
              <div className="relative">
                <input
                  id="reset-new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className={`${inputClass} pr-10`}
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
            <div>
              <label htmlFor="reset-confirm-password" className={labelClass}>
                Confirm password
              </label>
              <input
                id="reset-confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-sm font-semibold hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className={labelClass}>
                Email Address
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-sm font-semibold hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="mt-5 pt-4 border-t border-[var(--home-border)] text-center text-sm text-[var(--home-text-secondary)]">
          <Link
            href="/sign-in"
            className="font-semibold text-[var(--home-accent)] hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthSplitShell>
  );
}

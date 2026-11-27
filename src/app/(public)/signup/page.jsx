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
  HiCheckCircle,
} from "react-icons/hi2";
import {
  MIN_PASSWORD_LENGTH,
  getAuthErrorMessage,
} from "@/services/authService";
import useAuth from "@/hooks/useAuth";
import CurrencySelect from "@/components/CurrencySelect";
import { SpendScopeLogo } from "@/components/Header";
import { DEFAULT_CURRENCY } from "@/utils/currencies";

export default function SignUpPage({
  isModal = false,
  onClose,
  onSwitchToSignIn,
}) {
  const router = useRouter();
  const { signUp, continueAsGuest, isAuthenticated, authReady } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY.code);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  useEffect(() => {
    if (!isModal && authReady && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isModal, authReady, isAuthenticated, router]);

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
    setInfoMessage("");

    if (!displayName.trim() || !email.trim() || !password || !confirmPassword) {
      setFormError("Please fill in all required fields.");
      return;
    }

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
      const data = await signUp({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        phone: phone.trim() || null,
        currency,
      });

      if (data?.session) {
        if (onClose) onClose();
        router.replace("/dashboard");
      } else {
        setInfoMessage(
          "Account created! Check your email to verify your address, then sign in.",
        );
      }
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const cardContent = (
    <div className="w-full max-w-md rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text)] shadow-2xl p-6 sm:p-8 relative">
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

      <div className="text-center mb-5 space-y-2">
        <div className="flex justify-center">
          <SpendScopeLogo className="w-9 h-9" />
        </div>
        <h1 className="font-display text-2xl tracking-tight text-[var(--home-text)]">
          Create Cloud Account
        </h1>
        <p className="text-sm text-[var(--home-text-secondary)]">
          Back up your SpendScope workspace privately
        </p>
      </div>

      {formError && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-4 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs sm:text-sm font-medium border border-[var(--home-destructive)]/40 bg-[var(--home-background)] text-[var(--home-destructive)]"
        >
          <HiExclamationTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 leading-snug">{formError}</div>
        </div>
      )}

      {infoMessage && (
        <div
          role="status"
          className="mb-4 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs sm:text-sm font-medium border border-[var(--home-income)]/40 bg-[var(--home-income-soft)] text-[var(--home-income)]"
        >
          <HiCheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 leading-snug">{infoMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label
            htmlFor="signup-displayname"
            className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
          >
            Display Name <span className="text-[var(--home-destructive)]">*</span>
          </label>
          <input
            id="signup-displayname"
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (formError) setFormError("");
            }}
            required
            autoComplete="name"
            placeholder="Alex Morgan"
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-[var(--home-text)] text-sm placeholder-[var(--home-text-muted)] focus:outline-none focus:border-[var(--home-accent)]"
          />
        </div>

        <div>
          <label
            htmlFor="signup-email"
            className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
          >
            Email Address <span className="text-[var(--home-destructive)]">*</span>
          </label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (formError) setFormError("");
            }}
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-[var(--home-text)] text-sm placeholder-[var(--home-text-muted)] focus:outline-none focus:border-[var(--home-accent)]"
          />
        </div>

        <div>
          <label
            htmlFor="signup-phone"
            className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
          >
            Phone{" "}
            <span className="text-[11px] font-normal text-[var(--home-text-muted)]">
              (Optional)
            </span>
          </label>
          <input
            id="signup-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            placeholder="+91 98765 43210"
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-[var(--home-text)] text-sm placeholder-[var(--home-text-muted)] focus:outline-none focus:border-[var(--home-accent)]"
          />
        </div>

        <div>
          <label
            htmlFor="signup-currency"
            className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
          >
            Default Currency
          </label>
          <CurrencySelect
            id="signup-currency"
            value={currency}
            onChange={(val) => setCurrency(val)}
            roundedClass="rounded-xl"
          />
        </div>

        <div>
          <label
            htmlFor="signup-password"
            className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
          >
            Password{" "}
            <span className="text-[11px] font-normal text-[var(--home-text-muted)]">
              (Min {MIN_PASSWORD_LENGTH} characters)
            </span>
          </label>
          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (formError) setFormError("");
              }}
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              placeholder="At least 12 characters"
              className="w-full px-4 py-2.5 pr-10 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-[var(--home-text)] text-sm placeholder-[var(--home-text-muted)] focus:outline-none focus:border-[var(--home-accent)]"
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
          <label
            htmlFor="signup-confirm-password"
            className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
          >
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="signup-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (formError) setFormError("");
              }}
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              placeholder="Repeat password"
              className="w-full px-4 py-2.5 pr-10 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-[var(--home-text)] text-sm placeholder-[var(--home-text-muted)] focus:outline-none focus:border-[var(--home-accent)]"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--home-text-muted)] hover:text-[var(--home-text)] cursor-pointer p-1"
              aria-label={
                showConfirmPassword ? "Hide confirm password" : "Show confirm password"
              }
            >
              {showConfirmPassword ? (
                <HiEyeSlash className="w-5 h-5" />
              ) : (
                <HiEye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-sm font-semibold hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer shadow-sm"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <div className="mt-4 pt-4 border-t border-[var(--home-border)] space-y-3 text-center">
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
          Already have an account?{" "}
          {onSwitchToSignIn ? (
            <button
              type="button"
              onClick={onSwitchToSignIn}
              className="font-semibold text-[var(--home-accent)] hover:underline cursor-pointer"
            >
              Sign in
            </button>
          ) : (
            <Link
              href="/sign-in"
              className="font-semibold text-[var(--home-accent)] hover:underline"
            >
              Sign in
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
        aria-label="Sign up modal"
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
        onClick={onClose}
      >
        <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md my-auto">
          {cardContent}
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[var(--home-background)]">
      {cardContent}
      <Link
        href="/"
        className="mt-5 text-xs font-semibold text-[var(--home-text-secondary)] hover:text-[var(--home-text)]"
      >
        ← Back to Home
      </Link>
    </div>
  );
}

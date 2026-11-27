"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  HiOutlineLockClosed,
  HiOutlineFingerPrint,
  HiOutlineBackspace,
} from "react-icons/hi2";
import useAuth from "@/hooks/useAuth";
import AppLoader from "@/components/shared/AppLoader";
import {
  getAppLockState,
  verifyPinAttempt,
  isPasskeySupported,
  verifyLocalPasskey,
} from "@/lib/webSecurity";

const IDLE_RELOCK_MS = 60 * 1000;

export default function AppLockGate({ children }) {
  const { userId } = useAuth();

  const [checking, setChecking] = useState(true);
  const [lockConfig, setLockConfig] = useState({
    enabled: false,
    passkeyEnabled: false,
    lockedUntil: null,
  });
  const [locked, setLocked] = useState(false);
  const [pinDigits, setPinDigits] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [passkeySupported, setPasskeySupported] = useState(false);

  const unlockedOwnerRef = useRef(null);
  const hiddenAtRef = useRef(null);

  const refreshLockState = useCallback(async () => {
    const state = await getAppLockState(userId);
    setLockConfig(state);
    setPasskeySupported(isPasskeySupported());

    if (!state.enabled) {
      setLocked(false);
      unlockedOwnerRef.current = null;
      setChecking(false);
      return;
    }

    const now = Date.now();
    if (state.lockedUntil && state.lockedUntil > now) {
      setLockoutSeconds(Math.ceil((state.lockedUntil - now) / 1000));
    } else {
      setLockoutSeconds(0);
    }

    const ownerTag = userId || "guest";
    if (unlockedOwnerRef.current !== ownerTag) {
      setLocked(true);
    }
    setChecking(false);
  }, [userId]);

  useEffect(() => {
    refreshLockState();

    const handleLockChanged = () => {
      unlockedOwnerRef.current = userId || "guest";
      refreshLockState();
    };
    const handleLockNow = () => {
      unlockedOwnerRef.current = null;
      setPinDigits("");
      setError("");
      setLocked(true);
    };

    window.addEventListener("spendscope:lock-changed", handleLockChanged);
    window.addEventListener("spendscope:lock-now", handleLockNow);
    return () => {
      window.removeEventListener("spendscope:lock-changed", handleLockChanged);
      window.removeEventListener("spendscope:lock-now", handleLockNow);
    };
  }, [refreshLockState, userId]);

  // Re-lock cleanly after background idle (> 60s)
  useEffect(() => {
    if (typeof document === "undefined" || !lockConfig.enabled) return undefined;

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
      } else if (document.visibilityState === "visible") {
        if (
          hiddenAtRef.current &&
          Date.now() - hiddenAtRef.current >= IDLE_RELOCK_MS
        ) {
          unlockedOwnerRef.current = null;
          setPinDigits("");
          setError("");
          setLocked(true);
        }
        hiddenAtRef.current = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [lockConfig.enabled]);

  // Lockout countdown tick (exact ceil seconds)
  useEffect(() => {
    if (lockoutSeconds <= 0) return undefined;
    const timer = setInterval(() => {
      setLockoutSeconds((s) => (s > 1 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const submitPin = useCallback(
    async (candidate) => {
      if (candidate.length !== 4 || verifying || lockoutSeconds > 0) return;
      setVerifying(true);
      setError("");
      try {
        const res = await verifyPinAttempt(userId, candidate);
        if (res.valid) {
          unlockedOwnerRef.current = userId || "guest";
          setPinDigits("");
          setLocked(false);
          setLockoutSeconds(0);
          return;
        }
        setPinDigits("");
        if (res.lockedRemainingSeconds > 0) {
          setLockoutSeconds(res.lockedRemainingSeconds);
          setError("Too many wrong attempts. Please wait before trying again.");
        } else {
          setError(
            `Incorrect PIN. ${res.attemptsLeft} attempt(s) left before 4-minute cooldown.`,
          );
        }
      } finally {
        setVerifying(false);
      }
    },
    [userId, verifying, lockoutSeconds],
  );

  const handleDigit = useCallback(
    (digit) => {
      if (verifying || lockoutSeconds > 0) return;
      setError("");
      setPinDigits((prev) => {
        if (prev.length >= 4) return prev;
        const next = `${prev}${digit}`;
        if (next.length === 4) {
          setTimeout(() => submitPin(next), 40);
        }
        return next;
      });
    },
    [verifying, lockoutSeconds, submitPin],
  );

  const handleBackspace = useCallback(() => {
    if (verifying || lockoutSeconds > 0) return;
    setPinDigits((prev) => prev.slice(0, -1));
  }, [verifying, lockoutSeconds]);

  useEffect(() => {
    if (!locked) return undefined;
    const onKeyDown = (e) => {
      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Escape") {
        setPinDigits("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [locked, handleDigit, handleBackspace]);

  const handlePasskeyUnlock = async () => {
    setError("");
    setVerifying(true);
    try {
      const ok = await verifyLocalPasskey(userId);
      if (ok) {
        unlockedOwnerRef.current = userId || "guest";
        setPinDigits("");
        setLockoutSeconds(0);
        setLocked(false);
      } else {
        setError("Passkey verification was cancelled.");
      }
    } catch (err) {
      setError(err?.message || "Passkey unlock failed. Use your 4-digit PIN.");
    } finally {
      setVerifying(false);
    }
  };

  if (checking) {
    return <AppLoader label="Checking device security" />;
  }

  if (locked) {
    const mins = Math.floor(lockoutSeconds / 60);
    const secs = lockoutSeconds % 60;
    const countdownLabel = `${mins}:${String(secs).padStart(2, "0")}`;

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="App Lock Screen"
        className="min-h-screen bg-[var(--home-background)] text-[var(--home-text)] flex items-center justify-center p-4"
      >
        <div className="w-full max-w-sm rounded-[28px] border border-[var(--home-border)] bg-[var(--home-card)] p-6 sm:p-8 shadow-2xl space-y-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--home-track)] text-[var(--home-accent)] flex items-center justify-center">
            <HiOutlineLockClosed className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h1 className="font-display text-2xl text-[var(--home-text)]">
              Enter Passcode
            </h1>
            <p className="text-xs text-[var(--home-text-secondary)]">
              Device-local privacy lock on this browser
            </p>
          </div>

          {/* 4-dot PIN indicator */}
          <div className="flex items-center justify-center gap-4 py-1">
            {[0, 1, 2, 3].map((idx) => {
              const filled = idx < pinDigits.length;
              return (
                <span
                  key={idx}
                  data-testid={`pin-dot-${idx}`}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    filled
                      ? "bg-[var(--home-accent)] border-[var(--home-accent)] scale-110"
                      : "border-[var(--home-border)] bg-transparent"
                  }`}
                />
              );
            })}
          </div>

          {lockoutSeconds > 0 ? (
            <div
              role="alert"
              className="p-3 rounded-2xl border border-[var(--home-destructive)]/40 bg-[var(--home-background)] text-xs font-semibold text-[var(--home-destructive)]"
            >
              Locked for{" "}
              <span className="font-mono-num">{countdownLabel}</span> (
              {Math.ceil(lockoutSeconds / 60)} min remaining)
            </div>
          ) : (
            error && (
              <p
                role="alert"
                className="text-xs font-semibold text-[var(--home-destructive)]"
              >
                {error}
              </p>
            )
          )}

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button
                key={d}
                type="button"
                disabled={lockoutSeconds > 0 || verifying}
                onClick={() => handleDigit(d)}
                className="h-14 rounded-2xl bg-[var(--home-background)] border border-[var(--home-border)] font-mono-num text-xl font-bold text-[var(--home-text)] hover:border-[var(--home-accent)] active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              disabled={lockoutSeconds > 0 || verifying}
              onClick={() => {
                setPinDigits("");
                setError("");
              }}
              className="h-14 rounded-2xl bg-[var(--home-track)] text-xs font-bold text-[var(--home-text-secondary)] hover:text-[var(--home-text)] disabled:opacity-40 cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={lockoutSeconds > 0 || verifying}
              onClick={() => handleDigit("0")}
              className="h-14 rounded-2xl bg-[var(--home-background)] border border-[var(--home-border)] font-mono-num text-xl font-bold text-[var(--home-text)] hover:border-[var(--home-accent)] active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              aria-label="Backspace"
              disabled={lockoutSeconds > 0 || verifying}
              onClick={handleBackspace}
              className="h-14 rounded-2xl bg-[var(--home-track)] text-[var(--home-text-secondary)] hover:text-[var(--home-text)] flex items-center justify-center disabled:opacity-40 cursor-pointer"
            >
              <HiOutlineBackspace className="w-5 h-5" />
            </button>
          </div>

          {lockConfig.passkeyEnabled && passkeySupported && (
            <button
              type="button"
              disabled={verifying}
              onClick={handlePasskeyUnlock}
              className="w-full py-3 rounded-2xl border border-[var(--home-border)] bg-[var(--home-background)] text-xs font-bold text-[var(--home-accent)] inline-flex items-center justify-center gap-2 hover:border-[var(--home-accent)] cursor-pointer"
            >
              <HiOutlineFingerPrint className="w-4 h-4" />
              <span>Unlock with Passkey</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return children;
}

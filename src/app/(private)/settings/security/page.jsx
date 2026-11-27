"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  HiOutlineLockClosed,
  HiOutlineShieldCheck,
  HiOutlineFingerPrint,
} from "react-icons/hi2";
import useAuth from "@/hooks/useAuth";
import useAccounts from "@/hooks/useAccounts";
import {
  getAppLockState,
  enablePinLock,
  disablePinLock,
  verifyPinAttempt,
  isPlatformAuthenticatorAvailable,
  registerLocalPasskey,
  disableLocalPasskey,
} from "@/lib/webSecurity";
import SettingsSubpageHeader from "@/components/settings/SettingsSubpageHeader";

export default function SecuritySettingsPage() {
  const { userId, displayName, email } = useAuth();
  const { activeAccount } = useAccounts();

  const [lockState, setLockState] = useState({
    enabled: false,
    passkeyEnabled: false,
  });
  const [passkeyCapable, setPasskeyCapable] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const [s, pk] = await Promise.all([
        getAppLockState(userId),
        isPlatformAuthenticatorAvailable(),
      ]);
      setLockState(s);
      setPasskeyCapable(pk);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const notifyLockChanged = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("spendscope:lock-changed"));
    }
  };

  const handleEnablePin = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!/^\d{4}$/.test(pin)) {
      setError("Passcode must be exactly 4 digits (e.g. 0000 or 1234).");
      return;
    }
    if (pin !== confirmPin) {
      setError("Passcodes do not match.");
      return;
    }

    setSaving(true);
    try {
      await enablePinLock(userId, pin);
      setPin("");
      setConfirmPin("");
      await loadState();
      notifyLockChanged();
      setNotice("Device-local 4-digit PIN saved on this browser.");
    } catch (err) {
      setError(err?.message || "Failed to save PIN.");
    } finally {
      setSaving(false);
    }
  };

  const handleDisablePin = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const check = await verifyPinAttempt(userId, currentPin);
      if (!check.valid) {
        if (check.lockedRemainingSeconds > 0) {
          const mins = Math.ceil(check.lockedRemainingSeconds / 60);
          setError(`Too many wrong attempts. Try again in ${mins} min.`);
        } else {
          setError(
            `Incorrect PIN. ${check.attemptsLeft} attempt(s) remaining before 4-minute lockout.`,
          );
        }
        return;
      }
      await disablePinLock(userId);
      setCurrentPin("");
      await loadState();
      notifyLockChanged();
      setNotice("Passcode lock disabled on this browser.");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePasskey = async () => {
    setError("");
    setNotice("");
    setSaving(true);
    try {
      if (lockState.passkeyEnabled) {
        await disableLocalPasskey(userId);
        await loadState();
        notifyLockChanged();
        setNotice("Passkey convenience unlock removed.");
      } else {
        await registerLocalPasskey(userId, email || displayName || "SpendScope");
        await loadState();
        notifyLockChanged();
        setNotice("Local Passkey registered on this browser.");
      }
    } catch (err) {
      setError(err?.message || "Passkey action failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleLockNow = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("spendscope:lock-now"));
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <SettingsSubpageHeader
        title="Security & App Lock"
        description="Device-local 4-digit passcode and optional passkey lock."
        activeAccount={activeAccount}
      />

      <div className="p-4 rounded-[22px] border border-[var(--home-border)] bg-[var(--home-card)] text-xs text-[var(--home-text-secondary)] leading-relaxed flex items-start gap-3">
        <HiOutlineShieldCheck className="w-5 h-5 text-[var(--home-accent)] shrink-0 mt-0.5" />
        <span>
          <strong>This browser only:</strong> Your PIN is hashed locally with PBKDF2-SHA256 inside this browser&apos;s IndexedDB and is never synced to the cloud. Five failed attempts trigger a 4-minute cooldown. This acts as a privacy lock (not cryptographic disk encryption).
        </span>
      </div>

      {notice && (
        <div className="p-3.5 rounded-2xl border border-[var(--home-income)]/40 bg-[var(--home-income-soft)] text-xs font-semibold text-[var(--home-income)]">
          {notice}
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl border border-[var(--home-destructive)]/40 bg-[var(--home-card)] text-xs font-semibold text-[var(--home-destructive)]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-32 rounded-[24px] bg-[var(--home-card)] border border-[var(--home-border)] animate-pulse" />
      ) : lockState.enabled ? (
        <div className="space-y-4">
          <form
            onSubmit={handleDisablePin}
            className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[var(--home-income-soft)] text-[var(--home-income)] flex items-center justify-center">
                  <HiOutlineLockClosed className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg text-[var(--home-text)]">
                    Passcode Lock is Active
                  </h2>
                  <p className="text-xs text-[var(--home-text-muted)]">
                    Enter your current 4-digit PIN to disable it.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLockNow}
                className="px-4 py-2 rounded-full bg-[var(--home-track)] text-xs font-bold text-[var(--home-text)] hover:border-[var(--home-accent)] border border-[var(--home-border)] cursor-pointer"
              >
                Lock App Now
              </button>
            </div>

            <div>
              <label
                htmlFor="current-pin-input"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
              >
                Current 4-Digit PIN
              </label>
              <input
                id="current-pin-input"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                required
                className="w-40 px-4 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] font-mono-num text-lg tracking-[0.5em] text-center focus:outline-none focus:border-[var(--home-accent)]"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-full border border-[var(--home-destructive)]/40 text-[var(--home-destructive)] text-xs font-semibold hover:bg-[var(--home-background)] cursor-pointer"
            >
              {saving ? "Verifying…" : "Disable Passcode Lock"}
            </button>
          </form>

          {/* Optional Device-Local Passkey Section */}
          <section className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 sm:p-6 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[var(--home-track)] text-[var(--home-accent)] flex items-center justify-center shrink-0">
                  <HiOutlineFingerPrint className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg text-[var(--home-text)]">
                    Passkey Unlock (Optional)
                  </h2>
                  <p className="text-xs text-[var(--home-text-secondary)] mt-0.5 leading-relaxed">
                    Use Touch ID, Face ID, or Windows Hello as a local user-presence check to unlock on this device. No server assertion is performed; your 4-digit PIN remains the primary fallback.
                  </p>
                </div>
              </div>
            </div>

            {passkeyCapable ? (
              <button
                type="button"
                disabled={saving}
                onClick={handleTogglePasskey}
                className={`px-5 py-2.5 rounded-full text-xs font-semibold cursor-pointer ${
                  lockState.passkeyEnabled
                    ? "border border-[var(--home-border)] bg-[var(--home-background)] text-[var(--home-text)]"
                    : "bg-[var(--home-accent)] text-[var(--home-on-accent)]"
                }`}
              >
                {lockState.passkeyEnabled
                  ? "Remove Local Passkey"
                  : "Enable Biometric / Passkey"}
              </button>
            ) : (
              <p className="text-[11px] font-medium text-[var(--home-text-muted)]">
                Platform passkey authenticator is unavailable on this browser/origin.
              </p>
            )}
          </section>
        </div>
      ) : (
        <form
          onSubmit={handleEnablePin}
          className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 sm:p-6 space-y-4"
        >
          <h2 className="font-display text-lg text-[var(--home-text)]">
            Set 4-Digit Passcode
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="new-pin-input"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
              >
                New 4-Digit PIN
              </label>
              <input
                id="new-pin-input"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] font-mono-num text-lg tracking-[0.5em] text-center focus:outline-none focus:border-[var(--home-accent)]"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-pin-input"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
              >
                Confirm PIN
              </label>
              <input
                id="confirm-pin-input"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirmPin}
                onChange={(e) =>
                  setConfirmPin(e.target.value.replace(/\D/g, ""))
                }
                placeholder="••••"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] font-mono-num text-lg tracking-[0.5em] text-center focus:outline-none focus:border-[var(--home-accent)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            {saving ? "Saving…" : "Enable 4-Digit PIN"}
          </button>
        </form>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { HiOutlineArrowRightOnRectangle, HiOutlineTrash } from "react-icons/hi2";
import useAuth from "@/hooks/useAuth";
import useAccounts from "@/hooks/useAccounts";
import { AVATAR_KEYS } from "@/lib/defaultSeeds";
import {
  MIN_PASSWORD_LENGTH,
  updateUserProfile,
  updateUserPassword,
} from "@/services/authService";
import AvatarBadge from "@/components/shared/AvatarBadge";
import CurrencySelect from "@/components/CurrencySelect";
import SettingsSubpageHeader from "@/components/settings/SettingsSubpageHeader";

export default function ProfileSettingsPage() {
  const {
    userId,
    isGuest,
    profile,
    displayName,
    email,
    phone,
    defaultCurrency,
    logout,
    fetchProfile,
  } = useAuth();
  const { activeAccount } = useAccounts();

  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [avatarKey, setAvatarKey] = useState("user_pf");
  const [currencyInput, setCurrencyInput] = useState("INR");
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setNameInput(displayName || "");
    setEmailInput(email || "");
    setPhoneInput(phone || "");
    setAvatarKey(profile?.avatar_key || "user_pf");
    setCurrencyInput(defaultCurrency || "INR");
  }, [displayName, email, phone, profile?.avatar_key, defaultCurrency]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!userId) return;
    setError("");
    setNotice("");
    setSavingProfile(true);
    try {
      await updateUserProfile({
        userId,
        displayName: nameInput,
        email: emailInput,
        phone: phoneInput,
        avatarKey,
        defaultCurrency: currencyInput,
      });
      await fetchProfile();
      setNotice("Profile updated.");
    } catch (err) {
      setError(err?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      await updateUserPassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setNotice("Password updated successfully.");
    } catch (err) {
      setError(err?.message || "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <SettingsSubpageHeader
        title="Profile & Sign Out"
        description="Manage display details, password, and device session."
        activeAccount={activeAccount}
      />

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

      {isGuest ? (
        <div className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-6 space-y-4">
          <h2 className="font-display text-xl text-[var(--home-text)]">
            Guest Session
          </h2>
          <p className="text-xs sm:text-sm text-[var(--home-text-secondary)]">
            Sign in or create an account to save a profile and enable SpendScope Cloud backup across devices.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/sign-in"
              className="px-6 py-2.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-6 py-2.5 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] text-xs font-semibold text-[var(--home-text)]"
            >
              Create Account
            </Link>
          </div>
        </div>
      ) : (
        <>
          <form
            onSubmit={handleSaveProfile}
            className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 sm:p-6 space-y-4"
          >
            <h2 className="font-display text-lg text-[var(--home-text)]">
              Account Details
            </h2>

            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1.5">
                Avatar
              </span>
              <div className="flex flex-wrap gap-2">
                {AVATAR_KEYS.map((key) => {
                  const selected = key === avatarKey;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAvatarKey(key)}
                      className={`rounded-full p-0.5 border-2 cursor-pointer transition-transform ${
                        selected
                          ? "border-[var(--home-accent)] scale-110"
                          : "border-transparent opacity-75 hover:opacity-100"
                      }`}
                    >
                      <AvatarBadge avatarKey={key} size={36} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="profile-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
                >
                  Display Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-sm focus:outline-none focus:border-[var(--home-accent)]"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-phone"
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
                >
                  Phone (Optional)
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-sm focus:outline-none focus:border-[var(--home-accent)]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
              >
                Email Address
              </label>
              <input
                id="profile-email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-sm focus:outline-none focus:border-[var(--home-accent)]"
              />
            </div>

            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1">
                Profile Default Currency
              </span>
              <CurrencySelect
                value={currencyInput}
                onChange={setCurrencyInput}
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-2.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {savingProfile ? "Saving…" : "Save Profile"}
            </button>
          </form>

          {/* Change Password */}
          <form
            onSubmit={handlePasswordChange}
            className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 sm:p-6 space-y-4"
          >
            <h2 className="font-display text-lg text-[var(--home-text)]">
              Change Password
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="profile-new-pw"
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
                >
                  New Password (min {MIN_PASSWORD_LENGTH} chars)
                </label>
                <input
                  id="profile-new-pw"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-sm focus:outline-none focus:border-[var(--home-accent)]"
                />
              </div>
              <div>
                <label
                  htmlFor="profile-confirm-pw"
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
                >
                  Confirm New Password
                </label>
                <input
                  id="profile-confirm-pw"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] text-sm focus:outline-none focus:border-[var(--home-accent)]"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="px-6 py-2.5 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] text-xs font-semibold hover:border-[var(--home-accent)] cursor-pointer disabled:opacity-50"
            >
              {savingPassword ? "Updating…" : "Update Password"}
            </button>
          </form>

          {/* Sign Out Options */}
          <section className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 sm:p-6 space-y-3">
            <h2 className="font-display text-lg text-[var(--home-text)]">
              Sign Out
            </h2>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => logout({ wipeLocal: false })}
                className="px-5 py-2.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
              >
                <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
                <span>Sign out (keep offline copy)</span>
              </button>
              <button
                type="button"
                onClick={() => logout({ wipeLocal: true })}
                className="px-5 py-2.5 rounded-full border border-[var(--home-destructive)]/40 text-[var(--home-destructive)] text-xs font-semibold inline-flex items-center gap-2 hover:bg-[var(--home-background)] cursor-pointer"
              >
                <HiOutlineTrash className="w-4 h-4" />
                <span>Sign out &amp; remove data from this device</span>
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

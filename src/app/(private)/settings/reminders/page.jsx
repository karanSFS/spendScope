"use client";

import React, { useState, useEffect } from "react";
import { HiOutlineBell, HiOutlineCalendarDays } from "react-icons/hi2";
import useAccounts from "@/hooks/useAccounts";
import { downloadReminderIcs } from "@/services/preferencesService";
import SettingsSubpageHeader from "@/components/settings/SettingsSubpageHeader";

const FREQUENCIES = ["Never", "Daily", "Weekly", "Monthly"];

export default function RemindersSettingsPage() {
  const { activeAccount, updateAccount } = useAccounts();
  const [frequency, setFrequency] = useState("Never");
  const [timeStr, setTimeStr] = useState("20:00");
  const [notifPerm, setNotifPerm] = useState("default");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPerm(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (activeAccount) {
      setFrequency(activeAccount.reminders || "Never");
      const h =
        activeAccount.reminder_hour != null ? activeAccount.reminder_hour : 20;
      const m =
        activeAccount.reminder_minute != null
          ? activeAccount.reminder_minute
          : 0;
      setTimeStr(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      );
    }
  }, [activeAccount]);

  const [hourVal, minVal] = timeStr.split(":").map((n) => Number(n) || 0);

  const handleSave = async () => {
    if (!activeAccount?.id) return;
    setSaving(true);
    setNotice("");
    try {
      await updateAccount(activeAccount.id, {
        reminders: frequency,
        reminder_hour: frequency === "Never" ? null : hourVal,
        reminder_minute: frequency === "Never" ? null : minVal,
      });
      setNotice("Reminder schedule updated.");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotice("Browser notifications are unavailable here. Download the .ics calendar file below instead.");
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === "granted") {
      new Notification("SpendScope Reminders Enabled", {
        body: "Open tabs will remind you on schedule. Use the .ics file for closed-tab calendar alerts.",
      });
      setNotice("Browser notifications enabled.");
    } else {
      setNotice("Notifications were not granted. Use the .ics calendar reminder below.");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <SettingsSubpageHeader
        title="Reminders"
        description="Stay consistent logging daily or weekly expenses."
        activeAccount={activeAccount}
      />

      {notice && (
        <div className="p-3.5 rounded-2xl border border-[var(--home-income)]/40 bg-[var(--home-income-soft)] text-xs font-semibold text-[var(--home-income)]">
          {notice}
        </div>
      )}

      {activeAccount?.reminder_hour != null &&
        activeAccount.reminder_hour <= 12 &&
        activeAccount.reminders !== "Never" && (
          <div className="p-3.5 rounded-2xl border border-[var(--home-border)] bg-[var(--home-card)] text-xs text-[var(--home-text-secondary)]">
            If this reminder synced from Android, confirm the 24-hour time below and save once to store exact AM/PM hours on web.
          </div>
        )}

      <section className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 sm:p-6 space-y-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] block mb-2">
            Reminder Frequency
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FREQUENCIES.map((freq) => {
              const active = frequency === freq;
              return (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setFrequency(freq)}
                  className={`py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                    active
                      ? "bg-[var(--home-accent)] text-[var(--home-on-accent)] border-[var(--home-accent)]"
                      : "bg-[var(--home-background)] text-[var(--home-text-secondary)] border-[var(--home-border)]"
                  }`}
                >
                  {freq}
                </button>
              );
            })}
          </div>
        </div>

        {frequency !== "Never" && (
          <div>
            <label
              htmlFor="reminder-time"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1.5"
            >
              Preferred Time
            </label>
            <input
              id="reminder-time"
              type="time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-background)] font-mono-num text-sm focus:outline-none focus:border-[var(--home-accent)]"
            />
          </div>
        )}

        <button
          type="button"
          disabled={saving || !activeAccount}
          onClick={handleSave}
          className="px-6 py-2.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold cursor-pointer disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Schedule"}
        </button>
      </section>

      {/* Calendar .ics & Browser Notification fallback */}
      <section className="rounded-[24px] border border-[var(--home-border)] bg-[var(--home-card)] p-5 sm:p-6 space-y-4">
        <h2 className="font-display text-lg text-[var(--home-text)]">
          Reliable Calendar &amp; Tab Alerts
        </h2>
        <p className="text-xs text-[var(--home-text-secondary)] leading-relaxed">
          Web browsers cannot wake a closed tab at exact alarm times. Download the recurring calendar event for reliable OS alerts, and optionally enable open-tab browser notifications.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              downloadReminderIcs({
                frequency: frequency === "Never" ? "Daily" : frequency,
                hour: hourVal,
                minute: minVal,
                accountName: activeAccount?.name || "SpendScope",
              })
            }
            className="h-10 px-5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <HiOutlineCalendarDays className="w-4 h-4" />
            <span>Download .ics Calendar Reminder</span>
          </button>

          <button
            type="button"
            onClick={handleRequestNotifications}
            className="h-10 px-5 rounded-full border border-[var(--home-border)] bg-[var(--home-background)] text-xs font-semibold inline-flex items-center gap-2 hover:border-[var(--home-accent)] cursor-pointer"
          >
            <HiOutlineBell className="w-4 h-4" />
            <span>
              {notifPerm === "granted"
                ? "Notifications Active"
                : "Enable Browser Notifications"}
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}

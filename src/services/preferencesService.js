import { supabase, isSupabaseConfigured } from "@/lib/supabaseconfig";
import { getPreference, setPreference } from "@/lib/localDb";
import { pushOutbox } from "@/lib/syncEngine";

export async function getAppearancePreference(ownerId = null) {
  return await getPreference(ownerId, "appearance");
}

export async function saveAppearancePreference(
  ownerId = null,
  { appearanceMode = "light", accentColor = null } = {},
) {
  const payload = {
    owner_id: ownerId || null,
    appearance_mode: appearanceMode === "dark" ? "dark" : "light",
    accent_color: accentColor || null,
    updated_at: new Date().toISOString(),
  };

  await setPreference(ownerId, "appearance", payload, {
    enqueueSync: Boolean(ownerId),
  });

  if (ownerId && isSupabaseConfigured && supabase) {
    pushOutbox(ownerId, supabase).catch(() => {});
  }
  return payload;
}

/**
 * Generates an RFC-5545 recurring calendar event (.ics) for daily/weekly/monthly
 * transaction logging reminders so closed browser tabs still remind users cleanly.
 */
export function buildReminderIcs({
  frequency = "Daily",
  hour = 20,
  minute = 0,
  accountName = "SpendScope",
} = {}) {
  const cleanFreq = String(frequency || "Daily").toUpperCase();
  const rrule =
    cleanFreq === "WEEKLY"
      ? "FREQ=WEEKLY"
      : cleanFreq === "MONTHLY"
        ? "FREQ=MONTHLY"
        : "FREQ=DAILY";

  const now = new Date();
  const pad2 = (n) => String(n).padStart(2, "0");
  const dtStart = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}T${pad2(hour)}${pad2(minute)}00`;
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SpendScope//Reminder//EN",
    "BEGIN:VEVENT",
    `UID:spendscope-reminder-${Date.now()}@spendscope.app`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtStart}`,
    `RRULE:${rrule}`,
    `SUMMARY:Log today's expenses in ${accountName}`,
    "DESCRIPTION:Quick check-in to record today's spending and income in SpendScope.",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadReminderIcs(options = {}) {
  if (typeof window === "undefined") return;
  const content = buildReminderIcs(options);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "spendscope-reminder.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

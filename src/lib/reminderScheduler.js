import { getPreference, setPreference } from "@/lib/localDb";

const REMINDER_META_KEY = "reminder_meta";

function getIsoWeekKey(date) {
  const tmp = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function getReminderPeriodKey(frequency, date = new Date()) {
  const pad2 = (n) => String(n).padStart(2, "0");
  const clean = String(frequency || "Never").toLowerCase();
  if (clean === "daily") {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }
  if (clean === "weekly") {
    return getIsoWeekKey(date);
  }
  if (clean === "monthly") {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
  }
  return null;
}

export function isReminderDue({
  frequency = "Never",
  hour = 20,
  minute = 0,
  lastFiredKey = null,
  now = new Date(),
} = {}) {
  const clean = String(frequency || "Never").toLowerCase();
  if (clean === "never") return { due: false, periodKey: null };

  const periodKey = getReminderPeriodKey(clean, now);
  if (!periodKey || lastFiredKey === periodKey) {
    return { due: false, periodKey };
  }

  const schedHour = Number.isFinite(Number(hour)) ? Number(hour) : 20;
  const schedMin = Number.isFinite(Number(minute)) ? Number(minute) : 0;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const scheduledMinutes = schedHour * 60 + schedMin;

  // Catch up on missed reminder once scheduled time passes inside the period
  if (clean === "monthly" && now.getDate() > 1) {
    return { due: true, periodKey };
  }
  if (nowMinutes >= scheduledMinutes) {
    return { due: true, periodKey };
  }
  return { due: false, periodKey };
}

export async function checkAndTriggerAccountReminder(ownerId, activeAccount) {
  if (!activeAccount || !activeAccount.reminders || activeAccount.reminders === "Never") {
    return { triggered: false };
  }

  const metaKey = `${REMINDER_META_KEY}_${activeAccount.id}`;
  const meta = (await getPreference(ownerId, metaKey)) || {};
  const { due, periodKey } = isReminderDue({
    frequency: activeAccount.reminders,
    hour: activeAccount.reminder_hour,
    minute: activeAccount.reminder_minute,
    lastFiredKey: meta.lastFiredKey || null,
  });

  if (!due || !periodKey) {
    return { triggered: false };
  }

  await setPreference(
    ownerId,
    metaKey,
    {
      lastFiredKey: periodKey,
      firedAt: new Date().toISOString(),
    },
    { enqueueSync: false },
  );

  const message = `Time to log your ${activeAccount.reminders.toLowerCase()} expenses for ${activeAccount.name}.`;

  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    try {
      new Notification("SpendScope Reminder", {
        body: message,
        tag: `spendscope-reminder-${periodKey}`,
      });
    } catch {
      // Ignore browser notification failure
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("spendscope:reminder-due", {
        detail: {
          accountId: activeAccount.id,
          accountName: activeAccount.name,
          frequency: activeAccount.reminders,
          message,
          periodKey,
        },
      }),
    );
  }

  return { triggered: true, periodKey, message };
}

/**
 * Calendar-date <-> UTC midnight conversion utilities.
 *
 * Matches spend_scope_android's FinancialSyncWorker.kt convention:
 * transactions store occurred_at as device-local midnight converted to UTC ISO,
 * and are grouped by converting occurred_at back to the user's local calendar date.
 */

const pad2 = (n) => String(n).padStart(2, "0");

/**
 * Parses a YYYY-MM-DD string or Date into a local calendar Date at 00:00:00.000.
 */
export function parseLocalDate(dateInput) {
  if (!dateInput) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }
  if (dateInput instanceof Date) {
    return new Date(
      dateInput.getFullYear(),
      dateInput.getMonth(),
      dateInput.getDate(),
      0,
      0,
      0,
      0,
    );
  }
  const str = String(dateInput).trim();
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (ymd) {
    return new Date(
      Number(ymd[1]),
      Number(ymd[2]) - 1,
      Number(ymd[3]),
      0,
      0,
      0,
      0,
    );
  }
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }
  return new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
    0,
    0,
    0,
    0,
  );
}

/**
 * Converts a local calendar date (YYYY-MM-DD or Date) into UTC ISO string
 * representing local midnight (matching Android's SimpleDateFormat -> UTC).
 */
export function toLocalMidnightIso(dateInput) {
  return parseLocalDate(dateInput).toISOString();
}

/**
 * Converts a stored occurred_at ISO string into local calendar YYYY-MM-DD.
 */
export function fromIsoToLocalDateKey(isoString) {
  const d = parseLocalDate(isoString);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Converts a local calendar Date to YYYY-MM-DD.
 */
export function toLocalDateKey(date) {
  const d = parseLocalDate(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Returns local [startDate, endDate] inclusive bounds for a given period + anchor date.
 */
export function getPeriodBounds(period, anchorDate = new Date()) {
  const base = parseLocalDate(anchorDate);
  const year = base.getFullYear();
  const month = base.getMonth();
  const day = base.getDate();

  switch (period) {
    case "Daily": {
      const start = new Date(year, month, day, 0, 0, 0, 0);
      const end = new Date(year, month, day, 23, 59, 59, 999);
      return { start, end };
    }
    case "Weekly": {
      // 7-day rolling window ending on anchor or calendar Sunday-Saturday?
      // Android uses 7-day window aligned around anchor: let's match standard week (Mon-Sun) or Sun-Sat cleanly.
      const dow = base.getDay(); // 0 = Sun
      const start = new Date(year, month, day - dow, 0, 0, 0, 0);
      const end = new Date(year, month, day - dow + 6, 23, 59, 59, 999);
      return { start, end };
    }
    case "Yearly": {
      const start = new Date(year, 0, 1, 0, 0, 0, 0);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      return { start, end };
    }
    case "Monthly":
    default: {
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
  }
}

export function isOccurredAtInRange(occurredAtIso, startDate, endDate) {
  const localDay = parseLocalDate(occurredAtIso).getTime();
  const startMs = parseLocalDate(startDate).getTime();
  const endMs = parseLocalDate(endDate).getTime();
  return localDay >= startMs && localDay <= endMs;
}

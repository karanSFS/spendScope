import { describe, it, expect } from "vitest";
import {
  parseLocalDate,
  toLocalMidnightIso,
  fromIsoToLocalDateKey,
  toLocalDateKey,
  getPeriodBounds,
  isOccurredAtInRange,
} from "@/lib/dateUtils";

describe("dateUtils", () => {
  it("parses YYYY-MM-DD as local midnight and round-trips cleanly", () => {
    const d = parseLocalDate("2026-11-26");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(10);
    expect(d.getDate()).toBe(26);
    expect(d.getHours()).toBe(0);

    const iso = toLocalMidnightIso("2026-11-26");
    expect(fromIsoToLocalDateKey(iso)).toBe("2026-11-26");
    expect(toLocalDateKey(d)).toBe("2026-11-26");
  });

  it("computes Daily, Weekly, Monthly, and Yearly bounds accurately", () => {
    const anchor = "2026-11-26"; // Thursday
    const daily = getPeriodBounds("Daily", anchor);
    expect(toLocalDateKey(daily.start)).toBe("2026-11-26");
    expect(toLocalDateKey(daily.end)).toBe("2026-11-26");

    const weekly = getPeriodBounds("Weekly", anchor);
    expect(toLocalDateKey(weekly.start)).toBe("2026-11-22"); // Sunday
    expect(toLocalDateKey(weekly.end)).toBe("2026-11-28"); // Saturday

    const monthly = getPeriodBounds("Monthly", anchor);
    expect(toLocalDateKey(monthly.start)).toBe("2026-11-01");
    expect(toLocalDateKey(monthly.end)).toBe("2026-11-30");

    const yearly = getPeriodBounds("Yearly", anchor);
    expect(toLocalDateKey(yearly.start)).toBe("2026-01-01");
    expect(toLocalDateKey(yearly.end)).toBe("2026-12-31");
  });

  it("checks occurredAtIso range inclusivity in local calendar dates", () => {
    const iso = toLocalMidnightIso("2026-11-26");
    expect(isOccurredAtInRange(iso, "2026-11-01", "2026-11-30")).toBe(true);
    expect(isOccurredAtInRange(iso, "2026-11-26", "2026-11-26")).toBe(true);
    expect(isOccurredAtInRange(iso, "2026-12-01", "2026-12-31")).toBe(false);
  });
});

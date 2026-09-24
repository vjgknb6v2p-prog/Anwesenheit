import { toZonedTime } from "date-fns-tz";
import { describe, expect, it } from "vitest";
import { APP_TIMEZONE } from "./quick-return-times";
import { getWeekRange } from "./week";

function isoWeekdayInBerlin(date: Date): number {
  const zoned = toZonedTime(date, APP_TIMEZONE);
  return ((zoned.getUTCDay() + 6) % 7) + 1; // Montag=1 … Sonntag=7
}

describe("getWeekRange", () => {
  it("liefert Montag 00:00 bis folgenden Montag 00:00 (Europe/Berlin)", () => {
    // 2026-03-18 ist ein Mittwoch.
    const { from, to } = getWeekRange(new Date("2026-03-18T10:00:00Z"));
    expect(isoWeekdayInBerlin(from)).toBe(1);
    expect(isoWeekdayInBerlin(to)).toBe(1);
    expect(to.getTime() - from.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("liegt der Referenztag zwischen from (inklusive) und to (exklusiv)", () => {
    const reference = new Date("2026-03-18T10:00:00Z");
    const { from, to } = getWeekRange(reference);
    expect(from.getTime()).toBeLessThanOrEqual(reference.getTime());
    expect(to.getTime()).toBeGreaterThan(reference.getTime());
  });

  it("weekOffset verschiebt um ganze Wochen", () => {
    const current = getWeekRange(new Date("2026-03-18T10:00:00Z"), 0);
    const previous = getWeekRange(new Date("2026-03-18T10:00:00Z"), -1);
    const next = getWeekRange(new Date("2026-03-18T10:00:00Z"), 1);

    expect(current.from.getTime() - previous.from.getTime()).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
    expect(next.from.getTime() - current.from.getTime()).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
  });

  it("ein Montag als Referenztag ist bereits from der eigenen Woche", () => {
    // 2026-03-16 ist ein Montag.
    const reference = new Date("2026-03-16T05:00:00Z");
    const { from } = getWeekRange(reference);
    expect(isoWeekdayInBerlin(from)).toBe(1);
    // Derselbe Kalendertag in Europe/Berlin.
    const fromZoned = toZonedTime(from, APP_TIMEZONE);
    const referenceZoned = toZonedTime(reference, APP_TIMEZONE);
    expect(fromZoned.getUTCFullYear()).toBe(referenceZoned.getUTCFullYear());
    expect(fromZoned.getUTCMonth()).toBe(referenceZoned.getUTCMonth());
    expect(fromZoned.getUTCDate()).toBe(referenceZoned.getUTCDate());
  });
});

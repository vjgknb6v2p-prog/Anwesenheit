import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { APP_TIMEZONE } from "./quick-return-times";

export interface WeekRange {
  /** Montag 00:00 (inklusive), Europe/Berlin, als UTC-Zeitpunkt. */
  from: Date;
  /** Folgender Montag 00:00 (exklusiv), Europe/Berlin, als UTC-Zeitpunkt. */
  to: Date;
}

/**
 * Erweiterung "Wochenbericht-PDF-Export": Montag-bis-Sonntag-Wochengrenzen
 * der ISO-Woche, die `referenceDate` in Europe/Berlin enthält, verschoben um
 * `weekOffset` ganze Wochen (negativ = vorherige, positiv = folgende
 * Wochen). Dieselbe Montag-Start-Konvention wie `periodStart()` in
 * `src/domain/stats.ts` (Wochen-Granularität).
 */
export function getWeekRange(referenceDate: Date, weekOffset = 0): WeekRange {
  const zoned = toZonedTime(referenceDate, APP_TIMEZONE);
  const isoWeekday = ((zoned.getUTCDay() + 6) % 7) + 1; // Montag=1 … Sonntag=7
  zoned.setUTCDate(zoned.getUTCDate() - (isoWeekday - 1) + weekOffset * 7);
  zoned.setUTCHours(0, 0, 0, 0);
  const from = fromZonedTime(zoned, APP_TIMEZONE);

  const zonedEnd = new Date(zoned);
  zonedEnd.setUTCDate(zonedEnd.getUTCDate() + 7);
  const to = fromZonedTime(zonedEnd, APP_TIMEZONE);

  return { from, to };
}

import { formatInTimeZone } from "date-fns-tz";
import { APP_TIMEZONE } from "@/domain/quick-return-times";

/** "21:30" */
export function formatTime(date: Date): string {
  return formatInTimeZone(date, APP_TIMEZONE, "HH:mm");
}

/** "15.01.2026" */
export function formatDate(date: Date): string {
  return formatInTimeZone(date, APP_TIMEZONE, "dd.MM.yyyy");
}

/** "15.01.2026, 21:30" */
export function formatDateTime(date: Date): string {
  return formatInTimeZone(date, APP_TIMEZONE, "dd.MM.yyyy, HH:mm");
}

/** Wert für ein `<input type="datetime-local">`, z. B. "2026-01-15T21:30". */
export function toDateTimeLocalValue(date: Date): string {
  return formatInTimeZone(date, APP_TIMEZONE, "yyyy-MM-dd'T'HH:mm");
}

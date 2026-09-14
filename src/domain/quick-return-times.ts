import { fromZonedTime, toZonedTime } from "date-fns-tz";

/**
 * PROMPT.md Abschnitt 7: Quick-Chips für die geplante Rückkehr beim
 * Auschecken ("+2 h", "+4 h", "Heute 21:30", "Sonntag 18:00"). Der
 * "Heute …"-Chip leitet sich aus dem Setting `curfewTime` ab (Default
 * "22:00" → 21:30, exakt das im Auftrag genannte Beispiel) statt eines
 * hartkodierten Werts.
 *
 * Alle Zeitangaben sind Europe/Berlin-Wanduhrzeiten (Abschnitt 2: DB speichert
 * UTC, Anzeige/Eingabe in Europe/Berlin). Diese Funktion ist rein (gegebenes
 * `now` → deterministisches Ergebnis) und nutzt ausschließlich UTC-Getter/
 * -Setter auf dem von `toZonedTime` verschobenen Datum, damit das Ergebnis
 * unabhängig von der Systemzeitzone des ausführenden Prozesses ist.
 */
export const APP_TIMEZONE = "Europe/Berlin";

export interface QuickReturnOption {
  label: string;
  value: Date;
}

function atLocalTime(
  reference: Date,
  hours: number,
  minutes: number,
  dayOffset: number,
): Date {
  const zoned = toZonedTime(reference, APP_TIMEZONE);
  zoned.setUTCDate(zoned.getUTCDate() + dayOffset);
  zoned.setUTCHours(hours, minutes, 0, 0);
  return fromZonedTime(zoned, APP_TIMEZONE);
}

function formatLocalTime(date: Date): string {
  const zoned = toZonedTime(date, APP_TIMEZONE);
  const hh = zoned.getUTCHours().toString().padStart(2, "0");
  const mm = zoned.getUTCMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function parseCurfew(curfewTime: string): { hours: number; minutes: number } {
  const [hoursRaw, minutesRaw] = curfewTime.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return { hours: 22, minutes: 0 }; // Fallback auf den Setting-Default
  }
  return { hours, minutes };
}

function subtractMinutes(
  hours: number,
  minutes: number,
  offsetMinutes: number,
) {
  const MINUTES_PER_DAY = 24 * 60;
  const total =
    (((hours * 60 + minutes - offsetMinutes) % MINUTES_PER_DAY) +
      MINUTES_PER_DAY) %
    MINUTES_PER_DAY;
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

function nextSunday18Uhr(now: Date): Date {
  const zonedNow = toZonedTime(now, APP_TIMEZONE);
  const daysUntilSunday = (7 - zonedNow.getUTCDay()) % 7;
  let candidate = atLocalTime(now, 18, 0, daysUntilSunday);
  if (candidate.getTime() <= now.getTime()) {
    candidate = atLocalTime(now, 18, 0, daysUntilSunday + 7);
  }
  return candidate;
}

export function getQuickReturnOptions(
  now: Date,
  curfewTime: string,
): QuickReturnOption[] {
  const options: QuickReturnOption[] = [
    { label: "+2 h", value: new Date(now.getTime() + 2 * 60 * 60 * 1000) },
    { label: "+4 h", value: new Date(now.getTime() + 4 * 60 * 60 * 1000) },
  ];

  const curfew = parseCurfew(curfewTime);
  const suggested = subtractMinutes(curfew.hours, curfew.minutes, 30);
  let curfewOption = atLocalTime(now, suggested.hours, suggested.minutes, 0);
  let dayLabel = "Heute";
  if (curfewOption.getTime() <= now.getTime()) {
    curfewOption = atLocalTime(now, suggested.hours, suggested.minutes, 1);
    dayLabel = "Morgen";
  }
  options.push({
    label: `${dayLabel} ${formatLocalTime(curfewOption)}`,
    value: curfewOption,
  });

  const sunday = nextSunday18Uhr(now);
  options.push({ label: `Sonntag ${formatLocalTime(sunday)}`, value: sunday });

  return options;
}

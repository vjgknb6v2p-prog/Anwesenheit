import { toZonedTime } from "date-fns-tz";
import { APP_TIMEZONE } from "./quick-return-times";

export interface CalendarAbsenceInput {
  userId: string;
  userName: string;
  reason: string;
  destination: string;
  checkedOutAt: Date;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
}

export interface CalendarDay {
  /** Kalendertag 1–31 (nicht der Wochentag). */
  dayOfMonth: number;
  entries: CalendarAbsenceInput[];
}

/**
 * Gruppiert Abwesenheiten eines Monats nach Kalendertag (Anker:
 * `checkedOutAt`, in `Europe/Berlin` — dieselbe Vereinfachung wie
 * `groupAbsencesByPeriod` in `src/domain/stats.ts`: eine mehrtägige
 * Abwesenheit erscheint nur am Ausgangstag, nicht an jedem überspannten
 * Tag). Stornierte Abwesenheiten fließen nicht ein (Designentscheidung wie
 * bei den Statistiken, siehe docs/decisions.md). Liefert immer genau
 * `daysInMonth` Einträge, auch für Tage ohne Abwesenheit (leere `entries`).
 */
export function buildAbsenceCalendar(
  absences: readonly CalendarAbsenceInput[],
  year: number,
  month: number, // 1–12
): CalendarDay[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: CalendarDay[] = Array.from({ length: daysInMonth }, (_, i) => ({
    dayOfMonth: i + 1,
    entries: [],
  }));

  for (const absence of absences) {
    if (absence.status === "CANCELLED") {
      continue;
    }
    const zoned = toZonedTime(absence.checkedOutAt, APP_TIMEZONE);
    if (zoned.getFullYear() !== year || zoned.getMonth() + 1 !== month) {
      continue;
    }
    days[zoned.getDate() - 1]?.entries.push(absence);
  }

  return days;
}

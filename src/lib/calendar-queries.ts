import { fromZonedTime } from "date-fns-tz";
import { buildAbsenceCalendar, type CalendarDay } from "@/domain/calendar";
import { APP_TIMEZONE } from "@/domain/quick-return-times";
import { db } from "@/lib/db";

/**
 * Lädt und gruppiert alle Abwesenheiten eines Kalendermonats (Erweiterung
 * "Kalender-Ansicht"). `residentialAreaId` grenzt wie bei den Statistiken
 * auf den Wohnbereich eines Mitarbeiters ein — `undefined` (Admin) liefert
 * alle Wohnbereiche.
 */
export async function getAbsenceCalendarForMonth(
  year: number,
  month: number, // 1–12
  residentialAreaId?: string,
): Promise<CalendarDay[]> {
  // Monatsgrenzen in Europe/Berlin, für die DB-Abfrage nach UTC konvertiert
  // (Abschnitt-Konvention: DB ausschließlich UTC).
  const monthStartLocal = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const monthEndLocal = new Date(year, month, 1, 0, 0, 0, 0);
  const from = fromZonedTime(monthStartLocal, APP_TIMEZONE);
  const to = fromZonedTime(monthEndLocal, APP_TIMEZONE);

  const absences = await db.absence.findMany({
    where: {
      checkedOutAt: { gte: from, lt: to },
      ...(residentialAreaId ? { user: { residentialAreaId } } : {}),
    },
    select: {
      userId: true,
      reason: true,
      destination: true,
      checkedOutAt: true,
      status: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });

  return buildAbsenceCalendar(
    absences.map((absence) => ({
      userId: absence.userId,
      userName: `${absence.user.firstName} ${absence.user.lastName}`,
      reason: absence.reason,
      destination: absence.destination,
      checkedOutAt: absence.checkedOutAt,
      status: absence.status,
    })),
    year,
    month,
  );
}

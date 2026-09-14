import type { AbsenceReason } from "@/domain/absence-reason";
import {
  buildStatsSummary,
  type AbsenceStatsInput,
  type StatsGranularity,
  type StatsSummary,
} from "@/domain/stats";
import { db } from "@/lib/db";

const DEFAULT_RANGE_DAYS = 30;

export interface StatsQuery {
  from: Date;
  to: Date;
  granularity: StatsGranularity;
  /** `null`/`undefined` = kein Filter (nur für Admin relevant). */
  residentialAreaId?: string | null;
}

/**
 * Default-Zeitraum, wenn kein expliziter Filter gesetzt ist: die letzten
 * 30 Tage bis einschließlich heute (Designentscheidung, siehe
 * docs/decisions.md) — lang genug, um bei den ~60 Seed-Abwesenheiten
 * (verteilt über 90 Tage) sofort etwas anzuzeigen, ohne die Seite standardmäßig
 * mit der kompletten Historie zu laden.
 */
export function defaultStatsRange(now = new Date()): { from: Date; to: Date } {
  const to = new Date(now);
  const from = new Date(now);
  from.setDate(from.getDate() - DEFAULT_RANGE_DAYS);
  return { from, to };
}

/**
 * Lädt Abwesenheiten im angegebenen Zeitraum (über `checkedOutAt`, optional
 * auf einen Wohnbereich eingeschränkt — Rechte-Matrix: Mitarbeiter sehen
 * Statistiken nur für den eigenen Wohnbereich) und aggregiert sie über
 * `buildStatsSummary()`. Eine Quelle der Wahrheit für Seiten **und**
 * CSV-Export.
 */
export async function getStatsSummary({
  from,
  to,
  granularity,
  residentialAreaId,
}: StatsQuery): Promise<StatsSummary> {
  const absences = await db.absence.findMany({
    where: {
      checkedOutAt: { gte: from, lte: to },
      ...(residentialAreaId ? { user: { residentialAreaId } } : {}),
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: { checkedOutAt: "asc" },
  });

  const inputs: AbsenceStatsInput[] = absences.map((absence) => ({
    userId: absence.userId,
    userName: `${absence.user.firstName} ${absence.user.lastName}`,
    reason: absence.reason as AbsenceReason,
    checkedOutAt: absence.checkedOutAt,
    plannedReturnAt: absence.plannedReturnAt,
    checkedInAt: absence.checkedInAt,
    status: absence.status,
  }));

  return buildStatsSummary(inputs, granularity);
}

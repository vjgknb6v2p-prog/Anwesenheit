import { fromZonedTime } from "date-fns-tz";
import type { StatsGranularity } from "@/domain/stats";
import { APP_TIMEZONE } from "@/domain/quick-return-times";
import { defaultStatsRange } from "@/lib/stats-queries";
import { toDateInputValue } from "@/lib/time";

const GRANULARITIES: readonly StatsGranularity[] = ["day", "week", "month"];

/** Sentinel-Wert des Wohnbereichs-Filters für "kein Filter" (nur Admin-Seite). */
export const RESIDENTIAL_AREA_ALL = "ALLE";

export interface StatsPageParams {
  from: Date;
  to: Date;
  granularity: StatsGranularity;
}

/**
 * `value` ist ein "yyyy-MM-dd"-String aus einem `<input type="date">` — vom
 * Nutzer als Europe/Berlin-Kalendertag gedacht (wie jede andere angezeigte
 * Zeit, siehe `src/lib/time.ts`), nicht als UTC-Datum.
 */
function parseLocalDateParam(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const [, year, month, day] = match.map(Number) as [
    never,
    number,
    number,
    number,
  ];
  const naiveLocalMidnight = new Date(Date.UTC(year, month - 1, day));
  return fromZonedTime(naiveLocalMidnight, APP_TIMEZONE);
}

/**
 * Parst Zeitraumfilter (`/admin/statistiken`, `/staff/statistiken`) aus
 * `searchParams` mit sinnvollem Default (letzte 30 Tage, siehe
 * `defaultStatsRange`). `to` wird auf das Ende des gewählten Tages gesetzt,
 * damit die Absence des gewählten Endtags selbst mitgezählt wird.
 */
export function parseStatsPageParams(searchParams: {
  from?: string;
  to?: string;
  granularity?: string;
}): StatsPageParams {
  const defaults = defaultStatsRange();
  const from = parseLocalDateParam(searchParams.from) ?? defaults.from;
  const toStart = parseLocalDateParam(searchParams.to) ?? defaults.to;
  const to = new Date(toStart.getTime() + 24 * 60 * 60 * 1000 - 1);

  const granularity = GRANULARITIES.includes(
    searchParams.granularity as StatsGranularity,
  )
    ? (searchParams.granularity as StatsGranularity)
    : "day";

  return { from, to, granularity };
}

/**
 * Baut die Query-Parameter für den CSV-Export-Link aus den *effektiven*
 * (ggf. bereits per Default aufgefüllten) Filterwerten, damit Export und
 * angezeigte Statistik immer exakt denselben Zeitraum/Filter abdecken.
 */
export function buildStatsExportQuery({
  from,
  to,
  granularity,
  residentialAreaId,
}: StatsPageParams & { residentialAreaId?: string }): URLSearchParams {
  const query = new URLSearchParams({
    from: toDateInputValue(from),
    to: toDateInputValue(to),
    granularity,
  });
  if (residentialAreaId) {
    query.set("residentialAreaId", residentialAreaId);
  }
  return query;
}

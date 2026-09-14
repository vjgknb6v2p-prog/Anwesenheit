import type { StudentStatus } from "./status";

/**
 * Reine Sortier-/Filterlogik für die Admin-Live-Übersicht (PROMPT.md
 * Abschnitt 7). Bewusst getrennt von `src/lib/admin-queries.ts` (I/O), damit
 * sie ohne DB unit-testbar ist — Frontend (Client-Filter auf dem SSE-
 * Snapshot) und ein möglicher zukünftiger Server-seitiger Einsatz nutzen
 * dieselbe Funktion.
 */
export interface LiveOverviewRowLike {
  name: string;
  schoolClass: string | null;
  residentialAreaName: string | null;
  status: StudentStatus;
  checkedOutAt: string | null;
  plannedReturnAt: string | null;
}

export type LiveOverviewSortKey =
  "name" | "status" | "checkedOutAt" | "plannedReturnAt" | "duration";

export type SortDirection = "asc" | "desc";

export const ALL_FILTER = "ALLE";

export interface LiveOverviewFilters {
  status?: StudentStatus | typeof ALL_FILTER;
  residentialAreaName?: string | typeof ALL_FILTER;
  schoolClass?: string | typeof ALL_FILTER;
  query?: string;
}

const STATUS_ORDER: Record<StudentStatus, number> = {
  UEBERFAELLIG: 0,
  ABWESEND: 1,
  ANWESEND: 2,
};

export function filterLiveOverviewRows<T extends LiveOverviewRowLike>(
  rows: T[],
  filters: LiveOverviewFilters,
): T[] {
  const query = filters.query?.trim().toLowerCase();

  return rows.filter((row) => {
    if (
      filters.status &&
      filters.status !== ALL_FILTER &&
      row.status !== filters.status
    ) {
      return false;
    }
    if (
      filters.residentialAreaName &&
      filters.residentialAreaName !== ALL_FILTER &&
      row.residentialAreaName !== filters.residentialAreaName
    ) {
      return false;
    }
    if (
      filters.schoolClass &&
      filters.schoolClass !== ALL_FILTER &&
      row.schoolClass !== filters.schoolClass
    ) {
      return false;
    }
    if (query && !row.name.toLowerCase().includes(query)) {
      return false;
    }
    return true;
  });
}

/** `null` (kein Zeitpunkt, z. B. bei ANWESEND) sortiert immer ans Ende. */
function compareNullableIsoDates(a: string | null, b: string | null): number {
  if (a === null && b === null) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  // ISO-8601-Strings (immer UTC, gleiche Länge) sind lexikalisch sortierbar.
  return a.localeCompare(b);
}

/**
 * Sortiert die Live-Übersicht. Ohne explizite Nutzerwahl gilt die Vorgabe aus
 * Abschnitt 7 ("Überfällige Zeilen ... standardmäßig oben") über
 * `sortKey: "status"` — Gleichstände werden dabei wie bei jeder anderen
 * Sortierspalte zusätzlich alphabetisch nach Namen aufgelöst, für ein
 * stabiles, nachvollziehbares Ergebnis.
 */
export function sortLiveOverviewRows<T extends LiveOverviewRowLike>(
  rows: T[],
  sortKey: LiveOverviewSortKey = "status",
  direction: SortDirection = "asc",
): T[] {
  const sorted = [...rows].sort((a, b) => {
    let comparison: number;
    switch (sortKey) {
      case "name":
        comparison = a.name.localeCompare(b.name, "de");
        break;
      case "status":
        comparison = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        break;
      case "checkedOutAt":
        comparison = compareNullableIsoDates(a.checkedOutAt, b.checkedOutAt);
        break;
      case "plannedReturnAt":
        comparison = compareNullableIsoDates(
          a.plannedReturnAt,
          b.plannedReturnAt,
        );
        break;
      case "duration":
        // Je früher ausgecheckt, desto länger die bisherige Dauer — die
        // Auscheckzeit ist daher der richtige Sortierschlüssel für "Dauer".
        comparison = compareNullableIsoDates(a.checkedOutAt, b.checkedOutAt);
        break;
    }
    if (comparison === 0 && sortKey !== "name") {
      comparison = a.name.localeCompare(b.name, "de");
    }
    return direction === "desc" ? -comparison : comparison;
  });
  return sorted;
}

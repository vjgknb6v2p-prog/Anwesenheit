"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getLiveOverviewSnapshotAction } from "@/actions/admin-live";
import { checkInOtherAction } from "@/actions/staff";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { computeDurationMs, formatDuration } from "@/domain/duration";
import { cn } from "@/lib/utils";
import {
  ALL_FILTER,
  filterLiveOverviewRows,
  sortLiveOverviewRows,
  type LiveOverviewFilters,
  type LiveOverviewSortKey,
  type SortDirection,
} from "@/domain/live-overview";
import type { StudentStatus } from "@/domain/status";
import { formatTime } from "@/lib/time";
import type { LiveOverviewSnapshot } from "@/lib/admin-queries";

const FALLBACK_POLL_INTERVAL_MS = 30_000;

const STATUS_OPTIONS: {
  value: StudentStatus | typeof ALL_FILTER;
  label: string;
}[] = [
  { value: ALL_FILTER, label: "Alle Status" },
  { value: "ANWESEND", label: "Anwesend" },
  { value: "ABWESEND", label: "Abwesend" },
  { value: "UEBERFAELLIG", label: "Überfällig" },
];

const COLUMNS: { key: LiveOverviewSortKey; label: string }[] = [
  { key: "name", label: "Schüler" },
  { key: "status", label: "Status" },
  { key: "checkedOutAt", label: "Auscheckzeit" },
  { key: "plannedReturnAt", label: "Rückkehr geplant" },
  { key: "duration", label: "Dauer" },
];

interface LiveOverviewClientProps {
  initialSnapshot: LiveOverviewSnapshot;
  residentialAreaNames: string[];
  schoolClasses: string[];
}

/**
 * Client-Teil der Admin-Live-Übersicht. Empfängt Updates primär per SSE
 * (`/api/v1/stream`, ~1,5 s Intervall serverseitig) und pollt zusätzlich alle
 * 30 s per Server Action als Fallback (CLAUDE.md: "Live-Updates: SSE,
 * Fallback Polling alle 30 s") — Filter/Sortierung laufen rein clientseitig
 * auf dem jeweils aktuellen Snapshot, damit sie ohne Serverrundreise auf
 * jeden neuen Snapshot reagieren.
 */
export function LiveOverviewClient({
  initialSnapshot,
  residentialAreaNames,
  schoolClasses,
}: LiveOverviewClientProps) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [filters, setFilters] = useState<LiveOverviewFilters>({
    status: ALL_FILTER,
    residentialAreaName: ALL_FILTER,
    schoolClass: ALL_FILTER,
    query: "",
  });
  const [sortKey, setSortKey] = useState<LiveOverviewSortKey>("status");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [pendingCheckIn, setPendingCheckIn] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  useEffect(() => {
    const source = new EventSource("/api/v1/stream");
    source.onmessage = (event) => {
      setSnapshot(JSON.parse(event.data) as LiveOverviewSnapshot);
    };

    const pollFallback = setInterval(() => {
      getLiveOverviewSnapshotAction()
        .then(setSnapshot)
        .catch(() => {
          // Fallback-Poll ist ein reines Sicherheitsnetz — ein einzelner
          // fehlgeschlagener Versuch ist unkritisch, der nächste SSE-Push
          // oder Poll-Durchlauf holt den Stand nach.
        });
    }, FALLBACK_POLL_INTERVAL_MS);

    return () => {
      source.close();
      clearInterval(pollFallback);
    };
  }, []);

  const rows = useMemo(
    () =>
      sortLiveOverviewRows(
        filterLiveOverviewRows(snapshot.rows, filters),
        sortKey,
        sortDirection,
      ),
    [snapshot.rows, filters, sortKey, sortDirection],
  );

  function toggleSort(key: LiveOverviewSortKey) {
    if (key === sortKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  async function handleCheckIn(absenceId: string) {
    setPendingCheckIn(absenceId);
    setCheckInError(null);
    const result = await checkInOtherAction(absenceId);
    setPendingCheckIn(null);
    if (result.error) {
      setCheckInError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Live-Übersicht</h1>
        <p className="text-muted-foreground text-xs">
          Stand: {formatTime(new Date(snapshot.generatedAt))} Uhr · aktualisiert
          automatisch
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          testId="kpi-total"
          label="Schüler gesamt"
          value={snapshot.kpis.totalStudents}
        />
        <KpiCard
          testId="kpi-anwesend"
          label="Anwesend"
          value={snapshot.kpis.anwesend}
        />
        <KpiCard
          testId="kpi-abwesend"
          label="Abwesend"
          value={snapshot.kpis.abwesend}
        />
        <KpiCard
          testId="kpi-ueberfaellig"
          label="Überfällig"
          value={snapshot.kpis.ueberfaellig}
        />
        <KpiCard
          testId="kpi-active"
          label="Aktive Abwesenheiten"
          value={snapshot.kpis.activeAbsences}
        />
        <KpiCard
          testId="kpi-today"
          label="Abwesenheiten heute"
          value={snapshot.kpis.absencesToday}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Nach Status filtern"
          className="border-input bg-background h-11 rounded-xl border px-3 text-sm"
          value={filters.status}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              status: event.target.value as StudentStatus | typeof ALL_FILTER,
            }))
          }
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Nach Wohnbereich filtern"
          className="border-input bg-background h-11 rounded-xl border px-3 text-sm"
          value={filters.residentialAreaName}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              residentialAreaName: event.target.value,
            }))
          }
        >
          <option value={ALL_FILTER}>Alle Wohnbereiche</option>
          {residentialAreaNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <select
          aria-label="Nach Klasse filtern"
          className="border-input bg-background h-11 rounded-xl border px-3 text-sm"
          value={filters.schoolClass}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              schoolClass: event.target.value,
            }))
          }
        >
          <option value={ALL_FILTER}>Alle Klassen</option>
          {schoolClasses.map((schoolClass) => (
            <option key={schoolClass} value={schoolClass}>
              {schoolClass}
            </option>
          ))}
        </select>

        <Input
          type="search"
          aria-label="Volltextsuche"
          placeholder="Name suchen…"
          className="max-w-xs"
          value={filters.query}
          onChange={(event) =>
            setFilters((current) => ({ ...current, query: event.target.value }))
          }
        />
      </div>

      {checkInError && (
        <p role="alert" className="text-destructive text-sm">
          {checkInError}
        </p>
      )}

      {/* ≥ 768px: Tabelle. PROMPT.md Abschnitt 7: keine horizontal
          scrollende Tabelle auf kleinen Bildschirmen — dort stattdessen
          Karten (siehe unten). */}
      <div className="hidden overflow-x-auto rounded-2xl border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              {COLUMNS.map((column) => (
                <th key={column.key} className="p-3 font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className="hover:underline"
                  >
                    {column.label}
                    {sortKey === column.key &&
                      (sortDirection === "asc" ? " ▲" : " ▼")}
                  </button>
                </th>
              ))}
              <th className="p-3 font-medium">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <LiveOverviewTableRow
                key={row.userId}
                row={row}
                pendingCheckIn={pendingCheckIn}
                onCheckIn={handleCheckIn}
              />
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length + 1}
                  className="text-muted-foreground p-4 text-center"
                >
                  Keine Schüler entsprechen den aktuellen Filtern.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* < 768px: Karten statt Tabelle. */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <LiveOverviewCard
            key={row.userId}
            row={row}
            pendingCheckIn={pendingCheckIn}
            onCheckIn={handleCheckIn}
          />
        ))}
        {rows.length === 0 && (
          <p className="text-muted-foreground p-4 text-center text-sm">
            Keine Schüler entsprechen den aktuellen Filtern.
          </p>
        )}
      </ul>
    </div>
  );
}

function KpiCard({
  testId,
  label,
  value,
}: {
  testId: string;
  label: string;
  value: number;
}) {
  return (
    <div data-testid={testId} className="rounded-2xl border p-4 shadow-sm">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

interface RowProps {
  row: LiveOverviewSnapshot["rows"][number];
  pendingCheckIn: string | null;
  onCheckIn: (absenceId: string) => void;
}

const STATUS_FLASH_DURATION_MS = 1500;

/**
 * Erweiterung "Animationen & Mikro-Interaktionen": kurzer Farb-Einblend-
 * Effekt, wenn sich `value` gegenüber dem letzten Render ändert (z. B. ein
 * Statuswechsel durch einen SSE-Push) — macht Live-Updates in der Tabelle
 * sichtbar, ohne die ganze Seite neu zu laden oder aufzublitzen.
 */
function useFlashOnChange<T>(value: T): boolean {
  const [flashing, setFlashing] = useState(false);
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current === value) {
      return;
    }
    previous.current = value;
    setFlashing(true);
    const timeout = setTimeout(
      () => setFlashing(false),
      STATUS_FLASH_DURATION_MS,
    );
    return () => clearTimeout(timeout);
  }, [value]);

  return flashing;
}

function rowDuration(row: RowProps["row"]): string | null {
  if (!row.checkedOutAt) {
    return null;
  }
  return formatDuration(
    computeDurationMs(new Date(row.checkedOutAt), null, new Date()),
  );
}

function LiveOverviewTableRow({ row, pendingCheckIn, onCheckIn }: RowProps) {
  const duration = rowDuration(row);
  const flashing = useFlashOnChange(row.status);
  return (
    <tr
      className={cn(
        "transition-colors duration-1000",
        row.status === "UEBERFAELLIG" && "bg-status-overdue/10",
        flashing && "bg-status-info/20",
      )}
    >
      <td className="p-3 font-medium">{row.name}</td>
      <td className="p-3">
        <StatusBadge status={row.status} />
      </td>
      <td className="p-3">
        {row.checkedOutAt
          ? `${formatTime(new Date(row.checkedOutAt))} Uhr`
          : "–"}
      </td>
      <td className="p-3">
        {row.plannedReturnAt
          ? `${formatTime(new Date(row.plannedReturnAt))} Uhr`
          : "–"}
      </td>
      <td className="p-3">{duration ?? "–"}</td>
      <td className="p-3">
        {row.absenceId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pendingCheckIn === row.absenceId}
            onClick={() => onCheckIn(row.absenceId!)}
          >
            {pendingCheckIn === row.absenceId
              ? "Wird eingecheckt…"
              : "Einchecken"}
          </Button>
        )}
      </td>
    </tr>
  );
}

function LiveOverviewCard({ row, pendingCheckIn, onCheckIn }: RowProps) {
  const duration = rowDuration(row);
  const flashing = useFlashOnChange(row.status);
  return (
    <li
      className={cn(
        "flex flex-col gap-2 rounded-2xl border p-4 shadow-sm transition-colors duration-1000",
        row.status === "UEBERFAELLIG" && "bg-status-overdue/10",
        flashing && "bg-status-info/20",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{row.name}</p>
        <StatusBadge status={row.status} />
      </div>
      <p className="text-muted-foreground text-sm">
        {row.schoolClass ?? "–"} · {row.residentialAreaName ?? "–"}
      </p>
      {row.checkedOutAt && (
        <p className="text-sm">
          Ausgecheckt {formatTime(new Date(row.checkedOutAt))} Uhr
          {row.plannedReturnAt &&
            ` · geplant ${formatTime(new Date(row.plannedReturnAt))} Uhr`}
          {duration && ` · Dauer ${duration}`}
        </p>
      )}
      {row.absenceId && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pendingCheckIn === row.absenceId}
          onClick={() => onCheckIn(row.absenceId!)}
        >
          {pendingCheckIn === row.absenceId
            ? "Wird eingecheckt…"
            : "Einchecken"}
        </Button>
      )}
    </li>
  );
}

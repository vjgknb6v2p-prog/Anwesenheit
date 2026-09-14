import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { computeDurationMs, formatDuration } from "@/domain/duration";
import { deriveStatus } from "@/domain/status";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDateTime, formatTime } from "@/lib/time";

export const metadata: Metadata = {
  title: "Abwesenheiten – CheckIn",
};

const ALL = "ALLE";
const PAGE_SIZE = 100;

const REASON_LABELS: Record<string, string> = {
  HEIMFAHRT: "Heimfahrt",
  ARZT: "Arzt",
  SPORT_VEREIN: "Sportverein",
  EINKAUF_STADT: "Einkauf/Stadt",
  FAMILIE_BESUCH: "Familienbesuch",
  SCHULVERANSTALTUNG: "Schulveranstaltung",
  SONSTIGES: "Sonstiges",
};

const ABSENCE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktiv",
  CANCELLED: "Storniert",
  COMPLETED: "Abgeschlossen",
};

/**
 * Admin-weite Abwesenheiten-Übersicht (PROMPT.md Abschnitt 6:
 * `/admin/abwesenheiten`). Korrekturen selbst finden weiterhin auf der
 * Schüler-Detailseite (`/staff/schueler/[id]`) statt — die Rechte-Matrix
 * erlaubt Admins denselben Zugriff wie Mitarbeitern, eine zweite
 * Korrektur-UI wäre reine Duplikation (siehe docs/decisions.md).
 */
export default async function AdminAbsencesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireRole("ADMIN");
  const { status, q } = await searchParams;

  const absences = await db.absence.findMany({
    where: q
      ? {
          user: {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
            ],
          },
        }
      : undefined,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          schoolClass: true,
        },
      },
    },
    orderBy: { checkedOutAt: "desc" },
    take: PAGE_SIZE,
  });

  const now = new Date();
  const rows = absences
    .map((absence) => ({
      absence,
      derivedStatus:
        absence.status === "ACTIVE"
          ? deriveStatus(
              { status: "ACTIVE", plannedReturnAt: absence.plannedReturnAt },
              now,
            )
          : null,
    }))
    .filter(({ derivedStatus, absence }) => {
      if (!status || status === ALL) {
        return true;
      }
      if (status === "ABGESCHLOSSEN") {
        return absence.status !== "ACTIVE";
      }
      return derivedStatus === status;
    });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">
        Abwesenheiten ({rows.length} von {PAGE_SIZE} neuesten geladen)
      </h1>

      <form className="flex flex-wrap gap-2">
        <select
          name="status"
          defaultValue={status ?? ALL}
          className="border-input bg-background h-11 rounded-xl border px-3 text-sm"
        >
          <option value={ALL}>Alle Status</option>
          <option value="ABWESEND">Abwesend</option>
          <option value="UEBERFAELLIG">Überfällig</option>
          <option value="ABGESCHLOSSEN">Abgeschlossen/Storniert</option>
        </select>
        <Input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Name suchen…"
          className="max-w-xs"
        />
        <Button type="submit" variant="outline">
          Filtern
        </Button>
      </form>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Keine Einträge gefunden.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map(({ absence, derivedStatus }) => {
            const durationMs = computeDurationMs(
              absence.checkedOutAt,
              absence.checkedInAt,
              now,
            );
            return (
              <li
                key={absence.id}
                className={`rounded-2xl border p-4 shadow-sm ${
                  derivedStatus === "UEBERFAELLIG" ? "bg-status-overdue/10" : ""
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/staff/schueler/${absence.user.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {absence.user.firstName} {absence.user.lastName}
                  </Link>
                  {derivedStatus ? (
                    <StatusBadge status={derivedStatus} />
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      {ABSENCE_STATUS_LABELS[absence.status]}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">
                  {absence.user.schoolClass ?? "–"} ·{" "}
                  {REASON_LABELS[absence.reason] ?? absence.reason} ·{" "}
                  {absence.destination}
                </p>
                <p className="text-sm">
                  {formatDateTime(absence.checkedOutAt)} Uhr
                  {" → "}
                  {absence.checkedInAt
                    ? `${formatTime(absence.checkedInAt)} Uhr`
                    : `geplant ${formatTime(absence.plannedReturnAt)} Uhr`}
                </p>
                {absence.status !== "ACTIVE" && (
                  <p className="text-muted-foreground text-sm">
                    Dauer: {formatDuration(durationMs)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

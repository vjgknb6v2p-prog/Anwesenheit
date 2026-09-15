import type { Metadata } from "next";
import { computeDurationMs, formatDuration } from "@/domain/duration";
import { deriveStatus } from "@/domain/status";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/authz";
import { formatDateTime, formatTime } from "@/lib/time";
import { StatusBadge } from "@/components/status-badge";

export const metadata: Metadata = {
  title: "Historie – CheckIn",
};

const REASON_LABELS: Record<string, string> = {
  HEIMFAHRT: "Heimfahrt",
  ARZT: "Arzt",
  SPORT_VEREIN: "Sportverein",
  EINKAUF_STADT: "Einkauf/Stadt",
  FAMILIE_BESUCH: "Familienbesuch",
  SCHULVERANSTALTUNG: "Schulveranstaltung",
  SONSTIGES: "Sonstiges",
};

export default async function HistoryPage() {
  const user = await requireRole("STUDENT");

  const absences = await db.absence.findMany({
    where: { userId: user.id },
    orderBy: { checkedOutAt: "desc" },
    take: 100,
  });

  const now = new Date();

  return (
    <main className="flex min-h-screen flex-col gap-4 p-6 pb-28">
      <h1 className="text-xl font-semibold">Meine Abwesenheiten</h1>

      {absences.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Noch keine Abwesenheiten vorhanden.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {absences.map((absence) => {
            const status =
              absence.status === "ACTIVE"
                ? deriveStatus(
                    {
                      status: "ACTIVE",
                      plannedReturnAt: absence.plannedReturnAt,
                    },
                    now,
                  )
                : null;
            const durationMs = computeDurationMs(
              absence.checkedOutAt,
              absence.checkedInAt,
              now,
            );

            return (
              <li
                key={absence.id}
                className="flex flex-col gap-1 rounded-2xl border p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{absence.destination}</span>
                  {status ? (
                    <StatusBadge status={status} />
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      {absence.status === "CANCELLED"
                        ? "Storniert"
                        : "Abgeschlossen"}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">
                  {REASON_LABELS[absence.reason] ?? absence.reason}
                  {absence.reasonDetail ? ` – ${absence.reasonDetail}` : ""}
                </p>
                <p className="text-sm">
                  {formatDateTime(absence.checkedOutAt)} Uhr
                  {" → "}
                  {absence.checkedInAt
                    ? `${formatTime(absence.checkedInAt)} Uhr`
                    : `geplant ${formatTime(absence.plannedReturnAt)} Uhr`}
                </p>
                <p className="text-muted-foreground text-sm">
                  Dauer: {formatDuration(durationMs)}
                </p>
                {absence.note && (
                  <p className="text-muted-foreground text-sm italic">
                    „{absence.note}“
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

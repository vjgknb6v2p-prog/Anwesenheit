import type { Metadata } from "next";
import Link from "next/link";
import { CheckInButton } from "@/components/check-in-button";
import { computeDurationMs, formatDuration } from "@/domain/duration";
import { requireRole } from "@/lib/authz";
import { getActiveAbsencesByStatus } from "@/lib/staff-queries";
import { formatTime } from "@/lib/time";

export const metadata: Metadata = {
  title: "Überfällig – CheckIn",
};

export default async function StaffOverduePage() {
  await requireRole("STAFF", "ADMIN");

  const absences = await getActiveAbsencesByStatus("UEBERFAELLIG");
  const now = new Date();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Überfällig ({absences.length})</h1>

      {absences.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aktuell ist niemand überfällig.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {absences.map((absence) => (
            <li
              key={absence.id}
              className="border-status-overdue bg-status-overdue/10 flex flex-col gap-2 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link
                  href={`/staff/schueler/${absence.userId}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {absence.userName}
                </Link>
                <p className="text-muted-foreground text-sm">
                  Ziel: {absence.destination}
                </p>
                <p className="text-muted-foreground text-sm">
                  Geplant war {formatTime(absence.plannedReturnAt)} Uhr ·
                  überfällig seit{" "}
                  {formatDuration(
                    computeDurationMs(absence.plannedReturnAt, null, now),
                  )}
                </p>
              </div>
              <CheckInButton absenceId={absence.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

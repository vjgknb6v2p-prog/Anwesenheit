import { deriveStatus, type StudentStatus } from "@/domain/status";
import { db } from "@/lib/db";

export interface ActiveAbsenceWithUser {
  id: string;
  userId: string;
  userName: string;
  destination: string;
  checkedOutAt: Date;
  plannedReturnAt: Date;
  status: StudentStatus;
}

/**
 * Alle aktiven Abwesenheiten mit dem angegebenen abgeleiteten Status
 * (ABWESEND oder ÜBERFÄLLIG) — Basis für `/staff/abwesend` und
 * `/staff/ueberfaellig` (Abschnitt 6: getrennte, disjunkte Listen).
 */
export async function getActiveAbsencesByStatus(
  target: Extract<StudentStatus, "ABWESEND" | "UEBERFAELLIG">,
): Promise<ActiveAbsenceWithUser[]> {
  const now = new Date();
  const absences = await db.absence.findMany({
    where: { status: "ACTIVE" },
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { plannedReturnAt: "asc" },
  });

  return absences
    .map((absence) => ({
      id: absence.id,
      userId: absence.userId,
      userName: `${absence.user.firstName} ${absence.user.lastName}`,
      destination: absence.destination,
      checkedOutAt: absence.checkedOutAt,
      plannedReturnAt: absence.plannedReturnAt,
      status: deriveStatus(
        { status: "ACTIVE", plannedReturnAt: absence.plannedReturnAt },
        now,
      ),
    }))
    .filter((absence) => absence.status === target);
}

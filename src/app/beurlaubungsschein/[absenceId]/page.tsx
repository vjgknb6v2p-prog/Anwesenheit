import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BeurlaubungsscheinView } from "@/components/beurlaubungsschein-view";
import type { AbsenceReason } from "@/domain/absence-reason";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { roleHomePath } from "@/lib/roles";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = {
  title: "Beurlaubungsschein – CheckIn",
};

const REASON_LABELS: Record<AbsenceReason, string> = {
  HEIMFAHRT: "Heimfahrt",
  ARZT: "Arzt",
  SPORT_VEREIN: "Sportverein",
  EINKAUF_STADT: "Einkauf/Stadt",
  FAMILIE_BESUCH: "Familienbesuch",
  SCHULVERANSTALTUNG: "Schulveranstaltung",
  SONSTIGES: "Sonstiges",
};

/**
 * Erweiterung "Beurlaubungsschein-PDF": frei stehende Route außerhalb der
 * Rollen-Layouts (kein Bottom-/Top-Nav), damit die Druckansicht nicht die
 * Navigations-Chrome mit ausdruckt. Zugriff: Schüler nur auf die eigene
 * Abwesenheit (Abschnitt 3.8: keine fremden Daten), Mitarbeiter/Admin auf
 * jede (analog zur bestehenden Korrektur-Berechtigung, nicht
 * wohnbereichs-eingeschränkt).
 */
export default async function BeurlaubungsscheinPage({
  params,
}: {
  params: Promise<{ absenceId: string }>;
}) {
  const user = await requireUser();
  const { absenceId } = await params;

  const absence = await db.absence.findUnique({
    where: { id: absenceId },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          schoolClass: true,
          room: true,
          residentialArea: { select: { name: true } },
        },
      },
    },
  });

  if (!absence) {
    notFound();
  }

  if (user.role === "STUDENT" && absence.userId !== user.id) {
    redirect(roleHomePath(user.role));
  }

  return (
    <BeurlaubungsscheinView
      backHref={roleHomePath(user.role)}
      data={{
        studentName: `${absence.user.firstName} ${absence.user.lastName}`,
        schoolClass: absence.user.schoolClass,
        room: absence.user.room,
        residentialAreaName: absence.user.residentialArea?.name ?? null,
        reasonLabel:
          REASON_LABELS[absence.reason as AbsenceReason] ?? absence.reason,
        reasonDetail: absence.reasonDetail,
        destination: absence.destination,
        checkedOutAt: formatDateTime(absence.checkedOutAt),
        plannedReturnAt: formatDateTime(absence.plannedReturnAt),
        checkedInAt: absence.checkedInAt
          ? formatDateTime(absence.checkedInAt)
          : null,
        status: absence.status,
        issuedAt: formatDateTime(new Date()),
      }}
    />
  );
}

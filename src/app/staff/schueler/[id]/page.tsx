import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { StudentDetailClient } from "./student-detail-client";

export const metadata: Metadata = {
  title: "Schülerdetails – CheckIn",
};

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("STAFF", "ADMIN");
  const { id } = await params;

  const student = await db.user.findFirst({
    where: { id, role: "STUDENT", deletedAt: null },
    include: { residentialArea: { select: { name: true } } },
  });
  if (!student) {
    notFound();
  }

  const absences = await db.absence.findMany({
    where: { userId: id },
    orderBy: { checkedOutAt: "desc" },
    take: 50,
    include: { extensions: { where: { status: "PENDING" }, take: 1 } },
  });

  const activeAbsence =
    absences.find((absence) => absence.status === "ACTIVE") ?? null;
  const pendingExtension = activeAbsence?.extensions[0] ?? null;
  const history = absences.filter((absence) => absence.status !== "ACTIVE");

  return (
    <StudentDetailClient
      student={{
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        schoolClass: student.schoolClass,
        room: student.room,
        residentialAreaName: student.residentialArea?.name ?? null,
      }}
      activeAbsence={
        activeAbsence
          ? {
              id: activeAbsence.id,
              destination: activeAbsence.destination,
              checkedOutAt: activeAbsence.checkedOutAt.toISOString(),
              plannedReturnAt: activeAbsence.plannedReturnAt.toISOString(),
            }
          : null
      }
      pendingExtension={
        pendingExtension
          ? {
              id: pendingExtension.id,
              oldReturnAt: pendingExtension.oldReturnAt.toISOString(),
              newReturnAt: pendingExtension.newReturnAt.toISOString(),
            }
          : null
      }
      history={history.map((absence) => ({
        id: absence.id,
        destination: absence.destination,
        reason: absence.reason,
        reasonDetail: absence.reasonDetail,
        checkedOutAt: absence.checkedOutAt.toISOString(),
        plannedReturnAt: absence.plannedReturnAt.toISOString(),
        checkedInAt: absence.checkedInAt?.toISOString() ?? null,
        status: absence.status,
      }))}
    />
  );
}

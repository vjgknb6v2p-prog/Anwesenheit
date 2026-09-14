import type { Metadata } from "next";
import { deriveStatus } from "@/domain/status";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { StudentsAdminClient, type StudentRow } from "./students-admin-client";

export const metadata: Metadata = {
  title: "Schüler verwalten – CheckIn",
};

export default async function AdminStudentsPage() {
  await requireRole("ADMIN");

  const [students, residentialAreas] = await Promise.all([
    db.user.findMany({
      where: { role: "STUDENT", deletedAt: null },
      include: {
        residentialArea: { select: { id: true, name: true } },
        absences: { where: { status: "ACTIVE" }, take: 1 },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    db.residentialArea.findMany({ orderBy: { name: "asc" } }),
  ]);

  const now = new Date();
  const rows: StudentRow[] = students.map((student) => {
    const active = student.absences[0] ?? null;
    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      schoolClass: student.schoolClass,
      room: student.room,
      residentialAreaId: student.residentialAreaId,
      residentialAreaName: student.residentialArea?.name ?? null,
      active: student.active,
      status: deriveStatus(
        active
          ? { status: "ACTIVE", plannedReturnAt: active.plannedReturnAt }
          : null,
        now,
      ),
    };
  });

  return (
    <StudentsAdminClient students={rows} residentialAreas={residentialAreas} />
  );
}

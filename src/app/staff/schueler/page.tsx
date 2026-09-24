import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GroupActionsPanel } from "@/components/staff/group-actions-panel";
import { deriveStatus } from "@/domain/status";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Schüler – CheckIn",
};

export default async function StaffStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole("STAFF", "ADMIN");
  const { q } = await searchParams;

  const students = await db.user.findMany({
    where: {
      role: "STUDENT",
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      residentialArea: { select: { name: true } },
      absences: { where: { status: "ACTIVE" }, take: 1 },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const now = new Date();

  const studentRows = students.map((student) => {
    const activeAbsence = student.absences[0];
    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      schoolClass: student.schoolClass,
      residentialAreaName: student.residentialArea?.name ?? null,
      status: deriveStatus(
        activeAbsence
          ? {
              status: "ACTIVE" as const,
              plannedReturnAt: activeAbsence.plannedReturnAt,
            }
          : null,
        now,
      ),
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Schüler ({students.length})</h1>

      <form className="flex gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Name suchen…"
          className="max-w-sm"
        />
        <Button type="submit" variant="outline">
          Suchen
        </Button>
      </form>

      <GroupActionsPanel students={studentRows} />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

      <ul className="flex flex-col gap-2">
        {students.map((student) => {
          const activeAbsence = student.absences[0];
          const status = deriveStatus(
            activeAbsence
              ? {
                  status: "ACTIVE",
                  plannedReturnAt: activeAbsence.plannedReturnAt,
                }
              : null,
            now,
          );
          return (
            <li key={student.id}>
              <Link
                href={`/staff/schueler/${student.id}`}
                className="hover:bg-accent flex items-center justify-between gap-4 rounded-2xl border p-4 shadow-sm"
              >
                <div>
                  <p className="font-medium">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {student.schoolClass ?? "–"} ·{" "}
                    {student.residentialArea?.name ?? "–"}
                  </p>
                </div>
                <StatusBadge status={status} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

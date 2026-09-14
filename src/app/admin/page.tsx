import type { Metadata } from "next";
import { LiveOverviewClient } from "@/components/admin/live-overview-client";
import { getLiveOverviewSnapshot } from "@/lib/admin-queries";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Live-Übersicht – CheckIn",
};

export default async function AdminLiveOverviewPage() {
  await requireRole("ADMIN");

  const [snapshot, residentialAreas, schoolClasses] = await Promise.all([
    getLiveOverviewSnapshot(),
    db.residentialArea.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { role: "STUDENT", deletedAt: null, schoolClass: { not: null } },
      select: { schoolClass: true },
      distinct: ["schoolClass"],
      orderBy: { schoolClass: "asc" },
    }),
  ]);

  return (
    <LiveOverviewClient
      initialSnapshot={snapshot}
      residentialAreaNames={residentialAreas.map((area) => area.name)}
      schoolClasses={schoolClasses
        .map((student) => student.schoolClass)
        .filter((value): value is string => value !== null)}
    />
  );
}

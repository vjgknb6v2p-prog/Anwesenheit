import type { Metadata } from "next";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { ResidentialAreasClient } from "./residential-areas-client";

export const metadata: Metadata = {
  title: "Wohnbereiche – CheckIn",
};

export default async function AdminResidentialAreasPage() {
  await requireRole("ADMIN");

  const areas = await db.residentialArea.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <ResidentialAreasClient
      areas={areas.map((area) => ({
        id: area.id,
        name: area.name,
        userCount: area._count.users,
      }))}
    />
  );
}

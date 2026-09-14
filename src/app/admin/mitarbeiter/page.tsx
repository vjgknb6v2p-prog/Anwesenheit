import type { Metadata } from "next";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { StaffAdminClient, type StaffRow } from "./staff-admin-client";

export const metadata: Metadata = {
  title: "Mitarbeiter verwalten – CheckIn",
};

export default async function AdminStaffPage() {
  const admin = await requireRole("ADMIN");

  const [staff, residentialAreas] = await Promise.all([
    db.user.findMany({
      where: { role: { in: ["STAFF", "ADMIN"] }, deletedAt: null },
      include: { residentialArea: { select: { id: true, name: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    db.residentialArea.findMany({ orderBy: { name: "asc" } }),
  ]);

  const rows: StaffRow[] = staff.map((member) => ({
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    schoolClass: member.schoolClass,
    room: member.room,
    residentialAreaId: member.residentialAreaId,
    residentialAreaName: member.residentialArea?.name ?? null,
    active: member.active,
    role: member.role,
  }));

  return (
    <StaffAdminClient
      staff={rows}
      residentialAreas={residentialAreas}
      currentUserId={admin.id}
    />
  );
}

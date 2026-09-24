import type { Metadata } from "next";
import { AbsenceCalendar } from "@/components/calendar/absence-calendar";
import { requireRole } from "@/lib/authz";
import { getAbsenceCalendarForMonth } from "@/lib/calendar-queries";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Kalender – CheckIn",
};

export default async function StaffCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const user = await requireRole("STAFF", "ADMIN");
  const { year: yearParam, month: monthParam } = await searchParams;

  const now = new Date();
  const year = Number(yearParam) || now.getFullYear();
  const month = Number(monthParam) || now.getMonth() + 1;

  const staffUser = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { residentialAreaId: true },
  });

  if (!staffUser.residentialAreaId) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Kalender</h1>
        <p className="text-muted-foreground text-sm">
          Dir ist kein Wohnbereich zugeordnet.
        </p>
      </div>
    );
  }

  const days = await getAbsenceCalendarForMonth(
    year,
    month,
    staffUser.residentialAreaId,
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Kalender</h1>
      <AbsenceCalendar
        year={year}
        month={month}
        days={days}
        basePath="/staff/kalender"
      />
    </div>
  );
}

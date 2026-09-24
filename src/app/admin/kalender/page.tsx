import type { Metadata } from "next";
import { AbsenceCalendar } from "@/components/calendar/absence-calendar";
import { requireRole } from "@/lib/authz";
import { getAbsenceCalendarForMonth } from "@/lib/calendar-queries";

export const metadata: Metadata = {
  title: "Kalender – CheckIn",
};

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  await requireRole("ADMIN");
  const { year: yearParam, month: monthParam } = await searchParams;

  const now = new Date();
  const year = Number(yearParam) || now.getFullYear();
  const month = Number(monthParam) || now.getMonth() + 1;

  const days = await getAbsenceCalendarForMonth(year, month);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Kalender</h1>
      <AbsenceCalendar
        year={year}
        month={month}
        days={days}
        basePath="/admin/kalender"
      />
    </div>
  );
}

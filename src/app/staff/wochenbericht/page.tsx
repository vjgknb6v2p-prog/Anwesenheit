import type { Metadata } from "next";
import { WochenberichtView } from "@/components/wochenbericht-view";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { parseLocalDateParam } from "@/lib/stats-params";
import { toDateInputValue } from "@/lib/time";
import {
  getWochenberichtData,
  toWochenberichtViewData,
} from "@/lib/wochenbericht-queries";

export const metadata: Metadata = {
  title: "Wochenbericht – CheckIn",
};

/**
 * Rechte-Matrix (PROMPT.md Abschnitt 5): wie bei den Statistiken sehen
 * Mitarbeiter den Wochenbericht nur für den eigenen Wohnbereich.
 */
export default async function StaffWochenberichtPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const staffUser = await requireRole("STAFF", "ADMIN");
  const { date } = await searchParams;
  const referenceDate = parseLocalDateParam(date) ?? new Date();

  const dbUser = await db.user.findUnique({
    where: { id: staffUser.id },
    select: {
      residentialAreaId: true,
      residentialArea: { select: { name: true } },
    },
  });

  if (!dbUser?.residentialAreaId) {
    return (
      <div className="flex flex-col gap-4 p-8">
        <h1 className="text-xl font-semibold">Wochenbericht</h1>
        <p className="text-muted-foreground text-sm">
          Dir ist kein Wohnbereich zugewiesen — bitte einen Admin bitten, dies
          in der Benutzerverwaltung nachzutragen.
        </p>
      </div>
    );
  }

  const data = await getWochenberichtData({
    referenceDate,
    residentialAreaId: dbUser.residentialAreaId,
    residentialAreaName: dbUser.residentialArea?.name,
  });

  const prevDate = new Date(referenceDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const nextDate = new Date(referenceDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  return (
    <WochenberichtView
      data={toWochenberichtViewData(data)}
      backHref="/staff"
      prevHref={`/staff/wochenbericht?date=${toDateInputValue(prevDate)}`}
      nextHref={`/staff/wochenbericht?date=${toDateInputValue(nextDate)}`}
    />
  );
}

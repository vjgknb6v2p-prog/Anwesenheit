import type { Metadata } from "next";
import { WochenberichtView } from "@/components/wochenbericht-view";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { RESIDENTIAL_AREA_ALL, parseLocalDateParam } from "@/lib/stats-params";
import { toDateInputValue } from "@/lib/time";
import {
  getWochenberichtData,
  toWochenberichtViewData,
} from "@/lib/wochenbericht-queries";

export const metadata: Metadata = {
  title: "Wochenbericht – CheckIn",
};

export default async function AdminWochenberichtPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; residentialAreaId?: string }>;
}) {
  await requireRole("ADMIN");
  const params = await searchParams;
  const referenceDate = parseLocalDateParam(params.date) ?? new Date();
  const residentialAreaId =
    params.residentialAreaId &&
    params.residentialAreaId !== RESIDENTIAL_AREA_ALL
      ? params.residentialAreaId
      : undefined;

  const [residentialAreas, selectedArea] = await Promise.all([
    db.residentialArea.findMany({ orderBy: { name: "asc" } }),
    residentialAreaId
      ? db.residentialArea.findUnique({ where: { id: residentialAreaId } })
      : Promise.resolve(null),
  ]);

  const data = await getWochenberichtData({
    referenceDate,
    residentialAreaId,
    residentialAreaName: selectedArea?.name,
  });

  const prevDate = new Date(referenceDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const nextDate = new Date(referenceDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dateParam = toDateInputValue(referenceDate);

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-wrap items-end gap-2 p-8 pb-0 print:hidden">
        <input type="hidden" name="date" value={dateParam} />
        <label className="flex flex-col gap-1 text-sm">
          Wohnbereich
          <select
            name="residentialAreaId"
            defaultValue={residentialAreaId ?? RESIDENTIAL_AREA_ALL}
            className="border-input bg-background h-11 rounded-xl border px-3 text-sm"
          >
            <option value={RESIDENTIAL_AREA_ALL}>Alle Wohnbereiche</option>
            {residentialAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="border-input bg-background hover:bg-accent inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-medium"
        >
          Filtern
        </button>
      </form>

      <WochenberichtView
        data={toWochenberichtViewData(data)}
        backHref="/admin"
        prevHref={`/admin/wochenbericht?date=${toDateInputValue(prevDate)}${residentialAreaId ? `&residentialAreaId=${residentialAreaId}` : ""}`}
        nextHref={`/admin/wochenbericht?date=${toDateInputValue(nextDate)}${residentialAreaId ? `&residentialAreaId=${residentialAreaId}` : ""}`}
      />
    </div>
  );
}

import { Button } from "@/components/ui/button";
import type { StatsGranularity } from "@/domain/stats";
import { RESIDENTIAL_AREA_ALL } from "@/lib/stats-params";
import { toDateInputValue } from "@/lib/time";

export interface ResidentialAreaOption {
  id: string;
  name: string;
}

interface StatsFilterFormProps {
  from: Date;
  to: Date;
  granularity: StatsGranularity;
  /** Nur für Admin gesetzt — Mitarbeiter sehen keinen Wohnbereichs-Filter
   * (Rechte-Matrix: fest auf den eigenen Wohnbereich beschränkt). */
  residentialAreas?: ResidentialAreaOption[];
  selectedResidentialAreaId?: string;
  exportHref: string;
}

const FIELD_CLASSES =
  "border-input bg-background h-11 rounded-xl border px-3 text-sm";

/** Zeitraum-/Granularitäts-/Wohnbereichsfilter für `/admin/statistiken` und
 * `/staff/statistiken` — ein einfaches GET-Formular über `searchParams`,
 * konsistent mit den übrigen Filterformularen im Admin-/Staff-Bereich. */
export function StatsFilterForm({
  from,
  to,
  granularity,
  residentialAreas,
  selectedResidentialAreaId,
  exportHref,
}: StatsFilterFormProps) {
  return (
    <form className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        Von
        <input
          type="date"
          name="from"
          defaultValue={toDateInputValue(from)}
          className={FIELD_CLASSES}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Bis
        <input
          type="date"
          name="to"
          defaultValue={toDateInputValue(to)}
          className={FIELD_CLASSES}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Zeitraum
        <select
          name="granularity"
          defaultValue={granularity}
          className={FIELD_CLASSES}
        >
          <option value="day">Pro Tag</option>
          <option value="week">Pro Woche</option>
          <option value="month">Pro Monat</option>
        </select>
      </label>
      {residentialAreas && (
        <label className="flex flex-col gap-1 text-sm">
          Wohnbereich
          <select
            name="residentialAreaId"
            defaultValue={selectedResidentialAreaId ?? RESIDENTIAL_AREA_ALL}
            className={FIELD_CLASSES}
          >
            <option value={RESIDENTIAL_AREA_ALL}>Alle Wohnbereiche</option>
            {residentialAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <Button type="submit" variant="outline">
        Filtern
      </Button>
      <a
        href={exportHref}
        className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-medium transition-colors"
      >
        CSV exportieren
      </a>
    </form>
  );
}

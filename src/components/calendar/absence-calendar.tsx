import Link from "next/link";
import type { CalendarDay } from "@/domain/calendar";
import { cn } from "@/lib/utils";

const REASON_LABELS: Record<string, string> = {
  HEIMFAHRT: "Heimfahrt",
  ARZT: "Arzt",
  SPORT_VEREIN: "Sportverein",
  EINKAUF_STADT: "Einkauf/Stadt",
  FAMILIE_BESUCH: "Familienbesuch",
  SCHULVERANSTALTUNG: "Schulveranstaltung",
  SONSTIGES: "Sonstiges",
};

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MAX_VISIBLE_PER_DAY = 3;

/**
 * Montag-basierte Wochentag-Nummer (0=Mo…6=So) für den 1. eines Monats, um
 * die Kalenderzellen korrekt in ein 7-Spalten-Raster einzuordnen.
 */
function mondayIndexOfFirstDay(year: number, month: number): number {
  const jsDay = new Date(year, month - 1, 1).getDay(); // 0=So…6=Sa
  return (jsDay + 6) % 7;
}

export function AbsenceCalendar({
  year,
  month,
  days,
  basePath,
}: {
  year: number;
  month: number;
  days: CalendarDay[];
  /** Pfad für die Monats-Navigation, z. B. "/staff/kalender". */
  basePath: string;
}) {
  const leadingEmptyCells = mondayIndexOfFirstDay(year, month);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link
          href={`${basePath}?year=${prevYear}&month=${prevMonth}`}
          className="hover:bg-accent min-h-11 rounded-xl px-3 py-2 text-sm font-medium"
        >
          ← Vorheriger Monat
        </Link>
        <h2 className="font-medium">
          {new Date(year, month - 1, 1).toLocaleDateString("de-DE", {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <Link
          href={`${basePath}?year=${nextYear}&month=${nextMonth}`}
          className="hover:bg-accent min-h-11 rounded-xl px-3 py-2 text-sm font-medium"
        >
          Nächster Monat →
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-muted-foreground py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingEmptyCells }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => (
          <div
            key={day.dayOfMonth}
            className={cn(
              "flex min-h-24 flex-col gap-1 rounded-xl border p-1.5 text-left text-xs",
              day.entries.length > 0 && "border-status-info",
            )}
          >
            <span className="text-muted-foreground font-medium">
              {day.dayOfMonth}
            </span>
            {day.entries.slice(0, MAX_VISIBLE_PER_DAY).map((entry, i) => (
              <span
                key={`${entry.userId}-${i}`}
                className="truncate"
                title={`${entry.userName} – ${REASON_LABELS[entry.reason] ?? entry.reason}`}
              >
                {entry.userName.split(" ")[0]}
              </span>
            ))}
            {day.entries.length > MAX_VISIBLE_PER_DAY && (
              <span className="text-muted-foreground">
                +{day.entries.length - MAX_VISIBLE_PER_DAY} mehr
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

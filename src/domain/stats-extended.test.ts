import { describe, expect, it } from "vitest";
import {
  buildWeekdayHourHeatmap,
  computeTrend,
  countByDestination,
  type DestinationAbsenceInput,
  type HeatmapAbsenceInput,
} from "./stats-extended";

function heatmapAbsence(
  overrides: Partial<HeatmapAbsenceInput> = {},
): HeatmapAbsenceInput {
  return {
    checkedOutAt: new Date("2026-03-16T14:00:00Z"), // Montag, 15 Uhr MEZ/MESZ
    status: "COMPLETED",
    ...overrides,
  };
}

function destinationAbsence(
  overrides: Partial<DestinationAbsenceInput> = {},
): DestinationAbsenceInput {
  return {
    destination: "Stadtzentrum",
    status: "COMPLETED",
    ...overrides,
  };
}

describe("buildWeekdayHourHeatmap", () => {
  it("liefert immer 168 Zellen (7 Wochentage × 24 Stunden), auch ohne Daten", () => {
    const cells = buildWeekdayHourHeatmap([]);
    expect(cells).toHaveLength(7 * 24);
    expect(cells.every((cell) => cell.count === 0)).toBe(true);
  });

  it("ordnet eine Abwesenheit ihrem Wochentag und ihrer Stunde in Europe/Berlin zu", () => {
    const cells = buildWeekdayHourHeatmap([heatmapAbsence()]);
    const hit = cells.find((cell) => cell.weekday === 0 && cell.hour === 15);
    expect(hit?.count).toBe(1);
    expect(cells.filter((cell) => cell.count > 0)).toHaveLength(1);
  });

  it("zählt mehrere Abwesenheiten in derselben Zelle korrekt", () => {
    const cells = buildWeekdayHourHeatmap([
      heatmapAbsence(),
      heatmapAbsence({ checkedOutAt: new Date("2026-03-16T14:30:00Z") }),
    ]);
    const hit = cells.find((cell) => cell.weekday === 0 && cell.hour === 15);
    expect(hit?.count).toBe(2);
  });

  it("schließt stornierte Abwesenheiten aus", () => {
    const cells = buildWeekdayHourHeatmap([
      heatmapAbsence({ status: "CANCELLED" }),
    ]);
    expect(cells.every((cell) => cell.count === 0)).toBe(true);
  });
});

describe("countByDestination", () => {
  it("zählt Ziele absteigend, Gleichstand alphabetisch", () => {
    const result = countByDestination([
      destinationAbsence({ destination: "Bahnhof" }),
      destinationAbsence({ destination: "Stadtzentrum" }),
      destinationAbsence({ destination: "Stadtzentrum" }),
    ]);
    expect(result).toEqual([
      { destination: "Stadtzentrum", count: 2 },
      { destination: "Bahnhof", count: 1 },
    ]);
  });

  it("schließt stornierte Abwesenheiten aus", () => {
    const result = countByDestination([
      destinationAbsence({ status: "CANCELLED" }),
    ]);
    expect(result).toEqual([]);
  });

  it("liefert eine leere Liste ohne Daten", () => {
    expect(countByDestination([])).toEqual([]);
  });
});

describe("computeTrend", () => {
  it("berechnet eine positive prozentuale Veränderung", () => {
    expect(computeTrend(15, 10)).toEqual({
      current: 15,
      previous: 10,
      deltaPercent: 50,
    });
  });

  it("berechnet eine negative prozentuale Veränderung", () => {
    expect(computeTrend(5, 10)).toEqual({
      current: 5,
      previous: 10,
      deltaPercent: -50,
    });
  });

  it("liefert deltaPercent 0, wenn beide Perioden 0 sind", () => {
    expect(computeTrend(0, 0)).toEqual({
      current: 0,
      previous: 0,
      deltaPercent: 0,
    });
  });

  it("liefert deltaPercent null, wenn die Vorperiode 0 war, die aktuelle nicht", () => {
    expect(computeTrend(4, 0)).toEqual({
      current: 4,
      previous: 0,
      deltaPercent: null,
    });
  });
});

import { describe, expect, it } from "vitest";
import type { AbsenceStatsInput } from "./stats";
import {
  buildStatsSummary,
  computeAverageDurationMs,
  countAbsencesPerStudent,
  countByReason,
  countLateReturns,
  groupAbsencesByPeriod,
} from "./stats";

// Januar 2026 (Winter, Europe/Berlin = UTC+1, keine Sommerzeit-Sonderfälle):
// 2026-01-05 ist ein Montag (ISO-Wochenbeginn), 2026-01-12 die Folgewoche,
// 2026-02-01 der erste Tag des Folgemonats.

function absence(overrides: Partial<AbsenceStatsInput>): AbsenceStatsInput {
  return {
    userId: "u1",
    userName: "Anna Muster",
    reason: "HEIMFAHRT",
    checkedOutAt: new Date("2026-01-05T10:00:00.000Z"),
    plannedReturnAt: new Date("2026-01-05T14:00:00.000Z"),
    checkedInAt: new Date("2026-01-05T13:00:00.000Z"),
    status: "COMPLETED",
    ...overrides,
  };
}

describe("groupAbsencesByPeriod", () => {
  it("gruppiert nach Tag", () => {
    const result = groupAbsencesByPeriod(
      [
        absence({ checkedOutAt: new Date("2026-01-05T08:00:00.000Z") }),
        absence({ checkedOutAt: new Date("2026-01-05T18:00:00.000Z") }),
        absence({ checkedOutAt: new Date("2026-01-06T08:00:00.000Z") }),
      ],
      "day",
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      periodStart: new Date("2026-01-04T23:00:00.000Z"), // 05.01. 00:00 Berlin
      count: 2,
    });
    expect(result[1]).toEqual({
      periodStart: new Date("2026-01-05T23:00:00.000Z"), // 06.01. 00:00 Berlin
      count: 1,
    });
  });

  it("bucketet nach Europe/Berlin, nicht nach UTC-Kalendertag", () => {
    // 2026-01-04T23:30 UTC ist bereits 2026-01-05T00:30 in Berlin.
    const result = groupAbsencesByPeriod(
      [absence({ checkedOutAt: new Date("2026-01-04T23:30:00.000Z") })],
      "day",
    );
    expect(result).toEqual([
      { periodStart: new Date("2026-01-04T23:00:00.000Z"), count: 1 },
    ]);
  });

  it("gruppiert nach ISO-Woche (Montag als Wochenbeginn)", () => {
    const result = groupAbsencesByPeriod(
      [
        absence({ checkedOutAt: new Date("2026-01-05T10:00:00.000Z") }), // Mo
        absence({ checkedOutAt: new Date("2026-01-11T10:00:00.000Z") }), // So, gleiche Woche
        absence({ checkedOutAt: new Date("2026-01-12T10:00:00.000Z") }), // Mo, Folgewoche
      ],
      "week",
    );
    expect(result).toHaveLength(2);
    expect(result[0].count).toBe(2);
    expect(result[1].count).toBe(1);
  });

  it("gruppiert nach Monat", () => {
    const result = groupAbsencesByPeriod(
      [
        absence({ checkedOutAt: new Date("2026-01-05T10:00:00.000Z") }),
        absence({ checkedOutAt: new Date("2026-01-31T10:00:00.000Z") }),
        absence({ checkedOutAt: new Date("2026-02-01T10:00:00.000Z") }),
      ],
      "month",
    );
    expect(result).toHaveLength(2);
    expect(result[0].count).toBe(2);
    expect(result[1].count).toBe(1);
  });

  it("ignoriert stornierte Abwesenheiten", () => {
    const result = groupAbsencesByPeriod(
      [absence({ status: "CANCELLED" })],
      "day",
    );
    expect(result).toEqual([]);
  });

  it("liefert eine leere Liste für keine Abwesenheiten", () => {
    expect(groupAbsencesByPeriod([], "day")).toEqual([]);
  });
});

describe("computeAverageDurationMs", () => {
  it("berechnet die Ø-Dauer nur über abgeschlossene Rückkehren", () => {
    const result = computeAverageDurationMs([
      absence({
        checkedOutAt: new Date("2026-01-05T10:00:00.000Z"),
        checkedInAt: new Date("2026-01-05T12:00:00.000Z"), // 2h
      }),
      absence({
        checkedOutAt: new Date("2026-01-06T10:00:00.000Z"),
        checkedInAt: new Date("2026-01-06T14:00:00.000Z"), // 4h
      }),
      absence({
        checkedOutAt: new Date("2026-01-07T10:00:00.000Z"),
        checkedInAt: null,
        status: "ACTIVE",
      }),
    ]);
    expect(result).toBe(3 * 60 * 60 * 1000); // Ø aus 2h und 4h, ACTIVE zählt nicht
  });

  it("liefert 0, wenn keine Abwesenheit abgeschlossen ist", () => {
    expect(
      computeAverageDurationMs([
        absence({ checkedInAt: null, status: "ACTIVE" }),
      ]),
    ).toBe(0);
  });

  it("liefert 0 für eine leere Liste", () => {
    expect(computeAverageDurationMs([])).toBe(0);
  });
});

describe("countLateReturns", () => {
  it("zählt nur abgeschlossene Rückkehren nach der geplanten Zeit", () => {
    const result = countLateReturns([
      absence({
        plannedReturnAt: new Date("2026-01-05T12:00:00.000Z"),
        checkedInAt: new Date("2026-01-05T13:00:00.000Z"), // zu spät
      }),
      absence({
        plannedReturnAt: new Date("2026-01-05T12:00:00.000Z"),
        checkedInAt: new Date("2026-01-05T11:00:00.000Z"), // pünktlich
      }),
      absence({
        plannedReturnAt: new Date("2026-01-05T12:00:00.000Z"),
        checkedInAt: null,
        status: "ACTIVE", // noch nicht zurück, zählt nicht als "verspätete Rückkehr"
      }),
    ]);
    expect(result).toBe(1);
  });
});

describe("countByReason", () => {
  it("sortiert absteigend nach Häufigkeit, Gleichstand alphabetisch", () => {
    const result = countByReason([
      absence({ reason: "ARZT" }),
      absence({ reason: "HEIMFAHRT" }),
      absence({ reason: "HEIMFAHRT" }),
      absence({ reason: "SPORT_VEREIN" }),
    ]);
    expect(result).toEqual([
      { reason: "HEIMFAHRT", count: 2 },
      { reason: "ARZT", count: 1 },
      { reason: "SPORT_VEREIN", count: 1 },
    ]);
  });
});

describe("countAbsencesPerStudent", () => {
  it("sortiert absteigend nach Anzahl, Gleichstand alphabetisch nach Namen", () => {
    const result = countAbsencesPerStudent([
      absence({ userId: "u1", userName: "Zoe Zeller" }),
      absence({ userId: "u2", userName: "Anna Abt" }),
      absence({ userId: "u2", userName: "Anna Abt" }),
    ]);
    expect(result).toEqual([
      { userId: "u2", userName: "Anna Abt", count: 2 },
      { userId: "u1", userName: "Zoe Zeller", count: 1 },
    ]);
  });
});

describe("buildStatsSummary", () => {
  it("kombiniert alle Kennzahlen", () => {
    const summary = buildStatsSummary(
      [
        absence({
          checkedOutAt: new Date("2026-01-05T10:00:00.000Z"),
          checkedInAt: new Date("2026-01-05T12:00:00.000Z"),
        }),
        absence({ status: "CANCELLED" }),
      ],
      "day",
    );
    expect(summary.totalAbsences).toBe(1);
    expect(summary.averageDurationMs).toBe(2 * 60 * 60 * 1000);
    expect(summary.lateReturns).toBe(0);
    expect(summary.byReason).toEqual([{ reason: "HEIMFAHRT", count: 1 }]);
    expect(summary.byStudent).toEqual([
      { userId: "u1", userName: "Anna Muster", count: 1 },
    ]);
    expect(summary.byPeriod).toHaveLength(1);
  });
});

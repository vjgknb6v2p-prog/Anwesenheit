import { describe, expect, it } from "vitest";
import {
  ALL_FILTER,
  filterLiveOverviewRows,
  sortLiveOverviewRows,
  type LiveOverviewRowLike,
} from "./live-overview";

function row(overrides: Partial<LiveOverviewRowLike>): LiveOverviewRowLike {
  return {
    name: "Anna Muster",
    schoolClass: "10a",
    residentialAreaName: "Haus Nord",
    status: "ANWESEND",
    checkedOutAt: null,
    plannedReturnAt: null,
    ...overrides,
  };
}

describe("filterLiveOverviewRows", () => {
  const rows = [
    row({ name: "Anna Abwesend", status: "ABWESEND", schoolClass: "10a" }),
    row({ name: "Ben Überfällig", status: "UEBERFAELLIG", schoolClass: "9b" }),
    row({
      name: "Cara Anwesend",
      status: "ANWESEND",
      residentialAreaName: "Haus Süd",
    }),
  ];

  it("gibt bei ALLE-Filtern alle Zeilen zurück", () => {
    expect(filterLiveOverviewRows(rows, { status: ALL_FILTER })).toHaveLength(
      3,
    );
  });

  it("filtert nach Status", () => {
    const result = filterLiveOverviewRows(rows, { status: "UEBERFAELLIG" });
    expect(result.map((r) => r.name)).toEqual(["Ben Überfällig"]);
  });

  it("filtert nach Wohnbereich", () => {
    const result = filterLiveOverviewRows(rows, {
      residentialAreaName: "Haus Süd",
    });
    expect(result.map((r) => r.name)).toEqual(["Cara Anwesend"]);
  });

  it("filtert nach Klasse", () => {
    const result = filterLiveOverviewRows(rows, { schoolClass: "9b" });
    expect(result.map((r) => r.name)).toEqual(["Ben Überfällig"]);
  });

  it("filtert per Volltextsuche über den Namen, case-insensitiv", () => {
    const result = filterLiveOverviewRows(rows, { query: "anna" });
    expect(result.map((r) => r.name)).toEqual(["Anna Abwesend"]);
  });

  it("kombiniert mehrere Filter", () => {
    const result = filterLiveOverviewRows(rows, {
      status: "ANWESEND",
      residentialAreaName: "Haus Süd",
    });
    expect(result.map((r) => r.name)).toEqual(["Cara Anwesend"]);
  });
});

describe("sortLiveOverviewRows", () => {
  it("sortiert Überfällig vor Abwesend vor Anwesend (Default)", () => {
    const rows = [
      row({ name: "Present", status: "ANWESEND" }),
      row({ name: "Absent", status: "ABWESEND" }),
      row({ name: "Overdue", status: "UEBERFAELLIG" }),
    ];
    expect(sortLiveOverviewRows(rows).map((r) => r.status)).toEqual([
      "UEBERFAELLIG",
      "ABWESEND",
      "ANWESEND",
    ]);
  });

  it("löst Gleichstände alphabetisch nach Namen auf", () => {
    const rows = [
      row({ name: "Zoe", status: "ABWESEND" }),
      row({ name: "Anna", status: "ABWESEND" }),
    ];
    expect(sortLiveOverviewRows(rows).map((r) => r.name)).toEqual([
      "Anna",
      "Zoe",
    ]);
  });

  it("sortiert nach Namen aufsteigend/absteigend", () => {
    const rows = [row({ name: "Zoe" }), row({ name: "Anna" })];
    expect(
      sortLiveOverviewRows(rows, "name", "asc").map((r) => r.name),
    ).toEqual(["Anna", "Zoe"]);
    expect(
      sortLiveOverviewRows(rows, "name", "desc").map((r) => r.name),
    ).toEqual(["Zoe", "Anna"]);
  });

  it("sortiert null-Zeitpunkte (Anwesend) ans Ende", () => {
    const rows = [
      row({ name: "Present", checkedOutAt: null }),
      row({ name: "Absent", checkedOutAt: "2026-01-01T10:00:00.000Z" }),
    ];
    expect(
      sortLiveOverviewRows(rows, "checkedOutAt", "asc").map((r) => r.name),
    ).toEqual(["Absent", "Present"]);
  });

  it("sortiert nach Dauer: früherer Check-out (längere Dauer) zuerst", () => {
    const rows = [
      row({ name: "Kurz", checkedOutAt: "2026-01-01T12:00:00.000Z" }),
      row({ name: "Lang", checkedOutAt: "2026-01-01T08:00:00.000Z" }),
    ];
    expect(
      sortLiveOverviewRows(rows, "duration", "asc").map((r) => r.name),
    ).toEqual(["Lang", "Kurz"]);
  });

  it("mutiert das Eingabe-Array nicht", () => {
    const rows = [row({ name: "Zoe" }), row({ name: "Anna" })];
    const original = [...rows];
    sortLiveOverviewRows(rows, "name", "asc");
    expect(rows).toEqual(original);
  });
});

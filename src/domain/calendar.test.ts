import { describe, expect, it } from "vitest";
import { buildAbsenceCalendar, type CalendarAbsenceInput } from "./calendar";

function absence(
  overrides: Partial<CalendarAbsenceInput> = {},
): CalendarAbsenceInput {
  return {
    userId: "u1",
    userName: "Lena Bauer",
    reason: "EINKAUF_STADT",
    destination: "Stadtzentrum",
    checkedOutAt: new Date("2026-03-15T10:00:00Z"),
    status: "COMPLETED",
    ...overrides,
  };
}

describe("buildAbsenceCalendar", () => {
  it("liefert genau so viele Tage wie der Monat hat, auch ohne Abwesenheiten", () => {
    const days = buildAbsenceCalendar([], 2026, 4);
    expect(days).toHaveLength(30);
    expect(days.every((day) => day.entries.length === 0)).toBe(true);
  });

  it("ordnet eine Abwesenheit ihrem Auscheck-Kalendertag zu (Europe/Berlin)", () => {
    // 2026-03-15T10:00:00Z entspricht 11:00 MEZ/MESZ in Berlin, also
    // weiterhin der 15.
    const days = buildAbsenceCalendar([absence()], 2026, 3);
    expect(days[14]?.entries).toHaveLength(1);
    expect(days[0]?.entries).toHaveLength(0);
  });

  it("ignoriert Abwesenheiten außerhalb des angefragten Monats", () => {
    const days = buildAbsenceCalendar(
      [absence({ checkedOutAt: new Date("2026-04-01T10:00:00Z") })],
      2026,
      3,
    );
    expect(days.flatMap((d) => d.entries)).toHaveLength(0);
  });

  it("schließt stornierte Abwesenheiten aus", () => {
    const days = buildAbsenceCalendar(
      [absence({ status: "CANCELLED" })],
      2026,
      3,
    );
    expect(days.flatMap((d) => d.entries)).toHaveLength(0);
  });

  it("gruppiert mehrere Abwesenheiten am selben Tag korrekt", () => {
    const days = buildAbsenceCalendar(
      [
        absence({ userId: "u1" }),
        absence({ userId: "u2", userName: "Jonas Klein" }),
      ],
      2026,
      3,
    );
    expect(days[14]?.entries).toHaveLength(2);
  });
});

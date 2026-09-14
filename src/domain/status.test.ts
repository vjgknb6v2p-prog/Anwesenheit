import { describe, expect, it } from "vitest";
import { deriveStatus } from "./status";

describe("deriveStatus", () => {
  const now = new Date("2026-01-15T12:00:00.000Z");

  it("liefert ANWESEND, wenn keine aktive Abwesenheit existiert", () => {
    expect(deriveStatus(null, now)).toBe("ANWESEND");
  });

  it("liefert ABWESEND, wenn die geplante Rückkehr in der Zukunft liegt", () => {
    const activeAbsence = {
      status: "ACTIVE" as const,
      plannedReturnAt: new Date("2026-01-15T18:00:00.000Z"),
    };
    expect(deriveStatus(activeAbsence, now)).toBe("ABWESEND");
  });

  it("liefert UEBERFAELLIG, wenn die geplante Rückkehr in der Vergangenheit liegt", () => {
    const activeAbsence = {
      status: "ACTIVE" as const,
      plannedReturnAt: new Date("2026-01-15T06:00:00.000Z"),
    };
    expect(deriveStatus(activeAbsence, now)).toBe("UEBERFAELLIG");
  });

  it("liefert ABWESEND im Grenzfall 'exakt jetzt' (plannedReturnAt === now)", () => {
    const activeAbsence = {
      status: "ACTIVE" as const,
      plannedReturnAt: new Date(now.getTime()),
    };
    expect(deriveStatus(activeAbsence, now)).toBe("ABWESEND");
  });

  it("liefert UEBERFAELLIG eine Millisekunde nach der geplanten Rückkehr", () => {
    const activeAbsence = {
      status: "ACTIVE" as const,
      plannedReturnAt: new Date(now.getTime() - 1),
    };
    expect(deriveStatus(activeAbsence, now)).toBe("UEBERFAELLIG");
  });
});

import { describe, expect, it } from "vitest";
import { isEligibleForHardDelete } from "./retention";

const now = new Date("2026-06-15T12:00:00.000Z");

describe("isEligibleForHardDelete", () => {
  it("ist false für eine aktive Abwesenheit, egal wie alt", () => {
    expect(
      isEligibleForHardDelete(
        {
          checkedOutAt: new Date("2020-01-01T00:00:00.000Z"),
          status: "ACTIVE",
        },
        now,
        12,
      ),
    ).toBe(false);
  });

  it("ist false, wenn die Abwesenheit noch innerhalb der Frist liegt", () => {
    expect(
      isEligibleForHardDelete(
        {
          checkedOutAt: new Date("2026-01-01T00:00:00.000Z"),
          status: "COMPLETED",
        },
        now,
        12,
      ),
    ).toBe(false);
  });

  it("ist true für eine abgeschlossene Abwesenheit älter als die Frist", () => {
    expect(
      isEligibleForHardDelete(
        {
          checkedOutAt: new Date("2024-01-01T00:00:00.000Z"),
          status: "COMPLETED",
        },
        now,
        12,
      ),
    ).toBe(true);
  });

  it("ist true für eine stornierte Abwesenheit älter als die Frist", () => {
    expect(
      isEligibleForHardDelete(
        {
          checkedOutAt: new Date("2024-01-01T00:00:00.000Z"),
          status: "CANCELLED",
        },
        now,
        12,
      ),
    ).toBe(true);
  });

  it("respektiert eine geänderte Aufbewahrungsfrist", () => {
    const absence = {
      checkedOutAt: new Date("2026-05-01T00:00:00.000Z"),
      status: "COMPLETED" as const,
    };
    expect(isEligibleForHardDelete(absence, now, 12)).toBe(false);
    expect(isEligibleForHardDelete(absence, now, 1)).toBe(true);
  });
});

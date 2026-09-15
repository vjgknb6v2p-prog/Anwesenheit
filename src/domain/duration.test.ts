import { describe, expect, it } from "vitest";
import { computeDurationMs, formatDuration } from "./duration";

describe("computeDurationMs", () => {
  it("berechnet die Dauer bis jetzt, wenn noch nicht eingecheckt wurde", () => {
    const checkedOutAt = new Date("2026-01-15T10:00:00.000Z");
    const now = new Date("2026-01-15T12:30:00.000Z");
    expect(computeDurationMs(checkedOutAt, null, now)).toBe(
      2.5 * 60 * 60 * 1000,
    );
  });

  it("berechnet die Dauer bis zum Einchecken, ignoriert `now` danach", () => {
    const checkedOutAt = new Date("2026-01-15T10:00:00.000Z");
    const checkedInAt = new Date("2026-01-15T11:00:00.000Z");
    const now = new Date("2026-01-16T00:00:00.000Z");
    expect(computeDurationMs(checkedOutAt, checkedInAt, now)).toBe(
      60 * 60 * 1000,
    );
  });
});

describe("formatDuration", () => {
  it("formatiert unter einer Stunde nur in Minuten", () => {
    expect(formatDuration(45 * 60 * 1000)).toBe("45min");
  });

  it("formatiert Stunden und Minuten", () => {
    expect(formatDuration(2.5 * 60 * 60 * 1000)).toBe("2h 30min");
  });

  it("rundet auf ganze Minuten", () => {
    expect(formatDuration(90_500)).toBe("2min");
  });
});

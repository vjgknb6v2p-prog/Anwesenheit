import { describe, expect, it } from "vitest";
import { getQuickReturnOptions } from "./quick-return-times";

describe("getQuickReturnOptions", () => {
  // Montag, 12.01.2026, 10:00 UTC = 11:00 Berlin (Winterzeit, UTC+1)
  const monday10UtcJan = new Date("2026-01-12T10:00:00.000Z");

  it("liefert +2h und +4h relativ zu now", () => {
    const options = getQuickReturnOptions(monday10UtcJan, "22:00");
    expect(options[0]).toEqual({
      label: "+2 h",
      value: new Date("2026-01-12T12:00:00.000Z"),
    });
    expect(options[1]).toEqual({
      label: "+4 h",
      value: new Date("2026-01-12T14:00:00.000Z"),
    });
  });

  it("leitet 'Heute 21:30' aus curfewTime 22:00 ab", () => {
    const options = getQuickReturnOptions(monday10UtcJan, "22:00");
    // 21:30 Berlin (UTC+1 im Winter) = 20:30 UTC
    expect(options[2]).toEqual({
      label: "Heute 21:30",
      value: new Date("2026-01-12T20:30:00.000Z"),
    });
  });

  it("weicht auf 'Morgen' aus, wenn der Heute-Termin schon vorbei ist", () => {
    // 21:00 Berlin = 20:00 UTC, also nach der berechneten 20:30-UTC-Grenze
    const lateMonday = new Date("2026-01-12T21:00:00.000Z");
    const options = getQuickReturnOptions(lateMonday, "22:00");
    expect(options[2]?.label).toBe("Morgen 21:30");
    expect(options[2]?.value.toISOString()).toBe("2026-01-13T20:30:00.000Z");
  });

  it("berechnet den kommenden Sonntag 18:00 ab einem Montag", () => {
    const options = getQuickReturnOptions(monday10UtcJan, "22:00");
    // Sonntag, 18.01.2026, 18:00 Berlin (UTC+1) = 17:00 UTC
    expect(options[3]).toEqual({
      label: "Sonntag 18:00",
      value: new Date("2026-01-18T17:00:00.000Z"),
    });
  });

  it("bleibt am selben Sonntag, wenn 18:00 noch nicht erreicht ist", () => {
    // Sonntag, 11.01.2026, 10:00 UTC (vor 17:00 UTC / 18:00 Berlin)
    const sundayMorning = new Date("2026-01-11T10:00:00.000Z");
    const options = getQuickReturnOptions(sundayMorning, "22:00");
    expect(options[3]).toEqual({
      label: "Sonntag 18:00",
      value: new Date("2026-01-11T17:00:00.000Z"),
    });
  });

  it("springt auf den nächsten Sonntag, wenn 18:00 an diesem Sonntag vorbei ist", () => {
    const sundayEvening = new Date("2026-01-11T19:00:00.000Z");
    const options = getQuickReturnOptions(sundayEvening, "22:00");
    expect(options[3]).toEqual({
      label: "Sonntag 18:00",
      value: new Date("2026-01-18T17:00:00.000Z"),
    });
  });
});

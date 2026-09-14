import { describe, expect, it } from "vitest";
import { isSessionExpired } from "./session";

describe("isSessionExpired", () => {
  const opts = { maxAgeMs: 8 * 60 * 60 * 1000, idleMs: 60 * 60 * 1000 };
  const loginAt = new Date("2026-01-15T08:00:00.000Z");

  it("ist nicht abgelaufen direkt nach dem Login", () => {
    const now = new Date(loginAt);
    expect(isSessionExpired(loginAt, loginAt, now, opts)).toBe(false);
  });

  it("ist nicht abgelaufen kurz vor der Idle-Grenze", () => {
    const lastActiveAt = new Date("2026-01-15T09:00:00.000Z");
    const now = new Date(lastActiveAt.getTime() + opts.idleMs - 1);
    expect(isSessionExpired(loginAt, lastActiveAt, now, opts)).toBe(false);
  });

  it("ist wegen Inaktivität abgelaufen eine Millisekunde nach der Idle-Grenze", () => {
    const lastActiveAt = new Date("2026-01-15T09:00:00.000Z");
    const now = new Date(lastActiveAt.getTime() + opts.idleMs + 1);
    expect(isSessionExpired(loginAt, lastActiveAt, now, opts)).toBe(true);
  });

  it("ist im Grenzfall exakt auf der Idle-Grenze noch nicht abgelaufen", () => {
    const lastActiveAt = new Date("2026-01-15T09:00:00.000Z");
    const now = new Date(lastActiveAt.getTime() + opts.idleMs);
    expect(isSessionExpired(loginAt, lastActiveAt, now, opts)).toBe(false);
  });

  it("ist wegen absoluter Lebensdauer abgelaufen, auch bei durchgehender Aktivität", () => {
    const now = new Date(loginAt.getTime() + opts.maxAgeMs + 1);
    const lastActiveAt = new Date(now.getTime() - 1000); // gerade eben aktiv
    expect(isSessionExpired(loginAt, lastActiveAt, now, opts)).toBe(true);
  });

  it("ist im Grenzfall exakt auf der absoluten Lebensdauer-Grenze noch nicht abgelaufen", () => {
    const now = new Date(loginAt.getTime() + opts.maxAgeMs);
    expect(isSessionExpired(loginAt, now, now, opts)).toBe(false);
  });
});

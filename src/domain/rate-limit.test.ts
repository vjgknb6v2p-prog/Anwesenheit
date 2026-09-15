import { describe, expect, it } from "vitest";
import { isRateLimited } from "./rate-limit";

describe("isRateLimited", () => {
  const opts = { maxAttempts: 5, windowMs: 15 * 60 * 1000 };
  const now = new Date("2026-01-15T12:00:00.000Z");

  it("blockiert nicht ohne vorherige Versuche", () => {
    expect(isRateLimited([], now, opts)).toBe(false);
  });

  it("blockiert nicht bei 4 Versuchen im Zeitfenster", () => {
    const attempts = Array.from(
      { length: 4 },
      (_, i) => new Date(now.getTime() - i * 60 * 1000),
    );
    expect(isRateLimited(attempts, now, opts)).toBe(false);
  });

  it("blockiert ab dem 5. Versuch im Zeitfenster", () => {
    const attempts = Array.from(
      { length: 5 },
      (_, i) => new Date(now.getTime() - i * 60 * 1000),
    );
    expect(isRateLimited(attempts, now, opts)).toBe(true);
  });

  it("ignoriert Versuche außerhalb des Zeitfensters", () => {
    const attempts = [
      new Date(now.getTime() - opts.windowMs - 1), // knapp außerhalb
      new Date(now.getTime() - opts.windowMs - 1),
      new Date(now.getTime() - opts.windowMs - 1),
      new Date(now.getTime() - opts.windowMs - 1),
      new Date(now.getTime() - opts.windowMs - 1),
    ];
    expect(isRateLimited(attempts, now, opts)).toBe(false);
  });

  it("zählt einen Versuch exakt an der Fenstergrenze nicht mehr mit", () => {
    const attempts = [
      new Date(now.getTime() - opts.windowMs),
      new Date(now.getTime()),
      new Date(now.getTime()),
      new Date(now.getTime()),
      new Date(now.getTime()),
    ];
    expect(isRateLimited(attempts, now, opts)).toBe(false);
  });
});

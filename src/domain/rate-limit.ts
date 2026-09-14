/**
 * PROMPT.md Phase 1: Rate-Limiting auf Login (5 Versuche / 15 min pro
 * E-Mail + IP). Diese reine Funktion entscheidet nur anhand einer Liste
 * vergangener fehlgeschlagener Versuche, ob eine weitere Anmeldung blockiert
 * werden muss — woher die Liste kommt (Abfrage von `AuditLog`, siehe
 * `src/lib/audit.ts`), ist ihr egal.
 */
export interface RateLimitOptions {
  maxAttempts: number;
  windowMs: number;
}

export function isRateLimited(
  attemptTimestamps: Date[],
  now: Date,
  opts: RateLimitOptions,
): boolean {
  const windowStart = now.getTime() - opts.windowMs;
  const attemptsInWindow = attemptTimestamps.filter(
    (attempt) => attempt.getTime() > windowStart,
  ).length;

  return attemptsInWindow >= opts.maxAttempts;
}

export const LOGIN_RATE_LIMIT: RateLimitOptions = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
};

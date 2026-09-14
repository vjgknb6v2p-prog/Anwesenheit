/**
 * PROMPT.md Abschnitt 2: JWT-Session mit 8 h Laufzeit und 60 min
 * Idle-Timeout. Eine Session ist abgelaufen, sobald entweder die absolute
 * Lebensdauer (seit dem Login) oder die Idle-Zeit (seit der letzten
 * Aktivität) überschritten ist — je nachdem, was zuerst eintritt.
 *
 * Diese reine Funktion kapselt die zeitabhängige Kernlogik, damit sie ohne
 * einen echten Auth.js-Request-Zyklus (und ohne eine echte Stunde zu warten)
 * getestet werden kann. Die Verdrahtung mit den JWT-Zeitstempeln erfolgt in
 * `auth.ts`.
 */
export interface SessionTimeoutOptions {
  /** Absolute Lebensdauer der Session in Millisekunden (Standard: 8 h). */
  maxAgeMs: number;
  /** Erlaubte Inaktivität in Millisekunden (Standard: 60 min). */
  idleMs: number;
}

export function isSessionExpired(
  loginAt: Date,
  lastActiveAt: Date,
  now: Date,
  opts: SessionTimeoutOptions,
): boolean {
  const age = now.getTime() - loginAt.getTime();
  const idle = now.getTime() - lastActiveAt.getTime();

  return age > opts.maxAgeMs || idle > opts.idleMs;
}

export const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
export const SESSION_IDLE_TIMEOUT_MS = 60 * 60 * 1000;

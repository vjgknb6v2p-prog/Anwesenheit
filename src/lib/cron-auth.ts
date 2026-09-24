import type { NextRequest } from "next/server";

/**
 * Schützt die beiden Cron-Endpunkte (`/api/v1/cron/tick`, `/api/v1/cron/cleanup`)
 * per `CRON_SECRET` statt Session (Abschnitt 8) — externe Aufrufer haben keine
 * Session. Akzeptiert zwei Formen desselben Secrets:
 * - `x-cron-secret: <secret>` — für selbstgehostete Aufrufer (systemd-Timer, …)
 *   mit freier Header-Wahl, siehe README.md.
 * - `Authorization: Bearer <secret>` — Vercel Cron sendet diesen Header
 *   automatisch für über `vercel.json` konfigurierte Cron-Jobs, ohne dass der
 *   Header frei wählbar wäre.
 */
export function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  if (request.headers.get("x-cron-secret") === secret) {
    return true;
  }
  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

import webpush from "web-push";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

let vapidConfigured = false;

function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT,
  );
}

function ensureVapidConfigured(): void {
  if (vapidConfigured) {
    return;
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  vapidConfigured = true;
}

export interface PushPayload {
  title: string;
  body: string;
}

/**
 * Sendet eine Push-Nachricht an alle Geräte eines Nutzers (best effort).
 * PROMPT.md Abschnitt 8: "Kein Fehler, wenn Push nicht verfügbar ist" — ohne
 * konfigurierte VAPID-Keys oder ohne Abonnements passiert schlicht nichts,
 * kein Throw. Eine `410 Gone`/`404`-Antwort des Push-Dienstes bedeutet, dass
 * das Abonnement nicht mehr gültig ist (Browser-Neuinstallation,
 * Berechtigung entzogen o. Ä.) — die Zeile wird dann aufgeräumt, damit
 * zukünftige Cron-Ticks sie nicht erneut vergeblich versuchen.
 */
export async function sendWebPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!isPushConfigured()) {
    return;
  }
  ensureVapidConfigured();

  const subscriptions = await db.pushSubscription.findMany({
    where: { userId },
  });
  if (subscriptions.length === 0) {
    return;
  }

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload),
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await db.pushSubscription
            .delete({ where: { id: subscription.id } })
            .catch(() => {
              // Zwischenzeitlich bereits gelöscht (z. B. durch `unsubscribeFromPushAction`) — unkritisch.
            });
          return;
        }
        logger.error({ err: error, userId }, "Web-Push-Versand fehlgeschlagen");
      }
    }),
  );
}

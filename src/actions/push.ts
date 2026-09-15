"use server";

import { headers } from "next/headers";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { pushSubscriptionSchema } from "@/lib/validation/push";

export interface ActionResult {
  error?: string;
}

/**
 * Speichert ein Web-Push-Abonnement (PROMPT.md Abschnitt 8). `endpoint` ist
 * laut Schema `@unique` — ein `upsert` macht die Action idempotent, falls
 * derselbe Browser sich mehrfach registriert (z. B. nach erneutem
 * `pushManager.subscribe()` mit unverändertem Endpoint).
 */
export async function subscribeToPushAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = pushSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Ungültiges Push-Abonnement." };
  }
  const { endpoint, keys } = parsed.data;
  const userAgent = (await headers()).get("user-agent");

  await db.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
    },
    update: {
      userId: user.id,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
    },
  });

  return {};
}

/** Entfernt ein Abonnement — nur, wenn es dem angemeldeten Nutzer gehört. */
export async function unsubscribeFromPushAction(
  endpoint: string,
): Promise<ActionResult> {
  const user = await requireUser();

  await db.pushSubscription.deleteMany({
    where: { endpoint, userId: user.id },
  });

  return {};
}

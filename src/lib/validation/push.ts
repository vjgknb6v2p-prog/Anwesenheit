import { z } from "zod";

/**
 * Entspricht der Form von `PushSubscription.toJSON()` im Browser
 * (`{ endpoint, keys: { p256dh, auth } }`) — genau die Felder, die in
 * `PushSubscription` (Prisma) persistiert werden.
 */
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().min(1, "Ungültiges Abonnement."),
  keys: z.object({
    p256dh: z.string().min(1, "Ungültiges Abonnement."),
    auth: z.string().min(1, "Ungültiges Abonnement."),
  }),
});
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

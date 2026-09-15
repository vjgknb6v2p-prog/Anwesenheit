import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { LOGIN_RATE_LIMIT, isRateLimited } from "@/domain/rate-limit";

export interface WriteAuditLogInput {
  actorId?: string | null;
  action: string;
  targetUserId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ip?: string | null;
}

export function writeAuditLog(input: WriteAuditLogInput) {
  return db.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      targetUserId: input.targetUserId ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      metadata: input.metadata,
      ip: input.ip ?? null,
    },
  });
}

/**
 * Prüft, ob für die gegebene E-Mail-Adresse **oder** IP in den letzten
 * `LOGIN_RATE_LIMIT.windowMs` bereits `LOGIN_RATE_LIMIT.maxAttempts`
 * fehlgeschlagene Login-Versuche protokolliert wurden (PROMPT.md Phase 1:
 * „5 Versuche / 15 min pro E-Mail + IP"). Fehlgeschlagene Versuche werden von
 * der Login-Server-Action als `AuditLog`-Eintrag mit `action: "LOGIN_FAILED"`
 * geschrieben — ein eigenes Datenmodell dafür ist nicht nötig.
 */
export async function isLoginRateLimited(
  email: string,
  ip: string | null,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - LOGIN_RATE_LIMIT.windowMs);

  const recentFailures = await db.auditLog.findMany({
    where: {
      action: "LOGIN_FAILED",
      createdAt: { gt: windowStart },
      OR: [
        { metadata: { path: ["email"], equals: email } },
        ...(ip ? [{ ip }] : []),
      ],
    },
    select: { createdAt: true },
  });

  return isRateLimited(
    recentFailures.map((entry) => entry.createdAt),
    new Date(),
    LOGIN_RATE_LIMIT,
  );
}

import { createHash, randomBytes } from "node:crypto";
import type { PasswordResetToken } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Erzeugt ein zufälliges Passwort-Reset-Token. Der Rohwert wird per Link
 * verschickt, in der DB landet ausschließlich der SHA-256-Hash
 * (`PasswordResetToken.tokenHash`) — ein Leak der Datenbank allein reicht
 * damit nicht aus, um gültige Reset-Links zu fälschen.
 */
export function generateResetToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  return { raw, hash: hashResetToken(raw) };
}

export function hashResetToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Lädt ein Passwort-Reset-Token anhand seines Rohwerts und gibt es nur
 * zurück, wenn es weder abgelaufen noch bereits verwendet ist. Wird sowohl
 * von der Reset-Seite (Vorab-Prüfung für die Anzeige) als auch von
 * `resetPasswordAction` (maßgebliche Prüfung vor dem eigentlichen Update)
 * verwendet, damit die Gültigkeitsregel an genau einer Stelle steht.
 */
export async function findValidPasswordResetToken(
  rawToken: string,
): Promise<PasswordResetToken | null> {
  const resetToken = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(rawToken) },
  });

  if (
    !resetToken ||
    resetToken.usedAt ||
    resetToken.expiresAt.getTime() < Date.now()
  ) {
    return null;
  }

  return resetToken;
}

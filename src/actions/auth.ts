"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { isLoginRateLimited, writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { getMailer } from "@/lib/mail/mailer";
import { hashPassword } from "@/lib/password";
import { roleHomePath } from "@/lib/roles";
import { findValidPasswordResetToken, generateResetToken } from "@/lib/tokens";
import {
  loginSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 Stunde

async function getClientIp(): Promise<string | null> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }
  return headerList.get("x-real-ip");
}

export interface ActionResult {
  error?: string;
}

/**
 * Meldet einen Nutzer an. Prüft zuerst das Rate-Limit (PROMPT.md Phase 1:
 * 5 Versuche / 15 min pro E-Mail + IP), delegiert dann an Auth.js und
 * protokolliert Erfolg/Fehlschlag im Audit-Log. Bei Erfolg erfolgt der
 * Redirect serverseitig auf den rollenabhängigen Startbereich.
 */
export async function loginAction(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Bitte E-Mail und Passwort angeben." };
  }

  const { email, password } = parsed.data;
  const ip = await getClientIp();

  if (await isLoginRateLimited(email, ip)) {
    return {
      error:
        "Zu viele fehlgeschlagene Anmeldeversuche. Bitte in 15 Minuten erneut versuchen.",
    };
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      await writeAuditLog({ action: "LOGIN_FAILED", metadata: { email }, ip });
      return { error: "E-Mail oder Passwort ist falsch." };
    }
    throw error;
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    // Sollte nach erfolgreichem signIn nicht vorkommen, aber sauber
    // abfangen statt einen 500er auszulösen.
    redirect("/login");
  }

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await writeAuditLog({
    actorId: user.id,
    action: "LOGIN_SUCCESS",
    targetUserId: user.id,
    ip,
  });

  redirect(roleHomePath(user.role));
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

/**
 * Löst den Passwort-vergessen-Flow aus. Antwortet unabhängig davon, ob die
 * E-Mail-Adresse existiert, immer mit derselben Erfolgsmeldung — sonst ließe
 * sich über die Antwort erraten, welche E-Mail-Adressen im System bekannt
 * sind (User-Enumeration).
 */
export async function requestPasswordResetAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = requestPasswordResetSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Bitte eine gültige E-Mail-Adresse angeben." };
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (user && user.active && !user.deletedAt) {
    const { raw, hash } = generateResetToken();
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    await getMailer().send({
      to: user.email,
      subject: "CheckIn – Passwort zurücksetzen",
      text: `Zum Zurücksetzen deines Passworts öffne diesen Link (gültig 1 Stunde): ${appUrl}/passwort-zuruecksetzen/${raw}`,
    });

    await writeAuditLog({
      actorId: null,
      action: "PASSWORD_RESET_REQUESTED",
      targetUserId: user.id,
    });
  }

  return {};
}

/** Setzt das Passwort anhand eines gültigen, noch nicht verwendeten Tokens zurück. */
export async function resetPasswordAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const resetToken = await findValidPasswordResetToken(parsed.data.token);
  if (!resetToken) {
    return { error: "Der Link ist ungültig oder abgelaufen." };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await db.$transaction([
    db.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash, mustChangePassword: false },
    }),
    db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await writeAuditLog({
    actorId: resetToken.userId,
    action: "PASSWORD_RESET_COMPLETED",
    targetUserId: resetToken.userId,
  });

  redirect("/login");
}
